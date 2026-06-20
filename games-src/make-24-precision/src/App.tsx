import React, { useState, useEffect } from 'react';
import { 
  Undo, 
  RotateCcw, 
  Sparkles, 
  HelpCircle, 
  Trophy, 
  Flame, 
  TrendingUp, 
  Dices, 
  Plus, 
  Minus, 
  X, 
  HelpCircle as QuestionIcon,
  ChevronRight,
  BookOpen,
  Binary,
  Check,
  AlertCircle
} from 'lucide-react';

import { Fraction, CardState, OperatorType, GameHistoryState, Puzzle } from './types';
import * as Frac from './utils/fraction';
import { solve24, SolverResult } from './utils/solver';
import { generatePuzzle } from './utils/puzzles';

// Subcomponents
import { CardTile } from './components/CardTile';
import { VictoryOverlay } from './components/VictoryOverlay';
import { HintModal } from './components/HintModal';

// ── SkillForge host bridge ───────────────────────────────────────────────
// This game runs inside an origin-checked iframe. Report score/stats to the
// parent app via postMessage. Guarded so the game still works standalone.
function postToParent(event: string, data: unknown) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function App() {
  // Game states
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [cards, setCards] = useState<CardState[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<OperatorType | null>(null);
  const [history, setHistory] = useState<GameHistoryState[]>([]);
  
  // Stats states (persisted via localStorage)
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(0);
  const [totalGames, setTotalGames] = useState<number>(0); // puzzles solved — host "Matches" counter

  // Status indicators
  const [isWon, setIsWon] = useState<boolean>(false);
  const [isFailed, setIsFailed] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [shakeCardIds, setShakeCardIds] = useState<Record<string, boolean>>({});

  // Overlays & UI helpers
  const [showHintModal, setShowHintModal] = useState<boolean>(false);
  const [showRulesDrawer, setShowRulesDrawer] = useState<boolean>(false);
  const [showCustomDeckBuilder, setShowCustomDeckBuilder] = useState<boolean>(false);

  // Custom Deck creation states
  const [customNumbers, setCustomNumbers] = useState<string[]>(['', '', '', '']);
  const [customSolverResult, setCustomSolverResult] = useState<SolverResult | null>(null);

  // Load persistent stats on boot
  useEffect(() => {
    const savedScore = localStorage.getItem('make24_score');
    const savedStreak = localStorage.getItem('make24_streak');
    const savedBest = localStorage.getItem('make24_best_streak');
    const savedTotal = localStorage.getItem('make24_total_games');

    if (savedScore) setScore(parseInt(savedScore, 10));
    if (savedStreak) setStreak(parseInt(savedStreak, 10));
    if (savedBest) setBestStreak(parseInt(savedBest, 10));
    if (savedTotal) setTotalGames(parseInt(savedTotal, 10));

    // Boot first game
    const initialPuzzle = generatePuzzle('medium');
    loadPuzzle(initialPuzzle);
  }, []);

  // Sync with the SkillForge host: request any cloud-saved progress on mount,
  // then listen for the restore reply. Cumulative stats only ever grow, so we
  // keep the larger of local vs remote for each field.
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type !== 'RESTORE_PROGRESS' || !msg.data) return;

      const remote = msg.data as {
        bestScore?: number; score?: number; bestStreak?: number; totalGames?: number;
      };
      const remoteScore = Number(remote.bestScore ?? remote.score ?? 0) || 0;
      const remoteBestStreak = Number(remote.bestStreak ?? 0) || 0;
      const remoteTotal = Number(remote.totalGames ?? 0) || 0;

      setScore(prev => {
        const next = Math.max(prev, remoteScore);
        localStorage.setItem('make24_score', next.toString());
        return next;
      });
      setBestStreak(prev => {
        const next = Math.max(prev, remoteBestStreak);
        localStorage.setItem('make24_best_streak', next.toString());
        return next;
      });
      setTotalGames(prev => {
        const next = Math.max(prev, remoteTotal);
        localStorage.setItem('make24_total_games', next.toString());
        return next;
      });
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Update solver help in real-time when custom numbers change
  useEffect(() => {
    const parsed = customNumbers.map(n => parseInt(n, 10));
    const allFilledAndValid = parsed.every(n => !isNaN(n) && n >= 1 && n <= 13);
    
    if (allFilledAndValid) {
      const solved = solve24(parsed);
      setCustomSolverResult(solved);
    } else {
      setCustomSolverResult(null);
    }
  }, [customNumbers]);

  // Load a puzzle state
  const loadPuzzle = (puzzle: Puzzle) => {
    setCurrentPuzzle(puzzle);
    const initialCards: CardState[] = puzzle.numbers.map((num, i) => ({
      id: `initial-${i}-${Date.now()}`,
      value: Frac.fromInt(num),
      expression: `${num}`,
      isInitial: true
    }));
    setCards(initialCards);
    setSelectedCardId(null);
    setSelectedOperator(null);
    setHistory([]);
    setIsWon(false);
    setIsFailed(false);
    setAlertMessage(null);
    setShakeCardIds({});
  };

  // Skip current level or random next level
  const handleNextPuzzle = () => {
    const nextPuz = generatePuzzle(difficulty);
    loadPuzzle(nextPuz);
  };

  // Reset the current level cards to initial state
  const handleResetLevel = () => {
    if (!currentPuzzle) return;
    loadPuzzle(currentPuzzle);
  };

  // Step backward in history (Undo)
  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setCards(previousState.cards);
    setSelectedCardId(previousState.selectedCardId);
    setSelectedOperator(previousState.selectedOperator);
    setHistory(prev => prev.slice(0, prev.length - 1));
    setIsFailed(false);
    setAlertMessage(null);
  };

  // Click card action
  const handleCardClick = (clickedId: string) => {
    if (isWon) return;

    // Case 1: No card is selected yet
    if (selectedCardId === null) {
      setSelectedCardId(clickedId);
      return;
    }

    // Case 2: Clicking the already selected card deselects it
    if (selectedCardId === clickedId) {
      setSelectedCardId(null);
      setSelectedOperator(null);
      return;
    }

    // Case 3: A card is selected but NO operator has been chosen
    // Let's swap the selection to the newly clicked card (much better UX!)
    if (selectedOperator === null) {
      setSelectedCardId(clickedId);
      return;
    }

    // Case 4: Card is selected, operator is selected, and a second card is clicked. Merge them!
    const cardA = cards.find(c => c.id === selectedCardId);
    const cardB = cards.find(c => c.id === clickedId);

    if (!cardA || !cardB) return;

    // Math operation combination logic
    let resultFraction: Fraction | null = null;
    switch (selectedOperator) {
      case '+':
        resultFraction = Frac.add(cardA.value, cardB.value);
        break;
      case '-':
        resultFraction = Frac.sub(cardA.value, cardB.value);
        break;
      case '*':
        resultFraction = Frac.mul(cardA.value, cardB.value);
        break;
      case '/':
        resultFraction = Frac.div(cardA.value, cardB.value);
        break;
    }

    // Trigger error if operation is divide-by-zero
    if (resultFraction === null) {
      triggerShake(clickedId);
      triggerShake(selectedCardId);
      setAlertMessage('Cannot divide by zero!');
      setSelectedOperator(null);
      return;
    }

    // Capture state for Undo Stack before mutating
    setHistory(prev => [...prev, {
      cards: [...cards],
      selectedCardId,
      selectedOperator
    }]);

    // Format new compound expression
    const leftExpr = cardA.expression.includes(' ') ? `(${cardA.expression})` : cardA.expression;
    const rightExpr = cardB.expression.includes(' ') ? `(${cardB.expression})` : cardB.expression;
    
    let opStr = '';
    if (selectedOperator === '+') opStr = '+';
    if (selectedOperator === '-') opStr = '−';
    if (selectedOperator === '*') opStr = '×';
    if (selectedOperator === '/') opStr = '÷';
    
    const nextExpr = `${leftExpr} ${opStr} ${rightExpr}`;

    // Create the merged card
    const mergedCard: CardState = {
      id: `merged-${Date.now()}-${Math.random()}`,
      value: resultFraction,
      expression: nextExpr,
      isInitial: false
    };

    // Filter out the combined cards and insert merged card in place of B
    const filteredCards = cards.filter(c => c.id !== cardA.id && c.id !== cardB.id);
    const indexB = cards.findIndex(c => c.id === cardB.id);
    // Boundary safe splice
    const insertIndex = indexB >= 0 && indexB <= filteredCards.length ? indexB : filteredCards.length;
    filteredCards.splice(insertIndex, 0, mergedCard);

    // Apply updates
    setCards(filteredCards);
    setSelectedCardId(null);
    setSelectedOperator(null);
    setAlertMessage(null);

    // Check Victory/Defeat condition when there is exactly 1 card remaining
    if (filteredCards.length === 1) {
      const finalCard = filteredCards[0];
      if (Frac.is24(finalCard.value)) {
        // WINNING STEP
        setIsWon(true);
        // Calculate score additions: reward based on selected difficulty, expert is worth most!
        const scoreGain = difficulty === 'expert' ? 40 : difficulty === 'hard' ? 30 : difficulty === 'medium' ? 20 : 10;
        const streakBonus = Math.floor(streak / 3) * 5; // incremental bonus multiplier for streaks!
        const totalAwardStr = scoreGain + streakBonus;

        const nextScore = score + totalAwardStr;
        const nextStreak = streak + 1;
        
        setScore(nextScore);
        setStreak(nextStreak);
        
        localStorage.setItem('make24_score', nextScore.toString());
        localStorage.setItem('make24_streak', nextStreak.toString());

        if (nextStreak > bestStreak) {
          setBestStreak(nextStreak);
          localStorage.setItem('make24_best_streak', nextStreak.toString());
        }

        // Count this solved puzzle and report progress to the SkillForge host.
        const nextTotalGames = totalGames + 1;
        setTotalGames(nextTotalGames);
        localStorage.setItem('make24_total_games', nextTotalGames.toString());

        const nextBestStreak = Math.max(bestStreak, nextStreak);
        postToParent('BEST_SCORE', { bestScore: nextScore });
        postToParent('GAME_STATS', {
          bestScore: nextScore,
          score: nextScore,
          totalGames: nextTotalGames,
          bestStreak: nextBestStreak,
          streak: nextStreak,
        });
      } else {
        // FAILED STEP (last card remaining but is not equal to 24)
        setIsFailed(true);
        triggerShake(finalCard.id);
        setStreak(0);
        localStorage.setItem('make24_streak', '0');
        setAlertMessage('Matches is not 24. Try resetting the level or undoing!');
      }
    }
  };

  const triggerShake = (id: string) => {
    setShakeCardIds(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setShakeCardIds(prev => ({ ...prev, [id]: false }));
    }, 500);
  };

  const handleDifficultyChange = (diff: 'easy' | 'medium' | 'hard' | 'expert') => {
    setDifficulty(diff);
    const nextPuz = generatePuzzle(diff);
    loadPuzzle(nextPuz);
  };

  // Submit and load custom user numbers
  const handleCustomDeckSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customNumbers.map(n => parseInt(n, 10));
    const allValid = parsed.every(n => !isNaN(n) && n >= 1 && n <= 13);
    
    if (!allValid) {
      setAlertMessage('All custom cards must be integers between 1 and 13.');
      return;
    }

    if (!customSolverResult || customSolverResult.solutions.length === 0) {
      setAlertMessage('No possible mathematical combination of these numbers results in 24!');
      return;
    }

    const customPuzzle: Puzzle = {
      numbers: parsed,
      difficulty: customSolverResult.difficulty,
      solutions: customSolverResult.solutions
    };

    loadPuzzle(customPuzzle);
    setShowCustomDeckBuilder(false);
    setAlertMessage('Custom puzzle loaded successfully! Streaks are frozen.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative bg-grid-overlay overflow-x-hidden">
      
      {/* Top Header Row */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3.5 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo Title section */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Binary className="h-5.5 w-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">Make 24</h1>
                <span className="text-[10px] bg-slate-800 text-indigo-400 font-mono px-1.5 py-0.5 rounded border border-slate-700 font-semibold uppercase">
                  Fraction Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Combine four tiles perfectly with math</p>
            </div>
          </div>

          {/* Stats Badges Dashboard */}
          <div className="flex items-center justify-center gap-2">
            
            {/* Streak Badge */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-400 fill-orange-500/10" />
              <div className="text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono block leading-none">Streak</span>
                <span className="text-sm font-bold text-orange-400 leading-none">{streak}</span>
              </div>
            </div>

            {/* Score Badge */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500 fill-amber-500/10" />
              <div className="text-left">
                <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono block leading-none">Score</span>
                <span className="text-sm font-bold text-emerald-400 leading-none">{score}</span>
              </div>
            </div>

            {/* Rules Button */}
            <button 
              onClick={() => setShowRulesDrawer(true)}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl transition duration-150"
              title="How to Play"
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Playing Area Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col justify-between items-center gap-8">
        
        {/* Row of Difficulty sliders/tabs */}
        <section className="w-full flex justify-center">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-2xl flex w-full max-w-sm relative">
            {(['easy', 'medium', 'hard', 'expert'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => handleDifficultyChange(diff)}
                className={`
                  flex-1 py-1.5 text-xs font-bold rounded-xl transition-all duration-200 capitalize
                  ${difficulty === diff 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }
                `}
              >
                {diff}
              </button>
            ))}
          </div>
        </section>

        {/* Board Tiles Container */}
        <section className="w-full flex-1 flex flex-col items-center justify-center gap-6">
          
          <div className="w-full max-w-2xl py-2 flex items-center justify-between px-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-400" />
              <span>Goal: Combine remaining tiles to make <strong className="text-indigo-300">24</strong></span>
            </div>
            {currentPuzzle && (
              <span className="text-[10px] font-mono uppercase bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded-lg font-bold">
                Level Difficulty: {currentPuzzle.difficulty}
              </span>
            )}
          </div>

          {/* Alert Message row */}
          {alertMessage && (
            <div className="w-full max-w-md bg-indigo-950/40 border border-indigo-800/50 px-4 py-2.5 rounded-xl text-center text-xs text-indigo-300 flex items-center justify-center gap-2 animate-[shake_0.4s_ease-in-out]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{alertMessage}</span>
            </div>
          )}

          {/* Cards grid system */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl justify-items-center">
            {cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                isSelected={selectedCardId === card.id}
                isDisabled={isWon}
                onClick={() => handleCardClick(card.id)}
                shakeTrigger={!!shakeCardIds[card.id]}
              />
            ))}

            {/* Virtual ghost slots to maintain layout stability as cards decrease */}
            {Array.from({ length: 4 - cards.length }).map((_, index) => (
              <div 
                key={`empty-slot-${index}`}
                className="h-44 w-full md:w-40 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950/20 flex items-center justify-center opacity-40 select-none hidden sm:flex"
              >
                <div className="h-3 w-3 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>

        </section>

        {/* Dynamic Operator Choice Console */}
        <section className="w-full max-w-xl flex flex-col gap-3">
          <span className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-mono">
            {selectedCardId 
              ? `Select algebra operator to combine code '${cards.find(c => c.id === selectedCardId)?.value.n}'...` 
              : 'Select a structural tile first above'
            }
          </span>
          
          <div className="grid grid-cols-4 gap-2.5 bg-slate-900 p-2.5 rounded-3xl border border-slate-800">
            {([
              { type: '+', label: 'Addition', icon: <Plus className="h-4 w-4 md:h-5 md:w-5" />, color: 'hover:border-emerald-500 selected:bg-emerald-600 border-slate-800' },
              { type: '-', label: 'Subtraction', icon: <Minus className="h-4 w-4 md:h-5 md:w-5" />, color: 'hover:border-amber-500 selected:bg-amber-600 border-slate-800' },
              { type: '*', label: 'Multiplication', icon: <X className="h-4 w-4 md:h-5 md:w-5" />, color: 'hover:border-purple-500 selected:bg-purple-600 border-slate-800' },
              { type: '/', label: 'Division', icon: <span className="text-base md:text-lg font-bold">÷</span>, color: 'hover:border-cyan-500 selected:bg-cyan-600 border-slate-800' }
            ] as const).map(({ type, icon, color }) => {
              const isChosen = selectedOperator === type;
              return (
                <button
                  key={type}
                  id={`operator-${type}`}
                  disabled={selectedCardId === null || isWon}
                  onClick={() => setSelectedOperator(type)}
                  className={`
                    h-14 md:h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 border-2 text-slate-350 cursor-pointer
                    disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-slate-800
                    ${isChosen 
                      ? 'bg-indigo-600 text-white border-indigo-400 scale-102 font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                      : `bg-slate-950 border-slate-850 hover:bg-slate-900 hover:text-white ${color}`
                    }
                  `}
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer QoL controls (Undo, Reset, Hint, Skip) */}
        <section className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-3 mt-4">
          
          {/* Main system controls */}
          <div className="flex w-full sm:flex-1 gap-2">
            
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={history.length === 0 || isWon}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition duration-150 flex items-center justify-center gap-1.5"
              title="Undo Last Operation"
            >
              <Undo className="h-3.5 w-3.5" /> Undo
            </button>

            {/* Reset */}
            <button
              onClick={handleResetLevel}
              disabled={history.length === 0 && selectedCardId === null && selectedOperator === null}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 disabled:opacity-35 disabled:pointer-events-none transition duration-150 flex items-center justify-center gap-1.5"
              title="Reset Cards to Initial"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            
          </div>

          <div className="flex w-full sm:flex-1 gap-2">
            
            {/* Hint */}
            <button
              onClick={() => setShowHintModal(true)}
              className="flex-1 py-3 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/20"
              title="Get mathematically correct strategy solver step suggestions"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Strategy Hint
            </button>

            {/* Skip */}
            <button
              onClick={handleNextPuzzle}
              className="flex-1 py-3 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700/60 rounded-xl text-xs font-bold transition duration-150 flex items-center justify-center gap-1.5"
              title="Skip this puzzle"
            >
              <Dices className="h-3.5 w-3.5 text-indigo-400" /> New Deck
            </button>

          </div>

        </section>

        {/* Custom Deck Trigger Link */}
        <button
          onClick={() => setShowCustomDeckBuilder(true)}
          className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 cursor-pointer mt-2"
        >
          Check or play with custom target deck numbers
        </button>

      </main>

      {/* Persistent Legal/Footer notes */}
      <footer className="py-6 border-t border-slate-900/60 text-slate-500 text-center text-xs mt-12 bg-slate-950/80">
        <p className="font-mono">Make 24 Engine verified on UTC 2026-06-20. Client-side analytical math solver.</p>
      </footer>

      {/* WIN STATE OVERLAY PANEL */}
      {isWon && currentPuzzle && (
        <VictoryOverlay
          expression={cards[0]?.expression || ''}
          score={score}
          streak={streak}
          bestStreak={bestStreak}
          allSolutions={currentPuzzle.solutions}
          onNext={handleNextPuzzle}
          onReset={handleResetLevel}
        />
      )}

      {/* SOLVER HINT strategy modal */}
      {showHintModal && currentPuzzle && (
        <HintModal
          solutions={currentPuzzle.solutions}
          initialNumbers={currentPuzzle.numbers}
          onClose={() => setShowHintModal(false)}
        />
      )}

      {/* HOW TO PLAY rules drawer dialog */}
      {showRulesDrawer && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            
            <button
              onClick={() => setShowRulesDrawer(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">How to Play Make 24</h2>
            </div>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
              <p>
                In <strong>Make 24</strong>, your task is to combine exactly 4 numbers using standard algebraic operators (addition, subtraction, multiplication, and division) to reach a final total value of exactly <strong>24</strong>.
              </p>

              <div>
                <h3 className="font-semibold text-white mb-1.5 flex items-center gap-1.5 text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Basic Rules:
                </h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You must use <strong>all 4 initial tiles</strong> exactly once.</li>
                  <li>Each operation reduces the total card pool by 1, wrapping combined elements in brackets.</li>
                  <li>Fractions do not lose precision during calculations (e.g. 8/3 stays 8/3 rather than rounding).</li>
                  <li>You win if your final remaining card equals 24.</li>
                </ul>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-widest font-mono mb-2">
                  An legendary expert solution:
                </h4>
                <p className="font-mono text-xs text-indigo-100">
                  Given: [3, 3, 8, 8] <br />
                  1. 8 ÷ 3 = <span className="text-indigo-400">8/3</span><br />
                  2. 3 − 8/3 = <span className="text-indigo-400">1/3</span><br />
                  3. 8 ÷ 1/3 = <span className="text-emerald-400">24</span>
                </p>
              </div>

              <button
                onClick={() => setShowRulesDrawer(false)}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs rounded-xl transition duration-150 mt-2"
              >
                Let&apos;s Play!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CARDS DECK DRAW-IN GENERATOR PANEL */}
      {showCustomDeckBuilder && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCustomDeckSubmit}
            className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowCustomDeckBuilder(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Dices className="h-5 w-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white">Custom Target Deck</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Type 4 card integers in range [1 to 13] (e.g. Ace corresponds to 1, King to 13).</p>

            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-3.5">
                {customNumbers.map((val, idx) => (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <input
                      type="text"
                      maxLength={2}
                      inputMode="numeric"
                      value={val}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^0-9]/g, '');
                        const newVals = [...customNumbers];
                        newVals[idx] = cleaned;
                        setCustomNumbers(newVals);
                      }}
                      placeholder="1"
                      className="w-full h-16 bg-slate-950 text-center font-bold text-2xl border-2 border-slate-800 rounded-2xl text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                    <label className="text-[10px] text-slate-500 font-mono">card {idx + 1}</label>
                  </div>
                ))}
              </div>

              {/* Real-time analytical solver status inside builder */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/85">
                <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider mb-1.5">
                  Analytical Real-time Parser Status
                </span>
                
                {customSolverResult === null ? (
                  <div className="text-xs text-slate-450 italic">
                    Type four integers from 1-13 above to parse...
                  </div>
                ) : customSolverResult.solutions.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      SOLVABLE ({customSolverResult.solutions.length} ways)! Difficulty: <span className="uppercase">{customSolverResult.difficulty}</span>
                    </span>
                    <span className="text-[10px] text-indigo-300 font-mono block mt-1">
                      Start hint preview: {customSolverResult.solutions[0].split(' ')[0]} ...
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-rose-400 font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    IMPOSSIBLE! There is zero mathematical proof path to 24.
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomDeckBuilder(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium text-xs rounded-xl transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={customSolverResult === null || customSolverResult.solutions.length === 0}
                  className="flex-1.5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none transition duration-150 flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10"
                >
                  Load to Board <Check className="h-4 w-4" />
                </button>
              </div>

            </div>
          </form>
        </div>
      )}

    </div>
  );
}
