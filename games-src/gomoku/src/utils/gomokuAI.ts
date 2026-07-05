/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Board, Player, Difficulty, Move } from '../types';

export const DIRECTIONS = [
  [0, 1],   // Horizontal (→)
  [1, 0],   // Vertical (↓)
  [1, 1],   // Diagonal Down-Right (↘)
  [-1, 1]   // Diagonal Up-Right (↗)
];

/**
 * Checks if the coordinates are within the 15x15 board.
 */
export function isValid(r: number, c: number): boolean {
  return r >= 0 && r < 15 && c >= 0 && c < 15;
}

/**
 * Checks if the last move resulted in a win.
 * Radiates outwards from the last placed coordinate in all 4 directions.
 * Returns the winning coordinates if a win is found, otherwise null.
 */
export function checkWinFromMove(board: Board, row: number, col: number): { winner: Player; line: [number, number][] } | null {
  const player = board[row][col];
  if (!player) return null;

  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [[row, col]];

    // Scan backwards (opposite direction)
    let r = row - dr;
    let c = col - dc;
    while (isValid(r, c) && board[r][c] === player) {
      line.push([r, c]);
      r -= dr;
      c -= dc;
    }

    // Scan forwards (positive direction)
    r = row + dr;
    c = col + dc;
    while (isValid(r, c) && board[r][c] === player) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // Gomoku rule: 5 or more in a row wins
    if (line.length >= 5) {
      // Sort the line coordinates to make rendering / animating orderly
      line.sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
      return { winner: player, line };
    }
  }

  return null;
}

/**
 * Scans the entire board to check for a win. 
 * This is useful for safety and full-state recalculations.
 */
export function checkWinFull(board: Board): { winner: Player; line: [number, number][] } | null {
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (board[r][c]) {
        const result = checkWinFromMove(board, r, c);
        if (result) return result;
      }
    }
  }
  return null;
}

/**
 * Checks if the board is completely full (resulting in a draw).
 */
export function isBoardFull(board: Board): boolean {
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (board[r][c] === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Returns all empty cells that are adjacent (within a 2-cell radius) to any placed stone.
 * This simulates human spatial focus and speeds up AI calculations dramatically.
 */
export function getInterestingMoves(board: Board): [number, number][] {
  const interesting = new Set<string>();
  let hasStones = false;

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (board[r][c] !== null) {
        hasStones = true;
        // Check 2-cell radius
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (isValid(nr, nc) && board[nr][nc] === null) {
              interesting.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }

  // If the board is completely empty, the center cell (7,7) is the only interesting move
  if (!hasStones) {
    return [[7, 7]];
  }

  return Array.from(interesting).map((s) => {
    const [r, c] = s.split(',').map(Number);
    return [r, c];
  });
}

/**
 * Scores a single candidate move for a given active player using 5-cell window evaluation.
 */
function scoreMoveForPlayer(board: Board, r: number, c: number, activePlayer: Player): number {
  const opponent: Player = activePlayer === 'black' ? 'white' : 'black';
  let totalScore = 0;

  for (const [dr, dc] of DIRECTIONS) {
    // There are 5 windows of length 5 that can cover (r, c)
    for (let w = 0; w < 5; w++) {
      let validWindow = true;
      let activeCount = 0;
      let oppCount = 0;

      // Scan the 5 positions in this window
      for (let step = 0; step < 5; step++) {
        // Position of the cell in the window relative to the window start
        const wr = r + (step - w) * dr;
        const wc = c + (step - w) * dc;

        if (!isValid(wr, wc)) {
          validWindow = false;
          break;
        }

        const state = board[wr][wc];
        if (wr === r && wc === c) {
          // This is the cell being evaluated, assume the activePlayer plays here
          activeCount++;
        } else if (state === activePlayer) {
          activeCount++;
        } else if (state === opponent) {
          oppCount++;
        }
      }

      if (!validWindow) continue;

      // Score this window
      if (oppCount > 0) {
        // Blocked window (contains both players' stones), worth nothing to activePlayer
        continue;
      }

      // No opponent stones, evaluate the level of completion
      switch (activeCount) {
        case 5:
          totalScore += 100000; // Immediate win
          break;
        case 4:
          totalScore += 12000;  // Open/closed four
          break;
        case 3:
          totalScore += 1200;   // Open/closed three
          break;
        case 2:
          totalScore += 100;    // Two stones
          break;
        case 1:
          totalScore += 10;     // Single stone
          break;
      }
    }
  }

  return totalScore;
}

/**
 * Computes the best move for the AI opponent (playing as 'white').
 */
export function getBestAIMove(board: Board, difficulty: Difficulty): { row: number; col: number } {
  const candidateMoves = getInterestingMoves(board);
  
  if (candidateMoves.length === 0) {
    return { row: 7, col: 7 };
  }

  // Define parameters based on difficulty
  let defenseFactor = 1.0;
  let offenseFactor = 1.0;
  let randomFactor = 0.0;
  let blunderChance = 0.0;

  switch (difficulty) {
    case 'easy':
      defenseFactor = 0.4;
      offenseFactor = 0.7;
      randomFactor = 45.0; // High random noise to make beginner mistakes
      blunderChance = 0.25; // 25% chance of playing a random valid move
      break;
    case 'medium':
      defenseFactor = 0.85;
      offenseFactor = 1.0;
      randomFactor = 6.0;   // Small random noise to break ties naturally
      blunderChance = 0.04;  // 4% chance of minor oversight
      break;
    case 'hard':
      defenseFactor = 1.3;  // Highly defensive, prioritizes blocking user's active patterns
      offenseFactor = 1.0;
      randomFactor = 0.5;   // Micro noise to diversify equal options
      blunderChance = 0.0;  // Plays with absolute precision
      break;
  }

  // Implement difficulty blunder
  if (Math.random() < blunderChance && board[7][7] !== null) {
    // Choose a random interesting candidate to simulate a mistake
    const randomIndex = Math.floor(Math.random() * candidateMoves.length);
    const [r, c] = candidateMoves[randomIndex];
    return { row: r, col: c };
  }

  let bestMove = { row: 7, col: 7 };
  let maxScore = -Infinity;
  const scoredCandidates: { r: number; c: number; score: number }[] = [];

  for (const [r, c] of candidateMoves) {
    // Score if White (AI) plays here (offense)
    const aiScore = scoreMoveForPlayer(board, r, c, 'white');
    // Score if Black (Human) plays here (defense)
    const humanScore = scoreMoveForPlayer(board, r, c, 'black');

    // Combine scores.
    // Critical overrides:
    // If placing here wins White the game immediately, prioritize it above everything.
    let finalScore = 0;
    if (aiScore >= 100000) {
      finalScore = 1000000; // Guaranteed win
    } else if (humanScore >= 100000) {
      finalScore = 500000;  // Must-block opponent win
    } else {
      finalScore = (aiScore * offenseFactor) + (humanScore * defenseFactor);
    }

    // Add slight random noise to simulate human variance and break ties
    if (randomFactor > 0) {
      finalScore += Math.random() * randomFactor;
    }

    // Subtly penalize moves far from the center to favor tight, beautiful configurations
    const distToCenter = Math.sqrt(Math.pow(r - 7, 2) + Math.pow(c - 7, 2));
    finalScore -= distToCenter * 0.1;

    scoredCandidates.push({ r, c, score: finalScore });

    if (finalScore > maxScore) {
      maxScore = finalScore;
      bestMove = { row: r, col: c };
    }
  }

  // Sort candidates to find equal top moves, then pick one of them to add organic replayability
  scoredCandidates.sort((a, b) => b.score - a.score);
  const topScore = scoredCandidates[0]?.score || 0;
  const equalCandidates = scoredCandidates.filter((cand) => Math.abs(cand.score - topScore) < 0.5);
  
  if (equalCandidates.length > 1) {
    const chosen = equalCandidates[Math.floor(Math.random() * equalCandidates.length)];
    return { row: chosen.r, col: chosen.c };
  }

  return bestMove;
}
