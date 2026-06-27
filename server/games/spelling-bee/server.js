import 'dotenv/config';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// CORS — restrict to the app's own origins (audit M4), mirroring vocab/hamaru.
// The game is served same-origin via the nginx /api/ proxy, so this blocks
// cross-origin abuse of the compute-heavy /api/tts endpoint.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://skillforge.haruhadj.org', 'https://skillforge.haruhadj.duckdns.org', 'https://haruhadj.github.io']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

const PORT = Number(process.env.PORT) || 8787;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load hardcoded word bank (used as fallback)
const wordBank = JSON.parse(readFileSync(path.join(__dirname, 'data', 'wordBank.json'), 'utf8'));

// ── WordNet integration ───────────────────────────────────────────────────
// Maps spelling-bee difficulty names to WordNet tagcount-based difficulty keys
const DIFFICULTY_MAP = {
  easy:   'light',
  medium: 'medium',
  hard:   'hard',
};

let wordnetGetWords = null;
try {
  const wordnetPath = pathToFileURL(path.join(__dirname, '..', '..', 'wordnet', 'service.js')).href;
  const wordnetService = await import(wordnetPath);
  wordnetGetWords = wordnetService.getWordsByDifficulty;
  console.log('[SpellingBee] WordNet service loaded — will use as primary word source.');
} catch (err) {
  console.warn('[SpellingBee] WordNet service unavailable, falling back to word bank:', err.message);
}

/**
 * Fetch words from WordNet and normalise to spelling-bee word shape.
 * Returns null if WordNet is unavailable or returns no results.
 */
function getWordNetWords(difficulty, limit) {
  if (!wordnetGetWords) return null;
  const mappedDiff = DIFFICULTY_MAP[difficulty] || 'medium';
  try {
    const rows = wordnetGetWords(mappedDiff, limit * 3); // fetch extra for filtering
    if (!rows || rows.length === 0) return null;

    // Normalise to spelling-bee shape; skip abbreviations, acronyms, junk
    const hasVowel = /[aeiou]/i;
    const alphaOnly = /^[a-z]+$/;
    const words = rows
      .filter(r =>
        r.word &&
        r.definition &&
        r.word.length >= 4 &&           // no 3-letter abbreviations
        alphaOnly.test(r.word) &&        // no digits, underscores, etc.
        hasVowel.test(r.word)            // must contain a vowel (filters tsh, ldl, etc.)
      )
      .map(r => ({
        word:         r.word,
        definition:   r.definition,
        partOfSpeech: r.partOfSpeech || 'noun',
        example:      '',        // WordNet has no example sentences
        topic:        (r.topic || 'general').split('.')[0],
        freq:         r.freq ?? null,
      }))
      .slice(0, limit);

    return words.length > 0 ? words : null;
  } catch (err) {
    console.error('[SpellingBee] WordNet query failed:', err.message);
    return null;
  }
}

const ttsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// ── Microsoft Edge TTS ───────────────────────────────────────────────────
function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on('data', c => chunks.push(c));
    readable.on('end', () => resolve(Buffer.concat(chunks)));
    readable.on('error', reject);
  });
}

async function synthesizeSpeech(text, mode) {
  // Edge TTS WS closes after each turn — create a fresh client per request
  const client = new MsEdgeTTS();
  await client.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  const esc = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  let ssml;
  if (mode === 'word') {
    // Repeat the word with a natural pause (<break> tags unsupported by Edge TTS ws protocol)
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

// ── Utility: Shuffle helper ──────────────────────────────────────────────
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
const distPath = path.join(__dirname, '..', '..', '..', 'public', 'games', 'spelling-bee');
if (NODE_ENV === 'production') {
  app.use(express.static(distPath, {
    maxAge: '7d',
    immutable: true,
  }));
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/log-current-word', (req, res) => {
  const { word, idx, roundId, partOfSpeech, topic } = req.body || {};
  if (!word) return res.status(400).json({ error: 'Missing `word` in request body' });

  // Strip control chars / newlines + bound length to prevent log forging (audit L3).
  const clean = (v) => (v == null ? null : String(v).replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 80));

  // eslint-disable-next-line no-console
  console.log('[SpellingBee] Now spelling:', {
    word: clean(word),
    idx: Number.isFinite(Number(idx)) ? Number(idx) : null,
    roundId: clean(roundId),
    partOfSpeech: clean(partOfSpeech),
    topic: clean(topic),
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

  // ── Try WordNet first ────────────────────────────────────────────────────
  let wordnetWords = getWordNetWords(difficulty, limit);

  if (wordnetWords) {
    // Apply filters to WordNet results
    if (posFilter.length > 0) {
      wordnetWords = wordnetWords.filter(w => posFilter.includes(w.partOfSpeech));
    }
    if (topicFilter.length > 0) {
      wordnetWords = wordnetWords.filter(w => topicFilter.includes(w.topic));
    }
    if (wordnetWords.length > 0) {
      return res.json({ words: wordnetWords, source: 'wordnet' });
    }
  }

  // ── Fall back to static word bank ────────────────────────────────────────
  let pool = wordBank[difficulty] || [];

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
  const words = shuffled.slice(0, limit);

  return res.json({ words, source: 'local' });
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
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/api') {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ENV}] Spelling Bee API listening on http://${HOST}:${PORT}`);
  console.log(`[WordBank] Fallback: ${wordBank.easy.length} easy, ${wordBank.medium.length} medium, ${wordBank.hard.length} hard words.`);
  console.log(`[WordNet]  Primary source: ${wordnetGetWords ? 'active' : 'unavailable (using word bank)'}`);
});

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
