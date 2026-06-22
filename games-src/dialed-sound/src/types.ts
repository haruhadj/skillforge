export type GamePhase = 'START' | 'COUNTDOWN' | 'MEMORIZE' | 'GUESS' | 'RESULTS' | 'SUMMARY';

export interface RoundData {
  targetFreq: number;
  guessedFreq: number | null;
  score: number | null;
  centsDifference: number | null;
}

export interface GameState {
  currentRound: number; // 1 to 5
  phase: GamePhase;
  rounds: RoundData[];
  highScore: number;
}

export interface SnarkyMessage {
  minScore: number;
  message: string;
}

export const SNARKY_MESSAGES: SnarkyMessage[] = [
  { minScore: 9.9, message: "Perfect pitch! Are you an oscillator in disguise?" },
  { minScore: 9.0, message: "Exquisite. Your ears are finely-tuned instruments." },
  { minScore: 8.0, message: "Very solid! You dialed it in nicely." },
  { minScore: 6.0, message: "Decent ear. Just a little flat or sharp." },
  { minScore: 3.0, message: "Close-ish, but wouldn't trust you with an instrument." },
  { minScore: 1.0, message: "Ouch. That was practically in another postcode." },
  { minScore: 0.001, message: "Did you mute your browser, or is this a vibe check?" },
  { minScore: 0, message: "Absolute silence. Or absolute confusion." },
];
