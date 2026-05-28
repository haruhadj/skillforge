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

/**
 * Get synonyms for a word (words in the same synset)
 * @param {string} word - The word to find synonyms for
 * @param {number} limit - Maximum number of synonyms to return
 * @returns {Array} Array of synonym word objects
 */
export function getSynonyms(word, limit = 5) {
  const sql = `
    SELECT DISTINCT w2.word, sy.definition, p.pos as partOfSpeech, se.tagcount as freq
    FROM words w1
    JOIN senses se1 ON w1.wordid = se1.wordid
    JOIN synsets sy ON se1.synsetid = sy.synsetid
    JOIN senses se2 ON sy.synsetid = se2.synsetid
    JOIN words w2 ON se2.wordid = w2.wordid
    JOIN poses p ON sy.posid = p.posid
    WHERE w1.word = ?
      AND w2.word != w1.word
      AND length(w2.word) BETWEEN 3 AND 20
      AND w2.word NOT LIKE '% %'
      AND w2.word NOT LIKE '%-%'
    ORDER BY se.tagcount DESC
    LIMIT ?
  `;
  
  return queryAll(sql, [word.toLowerCase(), limit]);
}

/**
 * Get antonyms for a word (words in synsets connected by antonym relation)
 * @param {string} word - The word to find antonyms for
 * @param {number} limit - Maximum number of antonyms to return
 * @returns {Array} Array of antonym word objects
 */
export function getAntonyms(word, limit = 5) {
  // relationid 30 is antonym in the semrelations table
  const sql = `
    SELECT DISTINCT w2.word, sy2.definition, p.pos as partOfSpeech, se2.tagcount as freq
    FROM words w1
    JOIN senses se1 ON w1.wordid = se1.wordid
    JOIN synsets sy1 ON se1.synsetid = sy1.synsetid
    JOIN semrelations sr ON (sr.synset1id = sy1.synsetid OR sr.synset2id = sy1.synsetid)
    JOIN synsets sy2 ON (sy2.synsetid = CASE 
      WHEN sr.synset1id = sy1.synsetid THEN sr.synset2id 
      ELSE sr.synset1id 
    END)
    JOIN senses se2 ON sy2.synsetid = se2.synsetid
    JOIN words w2 ON se2.wordid = w2.wordid
    JOIN poses p ON sy2.posid = p.posid
    WHERE w1.word = ?
      AND w2.word != w1.word
      AND sr.relationid = 30
      AND length(w2.word) BETWEEN 3 AND 20
      AND w2.word NOT LIKE '% %'
      AND w2.word NOT LIKE '%-%'
    ORDER BY se2.tagcount DESC
    LIMIT ?
  `;
  
  return queryAll(sql, [word.toLowerCase(), limit]);
}

/**
 * Generate word pairs for Synonym Showdown game
 * Creates pairs of words that are either synonyms or different (antonyms or unrelated)
 * @param {string} difficulty - 'light', 'medium', 'hard', 'devilish'
 * @param {number} count - Number of pairs to generate
 * @returns {Array} Array of word pair objects
 */
export function generateWordPairs(difficulty, count = 20) {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.medium;
  const maxFreq = range.max === Infinity ? 999999 : range.max;
  
  const pairs = [];
  const usedWords = new Set();
  
  // Get base words
  const baseWords = queryAll(`
    SELECT DISTINCT w.word, sy.definition, p.pos as partOfSpeech, se.tagcount as freq
    FROM words w
    JOIN senses se ON w.wordid = se.wordid
    JOIN synsets sy ON se.synsetid = sy.synsetid
    JOIN poses p ON sy.posid = p.posid
    WHERE se.tagcount BETWEEN ? AND ?
      AND length(w.word) BETWEEN 4 AND 12
      AND w.word NOT LIKE '% %'
      AND w.word NOT LIKE '%-%'
      AND w.word = lower(w.word)
      AND sy.definition IS NOT NULL
      AND length(sy.definition) > 10
      AND length(sy.definition) < 200
    ORDER BY RANDOM()
    LIMIT ?
  `, [range.min, maxFreq, count * 2]);
  
  for (const baseWord of baseWords) {
    if (pairs.length >= count) break;
    if (usedWords.has(baseWord.word)) continue;
    
    // Try to find a synonym first
    const synonyms = getSynonyms(baseWord.word, 3);
    const validSynonyms = synonyms.filter(s => !usedWords.has(s.word) && s.word !== baseWord.word);
    
    if (validSynonyms.length > 0 && Math.random() < 0.5) {
      // Create a synonym pair
      const synonym = validSynonyms[0];
      pairs.push({
        id: `${baseWord.word}_${synonym.word}_${Date.now()}`,
        word1: baseWord.word,
        word2: synonym.word,
        relation: 'same',
        description: `Both mean: ${baseWord.definition}`,
        difficulty: difficulty === 'light' ? 'easy' : difficulty === 'medium' ? 'medium' : 'hard',
        partOfSpeech: baseWord.partOfSpeech || 'noun'
      });
      usedWords.add(baseWord.word);
      usedWords.add(synonym.word);
    } else {
      // Try to find an antonym
      const antonyms = getAntonyms(baseWord.word, 3);
      const validAntonyms = antonyms.filter(a => !usedWords.has(a.word) && a.word !== baseWord.word);
      
      if (validAntonyms.length > 0) {
        // Create an antonym pair (different)
        const antonym = validAntonyms[0];
        pairs.push({
          id: `${baseWord.word}_${antonym.word}_${Date.now()}`,
          word1: baseWord.word,
          word2: antonym.word,
          relation: 'different',
          description: `Opposites: ${baseWord.word} means "${baseWord.definition}" while ${antonym.word} means "${antonym.definition}"`,
          difficulty: difficulty === 'light' ? 'easy' : difficulty === 'medium' ? 'medium' : 'hard',
          partOfSpeech: baseWord.partOfSpeech || 'noun'
        });
        usedWords.add(baseWord.word);
        usedWords.add(antonym.word);
      } else {
        // Create a random different pair with another word from the list
        const otherWords = baseWords.filter(w => 
          w.word !== baseWord.word && !usedWords.has(w.word)
        );
        if (otherWords.length > 0) {
          const other = otherWords[Math.floor(Math.random() * otherWords.length)];
          pairs.push({
            id: `${baseWord.word}_${other.word}_${Date.now()}`,
            word1: baseWord.word,
            word2: other.word,
            relation: 'different',
            description: `Different meanings: ${baseWord.word} = "${baseWord.definition}" vs ${other.word} = "${other.definition}"`,
            difficulty: difficulty === 'light' ? 'easy' : difficulty === 'medium' ? 'medium' : 'hard',
            partOfSpeech: baseWord.partOfSpeech || 'noun'
          });
          usedWords.add(baseWord.word);
          usedWords.add(other.word);
        }
      }
    }
  }
  
  return pairs;
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
  getStats,
  getSynonyms,
  getAntonyms,
  generateWordPairs
};
