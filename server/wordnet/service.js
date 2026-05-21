/**
 * WordNet SQLite Service
 * 
 * Provides access to Open English WordNet database for vocabulary games.
 * Uses Node.js 24+ built-in node:sqlite module (zero dependencies).
 * 
 * Database: oewn-2025-sqlite-2.3.2.sqlite
 * Tables: words, synsets, senses, poses
 */

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'oewn-2025-sqlite-2.3.2.sqlite');

let db = null;

/**
 * Get or create database connection (singleton)
 * Uses DatabaseSync for synchronous operations (faster for local disk)
 * @returns {DatabaseSync} SQLite database instance
 */
export function getWordNetDB() {
  if (!db) {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
  }
  return db;
}

/**
 * Close database connection (for cleanup)
 */
export function closeWordNetDB() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a query and return all rows
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Array} Query results
 */
function queryAll(sql, params = []) {
  const database = getWordNetDB();
  try {
    const stmt = database.prepare(sql);
    const rows = stmt.all(...params);
    return rows || [];
  } catch (err) {
    console.error('[WordNet] Query error:', err.message, 'SQL:', sql);
    return [];
  }
}

/**
 * Execute a query and return first row
 * @param {string} sql - SQL query
 * @param {Array} params - Query parameters
 * @returns {Object|null} First row or null
 */
function queryOne(sql, params = []) {
  const database = getWordNetDB();
  try {
    const stmt = database.prepare(sql);
    const row = stmt.get(...params);
    return row || null;
  } catch (err) {
    console.error('[WordNet] Query error:', err.message, 'SQL:', sql);
    return null;
  }
}

/**
 * Difficulty configuration based on word frequency (tagcount in senses table)
 * Maps game difficulty levels to WordNet frequency ranges
 */
const DIFFICULTY_RANGES = {
  light:    { min: 15, max: Infinity, label: 'Easy', emoji: '🌱' },
  medium:   { min: 8,  max: 14,       label: 'Medium', emoji: '🌿' },
  hard:     { min: 3,  max: 7,        label: 'Hard', emoji: '🌲' },
  devilish: { min: 0,  max: 2,        label: 'Expert', emoji: '🔥' }
};

/**
 * Get random words by difficulty
 * @param {string} difficulty - 'light', 'medium', 'hard', 'devilish'
 * @param {number} count - Number of words to return (default: 10)
 * @returns {Array} Array of word objects with word, definition, partOfSpeech, topic
 */
export function getWordsByDifficulty(difficulty, count = 10) {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;
  
  const sql = `
    SELECT DISTINCT w.word, sy.definition, p.pos as partOfSpeech, d.domainname as topic, se.tagcount as freq
    FROM words w
    JOIN senses se ON w.wordid = se.wordid
    JOIN synsets sy ON se.synsetid = sy.synsetid
    JOIN poses p ON sy.posid = p.posid
    LEFT JOIN domains d ON sy.domainid = d.domainid
    WHERE se.tagcount BETWEEN ? AND ?
      AND length(w.word) BETWEEN 4 AND 20
      AND w.word NOT LIKE '% %'
      AND w.word NOT LIKE '%-%'
      AND w.word = lower(w.word)
      AND w.word GLOB '[a-z]*'
      AND (w.word LIKE '%a%' OR w.word LIKE '%e%' OR w.word LIKE '%i%'
           OR w.word LIKE '%o%' OR w.word LIKE '%u%')
      AND sy.definition IS NOT NULL
      AND length(sy.definition) > 10
      AND length(sy.definition) < 200
    ORDER BY RANDOM()
    LIMIT ?
  `;
  
  const maxFreq = range.max === Infinity ? 999999 : range.max;
  return queryAll(sql, [range.min, maxFreq, count]);
}

/**
 * Get a single word with its definition
 * @param {string} word - The word to look up
 * @returns {Object|null} Word data or null if not found
 */
export function getWordData(word) {
  const sql = `
    SELECT w.word, sy.definition, p.pos as partOfSpeech, d.domainname as topic, se.tagcount as freq
    FROM words w
    JOIN senses se ON w.wordid = se.wordid
    JOIN synsets sy ON se.synsetid = sy.synsetid
    JOIN poses p ON sy.posid = p.posid
    LEFT JOIN domains d ON sy.domainid = d.domainid
    WHERE w.word = ?
      AND sy.definition IS NOT NULL
    ORDER BY se.tagcount DESC
    LIMIT 1
  `;
  
  return queryOne(sql, [word.toLowerCase()]);
}

/**
 * Check if a word exists in the database
 * @param {string} word - Word to check
 * @returns {boolean} True if word exists
 */
export function isValidWord(word) {
  const sql = 'SELECT 1 FROM words WHERE word = ? LIMIT 1';
  const result = queryOne(sql, [word.toLowerCase()]);
  return !!result;
}

/**
 * Get distractor definitions for multiple-choice questions
 * Returns wrong definitions from words of similar difficulty
 * @param {string} correctWord - The correct answer (excluded from distractors)
 * @param {string} difficulty - Difficulty level
 * @param {number} count - Number of distractors (default: 3)
 * @returns {Array} Array of wrong definitions
 */
export function getDistractors(correctWord, difficulty, count = 3) {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;
  
  const sql = `
    SELECT DISTINCT sy.definition, w.word as sourceWord
    FROM words w
    JOIN senses se ON w.wordid = se.wordid
    JOIN synsets sy ON se.synsetid = sy.synsetid
    WHERE se.tagcount BETWEEN ? AND ?
      AND w.word != ?
      AND sy.definition IS NOT NULL
      AND length(sy.definition) > 10
      AND length(sy.definition) < 200
    ORDER BY RANDOM()
    LIMIT ?
  `;
  
  const maxFreq = range.max === Infinity ? 999999 : range.max;
  return queryAll(sql, [range.min, maxFreq, correctWord.toLowerCase(), count]);
}

/**
 * Generate complete quiz questions with word, correct definition, and distractors
 * @param {string} difficulty - Difficulty level
 * @param {number} count - Number of questions
 * @returns {Array} Quiz-ready questions
 */
export function generateQuizQuestions(difficulty, count = 10) {
  const words = getWordsByDifficulty(difficulty, count);
  
  const questions = [];
  for (const wordData of words) {
    // Get 3 distractors for this word
    const distractors = getDistractors(wordData.word, difficulty, 3);
    
    // Combine correct answer with distractors and shuffle
    const options = [
      { definition: wordData.definition, correct: true },
      ...distractors.map(d => ({ definition: d.definition, correct: false }))
    ];
    
    // Shuffle options
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    
    // Find correct index after shuffle
    const correctIndex = options.findIndex(o => o.correct);
    
    questions.push({
      word: wordData.word,
      partOfSpeech: wordData.partOfSpeech,
      correctDefinition: wordData.definition,
      correctIndex,
      options: options.map(o => o.definition),
      topic: wordData.topic?.split('.')[0] || 'general'
    });
  }
  
  return questions;
}

/**
 * Get difficulty metadata
 * @returns {Object} Difficulty configuration
 */
export function getDifficultyConfig() {
  return DIFFICULTY_RANGES;
}

/**
 * Get database stats
 * @returns {Object} Word counts and info
 */
export function getStats() {
  const totalWords = queryOne('SELECT COUNT(DISTINCT word) as count FROM words');
  const totalSynsets = queryOne('SELECT COUNT(*) as count FROM synsets');
  const totalWithFreq = queryOne('SELECT COUNT(DISTINCT w.word) as count FROM words w JOIN senses s ON w.wordid = s.wordid WHERE s.tagcount IS NOT NULL');
  
  const byDifficulty = {};
  for (const [key, range] of Object.entries(DIFFICULTY_RANGES)) {
    const maxFreq = range.max === Infinity ? 999999 : range.max;
    const count = queryOne(`
      SELECT COUNT(DISTINCT w.word) as count 
      FROM words w
      JOIN senses s ON w.wordid = s.wordid
      WHERE s.tagcount BETWEEN ? AND ?
    `, [range.min, maxFreq]);
    byDifficulty[key] = count?.count || 0;
  }
  
  return {
    totalWords: totalWords?.count || 0,
    totalSynsets: totalSynsets?.count || 0,
    wordsWithFrequency: totalWithFreq?.count || 0,
    byDifficulty,
    databasePath: DB_PATH
  };
}

export default {
  getWordNetDB,
  closeWordNetDB,
  getWordsByDifficulty,
  getWordData,
  isValidWord,
  getDistractors,
  generateQuizQuestions,
  getDifficultyConfig,
  getStats
};
