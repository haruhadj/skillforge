import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Heart, RefreshCw, Zap, ArrowLeft, Play, Award } from 'lucide-react';
import { FLASHCARDS } from '../../data';
import { MemoryCard } from '../../types';
import { fetchMemoryPairs } from '../../lib/api';

interface MemoryMatchEngineProps {
  onComplete: (score: number, xpGained: number) => void;
  onBack: () => void;
}

export default function MemoryMatchEngine({ onComplete, onBack }: MemoryMatchEngineProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shieldHp, setShieldHp] = useState(100);
  const [minionHp, setMinionHp] = useState(100);
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [elementalClass, setElementalClass] = useState<string | null>(null); // fire, water, lightning, wind etc.
  const [elementalEmoji, setElementalEmoji] = useState<string | null>(null);

  const [minionMaxHp, setMinionMaxHp] = useState(120);
  const [moves, setMoves] = useState(0);

  // Pool of Japanese mythical minions
  const MINIONS = [
    { name: 'Kapo the Kappa', emoji: '🥒', element: 'water', attackText: 'Water Splash' },
    { name: 'Chibi Tanuki', emoji: '🍃', element: 'earth', attackText: 'Leaf Strike' },
    { name: 'Karasu Tengu Minion', emoji: '🦅', element: 'wind', attackText: 'Air Slash' },
    { name: 'Kodama Wood Sprite', emoji: '🍄', element: 'nature', attackText: 'Spore Cloud' },
  ];
  const [currentMinion, setCurrentMinion] = useState(MINIONS[0]);

  // Card source — JMdict API pairs with a static fallback so it works offline.
  type DeckEntry = { id: string; japanese: string; romaji: string; english: string };
  const [deckSource, setDeckSource] = useState<DeckEntry[]>(
    () => FLASHCARDS.map((c) => ({ id: c.id, japanese: c.japanese, romaji: c.romaji, english: c.english })),
  );
  useEffect(() => {
    let alive = true;
    fetchMemoryPairs(2, 12).then((pairs) => {
      if (alive && pairs) {
        setDeckSource(pairs.map((p) => ({ id: p.matchId, japanese: p.japanese, romaji: p.romaji, english: p.english })));
      }
    });
    return () => { alive = false; };
  }, []);

  // Initial Setup
  const initializeGame = () => {
    // Select the current minion randomly
    const randomMinion = MINIONS[Math.floor(Math.random() * MINIONS.length)];
    setCurrentMinion(randomMinion);
    setMinionMaxHp(120);
    setMinionHp(120);
    setShieldHp(100);
    setMatchedPairsCount(0);
    setScore(0);
    setCombo(0);
    setMoves(0);
    setIsGameOver(false);
    setIsGameWon(false);

    // Grab 6 unique flashcards to map to 12 memory cards
    const sorted = [...deckSource].sort(() => 0.5 - Math.random());
    const selectedCards = sorted.slice(0, 6);

    const matchDeck: MemoryCard[] = [];
    selectedCards.forEach((card, idx) => {
      // Card 1: Japanese characters
      matchDeck.push({
        id: `card_${idx}_jp`,
        content: card.japanese,
        matchId: card.id,
        isFlipped: false,
        isMatched: false,
        type: 'japanese'
      });

      // Card 2: Romaji & English meaning
      // Use shorter translation if possible to fit card limits
      const friendlyMeaning = card.romaji === card.english.toLowerCase() 
        ? card.romaji 
        : `${card.romaji} (${card.english.split(' ')[0]})`;

      matchDeck.push({
        id: `card_${idx}_eng`,
        content: friendlyMeaning,
        matchId: card.id,
        isFlipped: false,
        isMatched: false,
        type: 'english_romaji'
      });
    });

    // Shuffle cards
    setCards(matchDeck.sort(() => 0.5 - Math.random()));
    setIsPlaying(true);
  };

  // Handle Card Click
  const handleCardClick = (cardId: string) => {
    if (selectedIds.length >= 2) return; // Ignore input during evaluation
    
    // Find clicked card
    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard || targetCard.isFlipped || targetCard.isMatched) return;

    // Flip the clicked card in state
    setCards(prevCards =>
      prevCards.map(c => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    const newSelected = [...selectedIds, cardId];
    setSelectedIds(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      evaluateMatch(newSelected);
    }
  };

  // Evaluation Routine
  const evaluateMatch = (selected: string[]) => {
    const card1 = cards.find(c => c.id === selected[0])!;
    const card2 = cards.find(c => c.id === selected[1])!;

    const isMatch = card1.matchId === card2.matchId;

    if (isMatch) {
      // Trigger Golden Flash / Elemental strike
      const elements = [
        { text: 'fire', emoji: '🔥', style: 'text-orange-400 border-orange-500' },
        { text: 'water', emoji: '💧', style: 'text-cyan-400 border-cyan-500' },
        { text: 'lightning', emoji: '⚡', style: 'text-amber-400 border-yellow-500' },
        { text: 'nature', emoji: '🍃', style: 'text-emerald-400 border-emerald-500' }
      ];
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      setElementalClass(randomElement.style);
      setElementalEmoji(randomElement.emoji);

      setTimeout(() => {
        // Apply Match
        setCards(prevCards =>
          prevCards.map(c =>
            c.id === selected[0] || c.id === selected[1]
              ? { ...c, isFlipped: true, isMatched: true }
              : c
          )
        );

        // Minion damages
        const baseDmg = 20;
        const damageDealt = baseDmg + combo * 5;
        setMinionHp(prev => Math.max(0, prev - damageDealt));
        setScore(prev => prev + 150 + combo * 30);
        setCombo(prev => prev + 1);
        setMatchedPairsCount(prev => prev + 1);
        
        setSelectedIds([]);
        setElementalClass(null);
        setElementalEmoji(null);
      }, 800);

    } else {
      // Mismatch
      setTimeout(() => {
        // Flip back
        setCards(prevCards =>
          prevCards.map(c =>
            c.id === selected[0] || c.id === selected[1]
              ? { ...c, isFlipped: false }
              : c
          )
        );
        // Take damage to shield for losing memory focus
        setShieldHp(prev => Math.max(0, prev - 12));
        setCombo(0);
        setSelectedIds([]);
      }, 1100);
    }
  };

  // Check Victory / Defeat conditions
  useEffect(() => {
    if (!isPlaying) return;

    if (shieldHp <= 0) {
      setIsGameOver(true);
      setIsPlaying(false);
    } else if (matchedPairsCount === 6 || minionHp <= 0) {
      setIsGameWon(true);
      setIsPlaying(false);
      setScore(prev => prev + 300); // clear bonus
    }
  }, [shieldHp, minionHp, matchedPairsCount, isPlaying]);

  const finishGame = () => {
    const finalScore = score + (isGameWon ? 500 : 0);
    const xpGained = Math.round(finalScore / 10);
    onComplete(finalScore, xpGained);
  };

  return (
    <div id="memory-match-module" className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
      
      {/* Background theme */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-emerald-950/20 via-slate-900/40 to-slate-950 pointer-events-none" />

      {/* Main Header navigation */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <button
          id="btn-back-to-dojo-memory"
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Dojo
        </button>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">MOVES</span>
            <span className="text-lg font-bold text-slate-200 font-mono">{moves}</span>
          </div>
          <div className="text-xs text-right bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-900/30">
            <span className="text-slate-400 block font-mono">COMBO</span>
            <span className="text-lg font-bold text-amber-400 font-mono">{combo}x</span>
          </div>
        </div>
      </div>

      {/* BEFORE STARTING: LOBBY */}
      {!isPlaying && !isGameOver && !isGameWon && (
        <div id="memory-match-lobby" className="relative z-10 py-12 text-center text-slate-100 max-w-lg mx-auto">
          <div className="text-6xl mb-6">🎴</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Elemental Card Match
          </h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Link Japanese characters to their Romaji counterparts! Form spatial map memory to channel elemental force fields and defeat mischievous spirits.
          </p>
          <div className="bg-slate-800/60 p-5 rounded-2xl border border-emerald-950/30 text-left mb-8 space-y-3">
            <h4 className="font-semibold text-emerald-300 text-sm flex items-center gap-1.5">
              <Zap size={14} /> Elements Mechanics:
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li>• A grid containing 12 turned-down glyph elements.</li>
              <li>• Match Japanese characters (e.g. <strong className="text-amber-400">ね</strong>) to equivalents (e.g. <strong className="text-amber-400">ne</strong>).</li>
              <li>• Incorrect flips break concentration, consuming <strong className="text-red-400">12 Shield focus HP</strong>.</li>
            </ul>
          </div>
          <button
            id="btn-play-memory"
            onClick={initializeGame}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play fill="white" size={18} /> Spawn Elemental Grid
          </button>
        </div>
      )}

      {/* GAME OVER CARD MAP */}
      {isGameOver && (
        <div id="memory-match-defeat" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">🍂</div>
          <h2 className="text-3xl font-bold mb-3 text-red-500 font-mono tracking-wider">
            FAILED FOCUS
          </h2>
          <p className="text-slate-400 mb-6 font-sans text-sm">
            Your Shield focus was completely broken, allowing the forest minion to escape. Do not worry; focus takes discipline.
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm">
              <span>Flipped Combinations:</span>
              <span className="text-slate-300">{moves}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm mt-2">
              <span>Points Earned:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1 text-sm pt-2">
              <span>Retrieved:</span>
              <span className="text-indigo-400">+{Math.round(score/10)} XP</span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button
              id="btn-retry-memory"
              onClick={initializeGame}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Recharge concentration
            </button>
            <button
              id="btn-finish-memory"
              onClick={finishGame}
              className="bg-slate-800 hover:bg-slate-750 text-slate-300 py-3 rounded-xl border border-slate-750 text-sm"
            >
              Back to Dojo
            </button>
          </div>
        </div>
      )}

      {/* GAMEOVER VICTORY CARD MAP */}
      {isGameWon && (
        <div id="memory-match-victory" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-4">✨🦁✨</div>
          <h2 className="text-2xl font-bold text-amber-400 tracking-tight mb-2">
            SPIRIT ALIGNED!
          </h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Beautiful logic! You matched all pairs, subduing the {currentMinion.name} and cleansing the elemental space.
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 text-left font-mono text-sm space-y-1.5">
            <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
              <span>Moves Required:</span>
              <span className="text-slate-200">{moves} pairs</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 py-1.5">
              <span>Elemental Score:</span>
              <span className="text-emerald-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>XP Yielded:</span>
              <span className="text-indigo-400 font-bold">+{Math.round((score + 500)/10)} XP</span>
            </div>
          </div>
          <button
            id="btn-claim-rewards-memory"
            onClick={finishGame}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-md"
          >
            Claim spiritual scrolls
          </button>
        </div>
      )}

      {/* ACTIVE PLAY STATE */}
      {isPlaying && (
        <div id="memory-match-active" className="relative z-10">
          
          {/* FIGHT FIELD / INTERACTIVE MINION HEADER */}
          <div className="grid grid-cols-2 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6">
            <div className="flex flex-col justify-center">
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest block uppercase font-bold">Player Focus Shield</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Shield size={16} className="text-emerald-400" />
                <span className="text-sm font-bold font-mono text-slate-100">{shieldHp}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_6px_#10b981]"
                  style={{ width: `${shieldHp}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center text-right border-l border-slate-800/60 pl-4">
              <span className="text-[10px] text-amber-500 font-mono tracking-widest block uppercase font-bold">{currentMinion.name}</span>
              <div className="flex justify-end items-center gap-1.5 mt-1">
                <span className="text-sm font-bold font-mono text-amber-300">{minionHp} HP</span>
                <span className="text-xl select-none">{currentMinion.emoji}</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 shadow-[0_0_6px_#f59e0b]"
                  style={{ width: `${(minionHp / minionMaxHp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ACTIVE ATK COMBAT SPARKLES ALERT */}
          <AnimatePresence>
            {elementalClass && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1.1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 mb-4 rounded-xl border border-amber-900/40 bg-amber-950/30 text-amber-300 text-sm font-mono tracking-wide font-black uppercase text-center`}
              >
                <Sparkles size={16} className="animate-spin text-amber-400" /> Matches Alignment! Consuming {elementalEmoji} spell element combo!
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN GRID */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-slate-950/30 p-3 rounded-xl border border-slate-850">
            {cards.map((card, index) => {
              const isSelected = selectedIds.includes(card.id);
              const showFace = card.isFlipped || card.isMatched || isSelected;

              return (
                <div
                  key={card.id}
                  id={`memory-card-wrap-${index}`}
                  onClick={() => handleCardClick(card.id)}
                  className="aspect-[4/3] relative cursor-pointer group min-h-[76px] sm:min-h-[90px]"
                  style={{ perspective: '1000px' }}
                >
                  <div
                    id={`memory-card-inner-${index}`}
                    className={`absolute inset-0 transition-all duration-500`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: showFace ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* BACK OF CARD */}
                    <div
                      id={`memory-card-back-${index}`}
                      className="absolute inset-0 bg-gradient-to-br from-slate-850 to-slate-800 hover:from-slate-800 hover:to-slate-750 rounded-xl border-2 border-slate-700/85 flex flex-col justify-center items-center shadow-md shadow-black/25 active:border-emerald-600/60"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 font-mono text-sm group-hover:scale-105 transition-transform group-hover:bg-slate-950 group-hover:text-emerald-400/80">
                        守
                      </div>
                    </div>

                    {/* FRONT OF CARD */}
                    <div
                      id={`memory-card-front-${index}`}
                      className={`absolute inset-0 rounded-xl border-2 flex flex-col justify-center items-center p-2 text-center text-slate-50 transition-shadow ${
                        card.isMatched
                          ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                          : 'bg-indigo-950/80 border-indigo-600'
                      }`}
                      style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <p
                        className={`font-semibold overflow-wrap tracking-wide ${
                          card.type === 'japanese' 
                            ? 'text-2xl sm:text-3xl font-sans text-amber-300' 
                            : 'text-xs sm:text-sm font-mono text-slate-200'
                        }`}
                      >
                        {card.content}
                      </p>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1">
                        {card.type === 'japanese' ? 'Glyph' : 'Translation'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center font-sans text-xs text-slate-400 mt-4 leading-relaxed bg-slate-950/20 py-2.5 px-4 rounded-lg border border-slate-900">
            Select cards matching characters to translate. Match characters in quick sequence boosts element scores.
          </div>

        </div>
      )}
    </div>
  );
}
