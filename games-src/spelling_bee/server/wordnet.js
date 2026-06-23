/**
 * WordNet SQLite Service for Spelling Bee
 * 
 * Provides access to Open English WordNet database.
 * Uses Node.js 24+ built-in node:sqlite module.
 * 
 * Database: oewn-2025-sqlite-2.3.2.sqlite
 */

import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Path to WordNet database (relative to SkillForge server location)
const DB_PATH = path.join(__dirname, '..', '..', '..', 'server', 'wordnet', 'oewn-2025-sqlite-2.3.2.sqlite');

let db = null;

/**
 * Get or create database connection (singleton)
 * @returns {DatabaseSync} SQLite database instance
 */
export function getWordNetDB() {
  if (!db) {
    db = new DatabaseSync(DB_PATH, { readOnly: true });
  }
  return db;
}

/**
 * Close database connection
 */
export function closeWordNetDB() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Execute a query and return all rows
 */
function queryAll(sql, params = []) {
  const database = getWordNetDB();
  try {
    const stmt = database.prepare(sql);
    const rows = stmt.all(...params);
    return rows || [];
  } catch (err) {
    console.error('[WordNet] Query error:', err.message);
    return [];
  }
}

/**
 * Spelling Bee difficulty mapping (uses tagcount ranges)
 * Maps to WordNet frequency data
 */
const DIFFICULTY_RANGES = {
  easy:   { min: 15, max: Infinity, minLen: 3 },
  medium: { min: 6,  max: 14,       minLen: 5 },
  hard:   { min: 2,  max: 7,        minLen: 8 },
};

/**
 * Get random words by difficulty for Spelling Bee
 * Includes example sentences from WordNet samples table if available
 * @param {string} difficulty - 'easy', 'medium', 'hard'
 * @param {number} count - Number of words
 * @param {Array} posFilter - Optional part of speech filter
 * @returns {Array} Word objects with word, definition, partOfSpeech, topic, example
 */
export function getWordsByDifficulty(difficulty, count = 10, posFilter = []) {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;
  
  // Build the base query
  let sql = `
    SELECT DISTINCT 
      w.word, 
      sy.definition, 
      p.pos as partOfSpeech, 
      d.domainname as topic,
      se.tagcount as freq
    FROM words w
    JOIN senses se ON w.wordid = se.wordid
    JOIN synsets sy ON se.synsetid = sy.synsetid
    JOIN poses p ON sy.posid = p.posid
    LEFT JOIN domains d ON sy.domainid = d.domainid
    WHERE se.tagcount BETWEEN ? AND ?
      AND length(w.word) BETWEEN ? AND 20
      AND w.word NOT LIKE '% %'
      AND w.word NOT LIKE '%-%'
      AND w.word = lower(w.word)
      AND sy.definition IS NOT NULL
      AND length(sy.definition) > 10
      AND length(sy.definition) < 200
  `;

  const params = [range.min, range.max === Infinity ? 999999 : range.max, range.minLen ?? 3];
  
  // Add part of speech filter if provided
  if (posFilter && posFilter.length > 0) {
    const posMap = {
      'noun': 'n',
      'verb': 'v', 
      'adjective': 'a',
      'adverb': 'r'
    };
    const posIds = posFilter.map(pos => posMap[pos]).filter(Boolean);
    if (posIds.length > 0) {
      sql += ` AND p.posid IN (${posIds.map(() => '?').join(',')})`;
      params.push(...posIds);
    }
  }
  
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(count);
  
  const words = queryAll(sql, params);
  
  // Add example sentences for each word
  return words.map(w => ({
    ...w,
    example: generateExample(w.word, w.definition)
  }));
}

/**
 * Generate a simple example sentence for a word
 * Since WordNet samples table may not have simple examples,
 * we create a contextual example
 */
function generateExample(word, definition) {
  // Try to create a simple example based on part of speech
  const examples = {
    noun: `The ${word} is an important part of our daily life.`,
    verb: `I like to ${word} whenever I have the chance.`,
    adjective: `The ${word} weather made everyone happy.`,
    adverb: `She spoke ${word} to everyone she met.`
  };
  
  // Return appropriate example or default
  return examples[word.partOfSpeech] || `This is a ${word}.`;
}

/**
 * Check if WordNet database is available
 * @returns {boolean}
 */
export function isWordNetAvailable() {
  try {
    const test = queryAll('SELECT 1 as test FROM words LIMIT 1');
    return test.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get WordNet stats
 * @returns {Object}
 */
export function getStats() {
  const totalWords = queryAll('SELECT COUNT(*) as count FROM words')[0]?.count || 0;
  const byDifficulty = {};
  
  for (const [key, range] of Object.entries(DIFFICULTY_RANGES)) {
    const count = queryAll(`
      SELECT COUNT(DISTINCT w.word) as count 
      FROM words w
      JOIN senses s ON w.wordid = s.wordid
      WHERE s.tagcount BETWEEN ? AND ?
    `, [range.min, range.max === Infinity ? 999999 : range.max])[0]?.count || 0;
    byDifficulty[key] = count;
  }
  
  return { totalWords, byDifficulty };
}

export default {
  getWordNetDB,
  closeWordNetDB,
  getWordsByDifficulty,
  isWordNetAvailable,
  getStats
};
