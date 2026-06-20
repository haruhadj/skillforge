/**
 * Hamaru JMdict service
 *
 * Wraps the jmdict-simplified "common" dictionary (a ~16 MB JSON, 22k entries)
 * and turns it into game-ready content for the Hamaru (ハマル) minigames:
 *   - Word Forge      → words decomposed into kana mora "blocks"
 *   - Boss Battle      → multiple-choice translation quizzes
 *   - Bubble Pop       → multiple-choice translation quizzes
 *   - Elemental Match  → japanese ⇄ english/romaji pairs
 *
 * The JSON is loaded once at boot and indexed in memory. No external services,
 * no API keys — fully deterministic and offline.
 *
 * Data shape (jmdict-simplified):
 *   words[].kanji[]  = { common, text, tags }
 *   words[].kana[]   = { common, text, tags }
 *   words[].sense[]  = { partOfSpeech[], gloss[].text, misc[], field[] }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH =
  process.env.HAMARU_DB_PATH ||
  path.join(__dirname, 'data', 'jmdict-eng-common-3.6.2.json');

// ── Kana tables ────────────────────────────────────────────────────────────

// Base hiragana → Hepburn romaji. Katakana is normalised to hiragana first.
const BASE = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'o', ん: 'n',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa', ゔ: 'vu',
};

// Two-kana combinations (youon + common foreign-sound clusters).
const YOUON = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo',
  うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo',
};

const SMALL_FOLLOWERS = new Set([
  'ゃ', 'ゅ', 'ょ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'ゎ',
  'ャ', 'ュ', 'ョ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ヮ',
]);

const HIRAGANA_RE = /^[ぁ-ゟ]+$/;

/** Convert any katakana in a string to hiragana (leaves ー and others alone). */
function katakanaToHiragana(s) {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0);
    // Katakana block U+30A1–U+30F6 → hiragana (−0x60). Skip ー (U+30FC) etc.
    if (code >= 0x30a1 && code <= 0x30f6) {
      out += String.fromCodePoint(code - 0x60);
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Split a kana reading into mora units (Word Forge "blocks").
 * Combines a base kana with a trailing small kana (きゃ), keeps っ and ー as
 * their own single blocks — matching the original game's per-syllable feel.
 */
export function splitMora(kana) {
  const mora = [];
  const chars = [...kana];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const n = chars[i + 1];
    if (n && SMALL_FOLLOWERS.has(n)) {
      mora.push(c + n);
      i++;
    } else {
      mora.push(c);
    }
  }
  return mora;
}

/** Convert a kana reading to Hepburn-ish romaji. */
export function kanaToRomaji(input) {
  const s = katakanaToHiragana(input);
  const chars = [...s];
  let out = '';
  let geminate = false;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const n = chars[i + 1];
    let rom;

    if (n && YOUON[c + n]) {
      rom = YOUON[c + n];
      i++;
    } else if (c === 'っ' || c === 'ッ') {
      geminate = true;
      continue;
    } else if (c === 'ー' || c === '〜' || c === '～') {
      const last = out.slice(-1);
      if ('aeiou'.includes(last)) out += last;
      continue;
    } else if (BASE[c] !== undefined) {
      rom = BASE[c];
    } else {
      rom = c; // pass through punctuation / latin
    }

    if (geminate) {
      out += rom.startsWith('ch') ? 't' : rom[0];
      geminate = false;
    }
    out += rom;
  }
  return out;
}

// ── Index / difficulty model ────────────────────────────────────────────────

// Parts of speech that make good vocabulary cards (content words).
const GOOD_POS = new Set([
  'n', 'n-suf', 'n-pref', 'adj-i', 'adj-na', 'adj-no', 'adv', 'adv-to',
  'v1', 'v5u', 'v5k', 'v5g', 'v5s', 'v5t', 'v5n', 'v5b', 'v5m', 'v5r',
  'v5k-s', 'vs', 'vk', 'vi', 'vt', 'num', 'pn',
]);

/**
 * Heuristic difficulty (1 easiest – 5 hardest). JMdict-common has no JLPT tags,
 * so we approximate from reading length and kanji weight.
 */
function assignLevel(moraCount, kanjiLen, hasKanji) {
  if (!hasKanji && moraCount <= 3) return 1;
  if (!hasKanji && moraCount <= 4) return 2;
  if (hasKanji && kanjiLen <= 1 && moraCount <= 4) return 2;
  if (moraCount <= 5 && kanjiLen <= 2) return 3;
  if (moraCount <= 6) return 4;
  return 5;
}

function firstCommon(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.find((e) => e.common) || list[0];
}

function glossesFor(word) {
  const out = [];
  for (const sense of word.sense || []) {
    for (const g of sense.gloss || []) {
      if (g.text) out.push(g.text);
    }
    if (out.length >= 3) break;
  }
  return out;
}

let DATA = null; // { levels: {1..5: Card[]}, all: Card[], byReading: Map, byKanji: Map, version }

function buildCard(word) {
  const kana = firstCommon(word.kana);
  if (!kana || !kana.text) return null;

  const pos = (word.sense?.[0]?.partOfSpeech) || [];
  if (!pos.some((p) => GOOD_POS.has(p))) return null;

  const glosses = glossesFor(word);
  if (glosses.length === 0) return null;

  const kanjiEntry = firstCommon(word.kanji);
  const kanji = kanjiEntry?.text || null;
  const mora = splitMora(kana.text);
  const isHiragana = HIRAGANA_RE.test(kana.text);

  return {
    id: word.id,
    kana: kana.text,
    kanji,
    japanese: kanji || kana.text, // canonical display form
    romaji: kanaToRomaji(kana.text),
    english: glosses[0],
    glosses,
    partOfSpeech: pos,
    components: mora,
    mora: mora.length,
    isHiragana,
    level: assignLevel(mora.length, kanji ? [...kanji].length : 0, !!kanji),
  };
}

export function load() {
  if (DATA) return DATA;
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const levels = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  const all = [];
  const byReading = new Map();
  const byKanji = new Map();

  for (const word of raw.words || []) {
    const card = buildCard(word);
    if (!card) continue;
    all.push(card);
    levels[card.level].push(card);
    if (!byReading.has(card.kana)) byReading.set(card.kana, card);
    if (card.kanji && !byKanji.has(card.kanji)) byKanji.set(card.kanji, card);
  }

  DATA = { levels, all, byReading, byKanji, version: raw.version };
  return DATA;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function sample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Pool of cards at the requested level. Stays within the requested level while
 * it holds enough variety, only widening to neighbouring levels when the
 * (possibly filtered) pool would be too small to sample from.
 */
function poolForLevel(level, predicate, minPool = 60) {
  const { levels } = load();
  const order = [level, level + 1, level - 1, level + 2, level - 2];
  const seen = new Set();
  const pool = [];
  for (const lv of order) {
    if (pool.length >= minPool) break; // primary level already has enough
    for (const card of levels[lv] || []) {
      if (seen.has(card.id)) continue;
      if (predicate && !predicate(card)) continue;
      seen.add(card.id);
      pool.push(card);
    }
  }
  return pool;
}

function publicCard(card) {
  return {
    id: card.id,
    japanese: card.japanese,
    kana: card.kana,
    kanji: card.kanji,
    romaji: card.romaji,
    english: card.english,
    partOfSpeech: card.partOfSpeech,
    components: card.components,
    level: card.level,
  };
}

// ── Public query API ────────────────────────────────────────────────────────

/** Word Forge: short, readable (hiragana) words split into kana blocks. */
export function getWords({ level = 1, count = 10, maxMora = 6 } = {}) {
  const pool = poolForLevel(level, (c) => c.isHiragana && c.mora <= maxMora && c.mora >= 2);
  return sample(pool, count).map(publicCard);
}

/** Boss Battle / Bubble Pop: 4-option multiple-choice translation quiz. */
export function getQuiz({ level = 1, count = 10, reverse = false } = {}) {
  const pool = poolForLevel(level);
  const picks = sample(pool, count);
  return picks.map((card) => {
    const distractors = sample(
      pool.filter((c) => c.id !== card.id && c.english !== card.english),
      3,
    );
    if (reverse) {
      // Prompt in English, choose the Japanese word.
      const options = sample(
        [card.japanese, ...distractors.map((d) => d.japanese)],
        4,
      );
      return {
        id: card.id,
        prompt: card.english,
        promptRomaji: null,
        answer: card.japanese,
        romaji: card.romaji,
        options,
      };
    }
    const options = sample(
      [card.english, ...distractors.map((d) => d.english)],
      4,
    );
    return {
      id: card.id,
      prompt: card.japanese,
      promptRomaji: card.romaji,
      answer: card.english,
      romaji: card.romaji,
      options,
    };
  });
}

/** Elemental Card Match: N japanese⇄english pairs. */
export function getMemoryPairs({ level = 1, count = 6 } = {}) {
  const pool = poolForLevel(level);
  return sample(pool, count).map((card) => ({
    matchId: card.id,
    japanese: card.japanese,
    kana: card.kana,
    romaji: card.romaji,
    english: card.english,
  }));
}

/** Single-word lookup by kana reading or kanji (study / hints). */
export function lookup(term) {
  if (!term) return null;
  const { byReading, byKanji } = load();
  const card = byKanji.get(term) || byReading.get(term);
  return card ? publicCard(card) : null;
}

export function getStats() {
  const { levels, all, version } = load();
  return {
    version,
    totalCards: all.length,
    byLevel: Object.fromEntries(
      Object.entries(levels).map(([lv, arr]) => [lv, arr.length]),
    ),
  };
}
