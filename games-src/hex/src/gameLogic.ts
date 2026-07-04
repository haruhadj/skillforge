/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cell, Player, AiDifficulty } from './types';

export const BOARD_SIZE = 11;

/**
 * Creates a clean size x size Hex board.
 */
export function createInitialBoard(size: number = BOARD_SIZE): Cell[][] {
  const board: Cell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let q = 0; q < size; q++) {
      row.push({
        id: `${q},${r}`,
        q,
        r,
        owner: null,
      });
    }
    board.push(row);
  }
  return board;
}

/**
 * Returns neighbors of (q, r) in axial coordinates.
 * Adjacency defined as: (q+1, r), (q-1, r), (q, r+1), (q, r-1), (q+1, r-1), (q-1, r+1).
 */
export function getNeighbors(q: number, r: number, size: number = BOARD_SIZE): { q: number; r: number }[] {
  const directions = [
    { dq: 1, dr: 0 },   // East
    { dq: -1, dr: 0 },  // West
    { dq: 0, dr: 1 },   // South-East
    { dq: 0, dr: -1 },  // North-West
    { dq: 1, dr: -1 },  // North-East
    { dq: -1, dr: 1 },  // South-West
  ];

  const neighbors: { q: number; r: number }[] = [];
  for (const dir of directions) {
    const nq = q + dir.dq;
    const nr = r + dir.dr;
    if (nq >= 0 && nq < size && nr >= 0 && nr < size) {
      neighbors.push({ q: nq, r: nr });
    }
  }
  return neighbors;
}

/**
 * Checks if a player has won the game.
 * Red connects Top (r = 0) to Bottom (r = size - 1).
 * Blue connects Left (q = 0) to Right (q = size - 1).
 * Returns the winning player and the path of cells participating in the connection.
 */
export function checkWin(board: Cell[][], size: number = BOARD_SIZE): { winner: Player | null; path: string[] } {
  // 1. Check Red (Top to Bottom)
  const redStarts = board[0].filter(cell => cell.owner === 'red');
  if (redStarts.length > 0) {
    const queue: { q: number; r: number; path: string[] }[] = redStarts.map(c => ({
      q: c.q,
      r: c.r,
      path: [c.id],
    }));
    const visited = new Set<string>(redStarts.map(c => c.id));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.r === size - 1) {
        return { winner: 'red', path: curr.path };
      }

      for (const n of getNeighbors(curr.q, curr.r, size)) {
        const neighborCell = board[n.r][n.q];
        if (neighborCell.owner === 'red' && !visited.has(neighborCell.id)) {
          visited.add(neighborCell.id);
          queue.push({
            q: n.q,
            r: n.r,
            path: [...curr.path, neighborCell.id],
          });
        }
      }
    }
  }

  // 2. Check Blue (Left to Right)
  const blueStarts = board.map(row => row[0]).filter(cell => cell.owner === 'blue');
  if (blueStarts.length > 0) {
    const queue: { q: number; r: number; path: string[] }[] = blueStarts.map(c => ({
      q: c.q,
      r: c.r,
      path: [c.id],
    }));
    const visited = new Set<string>(blueStarts.map(c => c.id));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr.q === size - 1) {
        return { winner: 'blue', path: curr.path };
      }

      for (const n of getNeighbors(curr.q, curr.r, size)) {
        const neighborCell = board[n.r][n.q];
        if (neighborCell.owner === 'blue' && !visited.has(neighborCell.id)) {
          visited.add(neighborCell.id);
          queue.push({
            q: n.q,
            r: n.r,
            path: [...curr.path, neighborCell.id],
          });
        }
      }
    }
  }

  return { winner: null, path: [] };
}

/**
 * Computes the shortest distance using Dijkstra from a starting set of coordinates.
 * Cost function: 0 if cell is owned by target player, 1 if cell is empty, Infinity if owned by opponent.
 */
function runDijkstra(
  board: Cell[][],
  size: number,
  player: Player,
  starts: { q: number; r: number }[]
): number[][] {
  const opponent = player === 'red' ? 'blue' : 'red';
  const dist: number[][] = Array(size).fill(null).map(() => Array(size).fill(Infinity));
  const queue: { q: number; r: number; d: number }[] = [];

  for (const start of starts) {
    const cell = board[start.r][start.q];
    if (cell.owner === opponent) continue;
    const cost = cell.owner === player ? 0 : 1;
    dist[start.r][start.q] = cost;
    queue.push({ q: start.q, r: start.r, d: cost });
  }

  // Sort helper (priority queue simplified since size is small)
  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const curr = queue.shift()!;

    if (curr.d > dist[curr.r][curr.q]) continue;

    const neighbors = getNeighbors(curr.q, curr.r, size);
    for (const n of neighbors) {
      const neighborCell = board[n.r][n.q];
      if (neighborCell.owner === opponent) continue;

      const edgeCost = neighborCell.owner === player ? 0 : 1;
      const newDist = curr.d + edgeCost;

      if (newDist < dist[n.r][n.q]) {
        dist[n.r][n.q] = newDist;
        queue.push({ q: n.q, r: n.r, d: newDist });
      }
    }
  }

  return dist;
}

/**
 * Computes the best move for the AI.
 * Blue is usually Player 2 (the AI in standard single player mode vs human red).
 * But we design it to support either player being the AI.
 */
export function getBestMove(
  board: Cell[][],
  aiPlayer: Player,
  difficulty: AiDifficulty,
  size: number = BOARD_SIZE
): { q: number; r: number } {
  const emptyCells: { q: number; r: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let q = 0; q < size; q++) {
      if (board[r][q].owner === null) {
        emptyCells.push({ q, r });
      }
    }
  }

  if (emptyCells.length === 0) {
    throw new Error("No moves available!");
  }

  // 1. Easy difficulty: Pick a completely random empty cell.
  if (difficulty === 'easy') {
    const randIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randIndex];
  }

  // Helper arrays for Red (Top-Bottom)
  const redStarts = Array(size).fill(0).map((_, i) => ({ q: i, r: 0 }));
  const redEnds = Array(size).fill(0).map((_, i) => ({ q: i, r: size - 1 }));

  // Helper arrays for Blue (Left-Right)
  const blueStarts = Array(size).fill(0).map((_, i) => ({ q: 0, r: i }));
  const blueEnds = Array(size).fill(0).map((_, i) => ({ q: size - 1, r: i }));

  // Run Dijkstra from start and end edges for both players
  const distToTop = runDijkstra(board, size, 'red', redStarts);
  const distToBottom = runDijkstra(board, size, 'red', redEnds);
  const distToLeft = runDijkstra(board, size, 'blue', blueStarts);
  const distToRight = runDijkstra(board, size, 'blue', blueEnds);

  let bestMove = emptyCells[0];
  let maxScore = -Infinity;

  // Evaluate each empty cell
  for (const cell of emptyCells) {
    const { q, r } = cell;

    // Red's shortest path length passing through this cell
    const redPath = distToTop[r][q] + distToBottom[r][q];
    // Blue's shortest path length passing through this cell
    const bluePath = distToLeft[r][q] + distToRight[r][q];

    // Convert distances to scores. Lower distance = higher value.
    // If distance is Infinity, give it a very high penalty.
    const redValue = redPath === Infinity ? 0 : (size * 3) - redPath;
    const blueValue = bluePath === Infinity ? 0 : (size * 3) - bluePath;

    // Weight based on difficulty
    let score = 0;
    if (difficulty === 'medium') {
      // Medium: balanced offense and defense with slight randomness
      // AI wants to improve its own path (blueValue if AI is blue) and block opponent (redValue)
      if (aiPlayer === 'blue') {
        score = blueValue * 1.1 + redValue * 0.9;
      } else {
        score = redValue * 1.1 + blueValue * 0.9;
      }
      // Add a tiny random factor so moves are not 100% predictable in identical situations
      score += Math.random() * 0.5;
    } else {
      // Hard: Aggressive defense and smart connection bridges
      // Strong weight on blocking opponent's winning attempts (near win blocks)
      const criticalRedThreshold = 3; // if red path is very short
      const criticalBlueThreshold = 3; // if blue path is very short

      if (aiPlayer === 'blue') {
        const isRedThreatening = redPath <= criticalRedThreshold;
        score = blueValue * 1.0 + redValue * (isRedThreatening ? 2.2 : 1.2);
      } else {
        const isBlueThreatening = bluePath <= criticalBlueThreshold;
        score = redValue * 1.0 + blueValue * (isBlueThreatening ? 2.2 : 1.2);
      }

      // Positional premium: prefer center cells in early game
      const center = (size - 1) / 2;
      const centerDist = Math.abs(q - center) + Math.abs(r - center);
      const centerPremium = (size - centerDist) * 0.15;
      score += centerPremium;
    }

    if (score > maxScore) {
      maxScore = score;
      bestMove = cell;
    }
  }

  return bestMove;
}
