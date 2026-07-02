/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Flame, 
  RotateCcw, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Zap, 
  HelpCircle, 
  ArrowRight,
  RefreshCw,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { GameState, Attempt, AccuracyTier } from './types';
import {
  generateTargetTime,
  getAccuracyTier,
  formatTime,
  formatDelta,
  getComboMultiplier,
  calculateRoundPoints,
  ACCURACY_TIERS
} from './utils';

function postToParent(event: string, data: unknown) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

// Simple Web Audio Synthesizer for tactile feedback
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTick() {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playRelease(isSuperWin: boolean, isWin: boolean) {
    if (this.muted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      
      if (isSuperWin) {
        // High-precision perfect arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.1, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.3);
        });
      } else if (isWin) {
        // High-precision good chime
        const notes = [587.33, 783.99]; // D5, G5
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          gain.gain.setValueAtTime(0.08, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.2);
          
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.25);
        });
      } else {
        // Disappointing analog buzz
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.22);
        
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(now + 0.23);
      }
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [targetTime, setTargetTime] = useState<number>(3.50);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [runScore, setRunScore] = useState<number>(0);
  const [bestRunScore, setBestRunScore] = useState<number>(0);
  const [lastRoundPoints, setLastRoundPoints] = useState<number>(0);
  const [bestDelta, setBestDelta] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHowTo, setShowHowTo] = useState<boolean>(false);
  const [controlMode, setControlMode] = useState<'HOLD' | 'TAP'>('HOLD');
  const [totalGames, setTotalGames] = useState<number>(0);

  const startTimeRef = useRef<number>(0);
  const isPressingRef = useRef<boolean>(false);
  const synthRef = useRef<SoundSynthesizer>(new SoundSynthesizer());

  // Max timer fail safe (10 seconds)
  const timerCheckRef = useRef<any>(null);

  // Load stats from localStorage on mount
  useEffect(() => {
    try {
      const storedBestRunScore = localStorage.getItem('chrono_best_run_score');
      if (storedBestRunScore) setBestRunScore(parseInt(storedBestRunScore, 10));

      const storedBestStreak = localStorage.getItem('chrono_best_streak');
      if (storedBestStreak) setBestStreak(parseInt(storedBestStreak, 10));

      const storedBestDelta = localStorage.getItem('chrono_best_delta');
      if (storedBestDelta) setBestDelta(parseFloat(storedBestDelta));

      const storedAttempts = localStorage.getItem('chrono_attempts');
      if (storedAttempts) setAttempts(JSON.parse(storedAttempts));

      const storedMuted = localStorage.getItem('chrono_muted');
      if (storedMuted === 'true') {
        setIsMuted(true);
        synthRef.current.muted = true;
      }

      const storedControlMode = localStorage.getItem('chrono_control_mode');
      if (storedControlMode === 'HOLD' || storedControlMode === 'TAP') {
        setControlMode(storedControlMode as 'HOLD' | 'TAP');
      }

      const storedTotalGames = localStorage.getItem('chrono_total_games');
      if (storedTotalGames) setTotalGames(parseInt(storedTotalGames, 10));
    } catch (e) {
      console.error('Failed to load local storage stats', e);
    }

    // Set first challenge target
    setTargetTime(generateTargetTime());
  }, []);

  // Sync mute state
  const toggleMute = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    synthRef.current.muted = newState;
    localStorage.setItem('chrono_muted', newState ? 'true' : 'false');
  };

  const handleControlModeChange = (mode: 'HOLD' | 'TAP') => {
    if (gameState !== 'IDLE') return;
    setControlMode(mode);
    localStorage.setItem('chrono_control_mode', mode);
  };

  // Safe timer boundary to prevent excessive holding
  useEffect(() => {
    if (gameState === 'COUNTING') {
      timerCheckRef.current = setInterval(() => {
        const currentElapsed = (performance.now() - startTimeRef.current) / 1000;
        if (currentElapsed >= 10.0) {
          stopCounting();
        }
      }, 100);
    } else {
      if (timerCheckRef.current) {
        clearInterval(timerCheckRef.current);
      }
    }

    return () => {
      if (timerCheckRef.current) clearInterval(timerCheckRef.current);
    };
  }, [gameState]);

  const startCounting = (e: React.MouseEvent | React.TouchEvent) => {
    // Avoid default touch scrolling / zooming behavior
    if (e.cancelable) {
      e.preventDefault();
    }
    if (gameState !== 'IDLE') return;
    if (isPressingRef.current) return;

    isPressingRef.current = true;
    setIsPressing(true);
    setGameState('COUNTING');
    startTimeRef.current = performance.now();
    synthRef.current.playTick();
  };

  const stopCounting = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && e.cancelable) {
      e.preventDefault();
    }
    if (!isPressingRef.current) return;
    if (gameState !== 'COUNTING') return;

    isPressingRef.current = false;
    setIsPressing(false);

    const endTime = performance.now();
    const duration = (endTime - startTimeRef.current) / 1000;
    setElapsedTime(duration);

    const delta = duration - targetTime;
    const absDelta = Math.abs(delta);

    // A round counts as a "hit" up to the Good Effort tier boundary — matches
    // the accuracy tiers shown in How To Play, so the streak/tier language stays consistent.
    const isWin = absDelta <= ACCURACY_TIERS.GOOD_EFFORT.maxDelta;
    const isSuperWin = absDelta <= ACCURACY_TIERS.GOD_TIER.maxDelta;

    // Trigger audio feedback based on performance
    synthRef.current.playRelease(isSuperWin, isWin);

    // Combo multiplier is based on the streak going into this round, so building
    // momentum pays off on the next hit rather than the one that just landed.
    const comboMultiplier = getComboMultiplier(streak);
    const roundPoints = isWin ? calculateRoundPoints(delta, comboMultiplier) : 0;
    setLastRoundPoints(roundPoints);

    // Update streak, combo run score (resets on a miss), and their all-time bests
    let newStreak = streak;
    let newRunScore = runScore;
    if (isWin) {
      newStreak = streak + 1;
      newRunScore = runScore + roundPoints;
      setStreak(newStreak);
      setRunScore(newRunScore);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
        localStorage.setItem('chrono_best_streak', newStreak.toString());
      }
    } else {
      newStreak = 0;
      newRunScore = 0;
      setStreak(0);
      setRunScore(0);
    }

    const updatedBestRunScore = Math.max(bestRunScore, newRunScore);
    if (updatedBestRunScore > bestRunScore) {
      setBestRunScore(updatedBestRunScore);
      localStorage.setItem('chrono_best_run_score', updatedBestRunScore.toString());
    }

    // Update Best Delta
    if (bestDelta === null || absDelta < bestDelta) {
      setBestDelta(absDelta);
      localStorage.setItem('chrono_best_delta', absDelta.toString());
    }

    // Determine accuracy tier
    const tier = getAccuracyTier(delta);

    // Record attempt
    const newAttempt: Attempt = {
      id: `${performance.now()}-${Math.random()}`,
      target: targetTime,
      actual: duration,
      delta: delta,
      tierId: tier.id,
      points: roundPoints,
      timestamp: Date.now()
    };

    const updatedAttempts = [newAttempt, ...attempts].slice(0, 10);
    setAttempts(updatedAttempts);
    localStorage.setItem('chrono_attempts', JSON.stringify(updatedAttempts));

    const newTotalGames = totalGames + 1;
    setTotalGames(newTotalGames);
    localStorage.setItem('chrono_total_games', newTotalGames.toString());

    postToParent('BEST_SCORE', { bestScore: updatedBestRunScore });
    postToParent('GAME_STATS', {
      totalGames: newTotalGames,
      bestRunScore: updatedBestRunScore,
      bestStreak: Math.max(bestStreak, newStreak),
      bestDelta: bestDelta === null ? absDelta : Math.min(bestDelta, absDelta)
    });

    setGameState('RESULT');
  };

  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (gameState === 'IDLE') {
      startCounting(e);
    } else if (gameState === 'COUNTING') {
      stopCounting(e);
    }
  };

  const handleNextRound = () => {
    setTargetTime(generateTargetTime());
    setGameState('IDLE');
    setElapsedTime(0);
  };

  const resetAllStats = () => {
    if (window.confirm('Are you sure you want to reset all high scores and history?')) {
      localStorage.removeItem('chrono_high_score');
      localStorage.removeItem('chrono_best_run_score');
      localStorage.removeItem('chrono_best_streak');
      localStorage.removeItem('chrono_best_delta');
      localStorage.removeItem('chrono_attempts');
      setBestRunScore(0);
      setBestStreak(0);
      setBestDelta(null);
      setAttempts([]);
      setStreak(0);
      setRunScore(0);
      handleNextRound();
    }
  };



  // Compute accuracy tier variables for RESULT phase
  const currentDelta = elapsedTime - targetTime;
  const currentTier = getAccuracyTier(currentDelta);

  return (
    <div id="chrono-app-root" className="h-[100dvh] w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between overflow-hidden select-none touch-none font-sans relative">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-[radial-gradient(circle_at_center,rgba(39,39,42,0.15),transparent_60%)] pointer-events-none" />
      
      <div className="w-full max-w-md mx-auto flex flex-col h-full px-5 pt-3 pb-4 sm:pt-6 sm:pb-6 justify-between relative z-10">
        
        {/* Header Block */}
        <header id="header-container" className="flex items-center justify-between w-full border-b border-zinc-900 pb-2.5 sm:pb-4">
          <div className="flex flex-col">
            <h1 id="logo-brand" className="text-lg font-display tracking-widest font-extrabold text-white flex items-center gap-1.5">
              CHRONO<span className="text-zinc-500 font-medium">_</span>SENSE
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 tracking-wider">INTERNAL CHRONOMETER v1.2</p>
          </div>

          <div id="header-actions" className="flex items-center gap-2">
            <button 
              id="how-to-toggle"
              onClick={() => setShowHowTo(true)}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95"
              aria-label="How to play"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button 
              id="mute-toggle"
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all active:scale-95"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
            </button>
          </div>
        </header>

        {/* Stats Strip */}
        <section id="stats-dashboard" className="grid grid-cols-3 gap-2 my-1.5 sm:my-3">
          <div className="bg-zinc-900/45 border border-zinc-800/60 rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center transition-all">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Best Score</span>
            <div className="flex items-center gap-1">
              <Trophy className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-amber-500" />
              <span className="text-xs sm:text-sm font-mono font-bold text-white">{bestRunScore.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-zinc-900/45 border border-zinc-800/60 rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center transition-all">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Combo</span>
            <div className="flex items-center gap-1">
              <Flame className={`h-3 sm:h-3.5 w-3 sm:w-3.5 ${streak > 0 ? 'text-orange-500 animate-bounce' : 'text-zinc-600'}`} />
              <span className={`text-xs sm:text-sm font-mono font-bold ${streak > 0 ? 'text-orange-400' : 'text-zinc-400'}`}>
                {streak > 0 ? `x${getComboMultiplier(streak).toFixed(1)}` : streak}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/45 border border-zinc-800/60 rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center transition-all">
            <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">Best Delta</span>
            <div className="flex items-center gap-1">
              <Clock className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-teal-400" />
              <span className="text-xs sm:text-sm font-mono font-bold text-teal-300">
                {bestDelta !== null ? `${bestDelta.toFixed(2)}s` : '--'}
              </span>
            </div>
          </div>
        </section>

        {/* Play Mode Selector */}
        {gameState !== 'COUNTING' && (
          <div className="flex justify-center my-1.5 sm:my-2">
            <div className="inline-flex p-0.5 bg-zinc-950/80 border border-zinc-900 rounded-lg">
              <button
                id="mode-hold"
                onClick={() => handleControlModeChange('HOLD')}
                disabled={gameState !== 'IDLE'}
                className={`px-3.5 py-1 text-[10px] font-mono font-black tracking-wider rounded-md transition-all ${
                  gameState !== 'IDLE' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  controlMode === 'HOLD'
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                HOLD MODE
              </button>
              <button
                id="mode-tap"
                onClick={() => handleControlModeChange('TAP')}
                disabled={gameState !== 'IDLE'}
                className={`px-3.5 py-1 text-[10px] font-mono font-black tracking-wider rounded-md transition-all ${
                  gameState !== 'IDLE' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                } ${
                  controlMode === 'TAP'
                    ? 'bg-zinc-900 text-emerald-400 border border-zinc-800/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                TAP MODE
              </button>
            </div>
          </div>
        )}

        {/* Main Display Stage */}
        <main id="game-stage" className="flex-grow flex flex-col justify-center items-center py-1 sm:py-2 relative min-h-0">
          <AnimatePresence mode="wait">
            
            {/* IDLE STATE */}
            {gameState === 'IDLE' && (
              <motion.div 
                key="idle-state"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full flex flex-col items-center justify-center text-center space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase">
                    Challenge Target
                  </span>
                  <div className="relative flex items-center justify-center py-2 sm:py-4">
                    {/* Ring glow behind text */}
                    <div className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
                    <span className="text-6xl sm:text-7xl font-display font-extrabold tracking-tight text-white select-none">
                      {targetTime.toFixed(2)}
                      <span className="text-xl text-zinc-500 font-medium ml-1">s</span>
                    </span>
                  </div>
                </div>

                <div className="max-w-[280px] text-center">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Tap & hold the trigger below. Count <strong className="text-emerald-400 font-semibold">{targetTime.toFixed(2)}s</strong> in your head, then release.
                  </p>
                </div>

                {runScore > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90 tracking-wider bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <Sparkles className="h-3 w-3" />
                    <span>RUN SCORE: {runScore.toLocaleString()} pts</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* COUNTING STATE */}
            {gameState === 'COUNTING' && (
              <motion.div 
                key="counting-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center justify-center text-center space-y-4 sm:space-y-8"
              >
                <div className="relative flex items-center justify-center w-36 h-36 sm:w-48 sm:h-48">
                  {/* Expanding radar pulse rings */}
                  <div className="absolute w-full h-full rounded-full border border-red-500/20 animate-ping" />
                  <div className="absolute w-3/4 h-3/4 rounded-full border border-red-500/40 animate-pulse pointer-events-none" />
                  <div className="absolute w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-red-950/40 to-transparent blur-md" />
                  
                  <div className="flex flex-col items-center z-10">
                    <span className="text-sm font-mono tracking-widest text-red-400 font-bold animate-pulse">
                      COUNTING
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 mt-1 uppercase tracking-widest">
                      RHYTHM LOCKED
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 tracking-wider italic">
                  Keep holding. Release when ready...
                </p>
              </motion.div>
            )}

            {/* RESULT STATE */}
            {gameState === 'RESULT' && (
              <motion.div 
                key="result-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full flex flex-col items-center justify-center space-y-3.5 sm:space-y-5"
              >
                {/* Result Tier Title */}
                <div className="text-center space-y-1">
                  <span className={`text-xs font-mono tracking-widest font-black uppercase px-3 py-1 rounded-full border ${currentTier.colorClass} ${currentTier.glowClass}`}>
                    {currentTier.label}
                  </span>
                </div>

                {/* Accuracy Match breakdown */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-[290px] sm:max-w-[320px] bg-zinc-900/40 border border-zinc-800/45 rounded-2xl p-3 sm:p-4 relative overflow-hidden">
                  <div className="flex flex-col justify-center border-r border-zinc-800/80 pr-2">
                    <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Target</span>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-zinc-300">
                      {targetTime.toFixed(2)}<span className="text-xs text-zinc-500">s</span>
                    </span>
                  </div>
                  <div className="flex flex-col justify-center pl-2">
                    <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Your Clock</span>
                    <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                      {elapsedTime.toFixed(3)}<span className="text-xs text-zinc-500">s</span>
                    </span>
                  </div>
                </div>

                {/* Difference Badge & explanation */}
                <div className="text-center space-y-1.5 sm:space-y-2 max-w-[280px]">
                  <div className="inline-flex flex-col items-center">
                    <span className="text-[9px] sm:text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-0.5">Accuracy Gap</span>
                    <span className={`text-3xl sm:text-4xl font-display font-black tracking-tight ${currentTier.textColorClass}`}>
                      {formatDelta(currentDelta)}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-400 leading-relaxed font-light px-2">
                    {currentTier.description}
                  </p>
                </div>

                {/* Points earned this round & running combo total */}
                <div className="flex items-center gap-3 text-[11px] sm:text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-400" />
                    <span className={lastRoundPoints > 0 ? 'text-emerald-400 font-bold' : 'text-red-400/80 font-bold'}>
                      {lastRoundPoints > 0 ? `+${lastRoundPoints.toLocaleString()} pts` : 'RUN RESET'}
                    </span>
                  </div>
                  <span className="text-zinc-700">•</span>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    <span className="text-zinc-300">{runScore.toLocaleString()} run</span>
                  </div>
                </div>

                {/* Score Progress visualizer */}
                <div className="w-full max-w-[240px] h-1.5 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800/50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ 
                      width: `${Math.max(5, Math.min(100, (1 - Math.abs(currentDelta) / 1.5) * 100))}%` 
                    }}
                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                    className={`h-full rounded-full ${
                      Math.abs(currentDelta) <= 0.05 ? 'bg-emerald-500' :
                      Math.abs(currentDelta) <= 0.20 ? 'bg-teal-500' :
                      Math.abs(currentDelta) <= 0.50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  />
                  {/* Center threshold marks */}
                  <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/40 transform -translate-x-1/2 pointer-events-none" />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Massive Thumb Control Area */}
        <section id="control-zone" className="w-full flex flex-col items-center justify-center py-2 sm:py-4 relative">
          <div className="relative flex items-center justify-center">
            
            {/* Dynamic decorative visual ring under/around the trigger button */}
            {gameState === 'COUNTING' && (
              <span className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border border-red-500/30 animate-ping pointer-events-none" />
            )}
            
            <motion.button
              id="trigger-button"
              onMouseDown={(e) => {
                if (controlMode === 'HOLD') {
                  startCounting(e);
                } else {
                  handleTap(e);
                }
              }}
              onMouseUp={(e) => {
                if (controlMode === 'HOLD') {
                  stopCounting(e);
                }
              }}
              onMouseLeave={() => {
                if (controlMode === 'HOLD' && gameState === 'COUNTING') {
                  stopCounting();
                }
              }}
              onTouchStart={(e) => {
                if (controlMode === 'HOLD') {
                  startCounting(e);
                } else {
                  handleTap(e);
                }
              }}
              onTouchEnd={(e) => {
                if (controlMode === 'HOLD') {
                  stopCounting(e);
                }
              }}
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full flex flex-col items-center justify-center border-4 outline-none relative select-none touch-none cursor-pointer transition-all ${
                gameState === 'IDLE' 
                  ? 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 hover:bg-zinc-900/90 shadow-[0_0_20px_rgba(16,185,129,0.05)] text-zinc-300' 
                  : gameState === 'COUNTING'
                  ? 'bg-red-600 border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.45)] text-white scale-110 active:scale-110' 
                  : 'bg-zinc-900 border-zinc-800/80 text-zinc-500 opacity-60 cursor-not-allowed'
              }`}
              disabled={gameState === 'RESULT'}
              whileTap={{ scale: gameState === 'IDLE' ? 0.95 : 1.1 }}
            >
              {gameState === 'IDLE' && (
                <div className="flex flex-col items-center pointer-events-none">
                  <span className="text-[11px] sm:text-xs font-mono tracking-widest font-black uppercase text-zinc-400">
                    {controlMode === 'HOLD' ? 'HOLD' : 'TAP'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-zinc-600 mt-0.5">
                    {controlMode === 'HOLD' ? 'TRIGGER' : 'START'}
                  </span>
                </div>
              )}
              {gameState === 'COUNTING' && (
                <div className="flex flex-col items-center pointer-events-none">
                  <span className="text-[11px] sm:text-xs font-mono tracking-widest font-black uppercase text-white animate-pulse">
                    {controlMode === 'HOLD' ? 'RELEASE' : 'TAP'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono tracking-wider text-red-200 mt-0.5 animate-pulse">
                    {controlMode === 'HOLD' ? 'AT TARGET' : 'TO STOP'}
                  </span>
                </div>
              )}
              {gameState === 'RESULT' && (
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-zinc-600" />
              )}
            </motion.button>
          </div>
          
          <div className="h-4 mt-1.5">
            {gameState === 'IDLE' && (
              <p className="text-[9px] sm:text-[10px] font-mono text-zinc-500 tracking-widest uppercase">READY TO ACQUIRE</p>
            )}
            {gameState === 'COUNTING' && (
              <p className="text-[9px] sm:text-[10px] font-mono text-red-400/80 tracking-widest uppercase animate-pulse">RECORDING ELAPSED TIME</p>
            )}
            {gameState === 'RESULT' && (
              <p className="text-[9px] sm:text-[10px] font-mono text-zinc-500 tracking-widest uppercase">MATCH RESOLVED</p>
            )}
          </div>
        </section>

        {/* Footer sliding actions panel */}
        <footer id="footer-actions-panel" className="h-20 sm:h-24 flex items-center justify-center relative">
          <AnimatePresence mode="wait">
            
            {/* IDLE state showing subtle attempt dots to look hyper polished */}
            {gameState === 'IDLE' && (
              <motion.div 
                key="idle-footer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="w-full flex flex-col justify-center items-center"
              >
                {attempts.length > 0 ? (
                  <div className="w-full flex flex-col items-center space-y-2">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 tracking-wider">
                      <TrendingUp className="h-3 w-3 text-zinc-500" />
                      <span>RECENT HISTORY</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
                      {attempts.slice(0, 5).map((att) => {
                        const attTier = getAccuracyTier(att.delta);
                        return (
                          <div 
                            key={att.id}
                            title={`Target: ${att.target}s | Actual: ${att.actual.toFixed(2)}s`}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono border ${attTier.colorClass}`}
                          >
                            {att.delta >= 0 ? '+' : ''}{att.delta.toFixed(2)}s
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-zinc-600 tracking-wider text-center max-w-[200px]">
                    Hold and release on rhythm. Land within 0.50s to score and build your combo!
                  </p>
                )}
              </motion.div>
            )}

            {/* COUNTING state: keep footer empty or quiet for zero distraction */}
            {gameState === 'COUNTING' && (
              <motion.div 
                key="counting-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-mono text-zinc-600 tracking-wider uppercase text-center"
              >
                FOCUSING BRAINWAVES
              </motion.div>
            )}

            {/* RESULT state: sliding actions drawer panel */}
            {gameState === 'RESULT' && (
              <motion.div 
                key="result-footer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                className="w-full flex justify-center"
              >
                <button
                  id="next-round-button"
                  onClick={handleNextRound}
                  className="w-full max-w-[280px] flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-zinc-950 hover:opacity-90 active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                >
                  <span>Next Round</span>
                  <ArrowRight className="h-3.5 sm:h-4 w-3.5 sm:w-4 stroke-[3px]" />
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </footer>

      </div>

      {/* HOW TO PLAY MODAL */}
      <AnimatePresence>
        {showHowTo && (
          <motion.div 
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowHowTo(false)}
          >
            <motion.div 
              key="modal-card"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full max-w-sm text-left space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-base font-display font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  How to Play Chrono Sense
                </h3>
                <button 
                  onClick={() => setShowHowTo(false)}
                  className="text-zinc-500 hover:text-white font-bold text-sm px-2 py-1 rounded hover:bg-zinc-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-zinc-400 leading-relaxed">
                <div className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-white">1</span>
                  <p>Read the given <strong>Target Time</strong> (e.g. 3.50 seconds).</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-white">2</span>
                  <p>Touch and hold down the massive <strong>HOLD TRIGGER</strong> button. The target will immediately disappear!</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-white">3</span>
                  <p>Count the target seconds in your mind as accurately as possible, then lift your finger to release.</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-white">4</span>
                  <p>Keep your timing accuracy error within <strong>±0.50 seconds</strong> to score points and keep your combo alive!</p>
                </div>

                <div className="flex gap-2.5 items-start">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-white">5</span>
                  <p>Precision pays: perfect timing scores up to <strong>1,000 pts</strong>, boosted by a combo multiplier (up to <strong>2x</strong>) that grows with consecutive hits. One miss beyond ±0.50s resets your run!</p>
                </div>
              </div>

              {/* Accuracy Table info */}
              <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-850 space-y-2">
                <span className="text-[9px] font-mono text-zinc-500 tracking-widest block uppercase">Accuracy Tiers</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-emerald-400">GOD TIER</span>
                  </div>
                  <div className="text-zinc-500 text-right">≤ 0.05s</div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    <span className="text-teal-400">EXCELLENT</span>
                  </div>
                  <div className="text-zinc-500 text-right">≤ 0.20s</div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-amber-400">GOOD EFFORT</span>
                  </div>
                  <div className="text-zinc-500 text-right">≤ 0.50s</div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-red-400">WAY OFF</span>
                  </div>
                  <div className="text-zinc-500 text-right">&gt; 0.50s</div>
                </div>
              </div>

              <div className="pt-2 flex justify-between gap-2.5 items-center">
                <button 
                  onClick={resetAllStats}
                  className="text-[10px] font-mono text-red-500/80 hover:text-red-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  Reset Saved Data
                </button>
                <button 
                  onClick={() => setShowHowTo(false)}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 px-3.5 py-1.5 rounded-xl font-mono text-[11px] font-bold"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
