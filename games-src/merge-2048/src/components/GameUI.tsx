/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, VolumeX, RotateCcw, HelpCircle, Gamepad2, Layers, Award, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameMode, GameStats } from '../types';

interface GameUIProps {
  stats: GameStats;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
  isGameOver: boolean;
  gameActive: boolean;
  onStartGame: () => void;
  maxLevelReached: number;
}

export default function GameUI({
  stats,
  mode,
  onModeChange,
  isMuted,
  onMuteToggle,
  onRestart,
  onOpenRules,
  isGameOver,
  gameActive,
  onStartGame,
  maxLevelReached,
}: GameUIProps) {
  const peakBlockValue = maxLevelReached > 0 ? Math.pow(2, maxLevelReached) : 0;

  return (
    <div id="game-ui-overlay" className="w-full max-w-md mx-auto flex flex-col gap-4 text-slate-100 font-sans p-2">
      
      {/* Top HUD Header Section */}
      <div id="hud-bar" className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 backend-blur-md">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-200 bg-clip-text text-transparent">
            Merge 2048
          </h1>
        </div>

        {/* Action Controls cluster */}
        <div className="flex items-center gap-1.5 animate-fade-in">
          <button
            id="help-trigger-btn"
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 hover:text-white text-slate-400 transition"
            title="Help & Rules"
          >
            <HelpCircle className="w-4.5 h-4.5" />
          </button>
          
          <button
            id="sound-toggle-btn"
            onClick={onMuteToggle}
            className={`p-2 rounded-xl transition ${
              isMuted ? 'bg-red-950/40 text-red-400 border border-red-900/40' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
          </button>

          {gameActive && (
            <button
              id="reset-trigger-btn"
              onClick={onRestart}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition active:rotate-180 duration-500"
              title="Reset Match"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      {/* Score and High Score Panel displays */}
      <div id="scorepanel-row" className="grid grid-cols-2 gap-3">
        {/* Score Capsule */}
        <div className="relative overflow-hidden bg-slate-900/70 p-3 rounded-2xl border border-slate-850 shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl" />
          <span className="block text-[10px] font-mono tracking-widest text-[#a5b4fc] uppercase">Score</span>
          <motion.span
            id="score-count"
            key={stats.score}
            initial={{ scale: 0.92, y: -2 }}
            animate={{ scale: 1, y: 0 }}
            className="block text-2xl font-extrabold text-white mt-0.5 tracking-tight"
          >
            {stats.score}
          </motion.span>
        </div>

        {/* High Score Capsule */}
        <div className="relative overflow-hidden bg-slate-900/70 p-3 rounded-2xl border border-slate-850 shadow-md">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl" />
          <div className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span className="block text-[10px] font-mono tracking-widest text-yellow-400 uppercase">Best Record</span>
          </div>
          <span id="best-score-count" className="block text-2xl font-extrabold text-white mt-0.5 tracking-tight">
            {stats.highScore}
          </span>
        </div>
      </div>

      {/* Main play space menu wrappers */}
      <AnimatePresence mode="wait">
        {!gameActive && !isGameOver && (
          <motion.div
            id="main-start-gate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-5 p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-indigo-950/80 border border-indigo-900/40 text-center relative overflow-hidden shadow-2xl shadow-indigo-950/20"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.06)_0,transparent_60%)] pointer-events-none" />
            
            <div className="space-y-2 relative z-10">
              <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                <Layers className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold font-sans tracking-tight text-white">Select Game Mode</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Combine identical numbered elements to reach the 2048 threshold. Discover the regular bouncy spheres or poly-faceted geometrical coordinates!
              </p>
            </div>

            {/* Mode selection columns */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              <button
                id="mode-classic-selector"
                onClick={() => onModeChange('classic')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition ${
                  mode === 'classic'
                    ? 'border-indigo-500 bg-indigo-950/50 hover:bg-indigo-950/60 shadow-lg shadow-indigo-900/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'classic' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'}`}>
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">Classic Rects</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Classic Block Layout</span>
                </div>
              </button>

              <button
                id="mode-shape-selector"
                onClick={() => onModeChange('shape')}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border text-center transition ${
                  mode === 'shape'
                    ? 'border-amber-500 bg-amber-950/30 hover:bg-amber-950/40 shadow-lg shadow-amber-900/10'
                    : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'shape' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'}`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">Geometry Shapes</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Physical Polygons</span>
                </div>
              </button>
            </div>

            <button
              id="start-button"
              onClick={onStartGame}
              className="w-full mt-2 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl transition shadow-xl shadow-indigo-950/40 hover:shadow-indigo-500/20 active:scale-[0.98] font-sans"
            >
              Start Merge Race
            </button>
          </motion.div>
        )}

        {isGameOver && (
          <motion.div
            id="gameover-overlay-gate"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col gap-5 p-6 rounded-2xl bg-slate-900 border border-red-900/30 text-center relative overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06)_0,transparent_60%)] pointer-events-none" />
            
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-mono tracking-widest text-red-400 uppercase bg-red-950/40 px-2.5 py-1.5 rounded-full border border-red-900/40">
                CONTAINER OVERFLOWED
              </span>
              <h2 className="text-2xl font-black font-sans tracking-tight text-white pt-2.5">Game Over</h2>
            </div>

            {/* Performance metrics dashboard list */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-4 rounded-xl border border-slate-850 text-left relative z-10">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Final Score</span>
                <span className="text-xl font-bold font-mono text-indigo-400">{stats.score}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Peak Item</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{peakBlockValue > 0 ? peakBlockValue : '-'}</span>
              </div>
              <div className="pt-2 border-t border-slate-850 col-span-2">
                <span className="block text-[10px] text-slate-400 uppercase">Total Merges</span>
                <span className="text-lg font-semibold text-slate-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" /> {stats.blocksMerged}
                </span>
              </div>
            </div>

            <button
              id="try-again-button"
              onClick={onRestart}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl transition shadow-lg shadow-red-950/30 active:scale-[0.98]"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* In-game mode switcher + instructions */}
      {gameActive && (
        <motion.div
          id="playing-controls"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col gap-2"
        >
          {/* Mode toggle — switching restarts the game */}
          <div className="flex items-center gap-2 bg-slate-900/60 p-2 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-mono text-slate-500 shrink-0 pl-1">Mode:</span>
            <div className="flex flex-1 gap-1.5">
              <button
                onClick={() => onModeChange('classic')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  mode === 'classic'
                    ? 'bg-indigo-600/80 text-white border border-indigo-500/60'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
                Classic
              </button>
              <button
                onClick={() => onModeChange('shape')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition ${
                  mode === 'shape'
                    ? 'bg-amber-600/80 text-white border border-amber-500/60'
                    : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Shapes
              </button>
            </div>
          </div>

          <div className="bg-slate-900/30 p-2.5 rounded-xl border border-slate-850 text-center select-none">
            <p className="text-[10px] text-slate-400 leading-tight">
              <span className="text-indigo-400 font-semibold font-mono">Desktop:</span> Click/Drag to aim, release to drop.
              <br />
              <span className="text-indigo-400 font-semibold font-mono">Mobile:</span> Hold/Slide to aim, lift finger to drop!
            </p>
          </div>
        </motion.div>
      )}

    </div>
  );
}
