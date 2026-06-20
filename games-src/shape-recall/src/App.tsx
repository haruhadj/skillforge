/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { GamePhase, ShapeTransform, ShapeType, RoundData } from './types';
import { generateRandomTarget, calculateScore, getRandomShapeSequence } from './utils';
import PlayCanvas from './components/PlayCanvas';
import GameSummary from './components/GameSummary';
import { Box, Target, Play, ShieldAlert, Sparkles, Zap, Maximize2, RefreshCw } from 'lucide-react';

// --- SkillForge iframe bridge ---------------------------------------------
const BEST_SCORE_KEY = 'shape-recall-best-score';
const TOTAL_GAMES_KEY = 'shape-recall-total-games';

function postToParent(event: string, data: unknown) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function App() {
  // Navigation & session state
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('MEMORIZE');
  const [shapesSequence, setShapesSequence] = useState<ShapeType[]>([]);
  
  // Coordinates and transforms (percentage-based relative to the canvas)
  const [targetTransform, setTargetTransform] = useState<ShapeTransform>({ x: 0, y: 0, width: 0, height: 0 });
  const [userTransform, setUserTransform] = useState<ShapeTransform>({ x: 40, y: 40, width: 20, height: 20 });
  
  // Game metrics logs
  const [roundsLog, setRoundsLog] = useState<RoundData[]>([]);
  const [roundScore, setRoundScore] = useState<{ posScore: number; sizeScore: number; totalScore: number } | undefined>(undefined);
  
  // High-precision clock
  const [timerCount, setTimerCount] = useState<number>(3.00);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // SkillForge bridge: restore best score from the host, accept player identity
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'RESTORE_PROGRESS' && msg.data) {
        const remoteBest = Number(msg.data.bestScore);
        if (!Number.isNaN(remoteBest)) {
          const localBest = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
          if (remoteBest > localBest) {
            localStorage.setItem(BEST_SCORE_KEY, String(remoteBest));
          }
        }
        const remoteTotal = Number(msg.data.totalGames);
        if (!Number.isNaN(remoteTotal)) {
          const localTotal = Number(localStorage.getItem(TOTAL_GAMES_KEY) || 0);
          if (remoteTotal > localTotal) {
            localStorage.setItem(TOTAL_GAMES_KEY, String(remoteTotal));
          }
        }
      }
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // SkillForge bridge: report score + stats once a session reaches the summary
  useEffect(() => {
    if (gamePhase !== 'SUMMARY' || roundsLog.length === 0) return;

    const sessionScore = roundsLog.reduce((sum, r) => sum + r.totalScore, 0);
    const roundedScore = Math.round(sessionScore * 100) / 100;

    const prevBest = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    const bestScore = Math.max(prevBest, roundedScore);
    localStorage.setItem(BEST_SCORE_KEY, String(bestScore));

    const totalGames = Number(localStorage.getItem(TOTAL_GAMES_KEY) || 0) + 1;
    localStorage.setItem(TOTAL_GAMES_KEY, String(totalGames));

    postToParent('BEST_SCORE', { bestScore });
    postToParent('GAME_STATS', { bestScore, lastScore: roundedScore, totalGames });
  }, [gamePhase, roundsLog]);

  // Initialize shapes pool and target for the active session
  const initializeGameSession = () => {
    const sequence = getRandomShapeSequence();
    setShapesSequence(sequence);
    
    // Choose active shape and make target transform
    const firstShape = sequence[0];
    const initialTarget = generateRandomTarget(firstShape);
    
    setTargetTransform(initialTarget);
    setUserTransform({ x: 40, y: 40, width: 20, height: 20 }); // perfect dead center with offset width 20, center at 50,50
    setRoundsLog([]);
    setRoundScore(undefined);
    setCurrentRound(1);
    setTimerCount(3.00);
    setGamePhase('MEMORIZE');
    setHasStarted(true);
  };

  // High-frequency TIMER Countdown hook
  useEffect(() => {
    if (gamePhase === 'MEMORIZE' && hasStarted) {
      const startTime = Date.now();
      const timerDuration = 3000; // 3 seconds in ms

      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, (timerDuration - elapsed) / 1000);
        
        setTimerCount(remaining);

        if (remaining <= 0) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
          }
          // Automatically cycle to manipulation phase
          setGamePhase('MANIPULATE');
        }
      }, 16); // ~60fps grid tick rate
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [gamePhase, hasStarted, currentRound]);

  // Submission handler
  const handleSubmitGuess = () => {
    const activeShape = shapesSequence[currentRound - 1];
    const score = calculateScore(targetTransform, userTransform);
    
    setRoundScore(score);

    // Save final metrics to log
    const logItem: RoundData = {
      roundNumber: currentRound,
      shapeType: activeShape,
      target: targetTransform,
      guess: userTransform,
      posScore: score.posScore,
      sizeScore: score.sizeScore,
      totalScore: score.totalScore,
    };

    setRoundsLog((prev) => [...prev, logItem]);
    setGamePhase('SCORE');
  };

  // Move to next coordinate round or load summary analytics panel
  const handleNextRound = () => {
    if (currentRound < 5) {
      const nextIdx = currentRound; // currentRound starts at 1, so indices are currentRound
      const nextShape = shapesSequence[nextIdx];
      const nextTarget = generateRandomTarget(nextShape);

      setTargetTransform(nextTarget);
      setUserTransform({ x: 40, y: 40, width: 20, height: 20 }); // reset user shape to dead center normalized scale
      setRoundScore(undefined);
      setTimerCount(3.00);
      setCurrentRound((prev) => prev + 1);
      setGamePhase('MEMORIZE');
    } else {
      setGamePhase('SUMMARY');
    }
  };

  return (
    <div id="application-root" className="flex h-dvh w-screen select-none overflow-hidden bg-[#0c0c0e] text-zinc-100 antialiased">

      {/* 1. ONBOARDING LAUNCHER OVERLAY SCREEN */}
      {!hasStarted && (
        <div id="onboarding-gate" className="relative z-50 h-full w-full overflow-y-auto">

          {/* Subtle decoration elements */}
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 grid-bg opacity-20 pointer-events-none" />

          <div className="relative flex min-h-full w-full flex-col items-center justify-center p-4 py-10 text-center sm:p-12">
          <div className="max-w-md w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-md relative sm:p-8">
            {/* Minimalist app logo design */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 shadow-xl shadow-cyan-500/10">
              <Sparkles className="h-7 w-7 text-white" />
            </div>

            <h1 className="mt-6 font-display text-3xl font-black tracking-tight text-white">
              Shape Memory Game
            </h1>
            <p className="mt-2 text-zinc-400 text-xs uppercase tracking-widest font-mono">
              Geometric Reciprocal Matcher
            </p>

            <p className="mt-4 text-xs text-zinc-400 leading-relaxed text-left border-l-2 border-zinc-800 pl-3">
              We present an high-fidelity offline Cartesian alignment evaluation. Memorize the shape's original coordinate bounds within 3 seconds, then drag and scale it back with maximum precision.
            </p>

            {/* Steps Instruction List */}
            <div className="mt-6 space-y-3.5 text-left">
              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-cyan-400 shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Phase 1: Memorization</h4>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Observe the randomized conical gradient shape's size and spot on the play coordinate grid for 3.00 seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-cyan-400 shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Phase 2: Drag & Corner Resize</h4>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    Shape resets to center. Drag its body to move it, and pull the white corners to resize. Touch/Mouse optimized.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-cyan-400 shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-200">Phase 3: Score Congruence</h4>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    View matching scores out of 10.00 showing position vs dimensions offset, compared side-by-side with genuine coordinates.
                  </p>
                </div>
              </div>
            </div>

            <button
              id="start-calibration-button"
              onClick={initializeGameSession}
              className="mt-8 flex w-full items-center justify-center space-x-2 rounded-xl bg-cyan-500 py-4 text-xs font-black uppercase tracking-wider text-black hover:bg-cyan-400 hover:scale-[1.01] active:scale-95 transition-all outline-none border-none"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Initialize Matrix Sync</span>
            </button>
          </div>
          </div>
        </div>
      )}

      {/* 2. GAMEPLAY ACTIVE SCREEN */}
      {hasStarted && gamePhase !== 'SUMMARY' && (
        <div className="flex h-full w-full items-center justify-center p-0 md:p-6 lg:p-8">
          {/* Responsive container card logic */}
          <div 
            id="canvas-card-envelope"
            className="flex h-full w-full max-w-5xl md:h-[min(80vh,760px)] md:w-[min(90vw,1000px)] flex-col overflow-hidden md:rounded-3xl border border-zinc-900 bg-zinc-950 shadow-[0_12px_44px_rgba(0,0,0,0.8)] relative"
          >
            <PlayCanvas
              phase={gamePhase}
              roundNumber={currentRound}
              shapeType={shapesSequence[currentRound - 1]}
              targetTransform={targetTransform}
              userTransform={userTransform}
              onUserTransformChange={setUserTransform}
              onSubmit={handleSubmitGuess}
              onNextRound={handleNextRound}
              timerCount={timerCount}
              roundScore={roundScore}
            />
          </div>
        </div>
      )}

      {/* 3. GAMEFINISHED SUMMARY SYSTEM PANEL */}
      {hasStarted && gamePhase === 'SUMMARY' && (
        <GameSummary
          roundsLog={roundsLog}
          onPlayAgain={initializeGameSession}
        />
      )}

    </div>
  );
}
