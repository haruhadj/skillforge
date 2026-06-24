/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import GameUI from './components/GameUI';
import RulesModal from './components/RulesModal';
import { GameMode, GameStats } from './types';
import { audio } from './utils/audio';
import { Layers } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<GameMode>('classic');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [gameActive, setGameActive] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [restartTrigger, setRestartTrigger] = useState<number>(0);

  // Stats storage
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    peakLevel: 0,
    blocksMerged: 0,
    tntUsed: 0,
  });

  // Load High Scores and preferences on Startup
  useEffect(() => {
    const savedHighScore = localStorage.getItem('merge2048_highscore');
    const savedPeak = localStorage.getItem('merge2048_peaklevel');
    const hasPlayedBefore = localStorage.getItem('merge2048_played_before');
    const savedMute = localStorage.getItem('merge2048_muted');

    setStats((prev) => ({
      ...prev,
      highScore: savedHighScore ? parseInt(savedHighScore) : 0,
      peakLevel: savedPeak ? parseInt(savedPeak) : 0,
    }));

    if (savedMute === 'true') {
      audio.toggleMute();
      setIsMuted(true);
    }

    // Auto open instructions modal if it's the player's first load session!
    if (!hasPlayedBefore) {
      setIsRulesOpen(true);
      localStorage.setItem('merge2048_played_before', 'true');
    }
  }, []);

  // Update Score and High Score bounds
  const handleScoreChange = (scoreAdd: number) => {
    setStats((prev) => {
      const newScore = prev.score + scoreAdd;
      const isNewHigh = newScore > prev.highScore;
      const finalHigh = isNewHigh ? newScore : prev.highScore;

      if (isNewHigh) {
        localStorage.setItem('merge2048_highscore', finalHigh.toString());
      }

      return {
        ...prev,
        score: newScore,
        highScore: finalHigh,
      };
    });
  };

  // Update merge and tnt usage stats tracker
  const handleStatChange = (incremental: { levelReached: number; mergedCount: number; tntCount: number }) => {
    setStats((prev) => {
      const finalPeak = Math.max(prev.peakLevel, incremental.levelReached);
      if (incremental.levelReached > prev.peakLevel) {
        localStorage.setItem('merge2048_peaklevel', finalPeak.toString());
      }

      return {
        ...prev,
        peakLevel: finalPeak,
        blocksMerged: prev.blocksMerged + incremental.mergedCount,
        tntUsed: prev.tntUsed + incremental.tntCount,
      };
    });
  };

  // Sound muting toggler callback
  const handleMuteToggle = () => {
    const nextMute = audio.toggleMute();
    setIsMuted(nextMute);
    localStorage.setItem('merge2048_muted', nextMute.toString());
  };

  // Mode change: if a game is in progress, restart with the new mode
  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    if (gameActive) {
      setStats((prev) => ({ ...prev, score: 0, blocksMerged: 0, tntUsed: 0 }));
      setIsGameOver(false);
      setRestartTrigger((prev) => prev + 1);
    }
  };

  // Handles starting a fresh match
  const handleStartGame = () => {
    setStats((prev) => ({
      ...prev,
      score: 0,
      blocksMerged: 0,
      tntUsed: 0,
    }));
    setIsGameOver(false);
    setGameActive(true);
  };

  // Reset Match callback from UI button
  const handleRestart = () => {
    setStats((prev) => ({
      ...prev,
      score: 0,
      blocksMerged: 0,
      tntUsed: 0,
    }));
    setIsGameOver(false);
    setGameActive(true);
    setRestartTrigger((prev) => prev + 1); // trigger complete game re-init
  };

  // Handle Overflow Game Over
  const handleGameOver = () => {
    setGameActive(false);
    setIsGameOver(true);
  };

  return (
    <div
      id="root-viewport-wrap"
      className="min-h-screen w-full bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,1)_40%,rgba(2,6,23,1)_100%)] flex flex-col items-center justify-start py-4 px-3 sm:px-6 md:py-8 select-none overflow-x-hidden"
    >
      {/* Visual background grid layout indicators */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.015)_1.5px,transparent_1.5px)] bg-[size:30px_30px] pointer-events-none" />

      {/* Main Game Interface Board block wrapper */}
      <main className="w-full max-w-sm flex flex-col items-center gap-4 z-10">
        
        {/* Game UI Overlay dashboard component (scores, start menu, gameover menu) */}
        <GameUI
          stats={stats}
          mode={mode}
          onModeChange={handleModeChange}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onRestart={handleRestart}
          onOpenRules={() => setIsRulesOpen(true)}
          isGameOver={isGameOver}
          gameActive={gameActive}
          onStartGame={handleStartGame}
          maxLevelReached={stats.peakLevel}
        />

        {/* Physics-simylated canvas board */}
        <GameBoard
          mode={mode}
          isMuted={isMuted}
          onScoreChange={handleScoreChange}
          onStatChange={handleStatChange}
          onGameOver={handleGameOver}
          gameActive={gameActive}
          restartTrigger={restartTrigger}
        />

      </main>

      {/* Dialog Guidance Modal popup with rule explanations and touch guides */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

    </div>
  );
}
