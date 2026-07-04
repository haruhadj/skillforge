import { useState, useEffect, useCallback } from 'react';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Info, 
  X, 
  Trophy, 
  User, 
  Monitor, 
  Sparkles, 
  BookOpen, 
  Play,
  Swords,
  Award,
  Settings
} from 'lucide-react';

// Reversi Hard AI position weight matrix
// Center cells are 0-indexed: corners (0,0), (0,7), (7,0), (7,7) are highly valued.
// Cells surrounding corners are penalised.
const POSITION_WEIGHTS = [
  [120, -20,  20,   5,   5,  20, -20, 120],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [120, -20,  20,   5,   5,  20, -20, 120]
];

type Player = 'BLACK' | 'WHITE';
type GameMode = 'PASS_AND_PLAY' | 'VS_COMPUTER';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type GameStatus = 'PLAYING' | 'PASS_NOTIFICATION' | 'GAME_OVER';

// --- SkillForge iframe bridge ---------------------------------------------
const BEST_SCORE_KEY = 'renegade-best-score';
const TOTAL_GAMES_KEY = 'renegade-total-games';
const WINS_KEY = 'renegade-wins';

function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function App() {
  // Game Configuration & Preferences
  const [gameMode, setGameMode] = useState<GameMode>('VS_COMPUTER');
  const [computerColor, setComputerColor] = useState<Player>('WHITE');
  const [aiDifficulty, setAiDifficulty] = useState<Difficulty>('HARD');
  const [showHints, setShowHints] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Core Game State
  const [board, setBoard] = useState<(string | null)[][]>(() => createInitialBoard());
  const [turn, setTurn] = useState<Player>('BLACK');
  const [scores, setScores] = useState({ black: 2, white: 2 });
  const [validMoves, setValidMoves] = useState<[number, number][]>([]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('PLAYING');
  const [winner, setWinner] = useState<'BLACK' | 'WHITE' | 'DRAW' | null>(null);
  const [passPlayer, setPassPlayer] = useState<Player | null>(null);

  // Statistics History
  const [matchHistory, setMatchHistory] = useState<{winner: string, blackScore: number, whiteScore: number, date: string}[]>([]);

  // SkillForge bridge: restore best score / totals from the host, accept player identity
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type !== 'RESTORE_PROGRESS' || !msg.data) return;

      const remoteBest = Number(msg.data.bestScore);
      if (!Number.isNaN(remoteBest)) {
        const localBest = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
        if (remoteBest > localBest) localStorage.setItem(BEST_SCORE_KEY, String(remoteBest));
      }
      const remoteTotal = Number(msg.data.totalGames);
      if (!Number.isNaN(remoteTotal)) {
        const localTotal = Number(localStorage.getItem(TOTAL_GAMES_KEY) || 0);
        if (remoteTotal > localTotal) localStorage.setItem(TOTAL_GAMES_KEY, String(remoteTotal));
      }
      const remoteWins = Number(msg.data.wins);
      if (!Number.isNaN(remoteWins)) {
        const localWins = Number(localStorage.getItem(WINS_KEY) || 0);
        if (remoteWins > localWins) localStorage.setItem(WINS_KEY, String(remoteWins));
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // SkillForge bridge: report score + stats once a match concludes.
  // Session score is the human side's disc tally in a decisive win (0 on a loss/draw),
  // so "best score" tracks the player's most dominant win margin over time.
  useEffect(() => {
    if (gameStatus !== 'GAME_OVER' || !winner) return;

    const humanColor = gameMode === 'VS_COMPUTER' ? (computerColor === 'BLACK' ? 'WHITE' : 'BLACK') : null;
    const playerWon = humanColor ? winner === humanColor : winner !== 'DRAW';
    const sessionScore = playerWon ? (winner === 'BLACK' ? scores.black : scores.white) : 0;

    const prevBest = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    const bestScore = Math.max(prevBest, sessionScore);
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));

    const wins = Number(localStorage.getItem(WINS_KEY) || 0) + (playerWon ? 1 : 0);
    localStorage.setItem(WINS_KEY, String(wins));

    const totalGames = Number(localStorage.getItem(TOTAL_GAMES_KEY) || 0) + 1;
    localStorage.setItem(TOTAL_GAMES_KEY, String(totalGames));

    postToParent('BEST_SCORE', { bestScore });
    postToParent('GAME_STATS', { bestScore, wins, totalGames, lastResult: winner, gameMode });
  }, [gameStatus, winner]);

  // Sound Synthesizer via Web Audio API (tactile wooden feel)
  const playSound = useCallback((type: 'place' | 'flip' | 'pass' | 'win' | 'click') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === 'place') {
        // Crisp high-quality wooden piece "clack"
        const osc = ctx.createOscillator();
        const bandpass = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.08);

        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(220, ctx.currentTime);
        bandpass.Q.setValueAtTime(3, ctx.currentTime);

        gain.gain.setValueAtTime(0.6, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'flip') {
        // Soft friction slide + tiny click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(290, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.06);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      } else if (type === 'pass') {
        // Elegant retro double chime
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(392.00, now); // G4
        osc1.frequency.setValueAtTime(523.25, now + 0.12); // C5

        osc2.frequency.setValueAtTime(493.88, now); // B4
        osc2.frequency.setValueAtTime(659.25, now + 0.12); // E5

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
      } else if (type === 'win') {
        // Glorious Nintendo-style rising arpeggio
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C major arpeggio
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + idx * 0.09;
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.005, start + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(start);
          osc.stop(start + 0.4);
        });
      } else if (type === 'click') {
        // Minimal UI tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch (e) {
      console.warn('AudioContext initialization ignored until user interaction', e);
    }
  }, [isMuted]);

  // Helper: Initialize empty board with 4 center starting pieces
  function createInitialBoard(): (string | null)[][] {
    const arr = Array(8).fill(null).map(() => Array(8).fill(null));
    arr[3][3] = 'WHITE';
    arr[3][4] = 'BLACK';
    arr[4][3] = 'BLACK';
    arr[4][4] = 'WHITE';
    return arr;
  }

  // Restart/Reset Game
  const handleReset = () => {
    playSound('click');
    setBoard(createInitialBoard());
    setTurn('BLACK');
    setGameStatus('PLAYING');
    setWinner(null);
    setPassPlayer(null);
    setIsAnimating(false);
  };

  // Helper: Adjacency Scan algorithm to find captured pieces
  const getFlippedPieces = (
    currentBoard: (string | null)[][],
    r: number,
    c: number,
    player: Player
  ): [number, number][] => {
    if (currentBoard[r][c] !== null) return [];
    const opponent = player === 'BLACK' ? 'WHITE' : 'BLACK';
    const flipped: [number, number][] = [];
    
    // 8 structural cardinal/diagonal directions
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [dr, dc] of directions) {
      let currR = r + dr;
      let currC = c + dc;
      const tempLine: [number, number][] = [];
      
      while (currR >= 0 && currR < 8 && currC >= 0 && currC < 8) {
        const cell = currentBoard[currR][currC];
        if (cell === opponent) {
          tempLine.push([currR, currC]);
        } else if (cell === player) {
          // Sandwich flanked! Register consecutive opponents
          if (tempLine.length > 0) {
            flipped.push(...tempLine);
          }
          break;
        } else {
          // Hit an empty cell before reaching our own piece, invalid path
          break;
        }
        currR += dr;
        currC += dc;
      }
    }

    return flipped;
  };

  // Execute a valid move at (row, col)
  const executeMove = async (row: number, col: number) => {
    if (isAnimating) return;
    const activePlayer = turn;
    const opponent = activePlayer === 'BLACK' ? 'WHITE' : 'BLACK';

    const flips = getFlippedPieces(board, row, col, activePlayer);
    if (flips.length === 0) return;

    setIsAnimating(true);

    // 1. Place the initial tile on the board
    let updatedBoard = board.map(r => [...r]);
    updatedBoard[row][col] = activePlayer;
    setBoard(updatedBoard);
    playSound('place');

    // 2. Sort flipping coordinates by radial distance for waves propagation
    const sortedFlips = [...flips].sort((a, b) => {
      const distA = Math.max(Math.abs(a[0] - row), Math.abs(a[1] - col));
      const distB = Math.max(Math.abs(b[0] - row), Math.abs(b[1] - col));
      return distA - distB;
    });

    // 3. Sequential staggered flip with incremental sound
    for (let i = 0; i < sortedFlips.length; i++) {
      const [fr, fc] = sortedFlips[i];
      const dist = Math.max(Math.abs(fr - row), Math.abs(fc - col));
      await new Promise(resolve => setTimeout(resolve, 60 + dist * 70));
      
      setBoard(prev => {
        const b = prev.map(r => [...r]);
        b[fr][fc] = activePlayer;
        return b;
      });
      playSound('flip');
    }

    // Wait for the final flip animation to finish spinning
    await new Promise(resolve => setTimeout(resolve, 300));

    // Calculate updated board counts
    const finalBoard = updatedBoard.map(r => [...r]);
    flips.forEach(([fr, fc]) => {
      finalBoard[fr][fc] = activePlayer;
    });

    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (finalBoard[r][c] === 'BLACK') blackCount++;
        if (finalBoard[r][c] === 'WHITE') whiteCount++;
      }
    }
    setScores({ black: blackCount, white: whiteCount });

    // 4. Determine moves for opponent
    const oppMoves: [number, number][] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (getFlippedPieces(finalBoard, r, c, opponent).length > 0) {
          oppMoves.push([r, c]);
        }
      }
    }

    if (oppMoves.length > 0) {
      // Direct handoff
      setTurn(opponent);
      setValidMoves(oppMoves);
      setIsAnimating(false);
    } else {
      // Opponent has no valid moves! Must trigger PASS.
      // Check if original active player can move next
      const nextActiveMoves: [number, number][] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (getFlippedPieces(finalBoard, r, c, activePlayer).length > 0) {
            nextActiveMoves.push([r, c]);
          }
        }
      }

      if (nextActiveMoves.length === 0) {
        // Neither player can move (full board or both locked out) -> GAME OVER
        setValidMoves([]);
        setGameStatus('GAME_OVER');
        playSound('win');
        
        let finalWinner: 'BLACK' | 'WHITE' | 'DRAW' = 'DRAW';
        if (blackCount > whiteCount) finalWinner = 'BLACK';
        else if (whiteCount > blackCount) finalWinner = 'WHITE';
        setWinner(finalWinner);
        
        // Add to statistics
        setMatchHistory(prev => [
          {
            winner: finalWinner,
            blackScore: blackCount,
            whiteScore: whiteCount,
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev.slice(0, 9)
        ]);
        
        setIsAnimating(false);
      } else {
        // Inform active player opponent passed, turn rolls back
        setPassPlayer(opponent);
        setGameStatus('PASS_NOTIFICATION');
        playSound('pass');
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setGameStatus('PLAYING');
        setTurn(activePlayer);
        setValidMoves(nextActiveMoves);
        setIsAnimating(false);
      }
    }
  };

  // Handler for user tapping/clicking a tile
  const handleCellClick = (rowIndex: number, colIndex: number) => {
    if (gameStatus !== 'PLAYING') return;
    if (isAnimating) return;

    // Prevent clicking during computer's active thinking sequence
    if (gameMode === 'VS_COMPUTER' && turn === computerColor) {
      return;
    }

    const isValid = validMoves.some(([vr, vc]) => vr === rowIndex && vc === colIndex);
    if (!isValid) return;

    executeMove(rowIndex, colIndex);
  };

  // AI Logic: Returns best strategic position
  const getBestMoveHard = (moves: [number, number][], currentBoard: (string | null)[][], playerColor: Player): [number, number] => {
    let bestMove = moves[0];
    let maxScore = -Infinity;

    for (const [r, c] of moves) {
      // 1. Core positional matrix weight
      let score = POSITION_WEIGHTS[r][c];

      // 2. Greedy weight: flips caused
      const flipsCount = getFlippedPieces(currentBoard, r, c, playerColor).length;
      score += flipsCount * 1.5;

      // 3. Extra bonus for captured corners
      if ((r === 0 || r === 7) && (c === 0 || c === 7)) {
        score += 150;
      }

      // 4. Edge stability bonus
      if (r === 0 || r === 7 || c === 0 || c === 7) {
        score += 15;
      }

      if (score > maxScore) {
        maxScore = score;
        bestMove = [r, c];
      }
    }

    return bestMove;
  };

  // Computer AI turn trigger
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;
    if (gameMode !== 'VS_COMPUTER') return;
    if (turn !== computerColor) return;
    if (isAnimating) return;
    if (validMoves.length === 0) return;

    const aiTimer = setTimeout(() => {
      let selectedMove: [number, number];

      if (aiDifficulty === 'EASY') {
        // Random legal move
        const idx = Math.floor(Math.random() * validMoves.length);
        selectedMove = validMoves[idx];
      } else if (aiDifficulty === 'MEDIUM') {
        // Choose move maximizing flip counts (Greedy strategy)
        let maxFlips = -1;
        let chosen = validMoves[0];
        
        for (const [r, c] of validMoves) {
          const count = getFlippedPieces(board, r, c, turn).length;
          if (count > maxFlips) {
            maxFlips = count;
            chosen = [r, c];
          }
        }
        selectedMove = chosen;
      } else {
        // HARD difficulty
        selectedMove = getBestMoveHard(validMoves, board, turn);
      }

      executeMove(selectedMove[0], selectedMove[1]);
    }, 900); // Elegant thinking lag simulation

    return () => clearTimeout(aiTimer);
  }, [turn, gameStatus, gameMode, computerColor, validMoves, isAnimating, aiDifficulty, board]);

  // Compute active valid moves dynamically when board or player changes
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      const moves: [number, number][] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (getFlippedPieces(board, r, c, turn).length > 0) {
            moves.push([r, c]);
          }
        }
      }
      setValidMoves(moves);

      // What if the game initializes, or resets, and there are absolutely no legal moves for active player?
      if (moves.length === 0) {
        // Trigger pass checks recursively or instantly
        const opponent = turn === 'BLACK' ? 'WHITE' : 'BLACK';
        const oppMoves: [number, number][] = [];
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            if (getFlippedPieces(board, r, c, opponent).length > 0) {
              oppMoves.push([r, c]);
            }
          }
        }

        if (oppMoves.length === 0) {
          // No moves for anyone -> Game Over
          setGameStatus('GAME_OVER');
          playSound('win');
          let winState: 'BLACK' | 'WHITE' | 'DRAW' = 'DRAW';
          if (scores.black > scores.white) winState = 'BLACK';
          else if (scores.white > scores.black) winState = 'WHITE';
          setWinner(winState);
        } else {
          // Pass turn automatically with banner
          const autoPass = async () => {
            setPassPlayer(turn);
            setGameStatus('PASS_NOTIFICATION');
            playSound('pass');
            await new Promise(resolve => setTimeout(resolve, 1500));
            setGameStatus('PLAYING');
            setTurn(opponent);
          };
          autoPass();
        }
      }
    }
  }, [board, turn, gameStatus]);

  // Layout utilities
  const colsLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowsNumbers = ['1', '2', '3', '4', '5', '6', '7', '8'];

  // Identify human player name for UI representation
  const getPlayerLabel = (color: Player) => {
    if (gameMode === 'VS_COMPUTER') {
      return color === computerColor ? 'COMPUTER' : 'YOU';
    }
    return color === 'BLACK' ? 'PLAYER 1' : 'PLAYER 2';
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex flex-col justify-between bg-gradient-to-b from-neutral-900 via-stone-900 to-neutral-950 text-neutral-100 font-sans relative">
      
      {/* Decorative ambient neon background glow */}
      <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      
      {/* Header Panel */}
      <header className="w-full max-w-[440px] xs:max-w-[480px] sm:max-w-[540px] mx-auto pt-3 px-4 flex items-center justify-between z-10">
        <div className="flex flex-col">
          <span className="font-display tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-100 text-2xl font-extrabold shadow-sm">
            RENEGADE
          </span>
          <span className="font-mono text-[9px] text-amber-500/80 tracking-[0.25em] uppercase font-bold">
            Classic Reversi
          </span>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5 xs:gap-2">
          <button
            onClick={() => {
              playSound('click');
              setShowHelp(true);
            }}
            className="p-1.5 xs:p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 active:scale-95 border border-neutral-700/40 text-neutral-300 transition-all cursor-pointer"
            title="How to play"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
          </button>
          
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              playSound('click');
            }}
            className="p-1.5 xs:p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 active:scale-95 border border-neutral-700/40 text-neutral-300 transition-all cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-neutral-300" />}
          </button>

          <button
            onClick={() => {
              playSound('click');
              setShowSettings(true);
            }}
            className="p-1.5 xs:p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 active:scale-95 border border-neutral-700/40 text-neutral-300 transition-all cursor-pointer"
            title="Game Settings"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 xs:p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold active:scale-95 transition-all flex items-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer"
            title="Reset Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Playable Area */}
      <main className="flex-1 flex flex-col justify-center items-center px-0 sm:px-4 w-full max-w-[440px] xs:max-w-[480px] sm:max-w-[540px] mx-auto z-10 gap-2.5">

        {/* Compact Dashboard Bar */}
        <div className="w-[calc(100%-1.5rem)] sm:w-full bg-neutral-900/80 backdrop-blur-md rounded-2xl border border-neutral-800/60 p-2.5 flex flex-col gap-2 shadow-lg relative overflow-hidden">
          {/* Main info row */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Black player side */}
            <div className={`flex items-center gap-2.5 flex-1 transition-all duration-300 ${turn === 'BLACK' && gameStatus === 'PLAYING' ? 'opacity-100 scale-[1.02]' : 'opacity-60'}`}>
              {/* Circular Black Token */}
              <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 border flex items-center justify-center shadow-md
                ${turn === 'BLACK' && gameStatus === 'PLAYING' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-neutral-700/40'}
              `}>
                <div className="absolute inset-[15%] rounded-full bg-gradient-to-tl from-transparent to-white/10" />
                <span className="text-sm font-display font-extrabold text-neutral-100 z-10">{scores.black}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-wider font-bold text-neutral-300 flex items-center gap-1">
                  {gameMode === 'VS_COMPUTER' && computerColor === 'BLACK' ? <Monitor className="w-2.5 h-2.5 text-amber-500" /> : <User className="w-2.5 h-2.5 text-amber-500" />}
                  {getPlayerLabel('BLACK')}
                </span>
                {turn === 'BLACK' && gameStatus === 'PLAYING' && (
                  <span className="text-[7px] font-bold text-amber-400 tracking-wider uppercase animate-pulse">Thinking</span>
                )}
              </div>
            </div>

            {/* Vs / Distribution Ratio Badge */}
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-[9px] font-mono font-bold text-neutral-500 tracking-widest">VS</span>
            </div>

            {/* White player side */}
            <div className={`flex items-center gap-2.5 flex-1 flex-row-reverse text-right transition-all duration-300 ${turn === 'WHITE' && gameStatus === 'PLAYING' ? 'opacity-100 scale-[1.02]' : 'opacity-60'}`}>
              {/* Circular White Token */}
              <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br from-neutral-50 to-neutral-200 border flex items-center justify-center shadow-md
                ${turn === 'WHITE' && gameStatus === 'PLAYING' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'border-neutral-300'}
              `}>
                <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-white to-transparent opacity-60" />
                <span className="text-sm font-display font-extrabold text-neutral-950 z-10">{scores.white}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono tracking-wider font-bold text-neutral-300 flex items-center gap-1">
                  {getPlayerLabel('WHITE')}
                  {gameMode === 'VS_COMPUTER' && computerColor === 'WHITE' ? <Monitor className="w-2.5 h-2.5 text-amber-500" /> : <User className="w-2.5 h-2.5 text-amber-500" />}
                </span>
                {turn === 'WHITE' && gameStatus === 'PLAYING' && (
                  <span className="text-[7px] font-bold text-amber-400 tracking-wider uppercase animate-pulse">Thinking</span>
                )}
              </div>
            </div>

          </div>

          {/* Visual Distribution Ratio Bar */}
          {(() => {
            const total = scores.black + scores.white;
            const blackPercent = total > 0 ? (scores.black / total) * 100 : 50;
            return (
              <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800/50">
                <div 
                  className="bg-neutral-850 transition-all duration-500 ease-out border-r border-neutral-950 h-full" 
                  style={{ width: `${blackPercent}%` }} 
                />
                <div 
                  className="bg-neutral-100 transition-all duration-500 ease-out h-full" 
                  style={{ width: `${100 - blackPercent}%` }} 
                />
              </div>
            );
          })()}
        </div>

        {/* Tactical 3D Board Canvas */}
        <div className="relative w-full aspect-square max-w-full sm:max-w-[480px] mx-auto wood-grain p-1.5 xs:p-2.5 sm:p-4 rounded-none sm:rounded-3xl border-y-4 sm:border-4 border-amber-950 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col justify-center">
          
          {/* Subdued wood corner rivets */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-900 border border-amber-950/50 opacity-60" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-900 border border-amber-950/50 opacity-60" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-900 border border-amber-950/50 opacity-60" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-900 border border-amber-950/50 opacity-60" />

          {/* Grid Layout of Labels and Board */}
          <div className="grid grid-cols-[1.1rem_1fr_1.1rem] grid-rows-[1.1rem_1fr_1.1rem] gap-y-0.5 gap-x-0.5 items-center justify-center h-full">
            
            {/* Top-Left Blank Corner */}
            <div />
            
            {/* Top horizontal column letters A-H */}
            <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-mono font-bold text-amber-200/55 select-none tracking-tight">
              {colsLetters.map(c => <div key={c}>{c}</div>)}
            </div>
            
            {/* Top-Right Blank Corner */}
            <div />
            
            {/* Left vertical numbers 1-8 */}
            <div className="grid grid-rows-8 h-full text-center text-[10px] sm:text-xs font-mono font-bold text-amber-200/55 select-none py-1">
              {rowsNumbers.map(r => <div key={r} className="flex items-center justify-center">{r}</div>)}
            </div>
            
            {/* Emerald Green Felt Board Content */}
            <div className="aspect-square w-full felt-bg rounded-xl overflow-hidden shadow-[inset_0_5px_18px_rgba(0,0,0,0.8)] border-[3px] border-emerald-950/60 relative p-1">
              
              {/* Felt Star Points (traditional board guidance dots at intersections 2,2; 2,5; 5,2; 5,5) */}
              <div className="absolute top-[25.5%] left-[25.5%] w-2 h-2 rounded-full bg-emerald-950/45 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute top-[25.5%] left-[74.5%] w-2 h-2 rounded-full bg-emerald-950/45 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute top-[74.5%] left-[25.5%] w-2 h-2 rounded-full bg-emerald-950/45 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              <div className="absolute top-[74.5%] left-[74.5%] w-2 h-2 rounded-full bg-emerald-950/45 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              {/* 8x8 Grid Squares */}
              <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                {board.map((rowArr, rIdx) => 
                  rowArr.map((cellValue, cIdx) => {
                    const isLegal = validMoves.some(([vr, vc]) => vr === rIdx && vc === cIdx);
                    
                    return (
                      <div
                        id={`cell-${rIdx}-${cIdx}`}
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => isLegal && handleCellClick(rIdx, cIdx)}
                        className={`relative aspect-square flex items-center justify-center border border-emerald-950/20 select-none transition-colors duration-150 touch-none
                          ${isLegal && showHints && !isAnimating ? 'bg-emerald-600/10 cursor-pointer' : ''}
                        `}
                      >
                        {/* 3D double-sided flipping piece */}
                        {cellValue !== null ? (
                          <div className="w-[84%] h-[84%] rounded-full perspective-1000 relative animate-piece-place">
                            <div 
                              className="w-full h-full rounded-full transform-style-3d transition-transform duration-500 ease-out relative"
                              style={{ transform: cellValue === 'WHITE' ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                            >
                              {/* BLACK Side (Front Face) */}
                              <div className="absolute inset-0 rounded-full backface-hidden bg-gradient-to-br from-neutral-800 to-neutral-950 border border-neutral-700/60 shadow-[inset_0_2px_4px_rgba(255,255,255,0.15),_0_4px_8px_rgba(0,0,0,0.6)] flex items-center justify-center">
                                {/* Subtle circular brushing texture */}
                                <div className="absolute inset-[12%] rounded-full bg-gradient-to-tl from-transparent to-white/10" />
                                <div className="w-[70%] h-[70%] rounded-full border border-neutral-800/40 opacity-30" />
                              </div>
                              
                              {/* WHITE Side (Back Face) */}
                              <div className="absolute inset-0 rounded-full backface-hidden rotate-y-180 bg-gradient-to-br from-neutral-50 to-neutral-200 border border-neutral-300/80 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.12),_0_4px_8px_rgba(0,0,0,0.5)] flex items-center justify-center">
                                {/* Warm ivory shading */}
                                <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-white to-transparent opacity-50" />
                                <div className="w-[70%] h-[70%] rounded-full border border-neutral-300/40 opacity-40" />
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Legal move pulsing rings */
                          isLegal && showHints && !isAnimating && (
                            <button
                              id={`cell-hint-${rIdx}-${cIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(rIdx, cIdx);
                              }}
                              className="w-5.5 h-5.5 rounded-full border-[2px] border-dashed border-amber-400 bg-amber-400/10 hover:bg-amber-400/25 active:scale-90 transition-all duration-150 animate-pulse-glow flex items-center justify-center cursor-pointer"
                              title="Legal Move"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pass Notification Banner Overlay */}
              {gameStatus === 'PASS_NOTIFICATION' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30 transition-all animate-fade-in duration-300">
                  <div className="px-6 py-4 bg-amber-500 text-neutral-950 font-display font-extrabold rounded-2xl border-2 border-amber-300 text-center shadow-2xl scale-100 transform transition-transform animate-piece-place">
                    <span className="block text-[10px] font-mono tracking-widest text-neutral-950/60 uppercase font-bold">
                      NO LEGAL MOVES
                    </span>
                    <span className="text-lg tracking-wide">
                      {getPlayerLabel(passPlayer || 'WHITE')} PASSED
                    </span>
                  </div>
                </div>
              )}

              {/* Game Over Banner Overlay */}
              {gameStatus === 'GAME_OVER' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md z-30 p-4 text-center">
                  <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 rounded-2xl border-2 border-amber-500 shadow-2xl max-w-xs w-full flex flex-col items-center animate-piece-place gap-4">
                    <div className="p-3 bg-amber-500/15 rounded-full border border-amber-500/30 text-amber-400 animate-pulse-glow">
                      <Trophy className="w-8 h-8" />
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-2xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">
                        {winner === 'DRAW' ? "IT'S A DRAW!" : `${winner === 'BLACK' ? 'BLACK' : 'WHITE'} WINS!`}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 mt-1 uppercase tracking-wider">
                        {winner === 'DRAW' ? "Equal distribution of tiles" : `${getPlayerLabel(winner || 'BLACK')} dominated the felt`}
                      </span>
                    </div>

                    <div className="flex items-center justify-center gap-6 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800 w-full font-mono text-sm">
                      <div className="flex flex-col items-center">
                        <span className="text-neutral-500 text-xs font-bold">BLACK</span>
                        <span className="text-xl font-extrabold text-neutral-100">{scores.black}</span>
                      </div>
                      <div className="text-neutral-600 font-bold">:</div>
                      <div className="flex flex-col items-center">
                        <span className="text-neutral-500 text-xs font-bold">WHITE</span>
                        <span className="text-xl font-extrabold text-neutral-100">{scores.white}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleReset}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-amber-500/10 cursor-pointer"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right vertical numbers 1-8 */}
            <div className="grid grid-rows-8 h-full text-center text-[10px] sm:text-xs font-mono font-bold text-amber-200/55 select-none py-1">
              {rowsNumbers.map(r => <div key={r} className="flex items-center justify-center">{r}</div>)}
            </div>
            
            {/* Bottom-Left Blank Corner */}
            <div />
            
            {/* Bottom horizontal column letters A-H */}
            <div className="grid grid-cols-8 text-center text-[10px] sm:text-xs font-mono font-bold text-amber-200/55 select-none tracking-tight">
              {colsLetters.map(c => <div key={c}>{c}</div>)}
            </div>
            
            {/* Bottom-Right Blank Corner */}
            <div />
            
          </div>
        </div>

        {/* Dynamic Board status prompt */}
        <div className="text-center h-5 flex items-center justify-center">
          {gameStatus === 'PLAYING' && (
            <span className="text-xs font-mono text-neutral-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              {gameMode === 'VS_COMPUTER' && turn === computerColor ? (
                <span className="text-amber-300">Computer is computing strategic lines...</span>
              ) : (
                <span>Your turn! Place on pulsed golden highlights.</span>
              )}
            </span>
          )}
        </div>

        {/* Dynamic Sub-Label with Active Configuration */}
        <div className="text-[10px] font-mono text-neutral-500 tracking-wider flex items-center gap-1.5 opacity-85 mt-1 mb-3">
          <span className="text-amber-500/80">{gameMode === 'VS_COMPUTER' ? `VS COMPUTER • ${aiDifficulty}` : 'PASS & PLAY'}</span>
          <span className="text-neutral-700">•</span>
          <span className="text-neutral-400">HINTS: {showHints ? 'ON' : 'OFF'}</span>
        </div>

      </main>

      {/* Footer Info Statement */}
      <footer className="w-full max-w-md mx-auto pb-4 text-center text-[10px] font-mono text-neutral-600 tracking-wider">
        RENEGADE OTHELLO • DESIGNED FOR TACTILE MOBILITY
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50 p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-piece-place">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span className="font-display font-extrabold text-base text-neutral-100">
                  Match Configuration
                </span>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                  setShowSettings(false);
                }}
                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Game Mode */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                  Game Mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playSound('click');
                      setGameMode('VS_COMPUTER');
                      handleReset();
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                      ${gameMode === 'VS_COMPUTER' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-inner' 
                        : 'bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400'
                      }
                    `}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Vs Computer
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setGameMode('PASS_AND_PLAY');
                      handleReset();
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                      ${gameMode === 'PASS_AND_PLAY' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-inner' 
                        : 'bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400'
                      }
                    `}
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Pass & Play
                  </button>
                </div>
              </div>

              {/* AI Controls (Only if VS_COMPUTER) */}
              {gameMode === 'VS_COMPUTER' && (
                <>
                  {/* Difficulty */}
                  <div className="flex flex-col gap-1.5 border-t border-neutral-800/60 pt-3">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                      AI Difficulty
                    </span>
                    <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                      {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(diff => (
                        <button
                          key={diff}
                          onClick={() => {
                            playSound('click');
                            setAiDifficulty(diff);
                          }}
                          className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer
                            ${aiDifficulty === diff 
                              ? 'bg-amber-500 text-neutral-950' 
                              : 'text-neutral-500 hover:text-neutral-300'
                            }
                          `}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Your Tile Color */}
                  <div className="flex flex-col gap-1.5 border-t border-neutral-800/60 pt-3">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">
                      Your Color (goes first as Black)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          playSound('click');
                          setComputerColor('WHITE'); // You are black
                          handleReset();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                          ${computerColor === 'WHITE' 
                            ? 'bg-neutral-950 text-neutral-200 border-2 border-amber-500 shadow-inner' 
                            : 'bg-neutral-950/45 hover:bg-neutral-950 border border-neutral-800 text-neutral-500'
                          }
                        `}
                      >
                        <div className="w-3 h-3 rounded-full bg-neutral-900 border border-neutral-800" />
                        Black (First)
                      </button>
                      <button
                        onClick={() => {
                          playSound('click');
                          setComputerColor('BLACK'); // You are white
                          handleReset();
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer
                          ${computerColor === 'BLACK' 
                            ? 'bg-neutral-950 text-neutral-200 border-2 border-amber-500 shadow-inner' 
                            : 'bg-neutral-950/45 hover:bg-neutral-950 border border-neutral-800 text-neutral-500'
                          }
                        `}
                      >
                        <div className="w-3 h-3 rounded-full bg-neutral-100 border border-neutral-300" />
                        White (Second)
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Preferences: Legal Move Hints */}
              <div className="flex flex-col gap-1.5 border-t border-neutral-800/60 pt-3">
                <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Legal Move Hints</span>
                  <span className="text-[9px] text-amber-400/80 normal-case">(Pulsing gold highlights)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowHints(true);
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer
                      ${showHints 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-neutral-950 text-neutral-500'
                      }
                    `}
                  >
                    Enabled
                  </button>
                  <button
                    onClick={() => {
                      playSound('click');
                      setShowHints(false);
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer
                      ${!showHints 
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' 
                        : 'bg-neutral-950 text-neutral-500'
                      }
                    `}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {/* Warning label */}
              <p className="text-[9px] text-neutral-500 font-mono text-center mt-1">
                * Adjusting Game Mode or Player Color starts a fresh match.
              </p>
            </div>

            <button
              onClick={() => {
                playSound('click');
                setShowSettings(false);
              }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              Resume Game
            </button>
          </div>
        </div>
      )}

      {/* Rules / Tutorial Glassmorphic Modal */}
      {showHelp && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50 p-4 transition-all duration-300 animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full flex flex-col gap-4 max-h-[85vh] overflow-y-auto animate-piece-place">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span className="font-display font-extrabold text-base text-neutral-100">
                  How to Play Reversi
                </span>
              </div>
              <button
                onClick={() => {
                  playSound('click');
                  setShowHelp(false);
                }}
                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 flex flex-col gap-3 font-sans leading-relaxed">
              <p>
                Reversi (often called <strong>Othello</strong> or <strong>Renegade</strong>) is an 8x8 strategic board game played with dual-sided discs.
              </p>
              
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-mono text-[10px] text-amber-400 block font-bold uppercase mb-1">
                  1. Core Goal
                </span>
                Count of pieces wins! Have the majority of your colored discs showing on the board when the game terminates.
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-mono text-[10px] text-amber-400 block font-bold uppercase mb-1">
                  2. Capturing / Sandwiching
                </span>
                You make a move by placing a piece. To be legal, your placed disc must form a straight line (horizontal, vertical, or diagonal) with another disc of your color, with 1 or more of your opponent's discs trapped inside.
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-mono text-[10px] text-amber-400 block font-bold uppercase mb-1">
                  3. Dynamic Flipping
                </span>
                All trapped opponent discs are flipped to your color. You can flip multiple lines in 8 directions with a single move!
              </div>

              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-mono text-[10px] text-amber-400 block font-bold uppercase mb-1">
                  4. Passing & Game Over
                </span>
                If you have no valid placements, you must **PASS** and the opponent plays. The match terminates when the board is full (64 pieces) or neither player can perform a valid capture.
              </div>
            </div>

            <button
              onClick={() => {
                playSound('click');
                setShowHelp(false);
              }}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl active:scale-95 transition-all cursor-pointer text-xs uppercase tracking-wider"
            >
              Let's Play
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
