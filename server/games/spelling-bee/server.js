import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import textToSpeech from '@google-cloud/text-to-speech';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());

const PORT = Number(process.env.PORT) || 8787;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load hardcoded word bank
const wordBank = JSON.parse(readFileSync(path.join(__dirname, 'data', 'wordBank.json'), 'utf8'));

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

// Google Cloud TTS — lazily initialised on first request
let ttsClient = null;
function getTtsClient() {
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credsPath || credsPath.trim() === '') return null;
  if (!ttsClient) {
    ttsClient = new textToSpeech.TextToSpeechClient();
  }
  return ttsClient;
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
  const words = shuffled.slice(0, limit);

  return res.json({ words, source: 'local' });
});

// ── Google Cloud Text-to-Speech ──────────────────────────────────────────
app.get('/api/tts', async (req, res) => {
  const client = getTtsClient();
  if (!client) {
    return res.status(501).json({ error: 'Google Cloud TTS is not configured. Set GOOGLE_APPLICATION_CREDENTIALS in .env' });
  }

  const text = (req.query.text || '').trim();
  if (!text || text.length > 500) {
    return res.status(400).json({ error: 'Missing or too-long `text` parameter (max 500 chars).' });
  }

  const cached = ttsCache.get(text);
  if (cached) {
    res.set('Content-Type', 'audio/mp3');
    return res.send(cached);
  }

  try {
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: { languageCode: 'en-US', name: 'en-US-Chirp-HD-F' },
      audioConfig: { audioEncoding: 'MP3' },
    });

    const audioBuffer = Buffer.from(response.audioContent);
    ttsCache.set(text, audioBuffer);
    res.set('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[TTS] synthesizeSpeech error:', err.message);
    res.status(502).json({ error: 'TTS synthesis failed.' });
  }
});

// ── SPA fallback: serve index.html for all non-API routes in production ──
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ENV}] Spelling Bee API listening on http://${HOST}:${PORT}`);
  console.log(`[WordBank] Loaded ${wordBank.easy.length} easy, ${wordBank.medium.length} medium, ${wordBank.hard.length} hard words.`);
});

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
