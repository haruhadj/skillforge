import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hammer, Sparkles, ShieldAlert, Award, Star, ArrowLeft, RefreshCw, Volume2, Flame } from 'lucide-react';
import { FLASHCARDS } from '../../data';
import { Flashcard } from '../../types';
import { fetchWords } from '../../lib/api';

interface WordForgeEngineProps {
  onComplete: (score: number, xpGained: number) => void;
  onBack: () => void;
}

export default function WordForgeEngine({ onComplete, onBack }: WordForgeEngineProps) {
  // Word pool — JMdict API (kana split into mora blocks) with a static fallback.
  const STATIC_FORGE = FLASHCARDS.filter(c => c.type === 'vocab' && c.components && c.components.length > 0);
  const [vocabCards, setVocabCards] = useState<Flashcard[]>(STATIC_FORGE);
  useEffect(() => {
    let alive = true;
    fetchWords(1, 10, 4).then((words) => {
      if (alive && words) {
        setVocabCards(words.map((w) => ({
          id: w.id,
          japanese: w.kana,
          romaji: w.romaji,
          english: w.english,
          type: 'vocab' as const,
          level: w.level,
          components: w.components,
        })));
      }
    });
    return () => { alive = false; };
  }, []);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [targetWord, setTargetWord] = useState<Flashcard | null>(null);
  const [scrambledBlocks, setScrambledBlocks] = useState<{ id: string; char: string; isUsed: boolean }[]>([]);
  const [forgedSequence, setForgedSequence] = useState<string[]>([]);
  const [lives, setLives] = useState(4); // limit mistakes before failing word

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [forgeStatus, setForgeStatus] = useState<'idle' | 'success' | 'fail'>('idle');
  const [shakingBlockId, setShakingBlockId] = useState<string | null>(null);

  // Load word
  const loadWord = (index: number) => {
    if (index >= vocabCards.length) {
      setIsFinished(true);
      setIsPlaying(false);
      return;
    }

    const word = vocabCards[index];
    setTargetWord(word);
    setForgedSequence([]);
    setForgeStatus('idle');

    if (word.components) {
      // Create scrambled pool
      const correctChars = word.components.map((char, i) => ({
        id: `correct_${i}_${char}`,
        char,
        isUsed: false
      }));

      // Generate distractors from other word components or hiragana
      const distractors: { id: string; char: string; isUsed: boolean }[] = [];
      const distractorPool = ['た', 'こ', 'さ', 'り', 'ま', 'れ', 'お', 'る', 'き', 'つ'];
      
      const neededDistractors = Math.max(2, 6 - correctChars.length);
      const filteredDistractors = distractorPool.filter(c => !word.components!.includes(c));
      const chosenDistractors = filteredDistractors.sort(() => 0.5 - Math.random()).slice(0, neededDistractors);

      chosenDistractors.forEach((char, i) => {
        distractors.push({
          id: `distractor_${i}_${char}`,
          char,
          isUsed: false
        });
      });

      // Combine and shuffle
      const merged = [...correctChars, ...distractors].sort(() => 0.5 - Math.random());
      setScrambledBlocks(merged);
    }
  };

  // Start the engine
  const startGame = () => {
    setCurrentWordIdx(0);
    setScore(0);
    setCombo(0);
    setXp(0);
    setLives(4);
    setIsGameOver(false);
    setIsFinished(false);
    setIsPlaying(true);
    loadWord(0);
  };

  // Handle syllable block selection
  const handleBlockClick = (block: { id: string; char: string; isUsed: boolean }) => {
    if (block.isUsed || forgeStatus === 'success' || !targetWord || !targetWord.components) return;

    const nextExpectedCharIndex = forgedSequence.length;
    const nextExpectedChar = targetWord.components[nextExpectedCharIndex];

    if (block.char === nextExpectedChar) {
      // Correct character clicked!
      const newSeq = [...forgedSequence, block.char];
      setForgedSequence(newSeq);

      // Mark the actual block used in scrambled state
      setScrambledBlocks(prev =>
        prev.map(b => (b.id === block.id ? { ...b, isUsed: true } : b))
      );

      setScore(prev => prev + 50 + combo * 10);
      setCombo(prev => prev + 1);

      // Check if word is completed
      if (newSeq.length === targetWord.components.length) {
        setForgeStatus('success');
        setScore(prev => prev + 200); // Complete bonus
        setXp(prev => prev + 15);
        setTimeout(() => {
          // Go to next word
          const nextIdx = currentWordIdx + 1;
          setCurrentWordIdx(nextIdx);
          loadWord(nextIdx);
        }, 1800);
      }
    } else {
      // Incorrect syringe block! Fracture block
      setCombo(0);
      setShakingBlockId(block.id);
      setLives(prev => {
        const remaining = prev - 1;
        if (remaining <= 0) {
          setIsGameOver(true);
          setIsPlaying(false);
        }
        return remaining;
      });

      // Small cooldown on shaking error border
      setTimeout(() => {
        setShakingBlockId(null);
      }, 500);
    }
  };

  const handleFinish = () => {
    const finalScore = score + xp * 10;
    const xpGained = xp + Math.round(score / 15);
    onComplete(finalScore, xpGained);
  };

  return (
    <div id="word-forge-main" className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-orange-950/20 via-slate-900/40 to-slate-950 pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <button
          id="btn-back-word-forge"
          onClick={onBack}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Dojo
        </button>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-405 block tracking-wider font-mono">FORGE PROGRESS</span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              Word {currentWordIdx + 1} / {vocabCards.length}
            </span>
          </div>
          <div className="text-right bg-orange-950/20 px-3 py-1 rounded-lg border border-orange-900/30">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">FORGE XP</span>
            <span className="text-lg font-bold text-amber-500 font-mono">+{xp}</span>
          </div>
        </div>
      </div>

      {/* BEFORE STARTING: LOBBY */}
      {!isPlaying && !isGameOver && !isFinished && (
        <div id="word-forge-intro" className="relative z-10 py-12 text-center text-slate-100 max-w-lg mx-auto">
          <div className="text-6xl mb-6">🔨🌋</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent">
            Word Forge
          </h2>
          <p className="text-slate-350 mb-8 leading-relaxed">
            Construct complex Japanese vocabularies syllable by syllable. Hammer down the letters in the correct sequence alignment to craft durable vocab runes!
          </p>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-orange-950/40 text-left text-sm text-slate-300 space-y-3">
            <h4 className="font-semibold text-orange-400">🔥 Rules of the Anvil:</h4>
            <div className="text-xs space-y-1.5">
              <div>• We show you an English vocab translation (e.g. <strong className="text-orange-300">Water</strong>).</div>
              <div>• Tap the scrambled kana blocks (e.g. <strong className="text-orange-300">み</strong> + <strong className="text-orange-300">ず</strong>) in correct order.</div>
              <div>• Clicking wrong spell seals fractures the mold. You have <strong className="text-red-400">4 structural lives</strong> per session.</div>
            </div>
          </div>
          <button
            id="btn-play-word-forge"
            onClick={startGame}
            className="w-full bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Hammer size={18} /> Heat the Forge
          </button>
        </div>
      )}

      {/* GAME OVER STATE */}
      {isGameOver && (
        <div id="word-forge-gameover" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">💔</div>
          <h2 className="text-3xl font-bold mb-3 text-red-500 font-mono tracking-wider">
            ANVIL CRACKED
          </h2>
          <p className="text-slate-400 mb-6 font-sans text-sm">
            Too many spelling mistakes fractured the structural crucible. Refit your tools and start spelling again!
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm">
              <span>Words Crafted:</span>
              <span className="text-slate-300">{currentWordIdx}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm mt-2">
              <span>Fitted Points:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1 text-sm pt-2">
              <span>Summoned XP:</span>
              <span className="text-indigo-400">+{xp} XP</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              id="btn-retry-wordforge"
              onClick={startGame}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Relight Furnace
            </button>
            <button
              id="btn-finish-wordforge-1"
              onClick={handleFinish}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl border border-slate-700 transition-colors"
            >
              Back to Dojo
            </button>
          </div>
        </div>
      )}

      {/* GAME FINISHED (ALL WORDS COPED) */}
      {isFinished && (
        <div id="word-forge-complete" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">👑💎🏰</div>
          <h2 className="text-2xl font-bold text-amber-400 tracking-tight mb-2">
            GRAND FORGEMASTER!
          </h2>
          <p className="text-slate-350 text-sm mb-6 leading-relaxed">
            Astounding craftsmanship! You successfully forged every vocab word in the syllabus, earning heavy scroll credentials.
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 text-left font-mono text-sm space-y-1.5">
            <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
              <span>Words Forged:</span>
              <span className="text-orange-400 font-bold">{currentWordIdx}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 py-1.5">
              <span>Metal Score:</span>
              <span className="text-emerald-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>XP Yield:</span>
              <span className="text-indigo-400 font-bold">+{xp} XP</span>
            </div>
          </div>
          <button
            id="btn-word-forge-rewards"
            onClick={handleFinish}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md"
          >
            Claim Grand Runes
          </button>
        </div>
      )}

      {/* ACTIVE GAME FORGING STATION */}
      {isPlaying && targetWord && (
        <div id="word-forge-active" className="relative z-10">
          
          {/* LIVES & COMBO ROW */}
          <div className="flex justify-between items-center bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono text-xs uppercase font-bold">Forge integrity:</span>
              <div className="flex gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg transition-opacity duration-350 ${
                      i < lives ? 'opacity-100' : 'opacity-20 text-slate-600'
                    }`}
                  >
                    ❤️
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-mono text-xs">COMBO</span>
              <span className="font-bold font-mono text-orange-400 text-sm bg-orange-950/30 px-2 py-0.5 rounded border border-orange-900/45">
                {combo}x
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch mb-6">
            
            {/* ANVIL FORGE LAB TARGET */}
            <div className="flex flex-col justify-between p-5 bg-gradient-to-b from-slate-950 to-slate-900 rounded-xl border border-slate-800 relative shadow-inner overflow-hidden">
              {/* Flame overlay animation background */}
              <div className="absolute inset-0 bg-gradient-to-t from-orange-600/5 via-slate-950/20 to-transparent pointer-events-none" />

              <div className="relative z-10">
                <span className="text-[10px] text-orange-400 font-mono tracking-widest block uppercase font-bold mb-1">
                  Active Blueprint
                </span>
                <p className="text-3xl font-extrabold text-slate-100 tracking-tight">
                  {targetWord.english}
                </p>
                <p className="text-xs text-indigo-400/90 font-mono mt-1">
                  Romaji Guide: <strong className="text-slate-300 font-mono lowercase">{targetWord.romaji}</strong>
                </p>
              </div>

              {/* MOLTEN RECESS IN PROGRESS */}
              <div className="my-8 py-5 border-2 border-dashed border-slate-800 bg-slate-950/70 rounded-xl flex items-center justify-center gap-2 min-h-[90px] relative">
                {forgedSequence.length === 0 && (
                  <span className="text-xs text-slate-500 font-mono text-center flex items-center gap-1.5 px-4">
                    <Flame size={12} className="text-orange-500 animate-pulse" /> Syllables fit here on correct clicks...
                  </span>
                )}

                {/* ANIMATED CHRONICAL SLOTS */}
                <AnimatePresence>
                  {forgedSequence.map((char, index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0.8, y: 15, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      className="px-4.5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-2xl font-sans border border-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.4)] relative"
                    >
                      {char}
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white flex items-center justify-center text-[7px] font-bold">
                        {index + 1}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* SUCCESS STATUS GLOW */}
              <div className="flex justify-between items-center text-xs mt-1 relative z-10">
                <span className="text-slate-400 font-mono">Word size: {targetWord.components?.length} characters</span>
                {forgeStatus === 'success' && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1 uppercase animate-bounce">
                    <Sparkles size={12} /> Rune Sealed!
                  </span>
                )}
              </div>
            </div>

            {/* SCRAMBLED BLOCKS LIST */}
            <div className="flex flex-col justify-center p-5 bg-slate-950/40 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-450 font-mono tracking-wider block uppercase font-bold mb-4 text-center">
                Spelt Raw Materials
              </span>

              <div id="wordblock-grid" className="grid grid-cols-3 gap-3">
                {scrambledBlocks.map((block) => {
                  const isShaking = shakingBlockId === block.id;

                  return (
                    <motion.button
                      id={`raw-block-${block.id}`}
                      key={block.id}
                      onClick={() => handleBlockClick(block)}
                      disabled={block.isUsed}
                      animate={isShaking ? { x: [-8, 8, -6, 6, 0] } : {}}
                      transition={{ duration: 0.4 }}
                      className={`py-4 px-3 rounded-xl font-bold text-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center group ${
                        block.isUsed
                          ? 'bg-slate-900/60 border-slate-950 text-slate-700 cursor-not-allowed transform-none'
                          : isShaking
                          ? 'bg-red-950/60 border-red-500 text-red-100 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                          : 'bg-slate-800 hover:bg-slate-755 border-slate-700/80 text-orange-100 shadow-md transform hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                    >
                      <span className="font-sans text-2xl">{block.char}</span>
                      <span className="text-[8px] uppercase font-mono tracking-widest mt-1 text-slate-500 group-disabled:hidden">
                        Strike
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-5 text-center">
                <p className="text-[11px] text-slate-400">
                  Select Syllables in precise left-to-right Japanese spelling order.
                </p>
              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}
