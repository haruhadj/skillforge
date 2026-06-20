export interface Fraction {
  n: number; // numerator
  d: number; // denominator
}

export type OperatorType = '+' | '-' | '*' | '/';

export interface CardState {
  id: string;
  value: Fraction;
  expression: string;
  isInitial: boolean;
}

export interface GameHistoryState {
  cards: CardState[];
  selectedCardId: string | null;
  selectedOperator: OperatorType | null;
}

export interface Puzzle {
  numbers: number[]; // 4 initial numbers
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  solutions: string[]; // all valid combined expressions
}
