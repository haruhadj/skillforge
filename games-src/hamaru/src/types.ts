export interface Flashcard {
  id: string;
  japanese: string; 
  romaji: string;   
  english: string;  
  type: 'hiragana' | 'katakana' | 'kanji' | 'vocab' | 'grammar';
  level: number;
  components?: string[]; // Scrambled/ordered syllabary blocks for Word Forge (e.g., ["み", "ず"])
}

export type GameModeId = 'menu' | 'boss_battle' | 'memory_match' | 'word_forge' | 'bubble_burst';

export interface GameState {
  currentMode: GameModeId;
  score: number;
  combo: number;
  highScores: Record<GameModeId, number>;
  masterLevels: Record<GameModeId, number>;
}

export interface ParticleQuestion {
  id: string;
  sentenceBefore: string; // The text before the particle
  sentenceAfter: string;  // The text after the particle
  correctParticle: string; // e.g., "は", "が", "を", "に", "で"
  englishTranslation: string;
  options: string[]; // List of particles to choose from, e.g., ["は", "を", "に", "で"]
}

export interface MemoryCard {
  id: string; // Unique for each grid instance
  content: string; // Could be Japanese text or English/Romaji text
  matchId: string; // Shared ID between matching pair
  isFlipped: boolean;
  isMatched: boolean;
  type: 'japanese' | 'english_romaji';
}
