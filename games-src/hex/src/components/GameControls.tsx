/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameMode, AiDifficulty, Player, GameStats } from '../types';
import { Users, Cpu, Undo2, RotateCcw, Trophy, RefreshCw, Sparkles } from 'lucide-react';

interface GameControlsProps {
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  currentPlayer: Player;
  winner: Player | null;
  stats: GameStats;
  onModeChange: (mode: GameMode) => void;
  onDifficultyChange: (difficulty: AiDifficulty) => void;
  onUndo: () => void;
  onResetGame: () => void;
  onResetStats: () => void;
  canUndo: boolean;
}

export default function GameControls({
  gameMode,
  aiDifficulty,
  currentPlayer,
  winner,
  stats,
  onModeChange,
  onDifficultyChange,
  onUndo,
  onResetGame,
  onResetStats,
  canUndo,
}: GameControlsProps) {
  return (
    <div className="w-full flex flex-col gap-3.5 sm:gap-5" id="game-controls-container">
      
      {/* 1. Mode and Difficulty Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Game Mode Selector */}
        <div className="bg-stone-900/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2.5">
          <label className="text-[11px] font-mono tracking-wider text-stone-400 uppercase flex items-center gap-1.5">
            <Users size={12} className="text-stone-400" />
            Game Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onModeChange('pvp')}
              className={`py-2 px-3 rounded-lg text-xs font-sans font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                gameMode === 'pvp'
                  ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                  : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300 border border-white/5'
              }`}
              id="mode-pvp-btn"
            >
              <Users size={14} />
              Pass & Play
            </button>
            <button
              onClick={() => onModeChange('ai')}
              className={`py-2 px-3 rounded-lg text-xs font-sans font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                gameMode === 'ai'
                  ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                  : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300 border border-white/5'
              }`}
              id="mode-ai-btn"
            >
              <Cpu size={14} />
              vs. Computer
            </button>
          </div>
        </div>

        {/* AI Difficulty Selector (Visible only in vs. Computer mode) */}
        <div className="bg-stone-900/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2.5">
          <label className="text-[11px] font-mono tracking-wider text-stone-400 uppercase flex items-center gap-1.5">
            <Cpu size={12} className="text-stone-400" />
            AI Difficulty
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['easy', 'medium', 'hard'] as AiDifficulty[]).map(diff => (
              <button
                key={diff}
                disabled={gameMode !== 'ai'}
                onClick={() => onDifficultyChange(diff)}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-sans font-medium capitalize transition-all duration-200 cursor-pointer ${
                  gameMode !== 'ai'
                    ? 'opacity-30 cursor-not-allowed text-stone-600 bg-stone-900/10'
                    : aiDifficulty === diff
                    ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                    : 'bg-stone-800/60 hover:bg-stone-800 text-stone-300 border border-white/5'
                }`}
                id={`diff-${diff}-btn`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>



      {/* 3. Global Score Tracker Stats */}
      <div className="bg-stone-900/30 border border-white/5 rounded-xl p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
          <span className="text-xs font-mono text-stone-400 tracking-wider uppercase flex items-center gap-1">
            <Trophy size={12} className="text-amber-400" />
            Session History
          </span>
          <button
            onClick={onResetStats}
            className="text-[10px] font-mono text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
            id="reset-stats-btn"
          >
            Reset Stats
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-stone-950/40 p-2 rounded-lg border border-white/5">
            <div className="text-lg font-bold font-mono text-rose-400">{stats.redWins}</div>
            <div className="text-[9px] font-mono text-stone-500 uppercase tracking-tight">Red Wins</div>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-lg border border-white/5">
            <div className="text-lg font-bold font-mono text-sky-400">{stats.blueWins}</div>
            <div className="text-[9px] font-mono text-stone-500 uppercase tracking-tight">Blue Wins</div>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-lg border border-white/5">
            <div className="text-lg font-bold font-mono text-amber-400">{stats.playerWinsVsAi}</div>
            <div className="text-[9px] font-mono text-stone-500 uppercase tracking-tight">Vs AI Win</div>
          </div>
          <div className="bg-stone-950/40 p-2 rounded-lg border border-white/5">
            <div className="text-lg font-bold font-mono text-stone-300">{stats.aiWins}</div>
            <div className="text-[9px] font-mono text-stone-500 uppercase tracking-tight">AI Wins</div>
          </div>
        </div>
      </div>

      {/* 4. Secondary Action Buttons (Undo, Restart, Help) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          disabled={!canUndo || !!winner}
          onClick={onUndo}
          className={`py-2.5 px-4 rounded-xl text-xs font-sans font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !canUndo || !!winner
              ? 'opacity-40 cursor-not-allowed bg-stone-800/40 text-stone-500 border border-white/5'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-white/10 active:scale-95'
          }`}
          id="undo-move-btn"
        >
          <Undo2 size={14} />
          Undo Move
        </button>
        <button
          onClick={onResetGame}
          className="py-2.5 px-4 rounded-xl text-xs font-sans font-medium bg-stone-800 hover:bg-stone-700 text-stone-100 border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          id="restart-game-btn"
        >
          <RotateCcw size={14} />
          Restart Match
        </button>
      </div>

    </div>
  );
}
