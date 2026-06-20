import { Flashcard, ParticleQuestion } from './types';

export const FLASHCARDS: Flashcard[] = [
  // Hiragana
  { id: 'h1', japanese: 'ね', romaji: 'ne', english: 'ne (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h2', japanese: 'こ', romaji: 'ko', english: 'ko (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h3', japanese: 'さ', romaji: 'sa', english: 'sa (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h4', japanese: 'か', romaji: 'ka', english: 'ka (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h5', japanese: 'な', romaji: 'na', english: 'na (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h6', japanese: 'み', romaji: 'mi', english: 'mi (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h7', japanese: 'ず', romaji: 'zu', english: 'zu (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h8', japanese: 'す', romaji: 'su', english: 'su (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h9', japanese: 'し', romaji: 'shi', english: 'shi (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h10', japanese: 'い', romaji: 'i', english: 'i (Hiragana)', type: 'hiragana', level: 1 },
  { id: 'h11', japanese: 'ぬ', romaji: 'nu', english: 'nu (Hiragana)', type: 'hiragana', level: 2 },
  { id: 'h12', japanese: 'た', romaji: 'ta', english: 'ta (Hiragana)', type: 'hiragana', level: 2 },

  // Katakana
  { id: 'k1', japanese: 'ア', romaji: 'a', english: 'a (Katakana)', type: 'katakana', level: 1 },
  { id: 'k2', japanese: 'イ', romaji: 'i', english: 'i (Katakana)', type: 'katakana', level: 1 },
  { id: 'k3', japanese: 'サ', romaji: 'sa', english: 'sa (Katakana)', type: 'katakana', level: 1 },
  { id: 'k4', japanese: 'カ', romaji: 'ka', english: 'ka (Katakana)', type: 'katakana', level: 1 },
  { id: 'k5', japanese: 'メ', romaji: 'me', english: 'me (Katakana)', type: 'katakana', level: 2 },
  { id: 'k6', japanese: 'ラ', romaji: 'ra', english: 'ra (Katakana)', type: 'katakana', level: 2 },
  { id: 'k7', japanese: 'タ', romaji: 'ta', english: 'ta (Katakana)', type: 'katakana', level: 2 },
  { id: 'k8', japanese: 'ト', romaji: 'to', english: 'to (Katakana)', type: 'katakana', level: 2 },

  // Kanji
  { id: 'kj1', japanese: '水', romaji: 'mizu', english: 'Water', type: 'kanji', level: 1 },
  { id: 'kj2', japanese: '火', romaji: 'hi', english: 'Fire', type: 'kanji', level: 1 },
  { id: 'kj3', japanese: '木', romaji: 'ki', english: 'Tree/Wood', type: 'kanji', level: 1 },
  { id: 'kj4', japanese: '山', romaji: 'yama', english: 'Mountain', type: 'kanji', level: 1 },
  { id: 'kj5', japanese: '川', romaji: 'kawa', english: 'River', type: 'kanji', level: 1 },
  { id: 'kj6', japanese: '日', romaji: 'hi', english: 'Sun/Day', type: 'kanji', level: 2 },
  { id: 'kj7', japanese: '月', romaji: 'tsuki', english: 'Moon/Month', type: 'kanji', level: 2 },
  { id: 'kj8', japanese: '本', romaji: 'hon', english: 'Book/Origin', type: 'kanji', level: 2 },
  { id: 'kj9', japanese: '猫', romaji: 'neko', english: 'Cat', type: 'kanji', level: 3 },
  { id: 'kj10', japanese: '犬', romaji: 'inu', english: 'Dog', type: 'kanji', level: 3 },
  { id: 'kj11', japanese: '魚', romaji: 'sakana', english: 'Fish', type: 'kanji', level: 3 },

  // Vocabulary (With syllable composition for Word Forge)
  { id: 'v1', japanese: 'みず', romaji: 'mizu', english: 'Water', type: 'vocab', level: 1, components: ['み', 'ず'] },
  { id: 'v2', japanese: 'ねこ', romaji: 'neko', english: 'Cat', type: 'vocab', level: 1, components: ['ね', 'こ'] },
  { id: 'v3', japanese: 'すし', romaji: 'sushi', english: 'Sushi', type: 'vocab', level: 1, components: ['す', 'し'] },
  { id: 'v4', japanese: 'いぬ', romaji: 'inu', english: 'Dog', type: 'vocab', level: 1, components: ['い', 'ぬ'] },
  { id: 'v5', japanese: 'さかな', romaji: 'sakana', english: 'Fish', type: 'vocab', level: 2, components: ['さ', 'か', 'な'] },
  { id: 'v6', japanese: 'やま', romaji: 'yama', english: 'Mountain', type: 'vocab', level: 2, components: ['や', 'ま'] },
  { id: 'v7', japanese: 'かわ', romaji: 'kawa', english: 'River', type: 'vocab', level: 2, components: ['か', 'わ'] },
  { id: 'v8', japanese: 'さくら', romaji: 'sakura', english: 'Cherry Blossom', type: 'vocab', level: 3, components: ['さ', 'く', 'ら'] },
  { id: 'v9', japanese: 'ともだち', romaji: 'tomodachi', english: 'Friend', type: 'vocab', level: 3, components: ['と', 'も', 'だ', 'ち'] },
  { id: 'v10', japanese: 'がっこう', romaji: 'gakkou', english: 'School', type: 'vocab', level: 3, components: ['が', 'っ', 'こ', 'う'] },
];

export const PARTICLE_QUESTIONS: ParticleQuestion[] = [
  {
    id: 'p1',
    sentenceBefore: 'ねこ',
    sentenceAfter: 'さかな を たべました',
    correctParticle: 'は',
    englishTranslation: 'The cat ate the fish',
    options: ['は', 'が', 'に', 'で']
  },
  {
    id: 'p2',
    sentenceBefore: 'ともだち',
    sentenceAfter: 'あいます',
    correctParticle: 'に',
    englishTranslation: 'I will meet a friend',
    options: ['に', 'を', 'が', 'で']
  },
  {
    id: 'p3',
    sentenceBefore: 'がっこう',
    sentenceAfter: 'いきます',
    correctParticle: 'に',
    englishTranslation: 'Go to school',
    options: ['に', 'で', 'を', 'は']
  },
  {
    id: 'p4',
    sentenceBefore: 'はし',
    sentenceAfter: 'すし を たべます',
    correctParticle: 'で',
    englishTranslation: 'Eat sushi with chopsticks',
    options: ['で', 'を', 'に', 'が']
  },
  {
    id: 'p5',
    sentenceBefore: 'にほんご',
    sentenceAfter: 'べんきょう します',
    correctParticle: 'を',
    englishTranslation: 'Study Japanese',
    options: ['を', 'に', 'が', 'で']
  },
  {
    id: 'p6',
    sentenceBefore: 'としょかん',
    sentenceAfter: 'ほん を よみます',
    correctParticle: 'で',
    englishTranslation: 'Read books at the library',
    options: ['で', 'に', 'を', 'は']
  },
  {
    id: 'p7',
    sentenceBefore: 'いぬ',
    sentenceAfter: 'ほえます',
    correctParticle: 'が',
    englishTranslation: 'The dog barks',
    options: ['が', 'を', 'に', 'で']
  },
  {
    id: 'p8',
    sentenceBefore: 'えいご',
    sentenceAfter: 'はなします',
    correctParticle: 'で',
    englishTranslation: 'Speak in English',
    options: ['で', 'に', 'を', 'が']
  },
  {
    id: 'p9',
    sentenceBefore: 'あした',
    sentenceAfter: 'ともだち と あそびます',
    correctParticle: 'は',
    englishTranslation: 'Tomorrow I will play with friends',
    options: ['は', 'に', 'を', 'で']
  },
  {
    id: 'p10',
    sentenceBefore: 'こうえん',
    sentenceAfter: 'はしります',
    correctParticle: 'で',
    englishTranslation: 'Run in/at the park',
    options: ['で', 'を', 'に', 'が']
  }
];

export interface Boss {
  name: string;
  maxHp: number;
  avatar: string;
}

export const BOSSES: Boss[] = [
  { name: 'Kitsune Spark', maxHp: 100, avatar: '🦊' },
  { name: 'Tengu Tempest', maxHp: 150, avatar: '👺' },
  { name: 'Ryu Dragon', maxHp: 200, avatar: '🐉' },
  { name: 'Oni Warlord', maxHp: 300, avatar: '👹' }
];
