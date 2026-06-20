import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Heart, Zap, Sparkles, AlertTriangle, Play, HelpCircle, ArrowLeft, RotateCcw } from 'lucide-react';
import { FLASHCARDS, BOSSES, Boss } from '../../data';
import { Flashcard } from '../../types';
import { fetchQuiz, ApiQuizQuestion } from '../../lib/api';

interface BossBattleEngineProps {
  onComplete: (score: number, xpGained: number) => void;
  onBack: () => void;
}

interface Question {
  card: Flashcard;
  prompt: string;
  correctAnswer: string;
  options: string[];
}

export default function BossBattleEngine({ onComplete, onBack }: BossBattleEngineProps) {
  // Game state
  const [bossIndex, setBossIndex] = useState(0);
  const [bossHp, setBossHp] = useState(BOSSES[0].maxHp);
  const [playerHp, setPlayerHp] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  
  // Timers
  const TIMER_LIMIT = 5; // 5-second ticking timer
  const [timeLeft, setTimeLeft] = useState(TIMER_LIMIT);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  // Animation triggers
  const [bossAnimation, setBossAnimation] = useState<'idle' | 'hit' | 'attack'>('idle');
  const [playerAnimation, setPlayerAnimation] = useState<'idle' | 'hit' | 'attack'>('idle');
  const [flashImpact, setFlashImpact] = useState<string | null>(null); // To show damage text

  const currentBoss = BOSSES[bossIndex] || BOSSES[BOSSES.length - 1];

  // Quiz pool — server-built multiple-choice questions (from the full JMdict
  // pool) with a static fallback so the battle works offline.
  const apiQuestionsRef = useRef<ApiQuizQuestion[]>([]);
  const apiIdxRef = useRef(0);
  useEffect(() => {
    let alive = true;
    fetchQuiz(2, 24, false).then((qs) => {
      if (alive && qs) {
        apiQuestionsRef.current = qs;
        apiIdxRef.current = 0;
      }
    });
    return () => { alive = false; };
  }, []);

  // Helper to generate a new question
  const generateQuestion = (): Question => {
    // Prefer server-built questions when available.
    const apiQuestions = apiQuestionsRef.current;
    if (apiQuestions.length > 0) {
      if (apiIdxRef.current >= apiQuestions.length) {
        apiQuestions.sort(() => 0.5 - Math.random());
        apiIdxRef.current = 0;
      }
      const q = apiQuestions[apiIdxRef.current++];
      const card: Flashcard = {
        id: q.id,
        japanese: q.prompt,
        romaji: q.romaji,
        english: q.answer,
        type: 'vocab',
        level: 1,
      };
      return {
        card,
        prompt: `Translate "${q.prompt}"`,
        correctAnswer: q.answer,
        options: q.options,
      };
    }

    // Pick a card randomly
    const randomIndex = Math.floor(Math.random() * FLASHCARDS.length);
    const card = FLASHCARDS[randomIndex];
    
    // Choose direction: Japanese -> English/Romaji, or English -> Japanese
    const isJfToEng = Math.random() > 0.5;
    let prompt = '';
    let correctAnswer = '';
    let distractorPool: string[] = [];

    if (isJfToEng) {
      prompt = `Translate "${card.japanese}"`;
      correctAnswer = card.english;
      distractorPool = FLASHCARDS.filter(c => c.id !== card.id).map(c => c.english);
    } else {
      prompt = `Select the Japanese characters for "${card.english}"`;
      correctAnswer = card.japanese;
      distractorPool = FLASHCARDS.filter(c => c.id !== card.id).map(c => c.japanese);
    }

    // Shuffle and pick 3 unique distractors
    const uniqueDistractors = Array.from(new Set(distractorPool))
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Merge correct and options
    const options = [correctAnswer, ...uniqueDistractors].sort(() => 0.5 - Math.random());

    return {
      card,
      prompt,
      correctAnswer,
      options
    };
  };

  // Next Round
  const startNextRound = () => {
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
    setTimeLeft(TIMER_LIMIT);
    setCurrentQuestion(generateQuestion());
  };

  // Setup Game
  const startNewGame = () => {
    setBossIndex(0);
    setBossHp(BOSSES[0].maxHp);
    setPlayerHp(100);
    setScore(0);
    setCombo(0);
    setIsGameOver(false);
    setHasWon(false);
    setIsPlaying(true);
    // Trigger initial question
    setSelectedOption(null);
    setIsAnswered(false);
    setFeedback(null);
    setTimeLeft(TIMER_LIMIT);
    setCurrentQuestion(generateQuestion());
  };

  // Timer loop
  useEffect(() => {
    if (!isPlaying || isGameOver || hasWon || isAnswered || !currentQuestion) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0.5) {
          // Time expired! Enemy attacks
          handleTimeOut();
          return TIMER_LIMIT;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isPlaying, isGameOver, hasWon, isAnswered, currentQuestion]);

  // Handle Timeout (Boss attacks)
  const handleTimeOut = () => {
    setIsAnswered(true);
    setCombo(0);
    setBossAnimation('attack');
    setPlayerAnimation('hit');
    setPlayerHp((prev) => Math.max(0, prev - 20));
    setFeedback({ isCorrect: false, text: `Time expired! ${currentBoss.name} attacked you for 20 damage.` });
    setFlashImpact(`-${20} HP`);

    // Dynamic state check
    setTimeout(() => {
      setBossAnimation('idle');
      setPlayerAnimation('idle');
      setFlashImpact(null);
      
      // Check if player died
      if (playerHp <= 20) {
        setIsGameOver(true);
        setIsPlaying(false);
      } else {
        startNextRound();
      }
    }, 1500);
  };

  // Process selected answer
  const handleAnswer = (option: string) => {
    if (isAnswered || isGameOver || hasWon) return;
    setIsAnswered(true);
    setSelectedOption(option);

    const isCorrect = option === currentQuestion?.correctAnswer;

    if (isCorrect) {
      // Player deals damage to boss
      const dmg = 25 + combo * 5;
      setBossHp((prev) => Math.max(0, prev - dmg));
      setScore((prev) => prev + 100 + combo * 20);
      setCombo((prev) => prev + 1);
      
      setPlayerAnimation('attack');
      setBossAnimation('hit');
      setFeedback({ isCorrect: true, text: `Correct! Dealt ${dmg} damage to ${currentBoss.name}!` });
      setFlashImpact(`-${dmg} HP`);

      setTimeout(() => {
        setPlayerAnimation('idle');
        setBossAnimation('idle');
        setFlashImpact(null);

        // Check if boss died
        setBossHp((latestBossHp) => {
          const actualNewHp = Math.max(0, latestBossHp - dmg);
          if (actualNewHp <= 0) {
            // Defeated boss!
            const nextBossIdx = bossIndex + 1;
            if (nextBossIdx < BOSSES.length) {
              setBossIndex(nextBossIdx);
              setBossHp(BOSSES[nextBossIdx].maxHp);
              setScore((prev) => prev + 500); // Boss bonus
              // Small healing when defeating a boss
              setPlayerHp(prev => Math.min(100, prev + 30));
              setFeedback({ isCorrect: true, text: `🎉 Defeated ${currentBoss.name}! Next boss is arriving...` });
              setTimeout(() => {
                startNextRound();
              }, 2000);
            } else {
              setHasWon(true);
              setIsPlaying(false);
            }
          } else {
            startNextRound();
          }
          return actualNewHp;
        });

      }, 1500);

    } else {
      // Bad answer! Boss responds
      setCombo(0);
      setBossAnimation('attack');
      setPlayerAnimation('hit');
      setPlayerHp((prev) => Math.max(0, prev - 15));
      setFeedback({ 
        isCorrect: false, 
        text: `Incorrect! It was "${currentQuestion?.correctAnswer}". ${currentBoss.name} counterattacked!` 
      });
      setFlashImpact(`-${15} HP`);

      setTimeout(() => {
        setBossAnimation('idle');
        setPlayerAnimation('idle');
        setFlashImpact(null);

        setPlayerHp((latestPlayerHp) => {
          const actualPlayerHp = Math.max(0, latestPlayerHp - 15);
          if (actualPlayerHp <= 0) {
            setIsGameOver(true);
            setIsPlaying(false);
          } else {
            startNextRound();
          }
          return actualPlayerHp;
        });

      }, 1500);
    }
  };

  // End and persist state
  const handleFinish = () => {
    const finalScore = score + (hasWon ? 1000 : 0);
    const xpGained = Math.round(finalScore / 10);
    onComplete(finalScore, xpGained);
  };

  return (
    <div id="boss-battle-screen" className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-indigo-950/20 via-slate-900/40 to-slate-950 pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <button
          id="btn-back-menu"
          onClick={onBack}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Dojo
        </button>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">COMBO</span>
            <span className="text-lg font-bold text-amber-400 font-mono">
              {combo}x
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">SCORE</span>
            <span className="text-lg font-bold text-indigo-300 font-mono">
              {score}
            </span>
          </div>
        </div>
      </div>

      {/* LOBBY / INITIAL START STATE */}
      {!isPlaying && !isGameOver && !hasWon && (
        <div id="boss-battle-intro" className="relative z-10 py-12 text-center text-slate-100 max-w-lg mx-auto">
          <div className="text-6xl mb-6">🌋</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight bg-gradient-to-r from-red-400 to-amber-400 bg-clip-text text-transparent">
            Arcade Boss Battle
          </h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Unleash your Japanese recognition instinct! The castle bosses prepare devastating spells. Answer correctly within <strong className="text-amber-400">5 seconds</strong> to strike them down before they strike you!
          </p>
          <div className="bg-slate-800/50 p-4 rounded-xl mb-8 border border-indigo-950/40 text-left text-sm text-slate-300 space-y-2">
            <h4 className="font-semibold text-slate-200">⚔️ Battle Parameters:</h4>
            <div>• Each correct translation damages the level boss.</div>
            <div>• Combos multiply your scores and increase power.</div>
            <div>• Timer reaches 0 or wrong selections triggers an enemy assault!</div>
          </div>
          <button
            id="btn-start-battle"
            onClick={startNewGame}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-indigo-900/40 hover:shadow-indigo-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 text-lg"
          >
            <Play fill="white" size={20} /> Enter the Arena
          </button>
        </div>
      )}

      {/* GAME OVER STATE */}
      {isGameOver && (
        <div id="boss-battle-gameover" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">💀</div>
          <h2 className="text-3xl font-bold mb-3 text-red-500 font-mono tracking-wider">
            DEFEAT
          </h2>
          <p className="text-slate-400 mb-6">
            The scrolls were lost, to survive you must train longer in the Dojo.
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm">
              <span>Final Score:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1 text-sm pt-2">
              <span>Experience:</span>
              <span className="text-indigo-400">+{Math.round(score/10)} XP</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              id="btn-retry-battle-1"
              onClick={startNewGame}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Restart Challenge
            </button>
            <button
              id="btn-finish-battle-1"
              onClick={handleFinish}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl border border-slate-700 transition-colors"
            >
              Back to Dojo
            </button>
          </div>
        </div>
      )}

      {/* CONGRATULATIONS STATE */}
      {hasWon && (
        <div id="boss-battle-victory" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-3xl font-bold mb-3 text-amber-400 tracking-tight">
            VICTORY!
          </h2>
          <p className="text-slate-400 mb-6Shared">
            You cleared the fortress, slaying the Oni Warlord and mastering character speed reading!
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm">
              <span>Battle Score:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm pt-2">
              <span>Victory Bonus:</span>
              <span className="text-green-400">+1,000</span>
            </div>
            <div className="flex justify-between py-1 text-sm pt-2">
              <span>Total Score:</span>
              <span className="text-emerald-400 font-bold">{score + 1000}</span>
            </div>
            <div className="flex justify-between py-1 text-sm pt-2">
              <span>Experience:</span>
              <span className="text-indigo-400">+{Math.round((score + 1000) / 10)} XP</span>
            </div>
          </div>
          <button
            id="btn-victory-continue"
            onClick={handleFinish}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors"
          >
            Claim rewards & stats
          </button>
        </div>
      )}

      {/* ACTIVE BATTLEVIEW */}
      {isPlaying && !isGameOver && !hasWon && currentQuestion && (
        <div id="boss-battle-active" className="relative z-10 flex flex-col items-stretch">
          
          {/* THE COMBAT STAGE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/80 rounded-xl p-5 border border-slate-800 relative shadow-inner overflow-hidden mb-6 min-h-[220px]">
            {/* Impact Flash Notifications */}
            <AnimatePresence>
              {flashImpact && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.8 }}
                  animate={{ opacity: 1, y: -20, scale: 1.2 }}
                  exit={{ opacity: 0, y: -40, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="absolute left-1/2 top-10 transform -translate-x-1/2 z-30 font-mono text-2xl font-black text-amber-500 tracking-wider bg-slate-900/95 px-4 py-1.5 rounded-full border border-amber-500/30"
                >
                  {flashImpact}
                </motion.div>
              )}
            </AnimatePresence>

            {/* PLAYER UNIT */}
            <div className="flex flex-col justify-between items-start border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4">
              <div className="flex items-center gap-3 w-full">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl relative">
                  🥋
                  {playerAnimation === 'hit' && (
                    <span className="absolute inset-0 bg-red-600/40 rounded-xl animate-ping" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">Kotoba Samurai</span>
                    <span className="text-xs font-bold text-red-400 font-mono">{playerHp} / 100</span>
                  </div>
                  {/* Progress health bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-red-500 h-full transition-all duration-300 shadow-[0_0_8px_#ef4444]"
                      style={{ width: `${playerHp}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Player avatar state */}
              <motion.div 
                animate={{
                  x: playerAnimation === 'attack' ? [0, 40, 0] : playerAnimation === 'hit' ? [-10, 10, -10, 10, 0] : 0,
                  rotate: playerAnimation === 'hit' ? [-5, 5, -5, 5, 0] : 0,
                  scale: playerAnimation === 'attack' ? 1.15 : 1
                }}
                transition={{ duration: 0.5 }}
                className="my-4 mx-auto text-5xl select-none"
              >
                ⚔️
              </motion.div>
              <div className="text-xs bg-slate-900/80 text-indigo-400 py-1 px-2.5 rounded-md border border-slate-800/80 self-center">
                Spells: <strong className="text-slate-200">Translations</strong>
              </div>
            </div>

            {/* BOSS UNIT */}
            <div className="flex flex-col justify-between items-stretch pt-4 md:pt-0">
              <div className="flex items-center gap-3 w-full">
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl relative">
                  {currentBoss.avatar}
                  {bossAnimation === 'hit' && (
                    <span className="absolute inset-0 bg-orange-600/40 rounded-xl animate-ping" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wide">{currentBoss.name}</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">HP {bossHp} / {currentBoss.maxHp}</span>
                  </div>
                  {/* Boss HP bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-orange-500 h-full transition-all duration-300 shadow-[0_0_8px_#f97316]"
                      style={{ width: `${(bossHp / currentBoss.maxHp) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Boss avatar visual state */}
              <motion.div
                animate={{
                  x: bossAnimation === 'attack' ? [0, -40, 0] : bossAnimation === 'hit' ? [10, -10, 10, -10, 0] : 0,
                  rotate: bossAnimation === 'hit' ? [5, -5, 5, -5, 0] : 0,
                  scale: bossAnimation === 'attack' ? 1.2 : 1
                }}
                transition={{ duration: 0.5 }}
                className="my-3 mx-auto text-6xl select-none relative"
              >
                {currentBoss.avatar}
              </motion.div>

              <div className="flex items-center justify-between border-t border-slate-900 pt-3.5">
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <Shield size={13} /> Guardian #{bossIndex + 1}
                </div>
                <span className="text-xs text-slate-400 font-mono">Defeats: {bossIndex}</span>
              </div>
            </div>
          </div>

          {/* TIMER PROGRESS */}
          <div className="mb-6 relative">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-mono flex items-center gap-1 font-bold">
                <AlertTriangle size={12} className="text-amber-500 animate-pulse" /> BOSS ATTACK COUNTDOWN
              </span>
              <span className={`font-mono font-bold ${timeLeft <= 1.5 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`}>
                {timeLeft.toFixed(1)}s
              </span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-[1px]">
              <div
                className={`h-full transition-all duration-100 rounded-full ${
                  timeLeft <= 1.5 ? 'bg-gradient-to-r from-red-600 to-amber-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${(timeLeft / TIMER_LIMIT) * 100}%` }}
              />
            </div>
          </div>

          {/* QUESTION PROMPT */}
          <div className="text-center py-6 px-4 bg-slate-800/40 rounded-xl border border-slate-800/80 mb-5 relative overflow-hidden backdrop-blur-xs">
            <div className="absolute top-1 right-2 text-[60px] opacity-5 pointer-events-none font-sans font-black select-none">
              字
            </div>
            <span className="text-xs uppercase text-indigo-400 tracking-widest font-bold block mb-1">Active Glyph</span>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              {currentQuestion.prompt}
            </h3>
          </div>

          {/* INPUT FORM OPTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-2 mt-1">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === option;
              const isCorrectOpt = option === currentQuestion.correctAnswer;
              
              let btnStyle = 'bg-slate-800 hover:bg-slate-750 text-slate-100 border-slate-700/80';
              if (selectedOption !== null) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-green-600 text-white border-green-500 shadow-[0_0_12px_rgba(22,163,74,0.3)]';
                } else if (isSelected) {
                  btnStyle = 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.3)]';
                } else {
                  btnStyle = 'bg-slate-900 text-slate-500 border-slate-900 opacity-60';
                }
              }

              return (
                <button
                  id={`btn-opt-${idx}`}
                  key={idx}
                  onClick={() => handleAnswer(option)}
                  disabled={selectedOption !== null}
                  className={`w-full py-4 px-5 text-lg font-medium rounded-xl border-2 transition-all text-center flex justify-center items-center cursor-pointer min-h-[64px] ${btnStyle}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* RESPONSE FEEDBACK PANEL */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-3.5 mt-1 rounded-xl border text-center font-medium ${
                  feedback.isCorrect 
                    ? 'bg-green-950/40 text-green-300 border-green-800/40' 
                    : 'bg-red-950/40 text-red-300 border-red-800/40'
                }`}
              >
                {feedback.text}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}
    </div>
  );
}
