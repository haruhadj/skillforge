import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { getWordsByDifficulty, isWordNetAvailable, getStats } from './wordnet.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT) || 8787;
const NODE_ENV = process.env.NODE_ENV || 'development';

import { readFileSync } from 'fs';
const wordBank = JSON.parse(readFileSync(path.join(__dirname, 'data', 'wordBank.json'), 'utf8'));

// Check WordNet availability on startup
const wordnetAvailable = isWordNetAvailable();
if (wordnetAvailable) {
  const stats = getStats();
  console.log(`[WordNet] Connected: ${stats.totalWords.toLocaleString()} words available`);
  console.log(`[WordNet] By difficulty:`, stats.byDifficulty);
} else {
  console.log('[WordNet] Not available, using local wordBank fallback');
}

const ttsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// ── Utility: Shuffle helper ──────────────────────────────────────────────
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Microsoft Edge TTS — free, no credentials required
function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', c => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

async function synthesizeSpeech(text, mode) {
  const client = new MsEdgeTTS();
  await client.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let ssml;
  if (mode === 'word') {
    ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-AriaNeural'><prosody rate="-15%">${esc} ... ${esc}</prosody></voice></speak>`;
  } else if (mode === 'definition') {
    ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-AriaNeural'><prosody rate="-8%">${esc}</prosody></voice></speak>`;
  } else {
    ssml = `<speak version='1.0' xml:lang='en-US'><voice name='en-US-AriaNeural'>${esc}</voice></speak>`;
  }
  try {
    const { audioStream } = client.rawToStream(ssml);
    return await streamToBuffer(audioStream);
  } finally {
    client.close();
  }
}

app.disable('x-powered-by');

// Trust first proxy (e.g. nginx, Cloudflare, Railway) for correct client IP in rate limiting
if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Rate limiting — separate limits for API and TTS
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const ttsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many TTS requests. Please slow down.' },
});

app.use('/api/tts', ttsLimiter);
app.use('/api', apiLimiter);

app.use(express.json({ limit: '16kb' }));

// ── Serve static frontend in production ─────────────────────────────────
const distPath = path.join(__dirname, '..', 'dist');
if (NODE_ENV === 'production') {
  app.use(express.static(distPath, {
    maxAge: '7d',
    immutable: true,
  }));
}

app.get('/api/health', (req, res) => {
  const stats = wordnetAvailable ? getStats() : null;
  res.json({ 
    ok: true,
    wordnet: {
      available: wordnetAvailable,
      stats: stats
    },
    wordBank: {
      easy: wordBank.easy.length,
      medium: wordBank.medium.length,
      hard: wordBank.hard.length
    }
  });
});

app.post('/api/log-current-word', (req, res) => {
  const { word, idx, roundId, partOfSpeech, topic } = req.body || {};
  if (!word) return res.status(400).json({ error: 'Missing `word` in request body' });

  // eslint-disable-next-line no-console
  console.log('[SpellingBee] Now spelling:', {
    word: String(word),
    idx: idx ?? null,
    roundId: roundId ?? null,
    partOfSpeech: partOfSpeech ?? null,
    topic: topic ?? null,
    at: new Date().toISOString(),
  });

  return res.json({ ok: true });
});

app.get('/api/words', async (req, res) => {
  const difficulty = ['easy', 'medium', 'hard'].includes(req.query.difficulty)
    ? req.query.difficulty
    : 'medium';
  const limit = clampInt(req.query.limit, 1, 25);

  // Parse optional partOfSpeech filter (comma-separated)
  const validPos = ['noun', 'verb', 'adjective', 'adverb'];
  const posFilter = (req.query.partOfSpeech || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => validPos.includes(s));

  // Parse optional topic filter (comma-separated)
  const topicFilter = (req.query.topic || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 0);

  let words = [];
  let source = 'local';

  // Try WordNet first if available
  if (wordnetAvailable) {
    try {
      words = getWordsByDifficulty(difficulty, limit, posFilter);
      if (words.length > 0) {
        source = 'wordnet';
        
        // Apply topic filter if specified
        if (topicFilter.length > 0) {
          words = words.filter(w => {
            const topic = (w.topic || '').toLowerCase();
            return topicFilter.some(tf => topic.includes(tf));
          });
        }
        
        // If WordNet returned fewer words than requested, supplement with local
        if (words.length < limit) {
          const needed = limit - words.length;
          const localWords = wordBank[difficulty] || [];
          const localFiltered = localWords.filter(lw => 
            !words.some(ww => ww.word === lw.word)
          );
          words = [...words, ...localFiltered.slice(0, needed)];
          source = 'wordnet+local';
        }
      }
    } catch (err) {
      console.error('[WordNet] Error fetching words:', err.message);
    }
  }

  // Fallback to local wordBank if WordNet failed or returned no words
  if (words.length === 0) {
    let pool = wordBank[difficulty] || [];

    // Apply filters
    if (posFilter.length > 0) {
      pool = pool.filter(w => posFilter.includes(w.partOfSpeech));
    }
    if (topicFilter.length > 0) {
      pool = pool.filter(w => topicFilter.includes(w.topic));
    }

    if (pool.length === 0) {
      return res.json({ words: [], source: 'empty' });
    }

    const shuffled = shuffle(pool);
    words = shuffled.slice(0, limit);
    source = 'local';
  }

  return res.json({ words, source });
});

// ── Microsoft Edge Text-to-Speech ────────────────────────────────────────
app.get('/api/tts', async (req, res) => {
  const text = (req.query.text || '').trim();
  if (!text || text.length > 500) {
    return res.status(400).json({ error: 'Missing or too-long `text` parameter (max 500 chars).' });
  }

  const mode = ['word', 'definition', 'example'].includes(req.query.mode)
    ? req.query.mode
    : 'word';

  const cacheKey = `${mode}:${text}`;
  const cached = ttsCache.get(cacheKey);
  if (cached) {
    res.set('Content-Type', 'audio/mp3');
    return res.send(cached);
  }

  try {
    const audioBuffer = await synthesizeSpeech(text, mode);
    ttsCache.set(cacheKey, audioBuffer);
    res.set('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[TTS] Edge TTS error:', err.message);
    res.status(502).json({ error: 'TTS synthesis failed.' });
  }
});

// ── SPA fallback: serve index.html for all non-API routes in production ──
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ENV}] Spelling Bee Server listening on http://localhost:${PORT}`);
  if (wordnetAvailable) {
    const stats = getStats();
    console.log(`[WordNet] Connected: ${stats.totalWords.toLocaleString()} words`);
    console.log(`[WordNet] Easy: ${stats.byDifficulty.easy}, Medium: ${stats.byDifficulty.medium}, Hard: ${stats.byDifficulty.hard}`);
  }
  console.log(`[WordBank] Fallback loaded: ${wordBank.easy.length} easy, ${wordBank.medium.length} medium, ${wordBank.hard.length} hard words.`);
});

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

