/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cell, Player, GameMode, AiDifficulty, GameStats } from './types';
import { createInitialBoard, checkWin, getBestMove, BOARD_SIZE } from './gameLogic';
import GameBoard from './components/GameBoard';
import GameControls from './components/GameControls';
import WinnerModal from './components/WinnerModal';
import { Sparkles, Trophy, BookOpen, Info, CheckCircle2, Award, Zap, RotateCcw } from 'lucide-react';

const STATS_KEY = 'hex_game_stats_v1';

// --- SkillForge iframe bridge ---------------------------------------------
function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function App() {
  // Game Play States
  const [board, setBoard] = useState<Cell[][]>(() => createInitialBoard(BOARD_SIZE));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('red');
  const [winner, setWinner] = useState<Player | null>(null);
  const [winningPath, setWinningPath] = useState<string[]>([]);
  const [history, setHistory] = useState<Cell[][][]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [aiDifficulty, setAiDifficulty] = useState<AiDifficulty>('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const aiThinkingRef = React.useRef(false);

  // Statistics State
  const [stats, setStats] = useState<GameStats>({
    redWins: 0,
    blueWins: 0,
    aiWins: 0,
    playerWinsVsAi: 0,
  });

  // Load stats from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STATS_KEY);
    if (saved) {
      try {
        setStats(JSON.parse(saved));
      } catch (err) {
        console.error('Failed to parse hex stats:', err);
      }
    }
  }, []);

  // SkillForge bridge: request cloud-saved progress, merge in by taking the
  // max of each counter (local vs remote), so restoring never loses wins.
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'RESTORE_PROGRESS' || !msg.data) return;

      setStats(prev => {
        const remote = msg.data as Partial<GameStats>;
        const merged: GameStats = {
          redWins: Math.max(prev.redWins, Number(remote.redWins) || 0),
          blueWins: Math.max(prev.blueWins, Number(remote.blueWins) || 0),
          aiWins: Math.max(prev.aiWins, Number(remote.aiWins) || 0),
          playerWinsVsAi: Math.max(prev.playerWinsVsAi, Number(remote.playerWinsVsAi) || 0),
        };
        localStorage.setItem(STATS_KEY, JSON.stringify(merged));
        return merged;
      });
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // SkillForge bridge: report a bounded best-match SKILL score once a match ends.
  // Only a decisive human win vs the AI counts (the human plays red). The score
  // rewards AI difficulty and an efficient win — a shorter connecting path — so the
  // leaderboard reflects skill, not how many games were ground out. Hex has no draws;
  // redWins + blueWins is the total completed-match count. Host keeps the best match.
  useEffect(() => {
    if (!winner) return;
    const saved = localStorage.getItem(STATS_KEY);
    const current: GameStats = saved ? JSON.parse(saved) : stats;

    const totalGames = current.redWins + current.blueWins;

    const DIFF_MULT: Record<AiDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
    let matchScore = 0;
    if (gameMode === 'ai' && winner === 'red') {
      // Shortest possible connecting path is BOARD_SIZE (11) → +400; a meandering
      // 30-cell path → +0. Fall back to the minimum length if the path is missing.
      const pathLen = winningPath.length || BOARD_SIZE;
      const efficiency = Math.max(0, Math.min(400, Math.round(((30 - pathLen) / (30 - BOARD_SIZE)) * 400)));
      matchScore = 200 * (DIFF_MULT[aiDifficulty] ?? 2) + efficiency;
    }

    // BEST_SCORE carries the leaderboard skill score; the host keeps the max.
    postToParent('BEST_SCORE', { bestScore: matchScore });
    // GAME_STATS is progress/analytics only — no score-like keys (bestScore/score/
    // lastScore), or the host would count the same match twice.
    postToParent('GAME_STATS', { ...current, totalGames, lastResult: winner, aiDifficulty, gameMode });
  }, [winner]);

  // Save statistics helper
  const saveStats = (newStats: GameStats) => {
    setStats(newStats);
    localStorage.setItem(STATS_KEY, JSON.stringify(newStats));
  };

  // Cell placement handler
  const handleCellClick = (q: number, r: number) => {
    // Block interaction during AI turn, game over, or if cell is already occupied
    if (winner || isAiThinking || board[r][q].owner !== null) return;
    if (gameMode === 'ai' && currentPlayer === 'blue') return;

    // Record board history (deep copy)
    const boardCopy = board.map(row => row.map(cell => ({ ...cell })));
    setHistory(prev => [...prev, boardCopy]);

    // Apply move
    const newBoard = board.map(row =>
      row.map(cell => {
        if (cell.q === q && cell.r === r) {
          return { ...cell, owner: currentPlayer };
        }
        return cell;
      })
    );
    setBoard(newBoard);

    // Evaluate Win Condition
    const winResult = checkWin(newBoard, BOARD_SIZE);
    if (winResult.winner) {
      setWinner(winResult.winner);
      setWinningPath(winResult.path);
      setIsModalOpen(true);

      // Record victory stats
      const updatedStats = { ...stats };
      if (gameMode === 'pvp') {
        if (winResult.winner === 'red') updatedStats.redWins += 1;
        else updatedStats.blueWins += 1;
      } else {
        if (winResult.winner === 'red') {
          updatedStats.redWins += 1;
          updatedStats.playerWinsVsAi += 1;
        } else {
          updatedStats.blueWins += 1;
          updatedStats.aiWins += 1;
        }
      }
      saveStats(updatedStats);
    } else {
      // Rotate active turn
      setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red');
    }
  };

  // AI Opponent automation hook
  useEffect(() => {
    if (gameMode !== 'ai' || currentPlayer !== 'blue' || winner || aiThinkingRef.current) {
      return;
    }

    aiThinkingRef.current = true;
    setIsAiThinking(true);

    const aiTimer = setTimeout(() => {
      try {
        const aiMove = getBestMove(board, 'blue', aiDifficulty, BOARD_SIZE);

        // Record history before AI makes its move
        const boardCopyBeforeAi = board.map(row => row.map(cell => ({ ...cell })));
        setHistory(prev => [...prev, boardCopyBeforeAi]);

        // Apply AI move (Blue)
        const newBoard = board.map(row =>
          row.map(cell => {
            if (cell.q === aiMove.q && cell.r === aiMove.r) {
              return { ...cell, owner: 'blue' };
            }
            return cell;
          })
        );
        setBoard(newBoard);

        // Evaluate win condition
        const winResult = checkWin(newBoard, BOARD_SIZE);
        if (winResult.winner) {
          setWinner(winResult.winner);
          setWinningPath(winResult.path);
          setIsModalOpen(true);

          setStats(prev => {
            const next = {
              ...prev,
              blueWins: prev.blueWins + 1,
              aiWins: prev.aiWins + 1,
            };
            localStorage.setItem(STATS_KEY, JSON.stringify(next));
            return next;
          });
        } else {
          setCurrentPlayer('red');
        }
      } catch (err) {
        console.error('AI logic failure:', err);
      } finally {
        aiThinkingRef.current = false;
        setIsAiThinking(false);
      }
    }, 700);

    return () => {
      clearTimeout(aiTimer);
    };
  }, [board, gameMode, currentPlayer, winner, aiDifficulty]);

  // Handle Undo functionality
  const handleUndo = () => {
    if (history.length === 0 || winner) return;

    if (gameMode === 'ai') {
      // In AI mode, we undo BOTH the AI's move and the user's move to revert back to the player's turn.
      if (history.length >= 2) {
        const previousState = history[history.length - 2];
        setBoard(previousState);
        setHistory(prev => prev.slice(0, prev.length - 2));
        setCurrentPlayer('red');
      } else {
        // Fallback for single move
        const previousState = history[0];
        setBoard(previousState);
        setHistory([]);
        setCurrentPlayer('red');
      }
    } else {
      // In local PvP mode, undo rolls back exactly one move at a time
      const previousState = history[history.length - 1];
      setBoard(previousState);
      setHistory(prev => prev.slice(0, prev.length - 1));
      setCurrentPlayer(currentPlayer === 'red' ? 'blue' : 'red');
    }
  };

  // Restart match helper
  const handleResetGame = () => {
    setBoard(createInitialBoard(BOARD_SIZE));
    setCurrentPlayer('red');
    setWinner(null);
    setWinningPath([]);
    setHistory([]);
    setIsModalOpen(false);
    setIsAiThinking(false);
  };

  // Reset all win-loss logs
  const handleResetStats = () => {
    const freshStats = {
      redWins: 0,
      blueWins: 0,
      aiWins: 0,
      playerWinsVsAi: 0,
    };
    setStats(freshStats);
    localStorage.removeItem(STATS_KEY);
  };

  // Modify match parameters (re-initializes current game safely)
  const handleModeChange = (mode: GameMode) => {
    setGameMode(mode);
    handleResetGame();
  };

  const handleDifficultyChange = (difficulty: AiDifficulty) => {
    setAiDifficulty(difficulty);
    handleResetGame();
  };

  return (
    <div className="min-h-screen bg-[#090807] text-stone-200 flex flex-col justify-between py-3 px-0 sm:p-6 md:p-8 max-w-7xl mx-auto" id="app-root-container">
      
      {/* Elegant Minimalist Header */}
      <header className="mb-4 sm:mb-6 flex flex-row items-center justify-between gap-3 border-b border-white/5 pb-3 px-4 sm:px-0" id="app-header">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles size={14} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-display font-black tracking-tight text-white leading-none">
              HEX
            </h1>
            <span className="text-[9px] font-mono tracking-widest text-stone-500 uppercase block sm:inline">
              Worldwide Classics
            </span>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] bg-stone-900/80 border border-white/5 px-2.5 py-0.5 rounded-lg text-amber-400 font-mono">
            {gameMode === 'ai' ? `vs. CPU` : 'Local PvP'}
          </div>
          <button
            onClick={handleResetGame}
            className="p-1.5 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-white/10 text-stone-300 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-[10px] font-semibold"
            id="header-restart-btn"
            title="Restart Match"
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Grid Container */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start mb-6 flex-1">
        
        {/* Left Column (GameBoard & HUD Status): spans 7 cols on lg screens */}
        <div className="lg:col-span-7 flex flex-col gap-4 sm:gap-5" id="board-and-status-column">
          
          {/* Mobile-first HUD Indicator Card */}
          <div className="bg-[#121110] border border-white/5 rounded-2xl p-3.5 shadow-xl mx-4 sm:mx-0">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-2.5">
              <span>Active Turn Status</span>
              {isAiThinking ? (
                <span className="text-sky-400 flex items-center gap-1 animate-pulse font-semibold">
                  <span className="w-1 h-1 rounded-full bg-sky-500 animate-ping"></span>
                  CPU Thinking...
                </span>
              ) : winner ? (
                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                  Winner: {winner === 'red' ? 'Red' : 'Blue'} 🎉
                </span>
              ) : (
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Ready
                </span>
              )}
            </div>

            {/* Connected Active Avatars Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Red Player (Top ⇄ Bottom) */}
              <div
                onClick={() => !winner && !isAiThinking && currentPlayer !== 'red' && setCurrentPlayer('red')}
                className={`p-2 rounded-xl border transition-all duration-300 flex items-center gap-2.5 cursor-pointer select-none ${
                  winner === 'red'
                    ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                    : !winner && currentPlayer === 'red'
                    ? 'bg-rose-500/10 border-rose-500/60 ring-2 ring-rose-500/20 translate-y-[-1px]'
                    : 'bg-stone-900/40 border-transparent opacity-40 hover:opacity-70'
                }`}
                id="hud-red-card"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 text-xs font-bold">
                  R
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-white leading-tight flex items-center gap-1">
                    Red Player {!winner && currentPlayer === 'red' && <span className="text-amber-400 animate-pulse">★</span>}
                  </span>
                  <span className="text-[9px] font-mono text-rose-400 font-medium truncate">Top ⇄ Bottom</span>
                </div>
              </div>

              {/* Blue Player (Left ⇄ Right) */}
              <div
                onClick={() => !winner && !isAiThinking && currentPlayer !== 'blue' && gameMode === 'pvp' && setCurrentPlayer('blue')}
                className={`p-2 rounded-xl border transition-all duration-300 flex items-center gap-2.5 cursor-pointer select-none ${
                  winner === 'blue'
                    ? 'bg-sky-500/20 border-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.25)]'
                    : !winner && currentPlayer === 'blue'
                    ? 'bg-sky-500/10 border-sky-500/60 ring-2 ring-sky-500/20 translate-y-[-1px]'
                    : 'bg-stone-900/40 border-transparent opacity-40 hover:opacity-70'
                }`}
                id="hud-blue-card"
              >
                <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-500 shrink-0 text-xs font-bold">
                  {gameMode === 'ai' ? 'C' : 'B'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold text-white leading-tight flex items-center gap-1">
                    {gameMode === 'ai' ? 'Computer' : 'Blue Player'} {!winner && currentPlayer === 'blue' && <span className="text-amber-400 animate-pulse">★</span>}
                  </span>
                  <span className="text-[9px] font-mono text-sky-400 font-medium truncate">Left ⇄ Right</span>
                </div>
              </div>

            </div>
          </div>

          {/* Hex Game Board Wrapper: Edge-to-Edge on mobile, beautiful card on desktop */}
          <div className="bg-[#121110] border-y border-x-0 sm:border sm:rounded-2xl p-1 sm:p-4 shadow-xl w-full">
            <GameBoard
              board={board}
              currentPlayer={currentPlayer}
              winner={winner}
              winningPath={winningPath}
              onCellClick={handleCellClick}
            />
          </div>

        </div>

        {/* Right Column (Controls, Statistics, Help Panels): spans 5 cols on lg screens */}
        <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-6" id="controls-and-help-column">
          
          {/* Game Controls Panel (Game Mode selection + Win-Loss Tally) */}
          <div className="bg-[#121110] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl mx-4 sm:mx-0">
            <GameControls
              gameMode={gameMode}
              aiDifficulty={aiDifficulty}
              currentPlayer={currentPlayer}
              winner={winner}
              stats={stats}
              onModeChange={handleModeChange}
              onDifficultyChange={handleDifficultyChange}
              onUndo={handleUndo}
              onResetGame={handleResetGame}
              onResetStats={handleResetStats}
              canUndo={history.length > 0}
            />
          </div>

          {/* Strategy Help Card */}
          <div className="bg-[#121110] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl mx-4 sm:mx-0" id="how-to-play-guide">
            <h3 className="text-xs font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2 border-b border-white/5 pb-2 font-bold">
              <BookOpen size={14} />
              Rules & Strategy Guides
            </h3>
            
            <div className="flex flex-col gap-2.5 text-xs text-stone-300 mt-2.5">
              <div className="flex gap-2">
                <span className="text-rose-400 font-bold shrink-0">•</span>
                <p>
                  <strong className="text-rose-400 font-medium">Red Player</strong> must establish a connected pathway from <strong className="text-white">Top to Bottom</strong>.
                </p>
              </div>

              <div className="flex gap-2">
                <span className="text-sky-400 font-bold shrink-0">•</span>
                <p>
                  <strong className="text-sky-400 font-medium">Blue Player / CPU</strong> must connect from <strong className="text-white">Left to Right</strong>.
                </p>
              </div>

              <div className="flex gap-2">
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <p>
                  Hex can **never end in a draw**. Due to the grid topology, one player is mathematically guaranteed to connect their sides.
                </p>
              </div>

              <div className="flex gap-2">
                <span className="text-emerald-400 font-bold shrink-0">•</span>
                <p>
                  <strong className="text-emerald-400 font-medium">The V-Bridge Technique</strong>: Place your stones in staggered, diagonal patterns. Since they share two open adjacent cells, it's virtually impossible for the opponent to completely cut your connection off!
                </p>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Modern Minimalist Footer */}
      <footer className="border-t border-white/5 pt-3.5 text-center text-[10px] font-mono text-stone-500 tracking-wider flex flex-col sm:flex-row items-center justify-between gap-2 px-4 sm:px-0" id="app-footer">
        <span>HEX DIGITAL CLASSIC COLLECTION</span>
        <span>NO DRAWS POSSIBLE • 11x11 RHOMBUS PLAYGROUND</span>
      </footer>

      {/* Game Winning Celebration Overlay Modal */}
      <WinnerModal
        winner={winner}
        gameMode={gameMode}
        onRestart={handleResetGame}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
