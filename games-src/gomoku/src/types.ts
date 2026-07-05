/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Player = 'black' | 'white';

export type CellState = Player | null;

export type Board = CellState[][];

export type GameMode = 'local' | 'ai';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type Winner = Player | 'draw' | null;

export interface Move {
  row: number;
  col: number;
  player: Player;
}

export interface GameStats {
  blackWins: number;
  whiteWins: number;
  draws: number;
}
