/**
 * Hamaru (ハマル) Game Server
 *
 * REST API serving Japanese vocabulary for the Hamaru minigames, backed by the
 * jmdict-simplified "common" dictionary (see jmdict-service.js). No API keys —
 * fully offline and deterministic.
 *
 * Endpoints:
 *   GET /api/hamaru/health                       - Health check
 *   GET /api/hamaru/stats                         - Dictionary statistics
 *   GET /api/hamaru/words?level=&count=&maxMora=  - Word Forge cards (kana blocks)
 *   GET /api/hamaru/quiz?level=&count=&reverse=   - Multiple-choice translation quiz
 *   GET /api/hamaru/cards?category=&level=&count= - Learning Hub study cards
 *   GET /api/hamaru/memory-pairs?level=&count=    - Card Match pairs
 *   GET /api/hamaru/word/:term                    - Single-word lookup
 *
 * Port: 8789
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import * as dict from './jmdict-service.js';

const app = express();

const PORT = Number(process.env.HAMARU_PORT) || 8789;
const HOST = process.env.HAMARU_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

app.disable('x-powered-by');

if (NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS — same-origin in prod (served via nginx /api/hamaru/), permissive in dev.
app.use(
  cors({
    origin:
      NODE_ENV === 'production'
        ? [
            // Keep in sync with the sibling game servers (chess/tictactoe/chroma/
            // vocab) which all allow the duckdns prod origin too (audit H3).
            'https://skillforge.haruhadj.org',
            'https://skillforge.haruhadj.duckdns.org',
          ]
        : [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:4173',
            'http://127.0.0.1:5173',
          ],
    credentials: true,
  }),
);

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

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api', apiLimiter);
app.use(express.json({ limit: '16kb' }));

// ── Validation helpers ──────────────────────────────────────────────────────

const clampLevel = (v) => Math.min(5, Math.max(1, parseInt(v || '1', 10) || 1));
const clampCount = (v, def, max) =>
  Math.min(max, Math.max(1, parseInt(v || String(def), 10) || def));

// ── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/hamaru/health', (req, res) => {
  res.json({ ok: true, service: 'hamaru', timestamp: new Date().toISOString() });
});

app.get('/api/hamaru/stats', (req, res) => {
  try {
    res.json({ success: true, stats: dict.getStats() });
  } catch (err) {
    console.error('[Hamaru] Stats error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve statistics' });
  }
});

app.get('/api/hamaru/words', (req, res) => {
  try {
    const level = clampLevel(req.query.level);
    const count = clampCount(req.query.count, 10, 30);
    const maxMora = Math.min(8, Math.max(2, parseInt(req.query.maxMora || '6', 10) || 6));
    const words = dict.getWords({ level, count, maxMora });
    if (words.length === 0) {
      return res.status(500).json({ success: false, error: 'No words available' });
    }
    res.json({ success: true, level, count: words.length, words });
  } catch (err) {
    console.error('[Hamaru] Words error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate words' });
  }
});

app.get('/api/hamaru/quiz', (req, res) => {
  try {
    const level = clampLevel(req.query.level);
    const count = clampCount(req.query.count, 10, 30);
    const reverse = req.query.reverse === 'true' || req.query.reverse === '1';
    const questions = dict.getQuiz({ level, count, reverse });
    if (questions.length === 0) {
      return res.status(500).json({ success: false, error: 'No questions available' });
    }
    res.json({ success: true, level, reverse, count: questions.length, questions });
  } catch (err) {
    console.error('[Hamaru] Quiz error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate quiz' });
  }
});

app.get('/api/hamaru/cards', (req, res) => {
  try {
    const category = req.query.category === 'kanji' ? 'kanji' : 'vocab';
    const level = clampLevel(req.query.level);
    const count = clampCount(req.query.count, 12, 30);
    const words = dict.getStudyCards({ category, level, count });
    if (words.length === 0) {
      return res.status(500).json({ success: false, error: 'No cards available' });
    }
    res.json({ success: true, category, level, count: words.length, words });
  } catch (err) {
    console.error('[Hamaru] Cards error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate cards' });
  }
});

app.get('/api/hamaru/memory-pairs', (req, res) => {
  try {
    const level = clampLevel(req.query.level);
    const count = clampCount(req.query.count, 6, 12);
    const pairs = dict.getMemoryPairs({ level, count });
    if (pairs.length === 0) {
      return res.status(500).json({ success: false, error: 'No pairs available' });
    }
    res.json({ success: true, level, count: pairs.length, pairs });
  } catch (err) {
    console.error('[Hamaru] Memory pairs error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate pairs' });
  }
});

app.get('/api/hamaru/word/:term', (req, res) => {
  try {
    const term = (req.params.term || '').trim();
    if (!term) {
      return res.status(400).json({ success: false, error: 'Invalid term parameter' });
    }
    const word = dict.lookup(term);
    if (!word) {
      return res.status(404).json({ success: false, error: 'Word not found' });
    }
    res.json({ success: true, word });
  } catch (err) {
    console.error('[Hamaru] Lookup error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to look up word' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available: [
      'GET /api/hamaru/health',
      'GET /api/hamaru/stats',
      'GET /api/hamaru/words?level=&count=&maxMora=',
      'GET /api/hamaru/quiz?level=&count=&reverse=',
      'GET /api/hamaru/cards?category=&level=&count=',
      'GET /api/hamaru/memory-pairs?level=&count=',
      'GET /api/hamaru/word/:term',
    ],
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Hamaru] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`[${NODE_ENV}] Hamaru API listening on http://${HOST}:${PORT}`);
  try {
    const stats = dict.getStats();
    console.log(`[Hamaru] Dictionary v${stats.version} loaded: ${stats.totalCards.toLocaleString()} cards`);
    console.log('[Hamaru] By level:', stats.byLevel);
  } catch (err) {
    console.error('[Hamaru] Failed to load dictionary:', err.message);
  }
});
