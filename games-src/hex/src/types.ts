/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Player = 'red' | 'blue';

export interface Cell {
  id: string; // "q,r"
  q: number;  // Column index (0 to 10)
  r: number;  // Row index (0 to 10)
  owner: Player | null;
}

export type GameMode = 'pvp' | 'ai';
export type AiDifficulty = 'easy' | 'medium' | 'hard';

export interface Move {
  q: number;
  r: number;
  player: Player;
}

export interface GameStats {
  redWins: number;
  blueWins: number;
  aiWins: number;
  playerWinsVsAi: number;
}
