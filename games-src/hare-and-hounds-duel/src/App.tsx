import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PawPrint, 
  Rabbit, 
  RotateCcw, 
  Award, 
  HelpCircle, 
  ArrowLeft, 
  Info,
  Sliders,
  Flame,
  User,
  Cpu
} from 'lucide-react';

// --- GAME CONFIGURATION AND GEOMETRY ---
type GameState = 'SETUP' | 'PLAYING' | 'GAME_OVER';
type Role = 'HOUNDS' | 'HARE';
type Difficulty = 'NORMAL' | 'HARD' | 'AMAZING';
type GameStatus = 'PLAYING' | 'HOUNDS_WIN' | 'HARE_WIN_ESCAPE' | 'HARE_WIN_STALL';

interface HistoryItem {
  turnNumber: number;
  role: Role;
  from: number;
  to: number;
  minHoundX: number;
  stagnantCount: number;
}

const COORDINATES: { [key: number]: { x: number; y: number; label: string } } = {
  0:  { x: 10, y: 15, label: '0' },
  1:  { x: 10, y: 50, label: '1' },
  2:  { x: 10, y: 85, label: '2' },
  3:  { x: 35, y: 15, label: '3' },
  4:  { x: 35, y: 50, label: '4' },
  5:  { x: 35, y: 85, label: '5' },
  6:  { x: 50, y: 50, label: '6' },
  7:  { x: 65, y: 15, label: '7' },
  8:  { x: 65, y: 50, label: '8' },
  9:  { x: 65, y: 85, label: '9' },
  10: { x: 90, y: 50, label: '10' }
};

const ADJACENCY: { [key: number]: number[] } = {
  0: [1, 3, 4],
  1: [0, 2, 4],
  2: [1, 4, 5],
  3: [0, 4, 6],
  4: [0, 1, 2, 3, 5, 6],
  5: [2, 4, 6],
  6: [3, 4, 5, 7, 8, 9],
  7: [6, 8, 10],
  8: [6, 7, 9, 10],
  9: [6, 8, 10],
  10: [7, 8, 9]
};

const EDGES = [
  [0, 1], [0, 3], [0, 4],
  [1, 2], [1, 4],
  [2, 4], [2, 5],
  [3, 4], [3, 6],
  [4, 5], [4, 6],
  [5, 6],
  [6, 7], [6, 8], [6, 9],
  [7, 8], [7, 10],
  [8, 9], [8, 10],
  [9, 10]
];

// Precompute shortest path distances using BFS
const DISTANCES = (() => {
  const dists: number[][] = Array.from({ length: 11 }, () => Array(11).fill(Infinity));
  for (let i = 0; i < 11; i++) {
    dists[i][i] = 0;
    const queue = [i];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (const neighbor of ADJACENCY[curr]) {
        if (dists[i][neighbor] === Infinity) {
          dists[i][neighbor] = dists[i][curr] + 1;
          queue.push(neighbor);
        }
      }
    }
  }
  return dists;
})();

// --- GAME LOGIC HELPERS ---
function getHoundMoves(houndPositions: number[], harePosition: number): { from: number; to: number }[] {
  const moves: { from: number; to: number }[] = [];
  for (const from of houndPositions) {
    for (const to of ADJACENCY[from]) {
      if (to !== harePosition && !houndPositions.includes(to)) {
        if (COORDINATES[to].x >= COORDINATES[from].x) {
          moves.push({ from, to });
        }
      }
    }
  }
  return moves;
}

function getHareMoves(houndPositions: number[], harePosition: number): number[] {
  const moves: number[] = [];
  for (const to of ADJACENCY[harePosition]) {
    if (!houndPositions.includes(to)) {
      moves.push(to);
    }
  }
  return moves;
}

function checkGameStatus(
  houndPositions: number[],
  harePosition: number,
  stagnantCount: number,
  turn: 'HOUNDS' | 'HARE'
): GameStatus {
  const minHoundX = Math.min(...houndPositions.map(h => COORDINATES[h].x));
  if (COORDINATES[harePosition].x < minHoundX) {
    return 'HARE_WIN_ESCAPE';
  }
  if (stagnantCount >= 10) {
    return 'HARE_WIN_STALL';
  }
  if (turn === 'HARE') {
    const hareMoves = getHareMoves(houndPositions, harePosition);
    if (hareMoves.length === 0) {
      return 'HOUNDS_WIN';
    }
  }
  return 'PLAYING';
}

// --- MINIMAX EVALUATION FUNCTION ---
function evaluateState(houndPositions: number[], harePosition: number, stagnantCount: number): number {
  const status = checkGameStatus(houndPositions, harePosition, stagnantCount, 'HARE');
  if (status === 'HOUNDS_WIN') return 10000;
  if (status === 'HARE_WIN_ESCAPE' || status === 'HARE_WIN_STALL') return -10000;

  const statusHounds = checkGameStatus(houndPositions, harePosition, stagnantCount, 'HOUNDS');
  if (statusHounds === 'HARE_WIN_ESCAPE' || statusHounds === 'HARE_WIN_STALL') return -10000;

  let score = 0;

  // 1. Hare X position (Hare wants lower X, Hounds want higher X)
  score += COORDINATES[harePosition].x * 12;

  // 2. Hounds X position (Hounds want to move right but not overshoot Hare)
  for (const h of houndPositions) {
    const houndX = COORDINATES[h].x;
    const hareX = COORDINATES[harePosition].x;
    if (houndX <= hareX) {
      score += houndX * 6;
    } else {
      score -= (houndX - hareX) * 10;
    }
  }

  // 3. Vertical barrier constraint (Hounds want to move together)
  const houndXs = houndPositions.map(h => COORDINATES[h].x);
  const minHoundX = Math.min(...houndXs);
  const maxHoundX = Math.max(...houndXs);
  score -= (maxHoundX - minHoundX) * 5;

  // 4. Shortest path distance from Hounds to Hare
  let totalDist = 0;
  for (const h of houndPositions) {
    totalDist += DISTANCES[h][harePosition];
  }
  score -= totalDist * 12;

  // 5. Hare mobility (Hounds want to restrict it)
  const hareMovesCount = getHareMoves(houndPositions, harePosition).length;
  score -= hareMovesCount * 18;

  // 6. Stagnant penalty
  score -= stagnantCount * 10;

  return score;
}

// --- MINIMAX ALGORITHM WITH ALPHA-BETA PRUNING ---
function minimax(
  houndPositions: number[],
  harePosition: number,
  stagnantCount: number,
  turn: 'HOUNDS' | 'HARE',
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  const status = checkGameStatus(houndPositions, harePosition, stagnantCount, turn);
  if (status === 'HOUNDS_WIN') return 9000 - depth;
  if (status === 'HARE_WIN_ESCAPE' || status === 'HARE_WIN_STALL') return -9000 + depth;
  if (depth === 0) return evaluateState(houndPositions, harePosition, stagnantCount);

  if (isMaximizing) {
    let maxEval = -Infinity;
    const moves = getHoundMoves(houndPositions, harePosition);
    if (moves.length === 0) return -9000 + depth;

    for (const m of moves) {
      const nextHounds = [...houndPositions];
      const idx = nextHounds.indexOf(m.from);
      nextHounds[idx] = m.to;
      nextHounds.sort((a, b) => a - b);

      const prevMinX = Math.min(...houndPositions.map(h => COORDINATES[h].x));
      const newMinX = Math.min(...nextHounds.map(h => COORDINATES[h].x));
      const nextStagnant = newMinX > prevMinX ? 0 : stagnantCount + 1;

      const evaluation = minimax(nextHounds, harePosition, nextStagnant, 'HARE', depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    const moves = getHareMoves(houndPositions, harePosition);
    if (moves.length === 0) return 9000 - depth;

    for (const nextHare of moves) {
      const evaluation = minimax(houndPositions, nextHare, stagnantCount, 'HOUNDS', depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// --- BEST MOVE CALCULATORS ---
function getBestMoveForHounds(
  houndPositions: number[],
  harePosition: number,
  stagnantCount: number,
  depth: number
): { from: number; to: number } {
  const moves = getHoundMoves(houndPositions, harePosition);
  if (moves.length === 0) return { from: houndPositions[0], to: houndPositions[0] };

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const m of moves) {
    const nextHounds = [...houndPositions];
    const idx = nextHounds.indexOf(m.from);
    nextHounds[idx] = m.to;
    nextHounds.sort((a, b) => a - b);

    const prevMinX = Math.min(...houndPositions.map(h => COORDINATES[h].x));
    const newMinX = Math.min(...nextHounds.map(h => COORDINATES[h].x));
    const nextStagnant = newMinX > prevMinX ? 0 : stagnantCount + 1;

    const score = minimax(nextHounds, harePosition, nextStagnant, 'HARE', depth - 1, -Infinity, Infinity, false);
    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}

function getBestMoveForHare(
  houndPositions: number[],
  harePosition: number,
  stagnantCount: number,
  depth: number
): number {
  const moves = getHareMoves(houndPositions, harePosition);
  if (moves.length === 0) return harePosition;

  let bestMove = moves[0];
  let bestScore = Infinity;

  for (const nextHare of moves) {
    const score = minimax(houndPositions, nextHare, stagnantCount, 'HOUNDS', depth - 1, -Infinity, Infinity, true);
    if (score < bestScore) {
      bestScore = score;
      bestMove = nextHare;
    }
  }
  return bestMove;
}

// --- SkillForge iframe bridge ---------------------------------------------
function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

interface MatchStats {
  wins: number;
  losses: number;
}

const HH_STATS_KEY = 'hare_hounds_stats_v1';

// --- THE APP COMPONENT ---
export default function App() {
  const [gameState, setGameState] = useState<GameState>('SETUP');
  const [humanRole, setHumanRole] = useState<Role>('HOUNDS');
  const [cpuDifficulty, setCpuDifficulty] = useState<Difficulty>('NORMAL');
  const [turn, setTurn] = useState<Role>('HOUNDS');
  
  // Game states
  const [houndPositions, setHoundPositions] = useState<number[]>([0, 1, 2]);
  const [harePosition, setHarePosition] = useState<number>(10);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [stagnantCount, setStagnantCount] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>('PLAYING');
  const [moveHistory, setMoveHistory] = useState<HistoryItem[]>([]);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [isCpuThinking, setIsCpuThinking] = useState<boolean>(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(true);

  // Persistent match record (win/loss vs CPU), used by the SkillForge bridge.
  const [matchStats, setMatchStats] = useState<MatchStats>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(HH_STATS_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return { wins: 0, losses: 0 };
  });

  // SkillForge bridge: request cloud-saved progress on mount and merge in by
  // taking the max of each counter (local vs remote), so restoring never loses wins.
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'RESTORE_PROGRESS' || !msg.data) return;

      setMatchStats(prev => {
        const remote = msg.data as Partial<MatchStats>;
        const merged: MatchStats = {
          wins: Math.max(prev.wins, Number(remote.wins) || 0),
          losses: Math.max(prev.losses, Number(remote.losses) || 0),
        };
        localStorage.setItem(HH_STATS_KEY, JSON.stringify(merged));
        return merged;
      });
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // SkillForge bridge: when a match ends, report a bounded best-match SKILL score.
  // The human wins as Hounds on HOUNDS_WIN, or as Hare on either HARE win. A win
  // rewards AI difficulty and an efficient game — fewer moves to trap or escape — so
  // the leaderboard reflects skill, not how many games were ground out. The host
  // keeps the best single match (write-if-higher).
  useEffect(() => {
    if (gameState !== 'GAME_OVER' || gameStatus === 'PLAYING') return;

    const humanWon =
      (humanRole === 'HOUNDS' && gameStatus === 'HOUNDS_WIN') ||
      (humanRole === 'HARE' && (gameStatus === 'HARE_WIN_ESCAPE' || gameStatus === 'HARE_WIN_STALL'));

    const DIFF_MULT: Record<Difficulty, number> = { NORMAL: 1, HARD: 2, AMAZING: 3 };
    let matchScore = 0;
    if (humanWon) {
      // A brisk win (~6 plies) → +400; a drawn-out 40+-ply win → +0.
      const plies = moveHistory.length;
      const efficiency = Math.max(0, Math.min(400, Math.round(((40 - plies) / (40 - 6)) * 400)));
      matchScore = 200 * (DIFF_MULT[cpuDifficulty] ?? 1) + efficiency;
    }

    setMatchStats(prev => {
      const next: MatchStats = {
        wins: prev.wins + (humanWon ? 1 : 0),
        losses: prev.losses + (humanWon ? 0 : 1),
      };
      localStorage.setItem(HH_STATS_KEY, JSON.stringify(next));

      const totalGames = next.wins + next.losses;
      // BEST_SCORE carries the leaderboard skill score; the host keeps the max.
      postToParent('BEST_SCORE', { bestScore: matchScore });
      // GAME_STATS is progress/analytics only — no score-like keys (bestScore/score/
      // lastScore), or the host would count the same match twice.
      postToParent('GAME_STATS', {
        ...next,
        totalGames,
        lastResult: humanWon ? 'win' : 'loss',
        humanRole,
        difficulty: cpuDifficulty,
      });
      return next;
    });
  }, [gameState, gameStatus]);

  // Restart back to Setup screen
  const handleRestart = () => {
    setGameState('SETUP');
    setHoundPositions([0, 1, 2]);
    setHarePosition(10);
    setSelectedPiece(null);
    setStagnantCount(0);
    setGameStatus('PLAYING');
    setMoveHistory([]);
    setTurn('HOUNDS');
  };

  // Start actual game play
  const startGame = (role: Role, diff: Difficulty) => {
    setHumanRole(role);
    setCpuDifficulty(diff);
    setHoundPositions([0, 1, 2]);
    setHarePosition(10);
    setSelectedPiece(null);
    setStagnantCount(0);
    setGameStatus('PLAYING');
    setMoveHistory([]);
    setTurn('HOUNDS'); // Hounds always go first!
    setGameState('PLAYING');
  };

  // Reset current match with same settings
  const resetMatch = () => {
    setHoundPositions([0, 1, 2]);
    setHarePosition(10);
    setSelectedPiece(null);
    setStagnantCount(0);
    setGameStatus('PLAYING');
    setGameState('PLAYING');
    setMoveHistory([]);
    setTurn('HOUNDS');
  };

  // Core move action
  const executeMove = (role: Role, from: number, to: number) => {
    if (gameStatus !== 'PLAYING') return;

    let nextHounds = [...houndPositions];
    let nextHare = harePosition;
    let nextStagnantCount = stagnantCount;

    if (role === 'HOUNDS') {
      const idx = nextHounds.indexOf(from);
      if (idx === -1) return;
      nextHounds[idx] = to;

      const prevMinX = Math.min(...houndPositions.map(h => COORDINATES[h].x));
      const newMinX = Math.min(...nextHounds.map(h => COORDINATES[h].x));
      nextStagnantCount = newMinX > prevMinX ? 0 : stagnantCount + 1;
    } else {
      nextHare = to;
    }

    const newHistoryItem: HistoryItem = {
      turnNumber: moveHistory.length + 1,
      role,
      from,
      to,
      minHoundX: Math.min(...nextHounds.map(h => COORDINATES[h].x)),
      stagnantCount: nextStagnantCount,
    };

    const nextTurn = role === 'HOUNDS' ? 'HARE' : 'HOUNDS';
    const nextStatus = checkGameStatus(nextHounds, nextHare, nextStagnantCount, nextTurn);

    // Update States
    setHoundPositions(nextHounds);
    setHarePosition(nextHare);
    setStagnantCount(nextStagnantCount);
    setMoveHistory(prev => [...prev, newHistoryItem]);
    setSelectedPiece(null);

    if (nextStatus !== 'PLAYING') {
      setGameStatus(nextStatus);
      setGameState('GAME_OVER');
    } else {
      setTurn(nextTurn);
    }
  };

  // CPU AI Engine Loop
  useEffect(() => {
    if (gameState !== 'PLAYING' || turn === humanRole) return;

    setIsCpuThinking(true);
    const timer = setTimeout(() => {
      setIsCpuThinking(false);

      if (turn === 'HOUNDS') {
        const moves = getHoundMoves(houndPositions, harePosition);
        if (moves.length === 0) {
          setGameStatus('HARE_WIN_ESCAPE');
          setGameState('GAME_OVER');
          return;
        }

        let chosen: { from: number; to: number };
        if (cpuDifficulty === 'NORMAL' && Math.random() < 0.20) {
          // 20% random beginner choice
          chosen = moves[Math.floor(Math.random() * moves.length)];
        } else {
          const depth = cpuDifficulty === 'NORMAL' ? 2 : cpuDifficulty === 'HARD' ? 4 : 8;
          chosen = getBestMoveForHounds(houndPositions, harePosition, stagnantCount, depth);
        }
        executeMove('HOUNDS', chosen.from, chosen.to);
      } else {
        const moves = getHareMoves(houndPositions, harePosition);
        if (moves.length === 0) {
          setGameStatus('HOUNDS_WIN');
          setGameState('GAME_OVER');
          return;
        }

        let chosenDest: number;
        if (cpuDifficulty === 'NORMAL' && Math.random() < 0.20) {
          chosenDest = moves[Math.floor(Math.random() * moves.length)];
        } else {
          const depth = cpuDifficulty === 'NORMAL' ? 2 : cpuDifficulty === 'HARD' ? 4 : 8;
          chosenDest = getBestMoveForHare(houndPositions, harePosition, stagnantCount, depth);
        }
        executeMove('HARE', harePosition, chosenDest);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [gameState, turn, humanRole, houndPositions, harePosition, stagnantCount, cpuDifficulty]);

  // Click handle for human interaction on nodes
  const handleNodeClick = (nodeId: number) => {
    if (gameState !== 'PLAYING') return;
    if (turn !== humanRole) return; // Block interaction on CPU's turn

    if (humanRole === 'HOUNDS') {
      if (houndPositions.includes(nodeId)) {
        setSelectedPiece(selectedPiece === nodeId ? null : nodeId);
      } else if (selectedPiece !== null) {
        // Try to move selected hound to nodeId
        const adjs = ADJACENCY[selectedPiece];
        const isEmpty = nodeId !== harePosition && !houndPositions.includes(nodeId);
        const isForward = COORDINATES[nodeId].x >= COORDINATES[selectedPiece].x;

        if (adjs.includes(nodeId) && isEmpty && isForward) {
          executeMove('HOUNDS', selectedPiece, nodeId);
        } else {
          setSelectedPiece(null);
        }
      }
    } else {
      // Human is HARE
      if (nodeId === harePosition) {
        setSelectedPiece(selectedPiece === nodeId ? null : nodeId);
      } else {
        // Direct move if empty and adjacent (auto-select Hare since there's only one!)
        const adjs = ADJACENCY[harePosition];
        const isEmpty = !houndPositions.includes(nodeId);

        if (adjs.includes(nodeId) && isEmpty) {
          executeMove('HARE', harePosition, nodeId);
        }
      }
    }
  };

  // Valid destinations for highlighted indicators
  const getValidDestinations = (): number[] => {
    if (gameState !== 'PLAYING' || turn !== humanRole) return [];
    if (humanRole === 'HARE') {
      return getHareMoves(houndPositions, harePosition);
    }
    if (humanRole === 'HOUNDS' && selectedPiece !== null) {
      const adjs = ADJACENCY[selectedPiece];
      return adjs.filter(nodeId => {
        const isEmpty = nodeId !== harePosition && !houndPositions.includes(nodeId);
        const isForward = COORDINATES[nodeId].x >= COORDINATES[selectedPiece].x;
        return isEmpty && isForward;
      });
    }
    return [];
  };

  const validDests = getValidDestinations();

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E2D5] font-sans p-3 sm:p-6 flex flex-col items-center select-none">
      {/* HEADER BANNER */}
      <header className="w-full max-w-5xl flex flex-col sm:flex-row justify-between items-center bg-[#221F1C] border border-[#3E3830] rounded-2xl p-4 mb-4 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-[#3E3830] text-[#FAF7F2] p-2.5 rounded-xl shadow-md">
            <Sliders className="w-6 h-6 text-[#E29E4D]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FAF7F2]">Hare & Hounds</h1>
            <p className="text-xs text-[#A89D8A] font-medium">Clubhouse Tabletop Series</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowRules(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#2D2722] hover:bg-[#3D352F] border border-[#524940] rounded-lg shadow-sm transition-all text-[#FAF7F2] cursor-pointer"
            id="rules-btn"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#BCAE99]" />
            Rules
          </button>
          
          {gameState !== 'SETUP' && (
            <button 
              onClick={handleRestart}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#E29E4D] hover:bg-[#F2AE5D] text-stone-950 rounded-lg shadow-sm transition-all cursor-pointer"
              id="exit-setup-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Main Menu
            </button>
          )}
        </div>
      </header>

      {/* SETUP SCREEN */}
      {gameState === 'SETUP' && (
        <main className="w-full max-w-2xl bg-[#221F1C] border border-[#3E3830] rounded-3xl p-6 sm:p-8 shadow-md flex flex-col gap-6 animate-fadeIn">
          <div className="text-center">
            <span className="text-xs tracking-widest font-extrabold text-[#FAF7F2] uppercase bg-[#3E2D17] px-3 py-1 rounded-full border border-[#E29E4D]/20">Single Player VS CPU</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FAF7F2] mt-2">Configure Game Board</h2>
            <p className="text-sm text-[#A89D8A] mt-1">Select your alignment side and adjust CPU skill difficulty</p>
          </div>

          {/* SIDE SELECTION */}
          <div>
            <label className="block text-xs font-bold text-[#8F8472] uppercase tracking-wider mb-2.5 text-center">1. Choose Side</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => setHumanRole('HOUNDS')}
                className={`group p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  humanRole === 'HOUNDS'
                    ? 'border-[#E29E4D] bg-[#3A2A19]/60 shadow-md ring-2 ring-[#E29E4D]/20'
                    : 'border-[#3E3830] hover:border-[#524940] hover:bg-[#2C2621]/50'
                }`}
                id="select-hounds-btn"
              >
                <div className={`p-4 rounded-full transition-all ${
                  humanRole === 'HOUNDS' ? 'bg-[#E29E4D] text-stone-950 shadow-lg' : 'bg-[#2D2722] text-[#8F8472] group-hover:bg-[#3D352F]'
                }`}>
                  <PawPrint className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-extrabold text-[#FAF7F2] text-sm">Play as Hounds</h3>
                  <p className="text-xs text-[#A89D8A] mt-1">Deploy 3 hounds at once. Move forward & trap the hare.</p>
                </div>
              </button>

              <button
                onClick={() => setHumanRole('HARE')}
                className={`group p-5 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all cursor-pointer ${
                  humanRole === 'HARE'
                    ? 'border-emerald-500 bg-[#143224]/60 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-[#3E3830] hover:border-[#524940] hover:bg-[#2C2621]/50'
                }`}
                id="select-hare-btn"
              >
                <div className={`p-4 rounded-full transition-all ${
                  humanRole === 'HARE' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-[#2D2722] text-[#8F8472] group-hover:bg-[#3D352F]'
                }`}>
                  <Rabbit className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <h3 className="font-extrabold text-[#FAF7F2] text-sm">Play as Hare</h3>
                  <p className="text-xs text-[#A89D8A] mt-1">Control the lone agile hare. Slip past the wall of hounds.</p>
                </div>
              </button>
            </div>
          </div>

          {/* DIFFICULTY SELECTION */}
          <div>
            <label className="block text-xs font-bold text-[#8F8472] uppercase tracking-wider mb-2.5 text-center">2. Select Difficulty</label>
            <div className="grid grid-cols-3 gap-2.5">
              {(['NORMAL', 'HARD', 'AMAZING'] as Difficulty[]).map(diff => (
                <button
                  key={diff}
                  onClick={() => setCpuDifficulty(diff)}
                  className={`py-3 px-2 sm:px-4 rounded-xl border font-bold text-xs transition-all uppercase cursor-pointer ${
                    cpuDifficulty === diff
                      ? 'bg-[#FAF7F2] text-stone-950 border-[#FAF7F2] shadow-md scale-[1.02]'
                      : 'bg-[#2D2722] hover:bg-[#3D352F] text-[#FAF7F2] border-[#3E3830]'
                  }`}
                  id={`diff-${diff}-btn`}
                >
                  {diff}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-[#A89D8A] mt-3 font-medium">
              {cpuDifficulty === 'NORMAL' && "Normal: Standard AI with 2-ply search depth. Tends to make occasional rookie mistakes."}
              {cpuDifficulty === 'HARD' && "Hard: Aggressive 4-ply lookahead evaluating strong defensive walls and fast escape paths."}
              {cpuDifficulty === 'AMAZING' && "Amazing: Perfect lookahead (8 plies) resulting in computer-optimized play. No errors."}
            </p>
          </div>

          {/* START BUTTON */}
          <button
            onClick={() => startGame(humanRole, cpuDifficulty)}
            className="w-full py-4 px-6 bg-[#E29E4D] hover:bg-[#F2AE5D] active:scale-[0.98] text-stone-950 font-extrabold text-sm rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
            id="start-game-btn"
          >
            Start Tabletop Game
          </button>
        </main>
      )}

      {/* GAMEPLAY SCREEN */}
      {gameState !== 'SETUP' && (
        <main className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fadeIn">
          
          {/* LEFT: BOARD GAME AREA */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* STAGES / FLAGS AND ALERTS */}
            <div className="bg-[#221F1C] border border-[#3E3830] rounded-2xl p-4 shadow-sm flex items-center justify-between">
              
              {/* Turn Status Panel */}
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl font-bold flex items-center gap-2 text-xs uppercase shadow-sm border ${
                  turn === 'HOUNDS' ? 'bg-[#3A2A19] text-[#F2AE5D] border-[#E29E4D]/20' : 'bg-[#143224] text-[#34D399] border-[#10B981]/20'
                }`}>
                  {turn === 'HOUNDS' ? <PawPrint className="w-4 h-4" /> : <Rabbit className="w-4 h-4" />}
                  <span>{turn}' Turn</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold">
                  {turn === humanRole ? (
                    <span className="flex items-center gap-1 text-[#E8E2D5] bg-[#2D2722] border border-[#3E3830] px-2.5 py-1 rounded-lg">
                      <User className="w-3.5 h-3.5" /> Your Turn
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[#F2AE5D] bg-[#3A2A19]/50 border border-[#E29E4D]/10 px-2.5 py-1 rounded-lg animate-pulse font-medium">
                      <Cpu className="w-3.5 h-3.5" /> CPU Thinking...
                    </span>
                  )}
                </div>
              </div>

              {/* Reset Control */}
              <div className="flex items-center gap-2">
                <button
                  onClick={resetMatch}
                  className="p-2 text-[#FAF7F2] hover:text-[#FAF7F2] bg-[#2D2722] hover:bg-[#3D352F] border border-[#3E3830] rounded-lg shadow-sm transition-all cursor-pointer"
                  title="Reset Match"
                  id="reset-match-btn"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* STALL WARNING BAR */}
            <div className="bg-[#221F1C] border border-[#3E3830] rounded-2xl p-4 shadow-sm flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#A89D8A] flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-[#E29E4D]" />
                  Hound Stalling Counter
                </span>
                <span className="font-bold text-[#FAF7F2]">{stagnantCount} / 10 turns</span>
              </div>
              <div className="w-full bg-[#141210] h-3.5 rounded-full overflow-hidden border border-[#3E3830] p-0.5 flex gap-1">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                     key={idx}
                     className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      idx < stagnantCount 
                        ? stagnantCount >= 7 
                          ? 'bg-red-500 shadow-sm shadow-red-900/30' 
                          : stagnantCount >= 4 
                            ? 'bg-amber-500' 
                            : 'bg-[#E29E4D]'
                        : 'bg-[#2D2722]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#8F8472] font-medium">
                Hounds must advance rightward. If Hounds make 10 consecutive turns without advancing their lowest X-coordinate, the Hare wins.
              </p>
            </div>

            {/* MAIN INTERACTIVE WOODEN BOARD */}
            <div className="bg-[#2E1E12] border-8 border-[#1F140C] rounded-[32px] shadow-2xl relative overflow-hidden aspect-[4/3] w-full p-4 flex items-center justify-center">
              
              {/* WOOD GRAIN BG OVERLAY */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="relative w-full h-full">
                
                {/* 1. DRAW BOARD TRACKS SVG */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  <defs>
                    <filter id="track-shadow" x="-10%" y="-10%" width="120%" height="120%">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                    </filter>
                  </defs>
                  
                  {/* Groove paths */}
                  {EDGES.map(([u, v], idx) => {
                    const from = COORDINATES[u];
                    const to = COORDINATES[v];
                    return (
                      <g key={idx}>
                        <line
                          x1={`${from.x}%`}
                          y1={`${from.y}%`}
                          x2={`${to.x}%`}
                          y2={`${to.y}%`}
                          stroke="#130B05"
                          strokeWidth="8"
                          strokeLinecap="round"
                          opacity="0.3"
                        />
                        <line
                          x1={`${from.x}%`}
                          y1={`${from.y}%`}
                          x2={`${to.x}%`}
                          y2={`${to.y}%`}
                          stroke="#7D654E"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* 2. GLOWING MOVE TARGET PATHWAY INDICATORS */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {humanRole === 'HOUNDS' && selectedPiece !== null && EDGES.map(([u, v], idx) => {
                    const isTargetEdge = (u === selectedPiece && validDests.includes(v)) || (v === selectedPiece && validDests.includes(u));
                    if (!isTargetEdge) return null;
                    const from = COORDINATES[u];
                    const to = COORDINATES[v];
                    return (
                      <line
                        key={`glow-${idx}`}
                        x1={`${from.x}%`}
                        y1={`${from.y}%`}
                        x2={`${to.x}%`}
                        y2={`${to.y}%`}
                        stroke="#10B981"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="animate-pulse"
                        opacity="0.7"
                      />
                    );
                  })}
                </svg>

                {/* 3. STATIC RECESS CHANNELS (EMPTY HOLES) */}
                {Object.keys(COORDINATES).map((key) => {
                  const id = parseInt(key);
                  const isOccupied = houndPositions.includes(id) || harePosition === id;
                  const isDestination = validDests.includes(id);

                  return (
                    <button
                      key={id}
                      onClick={() => handleNodeClick(id)}
                      disabled={isCpuThinking}
                      className="absolute w-10 h-10 sm:w-16 sm:h-16 rounded-full -translate-x-1/2 -translate-y-1/2 focus:outline-none transition-transform z-10 touch-manipulation cursor-pointer"
                      style={{ left: `${COORDINATES[id].x}%`, top: `${COORDINATES[id].y}%` }}
                      id={`node-${id}`}
                    >
                      <div className={`w-full h-full rounded-full flex items-center justify-center relative transition-all ${
                        isOccupied 
                          ? 'opacity-0' 
                          : isDestination
                            ? 'bg-[#10B981]/20 border border-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.5)] cursor-pointer hover:scale-105'
                            : 'bg-[#4A3929] border border-[#3A2D20] shadow-[inset_0_3px_5px_rgba(0,0,0,0.4)] hover:bg-[#574432]'
                      }`}>
                        {/* Tiny decorative node ID index indicator label */}
                        {!isOccupied && !isDestination && (
                          <span className="text-[9px] sm:text-xs text-[#A08970] font-bold select-none">{COORDINATES[id].label}</span>
                        )}
                        {/* Target pulse halos inside destination */}
                        {isDestination && (
                          <>
                            <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-70 animate-ping" />
                            <div className="w-2.5 h-2.5 sm:w-4 sm:h-4 bg-[#10B981] rounded-full z-10 shadow-[0_0_8px_#10B981]" />
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* 4. DYNAMIC MOVING PIECES (SLIDE ANIMATION VIA absolute XY COORDINATES) */}
                {/* THE 3 HOUNDS */}
                {houndPositions.map((nodeId, idx) => {
                  const isSelected = selectedPiece === nodeId && turn === humanRole;
                  const canMove = turn === humanRole && humanRole === 'HOUNDS';
                  
                  return (
                    <motion.div
                      key={`hound-${idx}`}
                      layout
                      transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handleNodeClick(nodeId)}
                      className={`absolute w-10 h-10 sm:w-16 sm:h-16 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 shadow-[0_4px_6px_rgba(0,0,0,0.3)] sm:shadow-[0_6px_10px_rgba(0,0,0,0.3)] bg-gradient-to-b from-amber-700 to-amber-900 border-2 border-amber-950 cursor-pointer select-none touch-manipulation transition-shadow ${
                        isSelected ? 'ring-2 sm:ring-4 ring-[#E29E4D] scale-105' : 'hover:scale-[1.03]'
                      } ${!canMove ? 'cursor-default' : ''}`}
                      style={{ left: `${COORDINATES[nodeId].x}%`, top: `${COORDINATES[nodeId].y}%` }}
                    >
                      {/* Wooden Ring Inset */}
                      <div className="w-8 h-8 sm:w-13 sm:h-13 rounded-full border border-amber-950/40 flex items-center justify-center shadow-inner">
                        <PawPrint className="w-4 h-4 sm:w-6 sm:h-6 text-amber-100 drop-shadow-sm" />
                      </div>
                    </motion.div>
                  );
                })}

                {/* THE AGILITY HARE */}
                <motion.div
                  key="hare-piece"
                  layout
                  transition={{ type: 'spring', stiffness: 220, damping: 25 }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => handleNodeClick(harePosition)}
                  className={`absolute w-10 h-10 sm:w-16 sm:h-16 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20 shadow-[0_4px_6px_rgba(0,0,0,0.3)] sm:shadow-[0_6px_10px_rgba(0,0,0,0.3)] bg-gradient-to-b from-stone-50 to-stone-200 border-2 border-stone-400 cursor-pointer select-none touch-manipulation transition-shadow ${
                    selectedPiece === harePosition && turn === humanRole ? 'ring-2 sm:ring-4 ring-emerald-400 scale-105' : 'hover:scale-[1.03]'
                  } ${turn !== humanRole ? 'cursor-default' : ''}`}
                  style={{ left: `${COORDINATES[harePosition].x}%`, top: `${COORDINATES[harePosition].y}%` }}
                >
                  <div className="w-8 h-8 sm:w-13 sm:h-13 rounded-full border border-stone-300 flex items-center justify-center shadow-inner">
                    <Rabbit className="w-4 h-4 sm:w-6 sm:h-6 text-stone-700 drop-shadow-sm" />
                  </div>
                </motion.div>

              </div>
            </div>
          </div>

          {/* RIGHT: INFO PANEL */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* CONFIG AND STATS MATCH METRICS */}
            <div className="bg-[#221F1C] border border-[#3E3830] rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <h3 className="text-sm font-extrabold text-[#FAF7F2] uppercase tracking-wide border-b border-[#3E3830] pb-2">Active Challenge</h3>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#2D2722]/60 p-2.5 rounded-xl border border-[#3E3830]">
                  <span className="text-[#8F8472] block font-bold uppercase tracking-wider text-[9px]">Your Role</span>
                  <span className="font-extrabold text-[#FAF7F2] text-sm mt-0.5 block flex items-center gap-1">
                    {humanRole === 'HOUNDS' ? <PawPrint className="w-3.5 h-3.5 text-[#E29E4D]" /> : <Rabbit className="w-3.5 h-3.5 text-stone-300" />}
                    {humanRole === 'HOUNDS' ? 'Hounds Team' : 'Agile Hare'}
                  </span>
                </div>

                <div className="bg-[#2D2722]/60 p-2.5 rounded-xl border border-[#3E3830]">
                  <span className="text-[#8F8472] block font-bold uppercase tracking-wider text-[9px]">AI Opponent</span>
                  <span className="font-extrabold text-[#FAF7F2] text-sm mt-0.5 block flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-stone-400" />
                    {cpuDifficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE ACTION SCROLL HISTORY */}
            <div className="bg-[#221F1C] border border-[#3E3830] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col flex-1">
              <button
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                className="w-full flex items-center justify-between text-sm font-extrabold text-[#FAF7F2] uppercase tracking-wide border-b border-[#3E3830] pb-2 mb-3 cursor-pointer outline-none focus:ring-1 focus:ring-stone-700 rounded select-none"
              >
                <span className="flex items-center gap-1.5">
                  Turn History Log
                  <span className="text-[10px] bg-[#2D2722] text-[#BCAE99] px-2 py-0.5 rounded-full font-bold lowercase tracking-normal">
                    {moveHistory.length} {moveHistory.length === 1 ? 'move' : 'moves'}
                  </span>
                </span>
                <span className="text-xs text-[#BCAE99] font-bold lg:hidden flex items-center gap-1">
                  {isHistoryCollapsed ? 'Show ▲' : 'Hide ▼'}
                </span>
              </button>
              
              <div className={`flex-1 overflow-y-auto max-h-[300px] pr-1 space-y-2 text-xs transition-all duration-300 ${
                isHistoryCollapsed ? 'hidden lg:block' : 'block'
              }`}>
                {moveHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[#8F8472] py-10">
                    <Info className="w-5 h-5 mb-2" />
                    <p className="font-semibold text-stone-300">Match started</p>
                    <p className="text-[10px]">Hounds always make the opening move.</p>
                  </div>
                ) : (
                  moveHistory.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded-xl border border-[#3E3830] bg-[#2D2722]/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#3E3830] flex items-center justify-center text-[10px] font-bold text-[#FAF7F2]">
                          {item.turnNumber}
                        </span>
                        <div>
                          <span className={`font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-full border ${
                            item.role === 'HOUNDS' ? 'bg-[#3A2A19] text-[#F2AE5D] border-[#E29E4D]/20' : 'bg-[#143224] text-[#34D399] border-[#10B981]/20'
                          }`}>
                            {item.role}
                          </span>
                          <span className="text-[#BCAE99] ml-1.5 font-medium">
                            Move <span className="font-bold text-[#FAF7F2]">{item.from}</span> → <span className="font-bold text-[#FAF7F2]">{item.to}</span>
                          </span>
                        </div>
                      </div>

                      {item.role === 'HOUNDS' && (
                        <span className="text-[10px] text-[#8F8472] font-medium">
                          Stall {item.stagnantCount}/10
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      )}

      {/* WIN OVERLAY DIALOG MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#221F1C] border-2 border-[#3E3830] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-5 animate-scaleUp">
            
            <div className={`p-5 rounded-full ${
              gameStatus === 'HOUNDS_WIN' ? 'bg-[#3A2A19] text-[#F2AE5D] border border-[#E29E4D]/20' : 'bg-[#143224] text-emerald-400 border border-emerald-500/20'
            }`}>
              <Award className="w-12 h-12" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-[#FAF7F2] uppercase tracking-tight">
                {gameStatus === 'HOUNDS_WIN' && "Hounds Triumph!"}
                {gameStatus === 'HARE_WIN_ESCAPE' && "Hare Escaped!"}
                {gameStatus === 'HARE_WIN_STALL' && "Stall Rule Triggered!"}
              </h2>
              
              <p className="text-xs text-[#8F8472] uppercase tracking-widest font-extrabold mt-1">
                {gameStatus === 'HOUNDS_WIN' && "Hounds win by blockading"}
                {gameStatus === 'HARE_WIN_ESCAPE' && "Hare slipped behind the defense"}
                {gameStatus === 'HARE_WIN_STALL' && "Hounds failed to advance for 10 turns"}
              </p>

              <div className="bg-[#2D2722]/60 border border-[#3E3830] p-4 rounded-2xl my-4">
                <p className="text-sm font-semibold text-[#E8E2D5]">
                  {gameStatus === 'HOUNDS_WIN' && (
                    humanRole === 'HOUNDS' ? "Splendid! You successfully surrounded and trapped the computer Hare." : "Game Over. The computer Hounds locked down all escape paths."
                  )}
                  {gameStatus === 'HARE_WIN_ESCAPE' && (
                    humanRole === 'HARE' ? "Magnificent! You bypassed the hounds and reached safe territory." : "Defeat. The computer Hare successfully breached your barrier."
                  )}
                  {gameStatus === 'HARE_WIN_STALL' && (
                    humanRole === 'HARE' ? "Success! You stalled the computer Hounds for 10 turns." : "Stall Out. You failed to advance your lowest hound for 10 consecutive turns."
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <button
                onClick={resetMatch}
                className="py-3 px-4 bg-[#2D2722] hover:bg-[#3D352F] text-[#FAF7F2] font-extrabold text-xs rounded-xl shadow-sm transition-all border border-[#3E3830] cursor-pointer"
                id="modal-replay-btn"
              >
                Replay Match
              </button>
              
              <button
                onClick={handleRestart}
                className="py-3 px-4 bg-[#E29E4D] hover:bg-[#F2AE5D] text-stone-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                id="modal-main-menu-btn"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RULE MODAL POPUP */}
      {showRules && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#221F1C] border border-[#3E3830] rounded-3xl p-6 max-w-xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto animate-scaleUp">
            <div className="flex justify-between items-center border-b border-[#3E3830] pb-3">
              <h3 className="text-lg font-black text-[#FAF7F2] flex items-center gap-2">
                <Info className="w-5 h-5 text-[#E29E4D]" />
                Game Rules & Guide
              </h3>
              <button 
                onClick={() => setShowRules(false)}
                className="text-[#8F8472] hover:text-[#FAF7F2] text-xl font-bold cursor-pointer"
                id="close-rules-btn"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#BCAE99] leading-relaxed">
              <div>
                <h4 className="font-bold text-[#FAF7F2] mb-1">Introduction</h4>
                <p>
                  Hare and Hounds is a classic 19th-century French military game. It is an asymmetric game of chase, blockading, and escape.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#F2AE5D] flex items-center gap-1.5 mb-1">
                  <PawPrint className="w-4 h-4" /> Hound Rules
                </h4>
                <p>
                  - Hounds always take the first turn.
                  <br />
                  - Hounds can move vertically, horizontally, or diagonally.
                  <br />
                  - <strong>Hounds can never move backwards (left).</strong> Every move must be to the right or strictly vertical/Y-aligned.
                  <br />
                  - To win, Hounds must surround the Hare so that it has zero legal moves left.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#34D399] flex items-center gap-1.5 mb-1">
                  <Rabbit className="w-4 h-4" /> Hare Rules
                </h4>
                <p>
                  - The Hare can move in any direction along connected paths.
                  <br />
                  - The Hare wins if it escapes past all Hounds (its X-coordinate is less than the lowest X-coordinate of all 3 hounds), OR if the Stall rule triggers.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
                  <Flame className="w-4 h-4" /> Stalling Rule (Draw / Hare Win)
                </h4>
                <p>
                  To prevent endless back-and-forth movement, the Hounds must consistently advance. If the Hounds fail to advance their lowest X-coordinate position for <strong>10 consecutive turns</strong>, the game is declared a stall-out and the Hare wins immediately.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full mt-2 py-3 bg-[#E29E4D] hover:bg-[#F2AE5D] text-stone-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              id="confirm-rules-btn"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
