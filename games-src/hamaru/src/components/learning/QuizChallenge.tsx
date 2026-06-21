import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, X, Flame, Trophy, RefreshCw } from 'lucide-react';
import { LearningModeProps, StudyItem, answerOf } from './types';

interface Question {
  item: StudyItem;
  options: string[];
}

const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

function buildQuestions(items: StudyItem[]): Question[] {
  const usable = items.filter((it) => answerOf(it));
  return shuffle(usable).slice(0, 10).map((item) => {
    const correct = answerOf(item);
    const distractors = shuffle(
      usable.filter((it) => answerOf(it) !== correct).map(answerOf),
    );
    const unique: string[] = [];
    for (const d of distractors) {
      if (!unique.includes(d) && d !== correct) unique.push(d);
      if (unique.length === 3) break;
    }
    return { item, options: shuffle([correct, ...unique]) };
  });
}

/** 4-option multiple-choice quiz: pick the reading/meaning of the shown glyph. */
export default function QuizChallenge({ items, onFinish, onBack }: LearningModeProps) {
  const questions = useMemo(() => buildQuestions(items), [items]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[idx];

  const choose = (opt: string) => {
    if (picked) return;
    setPicked(opt);
    const correct = opt === answerOf(q.item);
    const newCombo = correct ? combo + 1 : 0;
    const gain = correct ? 10 + Math.min(newCombo, 5) * 2 : 0; // combo bonus, capped
    const newXp = xp + gain;
    setCombo(newCombo);
    setScore((s) => s + gain);
    setXp(newXp);
    setTimeout(() => {
      if (idx + 1 >= questions.length) {
        setDone(true);
        onFinish(newXp + 5); // accumulated XP + small completion bonus
      } else {
        setIdx(idx + 1);
        setPicked(null);
      }
    }, 850);
  };

  if (!q && !done) {
    return (
      <div className="text-center py-16 text-slate-400">
        Not enough items to build a quiz.
        <button onClick={onBack} className="block mx-auto mt-4 text-indigo-400 font-bold cursor-pointer">Go back</button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / (questions.length * 10)) * 100);
    return (
      <div className="text-center py-12 space-y-5 max-w-sm mx-auto">
        <div className="text-6xl">{pct >= 70 ? '🏆' : '📖'}</div>
        <h3 className="text-2xl font-black text-slate-100">Quiz Complete!</h3>
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-2 font-mono text-sm">
          <div className="flex justify-between"><span className="text-slate-400">Score</span><span className="text-amber-400 font-bold">{score}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Accuracy</span><span className="text-emerald-400 font-bold">{pct}%</span></div>
          <div className="flex justify-between"><span className="text-slate-400">XP earned</span><span className="text-indigo-400 font-bold">+{xp}</span></div>
        </div>
        <div className="flex flex-col gap-2.5">
          <button onClick={() => { setIdx(0); setPicked(null); setScore(0); setCombo(0); setXp(0); setDone(false); }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
            <RefreshCw size={16} /> Try Again
          </button>
          <button onClick={onBack} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3.5 rounded-xl transition-colors cursor-pointer">
            Back to Learn
          </button>
        </div>
      </div>
    );
  }

  const correctAns = answerOf(q.item);

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3 font-mono text-xs">
          {combo > 1 && (
            <span className="flex items-center gap-1 text-orange-400 font-bold"><Flame size={13} /> {combo}x</span>
          )}
          <span className="flex items-center gap-1 text-amber-400 font-bold"><Trophy size={13} /> {score}</span>
          <span className="text-slate-400">{idx + 1}/{questions.length}</span>
        </div>
      </div>

      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300" style={{ width: `${(idx / questions.length) * 100}%` }} />
      </div>

      {/* Prompt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 py-10 flex flex-col items-center justify-center gap-1"
        >
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">What does this mean?</span>
          <span className="text-6xl sm:text-7xl font-bold text-amber-300">{q.item.jp}</span>
        </motion.div>
      </AnimatePresence>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {q.options.map((opt) => {
          const isCorrect = opt === correctAns;
          const isPicked = picked === opt;
          let cls = 'border-slate-800 bg-slate-900 hover:border-indigo-600 hover:bg-slate-850 text-slate-100';
          if (picked) {
            if (isCorrect) cls = 'border-emerald-500 bg-emerald-950/40 text-emerald-300';
            else if (isPicked) cls = 'border-red-500 bg-red-950/40 text-red-300';
            else cls = 'border-slate-850 bg-slate-900/50 text-slate-500';
          }
          return (
            <button
              key={opt}
              disabled={!!picked}
              onClick={() => choose(opt)}
              className={`w-full py-4 px-5 rounded-2xl border-2 font-semibold text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${cls}`}
            >
              <span>{opt}</span>
              {picked && isCorrect && <Check size={18} className="text-emerald-400 shrink-0" />}
              {picked && isPicked && !isCorrect && <X size={18} className="text-red-400 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
