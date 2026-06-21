import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, ListChecks, PenLine, Sparkles, Loader2 } from 'lucide-react';
import { HIRAGANA, KATAKANA, LearningCategory } from '../../data/kana';
import { FLASHCARDS } from '../../data';
import { fetchStudyCards } from '../../lib/api';
import { StudyItem } from './types';
import FlashcardDeck from './FlashcardDeck';
import QuizChallenge from './QuizChallenge';
import WritingCanvas from './WritingCanvas';

type Mode = 'flashcards' | 'quiz' | 'writing';

interface LearningHubProps {
  /** Report XP earned in a learning session up to the host/App. */
  onLearningXp: (xp: number) => void;
}

const CATEGORIES: { id: LearningCategory; label: string; glyph: string }[] = [
  { id: 'hiragana', label: 'Hiragana', glyph: 'あ' },
  { id: 'katakana', label: 'Katakana', glyph: 'ア' },
  { id: 'kanji', label: 'Kanji', glyph: '水' },
  { id: 'vocab', label: 'Vocab', glyph: '言葉' },
];

const MODES: { id: Mode; label: string; desc: string; icon: React.ReactNode; accent: string }[] = [
  { id: 'flashcards', label: 'Flashcards', desc: 'Flip & self-mark to memorise', icon: <Layers size={22} />, accent: 'text-indigo-400 border-indigo-600/40 hover:border-indigo-500' },
  { id: 'quiz', label: 'Quiz', desc: 'Multiple-choice recall', icon: <ListChecks size={22} />, accent: 'text-emerald-400 border-emerald-600/40 hover:border-emerald-500' },
  { id: 'writing', label: 'Writing', desc: 'Draw the stroke & self-check', icon: <PenLine size={22} />, accent: 'text-amber-400 border-amber-600/40 hover:border-amber-500' },
];

/** Build study items for a category. Kana is static; kanji/vocab use JMdict. */
async function loadItems(category: LearningCategory): Promise<StudyItem[]> {
  if (category === 'hiragana' || category === 'katakana') {
    const table = category === 'hiragana' ? HIRAGANA : KATAKANA;
    return table.map((k) => ({ id: `${category}-${k.kana}`, jp: k.kana, romaji: k.romaji, meaning: '' }));
  }
  const remote = await fetchStudyCards(category, 1, 24);
  if (remote) {
    return remote.map((w) => ({ id: w.id, jp: w.japanese, romaji: w.romaji, meaning: w.english }));
  }
  // Offline fallback: bundled static cards.
  return FLASHCARDS.filter((c) => c.type === category).map((c) => ({
    id: c.id, jp: c.japanese, romaji: c.romaji, meaning: c.english.replace(/\s*\(.*\)$/, ''),
  }));
}

export default function LearningHub({ onLearningXp }: LearningHubProps) {
  const [category, setCategory] = useState<LearningCategory>('hiragana');
  const [mode, setMode] = useState<Mode | null>(null);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load items whenever the category changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadItems(category).then((it) => {
      if (alive) { setItems(it); setLoading(false); }
    });
    return () => { alive = false; };
  }, [category]);

  const handleFinish = (xp: number) => {
    if (xp > 0) {
      onLearningXp(xp);
      setToast(`+${xp} XP earned! 🎉`);
      setTimeout(() => setToast(null), 2600);
    }
    setMode(null);
  };

  const activeCat = useMemo(() => CATEGORIES.find((c) => c.id === category)!, [category]);

  // ── Active learning mode (full-width) ──────────────────────────────────────
  if (mode) {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
          <Loader2 className="animate-spin text-indigo-400" size={28} />
          <span className="text-sm font-mono">Preparing your {activeCat.label} {mode}…</span>
        </div>
      );
    }
    const common = { category, items, onFinish: handleFinish, onBack: () => setMode(null) };
    return (
      <div className="py-2">
        {mode === 'flashcards' && <FlashcardDeck {...common} />}
        {mode === 'quiz' && <QuizChallenge {...common} />}
        {mode === 'writing' && <WritingCanvas {...common} />}
      </div>
    );
  }

  // ── Hub: pick a category, then a mode ──────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-full shadow-lg text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro */}
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg">📚</div>
        <div>
          <h2 className="text-lg font-bold text-slate-100">Learning Dojo</h2>
          <p className="text-xs text-slate-400 leading-relaxed">Pick a script, then drill it with flashcards, a quiz, or writing practice. Every session earns XP.</p>
        </div>
      </div>

      {/* Category chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-2xl border-2 p-3.5 flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
              category === c.id
                ? 'border-indigo-500 bg-indigo-950/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            <span className="text-2xl text-amber-300 font-bold">{c.glyph}</span>
            <span className={`text-xs font-bold ${category === c.id ? 'text-indigo-300' : 'text-slate-400'}`}>{c.label}</span>
          </button>
        ))}
      </div>

      {/* Mode tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            disabled={loading || items.length === 0}
            onClick={() => setMode(m.id)}
            className={`group rounded-2xl border-2 bg-slate-900/60 p-5 text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait ${m.accent}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={m.accent.split(' ')[0]}>{m.icon}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{items.length} items</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">{m.label}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
        <Sparkles size={12} className="text-indigo-400" /> Warm up here before heading into Battle Arenas
      </p>
    </div>
  );
}
