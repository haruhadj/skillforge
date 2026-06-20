import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, HelpCircle, ArrowLeft, RefreshCw, XCircle, Play } from 'lucide-react';
import { PARTICLE_QUESTIONS } from '../../data';
import { ParticleQuestion } from '../../types';

interface Bubble {
  id: string;
  particle: string;
  x: number; // horizontal percentage, 5% to 95%
  y: number; // vertical pixels from top, start e.g. at 400
  speed: number;
}

interface BubbleBurstEngineProps {
  onComplete: (score: number, xpGained: number) => void;
  onBack: () => void;
}

export default function BubbleBurstEngine({ onComplete, onBack }: BubbleBurstEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState<ParticleQuestion | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [shieldHp, setShieldHp] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isAnsweredCorrectly, setIsAnsweredCorrectly] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  // FX state
  const [smokeExplosion, setSmokeExplosion] = useState<{ x: number; y: number } | null>(null);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Start specific question
  const loadQuestion = (index: number) => {
    if (index >= PARTICLE_QUESTIONS.length) {
      setIsFinished(true);
      setIsPlaying(false);
      return;
    }
    setActiveQuestion(PARTICLE_QUESTIONS[index]);
    setBubbles([]);
    setIsAnswering(false);
    setIsAnsweredCorrectly(false);
  };

  // Start game routine
  const startGame = () => {
    setCurrentIdx(0);
    setShieldHp(100);
    setScore(0);
    setCombo(0);
    setIsGameOver(false);
    setIsFinished(false);
    setIsPlaying(true);
    loadQuestion(0);
  };

  // Interval loop to SPAWN bubbles
  useEffect(() => {
    if (!isPlaying || isGameOver || isFinished || !activeQuestion || isAnswering) return;

    const spawnInterval = setInterval(() => {
      // Pick a particle from options randomly
      const randomOption = activeQuestion.options[Math.floor(Math.random() * activeQuestion.options.length)];
      
      const newBubble: Bubble = {
        id: `bubble_${Math.random().toString(36).substr(2, 9)}`,
        particle: randomOption,
        x: Math.floor(Math.random() * 80) + 10, // 10% - 90%
        y: 380, // bottom of container (400px height)
        speed: Number((Math.random() * 1.5 + 1.2).toFixed(2)) // float speed
      };

      setBubbles(prev => {
        // cap maximum bubbles at once
        if (prev.length >= 8) return prev;
        return [...prev, newBubble];
      });
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [isPlaying, isGameOver, isFinished, activeQuestion, isAnswering]);

  // Framerate loop to MOVE bubbles upward
  useEffect(() => {
    if (!isPlaying || isGameOver || isFinished || isAnswering) return;

    let animId: number;

    const updateFrame = () => {
      setBubbles(prevBubbles => {
        const nextBubbles: Bubble[] = [];

        prevBubbles.forEach(b => {
          const nextY = b.y - b.speed;
          
          if (nextY > -30) {
            // Keep bubble if it hasn't floated completely off-screen
            nextBubbles.push({ ...b, y: nextY });
          } else {
            // Missed a bubble float-off check
            if (b.particle === activeQuestion?.correctParticle) {
              // Missed correct particle! Small shield damage
              setShieldHp(hp => Math.max(0, hp - 10));
              setCombo(0);
            }
          }
        });

        return nextBubbles;
      });

      animId = requestAnimationFrame(updateFrame);
    };

    animId = requestAnimationFrame(updateFrame);

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isGameOver, isFinished, isAnswering, activeQuestion]);

  // Shield check
  useEffect(() => {
    if (shieldHp <= 0 && isPlaying) {
      setIsGameOver(true);
      setIsPlaying(false);
    }
  }, [shieldHp, isPlaying]);

  // Treat particle clicks
  const handleBubbleClick = (e: React.MouseEvent<HTMLDivElement>, bubble: Bubble) => {
    if (isAnswering || !activeQuestion) return;

    const isCorrect = bubble.particle === activeQuestion.correctParticle;

    if (isCorrect) {
      // Score and trigger word filling transition
      setIsAnswering(true);
      setIsAnsweredCorrectly(true);
      setBubbles([]); // clear arena bubbles

      const bonus = 100 + combo * 20;
      setScore(s => s + bonus);
      setCombo(c => c + 1);

      setTimeout(() => {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        loadQuestion(nextIdx);
      }, 2000);

    } else {
      // Wrong particle particle hit! Smoke explosion at click coordinate
      const rect = arenaRef.current?.getBoundingClientRect();
      if (rect) {
        setSmokeExplosion({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }

      setCombo(0);
      setShieldHp(hp => Math.max(0, hp - 15));
      
      // pop specific bubble from state
      setBubbles(prev => prev.filter(b => b.id !== bubble.id));

      setTimeout(() => {
        setSmokeExplosion(null);
      }, 600);
    }
  };

  const handleFinish = () => {
    const finalScore = score + (isFinished ? 400 : 0);
    const xpGained = Math.round(finalScore / 10);
    onComplete(finalScore, xpGained);
  };

  return (
    <div id="bubble-burst-module" className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,_var(--tw-gradient-stops)] from-sky-950/20 via-slate-900/40 to-slate-950 pointer-events-none" />

      {/* Navigation Header */}
      <div className="relative z-10 flex justify-between items-center mb-6">
        <button
          id="btn-back-bubble"
          onClick={onBack}
          className="flex items-center gap-2 text-sky-450 hover:text-sky-305 transition-colors bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700 font-medium text-sm"
        >
          <ArrowLeft size={16} /> Back to Dojo
        </button>
        <div className="flex gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">GRAMMAR LEVEL</span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              Q {currentIdx + 1} / {PARTICLE_QUESTIONS.length}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block tracking-wider font-mono">STREAK</span>
            <span className="text-lg font-bold text-sky-400 font-mono">{combo}x</span>
          </div>
        </div>
      </div>

      {/* BEFORE STARTING: LOBBY */}
      {!isPlaying && !isGameOver && !isFinished && (
        <div id="bubble-burst-intro" className="relative z-10 py-12 text-center text-slate-100 max-w-lg mx-auto">
          <div className="text-6xl mb-6">🧼🫧✨</div>
          <h2 className="text-3xl font-bold mb-3 tracking-tight bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
            Particle Bubble Pop
          </h2>
          <p className="text-slate-350 mb-8 leading-relaxed">
            Master Japanese sentence connections! Gap sentences roll across the top scroll. Pop bubbles containing particles like <strong className="text-amber-400">は, が, を, に, で</strong> to make sense of clauses before they float away!
          </p>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-sky-950/40 text-left text-sm text-slate-350 space-y-3">
            <h4 className="font-semibold text-sky-400">🌊 River physics rules:</h4>
            <div className="text-xs space-y-1.5">
              <div>• Sentences contain empty blocks (e.g. <strong className="text-slate-100">ねこ ___ さかな を たべました</strong>).</div>
              <div>• Pop only the correct filler bubble. Distractor bubbles exploded on contact!</div>
              <div>• Missing correct particle floats consumes shield power. Keep shield energy above <strong className="text-red-400">0%</strong>.</div>
            </div>
          </div>
          <button
            id="btn-play-bubble-burst"
            onClick={startGame}
            className="w-full bg-gradient-to-r from-sky-600 to-indigo-650 hover:from-sky-500 hover:to-indigo-550 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-transform flex items-center justify-center gap-2 text-lg transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Play fill="white" size={16} /> Open Particle stream
          </button>
        </div>
      )}

      {/* GAME OVER CARD MAP */}
      {isGameOver && (
        <div id="bubble-burst-gameover" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">💥🌧️</div>
          <h2 className="text-3xl font-bold mb-3 text-red-500 font-mono tracking-wider">
            SHIELD FRACTURED
          </h2>
          <p className="text-slate-400 mb-6 font-sans text-sm pb-2 text-center">
            The particle cloud exploded, breaking your core grammar alignment shields. Restructure your rules syntax!
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm">
              <span>Sentences parsed:</span>
              <span className="text-slate-300">{currentIdx}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50 text-sm mt-2">
              <span>Points:</span>
              <span className="text-amber-400 font-bold">{score}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              id="btn-retry-bubble-1"
              onClick={startGame}
              className="bg-sky-650 hover:bg-sky-550 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} /> Reconnect Shields
            </button>
            <button
              id="btn-finish-bubble-1"
              onClick={handleFinish}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 px-6 rounded-xl border border-slate-700 transition-colors"
            >
              Back to Dojo
            </button>
          </div>
        </div>
      )}

      {/* GAME FINISHED COMPLETE */}
      {isFinished && (
        <div id="bubble-burst-victory" className="relative z-10 py-12 text-center text-slate-100 max-w-sm mx-auto">
          <div className="text-6xl mb-6">🫧🪷👑</div>
          <h2 className="text-2xl font-bold text-amber-400 tracking-tight mb-2">
            PARTICLE SYNAPSE SEALED!
          </h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Marvelous! You successfully bridged all gaps, mastering the challenging particles は, が, を, に, and で.
          </p>
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 mb-8 text-left font-mono text-sm space-y-1.5">
            <div className="flex justify-between border-b border-slate-700/50 pb-1.5">
              <span>Scoping Clears:</span>
              <span className="text-sky-400 font-bold">{currentIdx} / {PARTICLE_QUESTIONS.length}</span>
            </div>
            <div className="flex justify-between border-b border-slate-700/50 py-1.5">
              <span>Points cleared:</span>
              <span className="text-emerald-400 font-bold">{score}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span>XP Yield:</span>
              <span className="text-indigo-400 font-bold">+{Math.round((score + 400)/10)} XP</span>
            </div>
          </div>
          <button
            id="btn-bubble-burst-claim"
            onClick={handleFinish}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-md"
          >
            Claim Particle Keys
          </button>
        </div>
      )}

      {/* ACTIVE SCREEN GRAPHICS */}
      {isPlaying && activeQuestion && (
        <div id="bubble-burst-active" className="relative z-10">
          
          {/* USER SHIELD METER */}
          <div className="flex justify-between items-center bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 mb-5 text-xs font-mono">
            <div className="flex items-center gap-1.5 flex-1 max-w-[200px]">
              <Shield size={14} className="text-emerald-400" />
              <span className="text-slate-300">SHIELD</span>
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300 shadow-[0_0_6px_#10b981]"
                  style={{ width: `${shieldHp}%` }}
                />
              </div>
            </div>
            <span className="font-bold text-slate-350">{shieldHp}%</span>
            <span className="font-bold font-mono text-indigo-400 pl-4">{score} PTS</span>
          </div>

          {/* ACTIVE QUESTION BOARD */}
          <div className="bg-slate-950/85 p-5 rounded-2xl border border-slate-800 mb-6 text-center shadow-lg relative min-h-[140px] flex flex-col justify-center items-center">
            
            {/* The visual sentence gap */}
            <div className="flex items-center flex-wrap justify-center gap-3 mb-2.5">
              {/* Text before gap */}
              <span className="text-2xl sm:text-3.5xl font-extrabold text-slate-100 font-sans tracking-wide">
                {activeQuestion.sentenceBefore}
              </span>

              {/* The gap spacer block */}
              <motion.span
                animate={isAnswering ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] } : {}}
                className={`min-w-[64px] sm:min-w-[76px] h-11 sm:h-12 border-2 rounded-xl flex items-center justify-center font-extrabold text-2xl font-sans px-3.5 ${
                  isAnsweredCorrectly
                    ? 'bg-emerald-900/40 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900 border-dashed border-slate-700 text-sky-400 animate-pulse'
                }`}
              >
                {isAnsweredCorrectly ? activeQuestion.correctParticle : <span className="opacity-45">?</span>}
              </motion.span>

              {/* Text after gap */}
              <span className="text-2xl sm:text-3.5xl font-extrabold text-slate-100 font-sans tracking-wide">
                {activeQuestion.sentenceAfter}
              </span>
            </div>

            {/* Translation description */}
            <p className="text-xs text-slate-400 font-medium italic select-none">
              "{activeQuestion.englishTranslation}"
            </p>

            {isAnswering && (
              <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-widest mt-2 animate-pulse block">
                ⭐ Particle locked! Proceeding...
              </span>
            )}
          </div>

          {/* WATER BUBBLE STEAM AREA CANVAS */}
          <div
            id="bubble-steam-pool"
            ref={arenaRef}
            className="w-full h-[280px] bg-slate-950/70 border border-slate-850 rounded-2xl relative overflow-hidden backdrop-blur-3xl shadow-inner cursor-crosshair mb-4"
          >
            {/* Ambient liquid waves */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-sky-900/10 border-t border-sky-800/10 pointer-events-none" />

            {/* Bubble items */}
            {bubbles.map(bubble => (
              <div
                key={bubble.id}
                id={`floating-bubble-${bubble.id}`}
                onClick={(e) => handleBubbleClick(e, bubble)}
                className="absolute w-12 h-12 rounded-full cursor-pointer select-none flex items-center justify-center font-bold text-lg font-sans border-2 border-sky-400/80 bg-gradient-to-tr from-sky-950/60 to-sky-800/50 text-slate-100 transition-all active:scale-95 shadow-[0_0_12px_rgba(14,165,233,0.25)] hover:border-amber-400"
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {bubble.particle}
                {/* Visual glare spotlight overlay */}
                <span className="absolute top-1.5 left-2 w-2.5 h-2.5 bg-white/40 rounded-full" />
              </div>
            ))}

            {/* Empty space helper */}
            {bubbles.length === 0 && !isAnswering && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
                💨 Loading particles below...
              </div>
            )}

            {/* SMOKE EXPLOSION FX */}
            {smokeExplosion && (
              <div
                id="fx-smoke"
                className="absolute pointer-events-none w-14 h-14 bg-red-600/40 rounded-full border border-red-500 flex items-center justify-center shadow-md animate-ping"
                style={{
                  left: `${smokeExplosion.x}px`,
                  top: `${smokeExplosion.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="text-[10px] text-white font-mono font-bold uppercase tracking-widest leading-none">BURST</span>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-400">
            Tap the floating bubbles from the stream match the gap particle connection quickly. Correct hits locks in!
          </div>

        </div>
      )}
    </div>
  );
}
