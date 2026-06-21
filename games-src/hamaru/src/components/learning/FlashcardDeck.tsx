import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Check, RefreshCw, Sparkles } from 'lucide-react';
import { LearningModeProps } from './types';

/**
 * Tap-to-flip flashcard deck. Front shows the Japanese glyph, back reveals the
 * reading + meaning. The player self-marks "Got it" or "Review"; finishing the
 * deck awards XP scaled by how many were marked known.
 */
export default function FlashcardDeck({ items, onFinish, onBack }: LearningModeProps) {
  const deck = useMemo(
    () => [...items].sort(() => Math.random() - 0.5).slice(0, 16),
    [items],
  );

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [done, setDone] = useState(false);

  const card = deck[idx];

  const advance = (gotIt: boolean) => {
    const nextKnown = known + (gotIt ? 1 : 0);
    setKnown(nextKnown);
    if (idx + 1 >= deck.length) {
      setDone(true);
      // 6 XP per known card, +4 just for finishing the deck.
      onFinish(nextKnown * 6 + 4);
      return;
    }
    setFlipped(false);
    setIdx(idx + 1);
  };

  if (!card) {
    return (
      <div className="text-center py-16 text-slate-400">
        No cards available for this set.
        <button onClick={onBack} className="block mx-auto mt-4 text-indigo-400 font-bold cursor-pointer">
          Go back
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-12 space-y-5 max-w-sm mx-auto">
        <div className="text-6xl">🎴</div>
        <h3 className="text-2xl font-black text-slate-100">Deck Complete!</h3>
        <p className="text-slate-400 text-sm">
          You marked <strong className="text-emerald-400">{known}</strong> / {deck.length} as known.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => { setIdx(0); setKnown(0); setFlipped(false); setDone(false); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Shuffle Again
          </button>
          <button onClick={onBack} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition-colors cursor-pointer">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="font-mono text-xs text-slate-400">
          {idx + 1} / {deck.length}
        </span>
      </div>

      {/* Progress */}
      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300"
          style={{ width: `${((idx) / deck.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="[perspective:1200px]">
        <AnimatePresence mode="wait">
          <motion.button
            key={card.id + (flipped ? '-b' : '-f')}
            initial={{ opacity: 0, rotateY: flipped ? -90 : 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setFlipped((f) => !f)}
            className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 shadow-xl flex flex-col items-center justify-center gap-3 px-6 cursor-pointer active:scale-[0.99] transition-transform [transform-style:preserve-3d]"
          >
            {!flipped ? (
              <>
                <span className="text-6xl sm:text-7xl font-bold text-amber-300">{card.jp}</span>
                <span className="text-[11px] uppercase tracking-widest text-slate-500 font-mono flex items-center gap-1.5">
                  <RotateCcw size={12} /> Tap to flip
                </span>
              </>
            ) : (
              <>
                <span className="text-3xl sm:text-4xl font-bold text-slate-100">{card.romaji}</span>
                {card.meaning && (
                  <span className="text-lg text-emerald-400 font-semibold text-center">{card.meaning}</span>
                )}
                <span className="text-[11px] uppercase tracking-widest text-slate-500 font-mono mt-1">{card.jp}</span>
              </>
            )}
          </motion.button>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => advance(false)}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} /> Review
        </button>
        <button
          onClick={() => advance(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Check size={16} /> Got it
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
        <Sparkles size={12} className="text-indigo-400" /> Self-mark honestly to earn XP
      </p>
    </div>
  );
}
