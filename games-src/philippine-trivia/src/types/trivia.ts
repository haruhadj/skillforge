/**
 * Type declarations for "The Philippine Trivia" game.
 *
 * Raw quiz files in `data/*.json` come in three shapes (see data/loadQuizzes
 * in triviaData.ts). They are all normalized into `UnifiedQuestion` /
 * `QuizCategory` before reaching the UI, so components only deal with the
 * unified types below.
 */

// --- Unified formats used by every component ---
export type QuestionType = "multiple-choice" | "true-false" | "open-text";

export interface UnifiedQuestion {
  id: string; // Unique string identifier
  questionText: string;
  type: QuestionType;
  options: string[]; // Standardized choices ([] for open-text)
  hint?: string;
  correctAnswer: string;
  explanation: string;
  categoryTitle: string;
  roundName?: string;
}

export interface QuizCategory {
  id: string; // Stable id derived from the source filename; also the analytics quizId
  title: string;
  description: string;
  iconName: string; // Determines the Lucide icon shown on the card
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  estimatedTime: string; // e.g. "4 mins"
  questions: UnifiedQuestion[];
}

export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  maxStreak: number;
  correctAnswersCount: number;
  wrongAnswersCount: number;
}

export interface CategoryResult {
  categoryId: string;
  categoryTitle: string;
  score: number;
  totalQuestions: number;
  perfectScore: boolean;
  maxStreak: number;
  remainingHearts: number;
  missedQuestions: {
    questionText: string;
    yourAnswer: string;
    correctAnswer: string;
    explanation: string;
  }[];
}
