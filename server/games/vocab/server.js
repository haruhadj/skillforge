/**
 * Vocabulary Game Server
 * 
 * Provides REST API for "How Strong Is Your Vocab" game using WordNet.
 * Replaces external WordsAPI dependency.
 * 
 * Endpoints:
 *   GET /api/vocab/health           - Health check
 *   GET /api/vocab/stats            - Database statistics
 *   GET /api/vocab/words            - Get quiz questions with distractors
 *   GET /api/vocab/word/:word       - Get single word data
 *   GET /api/vocab/difficulties     - Get difficulty configuration
 * 
 * Port: 8788
 */

import 'dotenv/config';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Import WordNet service from parent directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wordnetPath = pathToFileURL(path.join(__dirname, '..', '..', 'wordnet', 'service.js')).href;
const { 
  generateQuizQuestions, 
  getWordData, 
  getStats, 
  getDifficultyConfig,
  isValidWord,
  generateWordPairs
} = await import(wordnetPath);

const app = express();

// CORS — restrict to the app's own origins, kept in sync with the sibling REST
// servers (hamaru/spelling-bee). The game is served same-origin via the nginx
// /api/ proxy, so this is config hygiene rather than the live boundary.
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://skillforge.haruhadj.org', 'https://skillforge.haruhadj.duckdns.org', 'https://haruhadj.github.io']
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
  credentials: true
}));

const PORT = Number(process.env.VOCAB_PORT) || 8788;
const HOST = process.env.VOCAB_HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

app.disable('x-powered-by');

// Trust proxy in production
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

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

app.use('/api', apiLimiter);

// Stricter bucket for the query-amplifying endpoints. Each /words or /wordpairs
// request fans out into dozens of ORDER BY RANDOM() full-scan joins over a large
// SQLite DB on the synchronous event-loop thread, so the flat 120/min budget is
// too generous for them. Mirrors the dedicated TTS limiter in spelling-bee.
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 20, // 20 heavy requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});

app.use('/api/vocab/words', heavyLimiter);
app.use('/api/vocab/wordpairs', heavyLimiter);

app.use(express.json({ limit: '16kb' }));

// ── Routes ───────────────────────────────────────────────────────────────

// Health check
app.get('/api/vocab/health', (req, res) => {
  res.json({ 
    ok: true, 
    service: 'vocab',
    timestamp: new Date().toISOString()
  });
});

// Database statistics
app.get('/api/vocab/stats', (req, res) => {
  try {
    const stats = getStats();
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('[Vocab] Stats error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve database statistics' 
    });
  }
});

// Difficulty configuration
app.get('/api/vocab/difficulties', (req, res) => {
  try {
    const config = getDifficultyConfig();
    res.json({
      success: true,
      difficulties: config
    });
  } catch (err) {
    console.error('[Vocab] Difficulties error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve difficulty configuration' 
    });
  }
});

// Get quiz questions
app.get('/api/vocab/words', (req, res) => {
  try {
    // Validate difficulty
    const validDifficulties = ['light', 'medium', 'hard', 'devilish'];
    const difficulty = validDifficulties.includes(req.query.difficulty)
      ? req.query.difficulty
      : 'medium';
    
    // Validate count (1-15) — caps the per-request ORDER BY RANDOM() fan-out
    const count = Math.min(15, Math.max(1, parseInt(req.query.count || '10', 10)));
    
    const questions = generateQuizQuestions(difficulty, count);
    
    if (questions.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No questions available'
      });
    }
    
    res.json({
      success: true,
      difficulty,
      count: questions.length,
      questions
    });
  } catch (err) {
    console.error('[Vocab] Words error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate questions'
    });
  }
});

// Get single word data
app.get('/api/vocab/word/:word', (req, res) => {
  try {
    const word = req.params.word?.toLowerCase().trim();
    if (!word || word.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Invalid word parameter'
      });
    }
    
    const data = getWordData(word);
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Word not found'
      });
    }
    
    res.json({
      success: true,
      word: data
    });
  } catch (err) {
    console.error('[Vocab] Word lookup error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to look up word'
    });
  }
});

// Validate word exists
app.get('/api/vocab/validate/:word', (req, res) => {
  try {
    const word = req.params.word?.toLowerCase().trim();
    if (!word) {
      return res.status(400).json({
        success: false,
        error: 'Invalid word parameter'
      });
    }
    
    const valid = isValidWord(word);
    
    res.json({
      success: true,
      word,
      valid
    });
  } catch (err) {
    console.error('[Vocab] Validation error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to validate word'
    });
  }
});

// Get word pairs for Synonym Showdown game
app.get('/api/vocab/wordpairs', (req, res) => {
  try {
    // Validate difficulty
    const validDifficulties = ['light', 'medium', 'hard', 'devilish'];
    const difficulty = validDifficulties.includes(req.query.difficulty)
      ? req.query.difficulty
      : 'medium';
    
    // Validate count (5-30) — caps the per-request ORDER BY RANDOM() fan-out
    const count = Math.min(30, Math.max(5, parseInt(req.query.count || '20', 10)));
    
    const pairs = generateWordPairs(difficulty, count);
    
    if (pairs.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'No word pairs available'
      });
    }
    
    res.json({
      success: true,
      difficulty,
      count: pairs.length,
      pairs
    });
  } catch (err) {
    console.error('[Vocab] Word pairs error:', err.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate word pairs'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    available: [
      'GET /api/vocab/health',
      'GET /api/vocab/stats',
      'GET /api/vocab/difficulties',
      'GET /api/vocab/words?difficulty=&count=',
      'GET /api/vocab/word/:word',
      'GET /api/vocab/validate/:word',
      'GET /api/vocab/wordpairs?difficulty=&count='
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Vocab] Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    error: NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`[${NODE_ENV}] Vocab API listening on http://${HOST}:${PORT}`);
  console.log(`[WordNet] Database loaded`);
  
  // Log stats on startup
  try {
    const stats = getStats();
    console.log(`[WordNet] Total words: ${stats.totalWords.toLocaleString()}`);
    console.log(`[WordNet] By difficulty:`, stats.byDifficulty);
  } catch (err) {
    console.error('[WordNet] Failed to load stats:', err.message);
  }
});
