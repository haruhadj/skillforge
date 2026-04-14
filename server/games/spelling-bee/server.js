import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';
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
const WORDSAPI_KEY = process.env.WORDSAPI_KEY;
const WORDSAPI_HOST = process.env.WORDSAPI_HOST || 'wordsapiv1.p.rapidapi.com';

const ttsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// ── Word pool: pre-fetched words per difficulty, served from memory ─────
// Zipf frequency scores (1-7): higher = more common in everyday language
// letterPattern ensures single lowercase words only (no phrases/hyphens)
const DIFFICULTY_CONFIG = {
  easy: {
    frequencyMin: 5.0,
    frequencyMax: 7.0,
    letterPattern: '^[a-z]{4,6}$',   // 4-6 letter common words
  },
  medium: {
    frequencyMin: 3.5,
    frequencyMax: 4.9,
    letterPattern: '^[a-z]{6,9}$',   // 6-9 letter moderate words
  },
  hard: {
    frequencyMin: 1.0,
    frequencyMax: 3.4,
    letterPattern: '^[a-z]{8,}$',    // 8+ letter rare/challenging words
  },
};
const POOL_TARGET = 20;          // words to keep in each pool (conserve API credits)
const POOL_REFILL_THRESHOLD = 8; // trigger refill when pool drops below this
const POOL_FETCH_DELAY_MS = 400;  // delay between WordsAPI calls (free-tier: 2500/day)

const wordPools = { easy: [], medium: [], hard: [] };
let poolRefilling = { easy: false, medium: false, hard: false };

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fillPool(difficulty) {
  if (!WORDSAPI_KEY) return;
  if (poolRefilling[difficulty]) return;
  poolRefilling[difficulty] = true;

  const cfg = DIFFICULTY_CONFIG[difficulty];
  let failures = 0;
  const maxConsecutiveFailures = 8;
  let apiCalls = 0;

  // eslint-disable-next-line no-console
  console.log(`[WordPool] Refilling "${difficulty}" pool (current: ${wordPools[difficulty].length}, target: ${POOL_TARGET})`);

  while (wordPools[difficulty].length < POOL_TARGET && failures < maxConsecutiveFailures) {
    try {
      const url = new URL(`https://${WORDSAPI_HOST}/words/`);
      url.searchParams.set('frequencyMin', String(cfg.frequencyMin));
      url.searchParams.set('frequencyMax', String(cfg.frequencyMax));
      url.searchParams.set('letterPattern', cfg.letterPattern);
      url.searchParams.set('hasDetails', 'definitions');
      url.searchParams.set('random', 'true');
      apiCalls++;

      const apiRes = await fetch(url, {
        headers: { 'x-rapidapi-key': WORDSAPI_KEY, 'x-rapidapi-host': WORDSAPI_HOST }
      });

      if (!apiRes.ok) {
        // eslint-disable-next-line no-console
        console.warn(`[WordPool] API ${apiRes.status} for "${difficulty}" (attempt ${apiCalls})`);
        failures++;
        await delay(POOL_FETCH_DELAY_MS);
        continue;
      }

      const data = await apiRes.json();
      const w = data?.word;

      // Double-check: single lowercase word only (no spaces, hyphens, numbers)
      if (!w || !/^[a-z]+$/.test(w)) { await delay(POOL_FETCH_DELAY_MS); continue; }
      // Skip duplicates already in pool
      if (wordPools[difficulty].some(d => d.word === w)) { await delay(POOL_FETCH_DELAY_MS); continue; }

      // Must have at least one definition (so we can provide hints)
      const defs = data?.results;
      if (!Array.isArray(defs) || defs.length === 0) { await delay(POOL_FETCH_DELAY_MS); continue; }

      // Pick the best definition (prefer one with an example sentence)
      const bestDef = defs.find(d => d.definition && d.examples?.length > 0) || defs[0];

      wordPools[difficulty].push({
        word: w,
        definition: bestDef.definition ?? 'Definition not found.',
        partOfSpeech: bestDef.partOfSpeech ?? 'noun',
        example: bestDef.examples?.[0] ?? null,
      });
      failures = 0; // reset on success
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[WordPool] Fetch error for "${difficulty}":`, err.message);
      failures++;
    }
    await delay(POOL_FETCH_DELAY_MS);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[WordPool] "${difficulty}" pool now has ${wordPools[difficulty].length} words (${apiCalls} API calls, ${failures} consecutive failures)`
  );
  poolRefilling[difficulty] = false;
}

// Google Cloud TTS — lazily initialised on first request
// Requires GOOGLE_APPLICATION_CREDENTIALS env var pointing to a service-account JSON key
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
const distPath = path.join(__dirname, '..', 'dist');
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

  const pool = wordPools[difficulty];

  // Get candidates (filtered by partOfSpeech if specified)
  const candidates = posFilter.length > 0
    ? pool.filter(w => posFilter.includes(w.partOfSpeech))
    : pool;

  if (candidates.length >= limit) {
    // Shuffle candidates and pick requested amount
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const words = shuffled.slice(0, limit);
    // Remove served words from the main pool
    const served = new Set(words.map(w => w.word));
    wordPools[difficulty] = pool.filter(w => !served.has(w.word));
    if (wordPools[difficulty].length < POOL_REFILL_THRESHOLD) {
      fillPool(difficulty);
    }
    return res.json({ words, source: 'pool' });
  }

  // Pool doesn't have enough — try to fill synchronously for this request
  if (WORDSAPI_KEY && !poolRefilling[difficulty]) {
    await fillPool(difficulty);
  }

  // Retry after fill
  const retryPool = wordPools[difficulty];
  const retryCandidates = posFilter.length > 0
    ? retryPool.filter(w => posFilter.includes(w.partOfSpeech))
    : retryPool;

  if (retryCandidates.length > 0) {
    const shuffled = [...retryCandidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const words = shuffled.slice(0, limit);
    const served = new Set(words.map(w => w.word));
    wordPools[difficulty] = retryPool.filter(w => !served.has(w.word));
    if (wordPools[difficulty].length < POOL_REFILL_THRESHOLD) fillPool(difficulty);
    return res.json({ words, source: words.length >= limit ? 'pool' : 'partial' });
  }

  // Not enough from API — return empty (client will fill from fallback)
  if (retryPool.length < POOL_REFILL_THRESHOLD) fillPool(difficulty);
  return res.json({ words: [], source: 'empty' });
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
  app.get('*path', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[${NODE_ENV}] Server listening on http://${HOST}:${PORT}`);
  // Pre-warm word pools on startup (non-blocking)
  if (WORDSAPI_KEY) {
    // eslint-disable-next-line no-console
    console.log('[WordPool] Pre-warming pools in background…');
    fillPool('easy');
    setTimeout(() => fillPool('medium'), 2000);
    setTimeout(() => fillPool('hard'), 4000);
  }
});

function clampInt(v, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

