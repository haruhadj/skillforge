/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Touchpad, HelpCircle, Flame, ShieldAlert, Award, Grid, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const listItems = [
    { level: 1, val: 2, color: 'from-blue-500 to-indigo-600', text: 'Classic block: 2' },
    { level: 2, val: 4, color: 'from-purple-500 to-pink-600', text: 'Classic block: 4' },
    { level: 3, val: 8, color: 'from-rose-500 to-red-600', text: 'Classic block: 8' },
    { level: 4, val: 16, color: 'from-orange-400 to-amber-600', text: 'Classic block: 16' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="rules-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <motion.div
            id="rules-container"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 shadow-2xl scrollbar-thin scrollbar-thumb-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-yellow-400" />
                <h2 className="text-xl font-bold font-sans tracking-tight text-white">How to Play</h2>
              </div>
              <button
                id="close-rules-btn"
                onClick={onClose}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                aria-label="Close guides"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mechanics Explanation */}
            <div className="space-y-5 text-sm leading-relaxed text-slate-300">
              
              {/* Controls Section */}
              <div id="instruction-controls" className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                  <Touchpad className="w-4 h-4 text-emerald-400" /> Controls
                </h3>
                <ul className="space-y-2 list-disc pl-5 text-slate-300">
                  <li>
                    <span className="font-semibold text-emerald-400">Desktop:</span> Click and drag the mouse horizontally to aim pool, release mouse button to drop the block.
                  </li>
                  <li>
                    <span className="font-semibold text-emerald-400">Mobile:</span> Press & drag touch screen to aim, lift your finger to drop the block!
                  </li>
                </ul>
              </div>

              {/* Merge Rules */}
              <div id="instruction-merge" className="space-y-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-400" /> Combining Blocks
                </h3>
                <p>
                  Blocks with the **same values** will merge upon colliding. Combining two identical blocks results in a single block of double value (e.g. 2 + 2 = 4, 1024 + 1024 = 2048!).
                </p>
                
                {/* Visual block sequence */}
                <div className="flex items-center justify-between px-2 py-3 bg-slate-950/40 rounded-xl border border-slate-800/40">
                  {listItems.map((item, idx) => (
                    <React.Fragment key={item.val}>
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center font-bold text-white shadow-md text-xs`}>
                          {item.val}
                        </div>
                      </div>
                      {idx < listItems.length - 1 && (
                        <div className="text-slate-600 font-bold">➔</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Game Modes */}
              <div id="instruction-modes" className="space-y-2">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Grid className="w-4 h-4 text-cyan-400" /> Display Modes
                </h3>
                <ul className="space-y-2 pl-4 list-disc">
                  <li>
                    <span className="font-semibold text-sky-400 text-xs uppercase px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 mr-1.5">Classic Mode</span> 
                    Blocks are sleek rounded cards featuring neon numeric engravings.
                  </li>
                  <li>
                    <span className="font-semibold text-amber-400 text-xs uppercase px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 mr-1.5">Shape Mode</span> 
                    Blocks are distinct multi-faceted geometric shapes. A circle corresponds to index 2, Triangle for 4, Square for 8, Pentagon for 16, and on up to multi-pointed glowing Star polygons for higher values!
                  </li>
                </ul>
              </div>

              {/* Special Features (TNT Blocks & Overflow) */}
              <div id="instruction-special" className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="flex gap-3">
                  <Flame className="w-6 h-6 text-red-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">TNT Clearups</h4>
                    <p className="text-xs text-slate-300">
                      Occasionally, a special glowing <span className="text-red-400 font-semibold font-mono">TNT</span> block is drafted in your slider. Drop it into crowded clusters to detonate everything in an explosive shockwave!
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2 border-t border-slate-800">
                  <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-white font-semibold">Overfill Container Warning</h4>
                    <p className="text-xs text-slate-300">
                      Keep blocks below the top red line. If static blocks sit above the line for more than 3 seconds, the pressure triggers a <span className="text-amber-400 font-semibold">Game Over</span>!
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* OK Button */}
            <div id="rules-footer" className="mt-6">
              <button
                id="rules-ok-btn"
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-900/30 active:scale-[0.98]"
              >
                Let’s Drop Some Blocks!
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
