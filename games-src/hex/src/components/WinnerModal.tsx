/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, GameMode } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Eye, Sparkles } from 'lucide-react';

interface WinnerModalProps {
  winner: Player | null;
  gameMode: GameMode;
  onRestart: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function WinnerModal({
  winner,
  gameMode,
  onRestart,
  isOpen,
  onClose,
}: WinnerModalProps) {
  if (!isOpen || !winner) return null;

  const isBlueAI = gameMode === 'ai' && winner === 'blue';
  const winnerName = winner === 'red' ? 'Red Player' : isBlueAI ? 'Computer AI' : 'Blue Player';
  const themeColor = winner === 'red' ? 'text-rose-500' : 'text-sky-500';
  const themeBg = winner === 'red' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-sky-500/10 border-sky-500/20';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" id="winner-modal-overlay">
        
        {/* Backdrop glass blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-stone-950/70 backdrop-blur-md cursor-pointer"
        />

        {/* Modal Card Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-stone-900 border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden text-center z-10 flex flex-col items-center"
        >
          {/* Subtle Ambient Glow effect in background */}
          <div className={`absolute -top-24 w-48 h-48 rounded-full filter blur-3xl opacity-20 ${winner === 'red' ? 'bg-rose-500' : 'bg-sky-500'}`} />

          {/* Trophy & Sparkles Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              winner === 'red' ? 'bg-rose-500/20 text-rose-400' : 'bg-sky-500/20 text-sky-400'
            }`}
          >
            <Trophy size={36} className="animate-pulse" />
          </motion.div>

          {/* Match Completion Heading */}
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase font-semibold flex items-center gap-1 mb-1">
            <Sparkles size={10} />
            Match Completed
            <Sparkles size={10} />
          </span>

          {/* Winner Title */}
          <h2 className="text-3xl font-sans font-bold tracking-tight text-white mb-2">
            <span className={themeColor}>{winnerName}</span> Wins!
          </h2>

          {/* Connection Description Badge */}
          <div className={`px-4 py-1.5 rounded-full border text-xs font-mono mb-6 uppercase tracking-wider ${themeBg} ${themeColor}`}>
            {winner === 'red' ? 'Red Connected Top to Bottom!' : 'Blue Connected Left to Right!'}
          </div>

          <p className="text-sm text-stone-300 leading-relaxed max-w-xs mb-6">
            A beautiful sequence of interlocking hexagonal stones has completed the target connection. Excellent match!
          </p>

          {/* Buttons for next steps */}
          <div className="w-full grid grid-cols-2 gap-3.5">
            <button
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-sans font-medium bg-stone-800 hover:bg-stone-700 text-stone-200 border border-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              id="review-board-btn"
            >
              <Eye size={14} />
              Review Board
            </button>
            <button
              onClick={onRestart}
              className={`py-2.5 px-4 rounded-xl text-xs font-sans font-semibold text-stone-950 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                winner === 'red' ? 'bg-rose-400 hover:bg-rose-300' : 'bg-sky-400 hover:bg-sky-300'
              }`}
              id="new-match-btn"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              Play Again
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
