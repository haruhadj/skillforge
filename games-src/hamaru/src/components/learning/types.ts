import { LearningCategory } from '../../data/kana';

/** A single normalised study item shared by all three learning modes. */
export interface StudyItem {
  id: string;
  jp: string;       // glyph / word shown as the prompt (kana, kanji, or vocab)
  romaji: string;   // reading
  meaning: string;  // English meaning ('' for plain kana — reading is the answer)
}

export interface LearningModeProps {
  category: LearningCategory;
  items: StudyItem[];
  /** Called when the player finishes/leaves the mode, reporting earned XP. */
  onFinish: (xpGained: number) => void;
  onBack: () => void;
}

/** The answer used by Quiz/Flashcards: meaning when present, else the reading. */
export const answerOf = (item: StudyItem): string => item.meaning || item.romaji;
