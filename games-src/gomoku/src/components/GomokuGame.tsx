/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Undo2, 
  Volume2, 
  VolumeX, 
  Info, 
  Sparkles, 
  User, 
  Users, 
  Check, 
  HelpCircle, 
  X,
  Play,
  Cpu
} from 'lucide-react';

import { Player, Board, GameMode, Difficulty, Winner, Move, GameStats } from '../types';
import { 
  getBestAIMove, 
  checkWinFromMove, 
  isBoardFull, 
  DIRECTIONS, 
  isValid 
} from '../utils/gomokuAI';
import {
  playClackSound,
  playWinSound,
  playTickSound
} from '../utils/audio';

// --- SkillForge iframe bridge ---------------------------------------------
function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function GomokuGame() {
  // --- Game States ---
  const [board, setBoard] = useState<Board>(() => 
    Array(15).fill(null).map(() => Array(15).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [winner, setWinner] = useState<Winner>(null);
  const [winningLine, setWinningLine] = useState<[number, number][] | null>(null);
  
  // Undo/History stacks
  const [boardHistory, setBoardHistory] = useState<Board[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  
  // Game mode & difficulty
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const aiThinkingRef = useRef(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Mobile-focused "Touch Assist" prevention mechanism
  const [touchAssistEnabled, setTouchAssistEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return true;
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  
  // Modals & Stats
  const [showRules, setShowRules] = useState(false);
  // Lets the player dismiss the game-over overlay while keeping `winner` set,
  // so the board stays locked and the AI does not resume on a finished board.
  const [overlayDismissed, setOverlayDismissed] = useState(false);
  const [stats, setStats] = useState<GameStats>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gomoku_stats_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return { blackWins: 0, whiteWins: 0, draws: 0 };
  });

  // Save stats to localStorage on update
  useEffect(() => {
    localStorage.setItem('gomoku_stats_v2', JSON.stringify(stats));
  }, [stats]);

  // SkillForge bridge: request cloud-saved progress on mount and merge in by
  // taking the max of each counter (local vs remote), so restoring never loses wins.
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'RESTORE_PROGRESS' || !msg.data) return;

      setStats(prev => {
        const remote = msg.data as Partial<GameStats>;
        const merged: GameStats = {
          blackWins: Math.max(prev.blackWins, Number(remote.blackWins) || 0),
          whiteWins: Math.max(prev.whiteWins, Number(remote.whiteWins) || 0),
          draws: Math.max(prev.draws, Number(remote.draws) || 0),
        };
        localStorage.setItem('gomoku_stats_v2', JSON.stringify(merged));
        return merged;
      });
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // SkillForge bridge: report score + stats once a match concludes. "Black" is
  // the player (in AI mode the human plays black), so blackWins doubles as the
  // best score; totalGames counts every completed match (wins + draws).
  useEffect(() => {
    if (!winner) return;
    const totalGames = stats.blackWins + stats.whiteWins + stats.draws;
    const bestScore = stats.blackWins;

    postToParent('BEST_SCORE', { bestScore });
    postToParent('GAME_STATS', { ...stats, bestScore, totalGames, lastResult: winner, gameMode });
  }, [winner]);

  // Audio helper wrapping our synthesizer with state check
  const triggerSound = useCallback((type: 'clack' | 'win' | 'tick') => {
    if (!soundEnabled) return;
    if (type === 'clack') playClackSound();
    if (type === 'win') playWinSound();
    if (type === 'tick') playTickSound();
  }, [soundEnabled]);

  // --- Reset current match ---
  const handleNewGame = useCallback(() => {
    triggerSound('tick');
    setBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
    setCurrentPlayer('black');
    setWinner(null);
    setWinningLine(null);
    setBoardHistory([]);
    setMoveHistory([]);
    aiThinkingRef.current = false;
    setIsAiThinking(false);
    setSelectedCell(null);
    setOverlayDismissed(false);
  }, [triggerSound]);

  // --- Reset scoreboard stats ---
  const handleResetStats = useCallback(() => {
    triggerSound('tick');
    setStats({ blackWins: 0, whiteWins: 0, draws: 0 });
  }, [triggerSound]);

  // --- Core move placement handler ---
  const makeMove = useCallback((row: number, col: number, player: Player) => {
    if (board[row][col] !== null || winner !== null || isAiThinking) return;

    // Save history prior to executing move
    setBoardHistory(prev => [...prev, board.map(r => [...r])]);
    
    // Create new board state
    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;
    
    const newMove: Move = { row, col, player };
    setMoveHistory(prev => [...prev, newMove]);
    setBoard(newBoard);
    triggerSound('clack');
    setSelectedCell(null); // Clear mobile selection on success

    // Win evaluation
    const winResult = checkWinFromMove(newBoard, row, col);
    if (winResult) {
      setWinner(winResult.winner);
      setWinningLine(winResult.line);
      triggerSound('win');
      
      // Update statistics
      setStats(prev => ({
        ...prev,
        blackWins: winResult.winner === 'black' ? prev.blackWins + 1 : prev.blackWins,
        whiteWins: winResult.winner === 'white' ? prev.whiteWins + 1 : prev.whiteWins,
      }));
      return;
    }

    // Draw evaluation
    if (isBoardFull(newBoard)) {
      setWinner('draw');
      setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
      return;
    }

    // Transition turn
    setCurrentPlayer(player === 'black' ? 'white' : 'black');
  }, [board, winner, isAiThinking, triggerSound]);

  // --- AI Player activation pipeline ---
  useEffect(() => {
    if (gameMode === 'ai' && currentPlayer === 'white' && winner === null && !aiThinkingRef.current) {
      aiThinkingRef.current = true;
      setIsAiThinking(true);
      
      // Tactile thinking delay of 650ms to simulate physical opponents
      const aiTimer = setTimeout(() => {
        const aiMove = getBestAIMove(board, difficulty);
        
        setBoardHistory(prev => [...prev, board.map(r => [...r])]);
        
        const newBoard = board.map(r => [...r]);
        newBoard[aiMove.row][aiMove.col] = 'white';
        
        const newMove: Move = { row: aiMove.row, col: aiMove.col, player: 'white' };
        setMoveHistory(prev => [...prev, newMove]);
        setBoard(newBoard);
        triggerSound('clack');
        setSelectedCell(null);

        const winResult = checkWinFromMove(newBoard, aiMove.row, aiMove.col);
        if (winResult) {
          setWinner('white');
          setWinningLine(winResult.line);
          triggerSound('win');
          setStats(prev => ({ ...prev, whiteWins: prev.whiteWins + 1 }));
        } else if (isBoardFull(newBoard)) {
          setWinner('draw');
          setStats(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
          setCurrentPlayer('black');
        }
        
        aiThinkingRef.current = false;
        setIsAiThinking(false);
      }, 650);

      return () => {
        clearTimeout(aiTimer);
        aiThinkingRef.current = false;
      };
    }
  }, [gameMode, currentPlayer, board, winner, difficulty, triggerSound]);

  // --- Undo handler ---
  const handleUndo = useCallback(() => {
    if (boardHistory.length === 0 || isAiThinking) return;
    triggerSound('tick');
    setSelectedCell(null);
    setOverlayDismissed(false);

    // In AI mode, we undo BOTH the AI's move and the user's last move (reverting by 2 states)
    if (gameMode === 'ai') {
      if (boardHistory.length >= 2) {
        const targetBoardState = boardHistory[boardHistory.length - 2];
        setBoard(targetBoardState);
        setBoardHistory(prev => prev.slice(0, prev.length - 2));
        setMoveHistory(prev => prev.slice(0, prev.length - 2));
        setCurrentPlayer('black');
        setWinner(null);
        setWinningLine(null);
      } else {
        // Fall back to complete board reset if only 1 move was on board
        setBoard(Array(15).fill(null).map(() => Array(15).fill(null)));
        setBoardHistory([]);
        setMoveHistory([]);
        setCurrentPlayer('black');
        setWinner(null);
        setWinningLine(null);
      }
    } else {
      // Local Mode: Undo exactly 1 turn
      const targetBoardState = boardHistory[boardHistory.length - 1];
      setBoard(targetBoardState);
      setBoardHistory(prev => prev.slice(0, prev.length - 1));
      setMoveHistory(prev => prev.slice(0, prev.length - 1));
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
      setWinner(null);
      setWinningLine(null);
    }
  }, [boardHistory, gameMode, currentPlayer, isAiThinking, triggerSound]);

  // Check if a cell is one of the 9 traditional Go star points (Hoshi)
  const isStarPoint = (r: number, c: number): boolean => {
    return (r === 3 || r === 7 || r === 11) && (c === 3 || c === 7 || c === 11);
  };

  const lastMove = moveHistory[moveHistory.length - 1] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-4 sm:py-6 px-0 sm:px-4 font-sans select-none overflow-x-hidden">
      
      {/* Decorative Tabletop Shadows Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.3)_0%,transparent_70%)] pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="relative w-full max-w-5xl flex flex-row justify-between items-center mb-3 sm:mb-6 gap-2 border-b border-slate-800/60 pb-3 sm:pb-5 z-10 px-4 sm:px-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-br from-amber-500 to-amber-700 p-1 sm:p-1.5 rounded-lg shadow-inner shadow-white/20">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-50" />
            </span>
            <div>
              <h1 className="font-display text-xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-100 via-amber-200 to-amber-400 leading-none">
                Gomoku
              </h1>
              <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 uppercase tracking-wider font-medium hidden xs:block">
                Five-in-a-Row Board Game
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Sound Toggle */}
          <button 
            id="sound-toggle-btn"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) {
                // Short play to confirm activation
                playTickSound();
              }
            }}
            className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border transition-all cursor-pointer ${
              soundEnabled 
                ? 'bg-slate-900 border-amber-500/30 text-amber-400 hover:bg-slate-800' 
                : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-900'
            }`}
            title={soundEnabled ? "Mute sound" : "Unmute sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Rules / Tutorial Button */}
          <button 
            id="rules-toggle-btn"
            onClick={() => { triggerSound('tick'); setShowRules(true); }}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-slate-300 hover:text-white transition-all text-xs sm:text-sm font-medium cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>How to Play</span>
          </button>
        </div>
      </header>

      {/* --- MAIN LAYOUT CONTAINER --- */}
      <main className="relative w-full max-w-5xl flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-8 items-start z-10 flex-1">
        
        {/* --- LEFT SIDEBAR: DASHBOARD & CONFIG --- */}
        <section className="lg:col-span-4 order-2 lg:order-1 flex flex-col gap-3.5 sm:gap-5 w-full justify-start px-4 sm:px-0">
          
          {/* Game Mode Selector Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
            <h2 className="text-[11px] sm:text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" /> Game Mode
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="mode-solo-btn"
                onClick={() => {
                  if (isAiThinking) return;
                  triggerSound('tick');
                  setGameMode('ai');
                  handleNewGame();
                }}
                className={`flex flex-col items-center gap-1 py-2 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  gameMode === 'ai'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.05)]'
                    : 'bg-slate-950 border-slate-800/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>VS Computer</span>
              </button>
              <button
                id="mode-local-btn"
                onClick={() => {
                  if (isAiThinking) return;
                  triggerSound('tick');
                  setGameMode('local');
                  handleNewGame();
                }}
                className={`flex flex-col items-center gap-1 py-2 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  gameMode === 'local'
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.05)]'
                    : 'bg-slate-950 border-slate-800/60 text-slate-400 hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Pass & Play</span>
              </button>
            </div>

            {/* AI Difficulty Selector (Rendered ONLY in vs computer) */}
            <AnimatePresence mode="popLayout">
              {gameMode === 'ai' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 pt-3 border-t border-slate-800/80 overflow-hidden"
                >
                  <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" /> AI Difficulty
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                      <button
                        key={level}
                        id={`diff-${level}-btn`}
                        onClick={() => {
                          if (isAiThinking) return;
                          triggerSound('tick');
                          setDifficulty(level);
                        }}
                        className={`py-1.5 sm:py-2 rounded-lg border text-[10px] sm:text-xs font-semibold capitalize transition-all cursor-pointer ${
                          difficulty === level
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/10'
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900 hover:text-slate-300'
                        }`}
                      >
                        {level === 'easy' ? 'Novice' : level === 'medium' ? 'Master' : 'Grandmaster'}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Touch Assist Toggle (highly polished on mobile) */}
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[11px] sm:text-xs font-bold text-slate-200 flex items-center gap-1">
                  Touch Assist
                  <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded font-normal uppercase">Mobile</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-400">Tap to select, tap again/confirm to play</span>
              </div>
              <button
                id="touch-assist-toggle"
                onClick={() => {
                  triggerSound('tick');
                  setTouchAssistEnabled(!touchAssistEnabled);
                  setSelectedCell(null);
                }}
                className={`w-9 sm:w-10 h-5 sm:h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
                  touchAssistEnabled ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-slate-950 shadow-md transform duration-200 ease-in-out ${
                  touchAssistEnabled ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Scoreboard Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md flex flex-col gap-3 sm:gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" /> Match Records
              </h2>
              <button 
                id="reset-stats-btn"
                onClick={handleResetStats}
                className="text-[9px] sm:text-[10px] text-slate-500 hover:text-amber-400 transition-colors uppercase tracking-wider cursor-pointer"
              >
                Reset Scores
              </button>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
              {/* Black / Player 1 */}
              <div className="bg-slate-950 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-800/40 relative">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-900 border border-neutral-950 mx-auto mb-1 shadow-md" />
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block truncate">
                  {gameMode === 'ai' ? 'Player (Black)' : 'P1 (Black)'}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-amber-100 block mt-0.5 sm:mt-1">
                  {stats.blackWins}
                </span>
              </div>

              {/* Draws */}
              <div className="bg-slate-950 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-800/40">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm bg-slate-800 mx-auto mb-1" />
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block">Draws</span>
                <span className="text-xl sm:text-2xl font-bold text-slate-400 block mt-0.5 sm:mt-1">
                  {stats.draws}
                </span>
              </div>

              {/* White / Player 2 / AI */}
              <div className="bg-slate-950 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-slate-800/40 relative">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-br from-white to-neutral-200 border border-neutral-300 mx-auto mb-1 shadow-md" />
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium block truncate">
                  {gameMode === 'ai' ? 'Computer' : 'P2 (White)'}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-amber-100 block mt-0.5 sm:mt-1">
                  {stats.whiteWins}
                </span>
              </div>
            </div>
          </div>

          {/* Turn Indicator / Action Card */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md flex-1 flex flex-col justify-center items-center py-3.5 sm:py-6 text-center">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-2 sm:mb-3">
              Current Game State
            </span>

            {winner ? (
              <div className="flex flex-col items-center">
                {winner === 'draw' ? (
                  <>
                    <div className="text-amber-400 text-sm sm:text-lg font-bold">Draw Match!</div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1">The grid has been completely filled.</p>
                  </>
                ) : (
                  <>
                    <div className="relative mb-2.5 sm:mb-3 flex justify-center">
                      {/* Floating trophy effect */}
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-bounce" />
                    </div>
                    <div className="text-base sm:text-xl font-extrabold capitalize text-amber-100 tracking-wide">
                      {winner === 'black' ? (gameMode === 'ai' ? 'Player Wins!' : 'Player 1 Wins!') : (gameMode === 'ai' ? 'Computer Wins!' : 'Player 2 Wins!')}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                      Five stones connected in a perfect line!
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                {/* Tactical Indicator pulse circle */}
                <div className="relative mb-2.5 sm:mb-4 flex items-center justify-center">
                  <div className={`absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full blur-md opacity-20 animate-pulse ${
                    currentPlayer === 'black' ? 'bg-amber-400' : 'bg-slate-100'
                  }`} />
                  {currentPlayer === 'black' ? (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-neutral-950 shadow-lg border border-neutral-950 relative flex items-center justify-center">
                      <div className="absolute top-[10%] left-[15%] w-[30%] h-[15%] rounded-full bg-white/20 blur-[0.5px]" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-300 shadow-lg border border-neutral-300 relative flex items-center justify-center">
                      <div className="absolute top-[8%] left-[12%] w-[30%] h-[15%] rounded-full bg-white/70 blur-[0.5px]" />
                    </div>
                  )}
                </div>

                {isAiThinking ? (
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-bounce delay-75" />
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-bounce delay-150" />
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 animate-bounce delay-300" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1.5 sm:mt-2">
                      AI is thinking...
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-sm sm:text-lg font-bold capitalize text-amber-100">
                      {currentPlayer === 'black' ? (gameMode === 'ai' ? 'Your Turn' : 'Player 1 (Black)') : (gameMode === 'ai' ? "Computer's Turn" : 'Player 2 (White)')}
                    </span>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                      Place a stone on any line intersection
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </section>

        {/* --- RIGHT SIDEBAR: THE MAIN BOARD CONTAINER & CONTROLS --- */}
        <section className="lg:col-span-8 order-1 lg:order-2 flex flex-col items-center gap-4 sm:gap-6 w-full">
          
          {/* Board Frame Wrapper */}
          <div className="relative w-full max-w-full sm:max-w-[min(100vw-2rem,530px)] aspect-square bg-amber-950/40 p-0 sm:p-4 rounded-none sm:rounded-3xl shadow-2xl border-y sm:border border-slate-800/80 backdrop-blur-sm">
            
            {/* Wooden board texture & border */}
            <div 
              id="gomoku-wooden-board"
              className="relative w-full h-full aspect-square bg-gradient-to-br from-[#eec285] via-[#e5b675] to-[#d6a053] rounded-none sm:rounded-2xl shadow-[inset_0_4px_12px_rgba(255,255,255,0.4),0_8px_24px_rgba(0,0,0,0.6)] border-y-[3px] sm:border-[4px] border-x-0 sm:border-x-[4px] border-amber-950 flex flex-col overflow-hidden p-1 sm:p-2 md:p-2.5"
            >
              {/* Thin black boundary inner border for professional Go style */}
              <div className="absolute inset-y-1 inset-x-0 sm:inset-1.5 md:inset-2.5 border-y sm:border border-amber-950/20 rounded-none sm:rounded-lg pointer-events-none" />

              {/* Grid 15x15 */}
              <div 
                className="w-full h-full grid select-none animate-fade-in"
                style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
              >
                {Array(15).fill(null).map((_, r) => (
                  Array(15).fill(null).map((_, c) => {
                    const stone = board[r][c];
                    const isWinningCell = winningLine?.some(([wr, wc]) => wr === r && wc === c) ?? false;
                    const isLast = lastMove && lastMove.row === r && lastMove.col === c;
                    const isStar = isStarPoint(r, c);
                    const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;

                    // Crosshair length modifiers to prevent edge bleeding
                    const verticalLineStyle = 
                      r === 0 ? "top-1/2 bottom-0" : 
                      r === 14 ? "top-0 bottom-1/2" : 
                      "top-0 bottom-0";
                    
                    const horizontalLineStyle = 
                      c === 0 ? "left-1/2 right-0" : 
                      c === 14 ? "left-0 right-1/2" : 
                      "left-0 right-0";

                    return (
                      <div
                        key={`${r}-${c}`}
                        id={`cell-${r}-${c}`}
                        onClick={() => {
                          if (stone !== null || winner !== null || isAiThinking) return;

                          if (touchAssistEnabled) {
                            if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
                              // Second tap on the same cell confirms placement
                              makeMove(r, c, currentPlayer);
                            } else {
                              // First tap selects and plays tick sound
                              triggerSound('tick');
                              setSelectedCell({ row: r, col: c });
                            }
                          } else {
                            // Classic instant tap placement
                            makeMove(r, c, currentPlayer);
                          }
                        }}
                        className="relative flex items-center justify-center cursor-pointer group transition-all"
                        style={{ aspectRatio: '1/1' }}
                      >
                        {/* Grid Lines Intersections Underneath */}
                        <div className={`absolute left-1/2 -translate-x-[0.5px] w-[1.5px] bg-amber-950/35 ${verticalLineStyle} pointer-events-none`} />
                        <div className={`absolute top-1/2 -translate-y-[0.5px] h-[1.5px] bg-amber-950/35 ${horizontalLineStyle} pointer-events-none`} />

                        {/* Traditional Star Point (Hoshi) Indicator */}
                        {isStar && !stone && (
                          <div className="absolute w-[5px] h-[5px] md:w-[6.5px] md:h-[6.5px] rounded-full bg-amber-950/75 pointer-events-none transform -translate-x-[0.25px] -translate-y-[0.25px]" />
                        )}

                        {/* Hover Preview Translucent Ghost Stone (Desktop hover) */}
                        {!stone && !isSelected && winner === null && !isAiThinking && (
                          <div className={`absolute w-[86%] h-[86%] rounded-full opacity-0 group-hover:opacity-40 transition-all duration-150 pointer-events-none flex items-center justify-center scale-90 group-hover:scale-100 ${
                            currentPlayer === 'black'
                              ? 'bg-gradient-to-br from-neutral-800 to-neutral-950 shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                              : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                          }`} />
                        )}

                        {/* Touch Assist Selected State Preview */}
                        {isSelected && !stone && (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="absolute w-[88%] h-[88%] z-20 pointer-events-none flex items-center justify-center"
                          >
                            {/* High-visibility glowing target selector ring */}
                            <div className="absolute inset-[-4px] rounded-full border-2 border-dashed border-amber-400 animate-[spin_8s_linear_infinite] shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                            
                            {currentPlayer === 'black' ? (
                              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-neutral-950 opacity-90 border border-neutral-950 flex items-center justify-center">
                                <div className="absolute top-[10%] left-[14%] w-[30%] h-[15%] rounded-full bg-white/15 blur-[0.5px]" />
                                {/* Pulsing indicator core */}
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute" />
                                <div className="w-2 h-2 rounded-full bg-amber-400 absolute" />
                              </div>
                            ) : (
                              <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-300 opacity-90 border border-neutral-300/40 flex items-center justify-center">
                                <div className="absolute top-[8%] left-[10%] w-[32%] h-[16%] rounded-full bg-white/70 blur-[0.3px]" />
                                {/* Pulsing indicator core */}
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute" />
                                <div className="w-2 h-2 rounded-full bg-amber-500 absolute" />
                              </div>
                            )}
                          </motion.div>
                        )}

                        {/* Placed Real 3D Stone with scale animation */}
                        {stone && (
                          <motion.div
                            initial={{ scale: 0.3, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 350, damping: 20 }}
                            className="absolute w-[88%] h-[88%] z-10 pointer-events-none"
                          >
                            {stone === 'black' ? (
                              /* Matte Deep Black Stone styling */
                              <div className={`relative w-full h-full rounded-full bg-gradient-to-br from-neutral-700 via-neutral-900 to-neutral-950 shadow-[1px_2.5px_4px_rgba(0,0,0,0.45),inset_1px_1px_1.5px_rgba(255,255,255,0.18)] border border-neutral-950 flex items-center justify-center ${
                                isWinningCell ? 'ring-4 ring-amber-400 ring-offset-1 ring-offset-amber-900 animate-pulse' : ''
                              }`}>
                                {/* Subtle white glare dot at top-left */}
                                <div className="absolute top-[10%] left-[14%] w-[30%] h-[15%] rounded-full bg-white/15 blur-[0.5px] transform rotate-[-15deg]" />
                                
                                {/* Last move center indicator dot */}
                                {isLast && !isWinningCell && (
                                  <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24] animate-pulse" />
                                )}
                              </div>
                            ) : (
                              /* Glossy White Porcelain Stone styling */
                              <div className={`relative w-full h-full rounded-full bg-gradient-to-br from-white via-neutral-100 to-neutral-280 shadow-[1px_2.5px_4px_rgba(0,0,0,0.32),inset_-0.5px_-0.5px_2px_rgba(0,0,0,0.12)] border border-neutral-300/40 flex items-center justify-center ${
                                isWinningCell ? 'ring-4 ring-amber-400 ring-offset-1 ring-offset-amber-900 animate-pulse' : ''
                              }`}>
                                {/* Shiny porcelain glare crescent */}
                                <div className="absolute top-[8%] left-[10%] w-[32%] h-[16%] rounded-full bg-white/70 blur-[0.3px] transform rotate-[-12deg]" />
                                
                                {/* Last move center indicator dot */}
                                {isLast && !isWinningCell && (
                                  <div className="w-2 h-2 rounded-full bg-amber-800 shadow-[0_0_3px_rgba(0,0,0,0.4)] animate-pulse" />
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                ))}
              </div>
            </div>
          </div>

          {/* --- MOBILE TOUCH ASSIST CONFIRMATION BUTTON --- */}
          <div className="w-full max-w-full sm:max-w-[min(100vw-2rem,530px)] flex flex-col items-stretch overflow-hidden px-4 sm:px-0">
            <AnimatePresence initial={false}>
              {selectedCell && (
                <motion.button
                  id="confirm-stone-btn"
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  onClick={() => {
                    if (selectedCell) {
                      makeMove(selectedCell.row, selectedCell.col, currentPlayer);
                    }
                  }}
                  className="w-full py-4.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/10 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-amber-400 cursor-pointer mb-3.5"
                >
                  <Check className="w-4 h-4 text-slate-950 stroke-[3.5]" />
                  <span>Confirm Stone Placement</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* --- CONTROL BUTTONS PANEL --- */}
          <div className="w-full max-w-full sm:max-w-[min(100vw-2rem,530px)] flex gap-3.5 justify-between px-4 sm:px-0">
            <button
              id="undo-btn"
              onClick={handleUndo}
              disabled={boardHistory.length === 0 || isAiThinking}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all border shadow-lg cursor-pointer ${
                boardHistory.length === 0 || isAiThinking
                  ? 'bg-slate-950 border-slate-900 text-slate-600 cursor-not-allowed shadow-none'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-amber-400 hover:border-amber-500/20 hover:bg-slate-800'
              }`}
            >
              <Undo2 className="w-4 h-4" />
              <span>Undo Move</span>
            </button>

            <button
              id="new-game-btn"
              onClick={handleNewGame}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 transition-all border border-amber-600 hover:border-amber-400 shadow-lg shadow-amber-500/10 hover:shadow-amber-400/20 active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-950" />
              <span>New Game</span>
            </button>
          </div>
        </section>
      </main>

        {/* --- DIALOG MODAL: GAME OVER / VICTORY OVERLAY --- */}
        <AnimatePresence>
          {winner && !overlayDismissed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
              >
                {/* Visual celebration effects in background */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-600" />
                
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="mb-4 mt-2 inline-flex p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <Trophy className="w-10 h-10 text-amber-400" />
                </div>

                <h2 className="text-2xl font-black tracking-tight text-amber-100">
                  {winner === 'draw' ? 'No Victor!' : 'Match Finished'}
                </h2>
                
                <p className="text-sm text-slate-400 mt-2 px-2 leading-relaxed">
                  {winner === 'draw' ? (
                    "The board has been filled with no 5-in-a-row connections."
                  ) : (
                    <>
                      Congratulations to <span className="font-bold text-amber-400 capitalize">{winner}</span> for aligning exactly five stones in a row!
                    </>
                  )}
                </p>

                {/* Scoreboard Review */}
                <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-850 mt-5 mb-6 flex justify-around text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Black</span>
                    <span className="text-xl font-bold text-slate-300">{stats.blackWins}</span>
                  </div>
                  <div className="border-l border-slate-800" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Draws</span>
                    <span className="text-xl font-bold text-slate-300">{stats.draws}</span>
                  </div>
                  <div className="border-l border-slate-800" />
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">White</span>
                    <span className="text-xl font-bold text-slate-300">{stats.whiteWins}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    id="win-new-game-btn"
                    onClick={handleNewGame}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/15 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Play Again</span>
                  </button>
                  <button
                    id="win-close-btn"
                    onClick={() => { triggerSound('tick'); setOverlayDismissed(true); }}
                    className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Close Overlay
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- DIALOG MODAL: RULES / HOW TO PLAY --- */}
        <AnimatePresence>
          {showRules && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.92, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.92, y: 15, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative shadow-2xl"
              >
                <button 
                  id="rules-close-btn"
                  onClick={() => { triggerSound('tick'); setShowRules(false); }}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2.5 mb-4">
                  <span className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <HelpCircle className="w-5 h-5 text-amber-400" />
                  </span>
                  <h2 className="text-xl font-bold tracking-tight text-amber-100">
                    Rules & Instructions
                  </h2>
                </div>

                <div className="text-slate-300 text-sm space-y-4 leading-relaxed max-h-[380px] overflow-y-auto pr-1">
                  <div>
                    <h3 className="font-bold text-amber-400 text-xs uppercase tracking-wider mb-1.5">Game Board Intersections</h3>
                    <p>
                      Gomoku is traditionally played on a grid of intersections rather than squares. In our high-fidelity layout, stones are placed directly at the crosshairs of the lines on a standard 15x15 board.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-400 text-xs uppercase tracking-wider mb-1.5">Basic Rules</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>Black and White take alternate turns placing stones on empty intersections.</li>
                      <li>Black (Player 1) always moves first.</li>
                      <li>The objective is to align exactly or more than 5 consecutive stones of your color in a straight line horizontally, vertically, or diagonally.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-400 text-xs uppercase tracking-wider mb-1.5">Tactile Visual Indicators</h3>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li><strong className="text-slate-100">Hoshi (Star Points)</strong>: The 9 distinct dark brown dots on the wooden board serve as reference markers.</li>
                      <li><strong className="text-slate-100">Last Move Ring</strong>: A colored pulse in the center of the stone shows the most recently placed stone, so you never lose track.</li>
                      <li><strong className="text-slate-100">Hover Guide</strong>: Hovering reveals a translucent preview stone matching the active player's turn.</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-400 text-xs uppercase tracking-wider mb-1.5">Undo & AI Opponent</h3>
                    <p>
                      Click <strong className="text-slate-100">Undo Move</strong> to reverse mistakes. When playing against the Computer, undoing a move rolls back both your and the AI's moves, maintaining seamless, localized gameplay logic.
                    </p>
                  </div>
                </div>

                <button
                  id="rules-dismiss-btn"
                  onClick={() => { triggerSound('tick'); setShowRules(false); }}
                  className="w-full mt-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  Got It, Let's Play!
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      
    </div>
  );
}
