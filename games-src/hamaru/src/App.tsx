import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Sparkles, Star, Award, Compass, RotateCcw, Volume2, Trophy, HelpCircle, ArrowLeft } from 'lucide-react';
import { GameModeId } from './types';
import { requestProgress, onRestoreProgress, reportBestScore, reportStats } from './lib/host';

// Import our custom sub-components
import GameSelectionMenu from './components/GameSelectionMenu';
import BossBattleEngine from './components/games/BossBattleEngine';
import MemoryMatchEngine from './components/games/MemoryMatchEngine';
import WordForgeEngine from './components/games/WordForgeEngine';
import BubbleBurstEngine from './components/games/BubbleBurstEngine';

export default function App() {
  const [currentMode, setCurrentMode] = useState<GameModeId>('menu');
  const [score, setScore] = useState<number>(0);
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [totalGames, setTotalGames] = useState<number>(0);

  // Separate highscore dictionaries
  const [highScores, setHighScores] = useState<Record<GameModeId, number>>({
    menu: 0,
    boss_battle: 0,
    memory_match: 0,
    word_forge: 0,
    bubble_burst: 0,
  });

  const [masterLevels, setMasterLevels] = useState<Record<GameModeId, number>>({
    menu: 0,
    boss_battle: 1,
    memory_match: 1,
    word_forge: 1,
    bubble_burst: 1,
  });

  // Level Up Celebrations Modal
  const [showLevelUp, setShowLevelUp] = useState<boolean>(false);
  const [oldLevel, setOldLevel] = useState<number>(1);

  // Clear splash on complete
  const [completeSplash, setCompleteSplash] = useState<{
    score: number;
    xp: number;
    gameName: string;
  } | null>(null);

  // Load stats from localStorage on Mount
  useEffect(() => {
    const savedScore = localStorage.getItem('kotoba_overall_score');
    const savedXp = localStorage.getItem('kotoba_overall_xp');
    const savedLevel = localStorage.getItem('kotoba_overall_level');
    const savedHighScores = localStorage.getItem('kotoba_highscores');
    const savedMasterLevels = localStorage.getItem('kotoba_masterlevels');

    if (savedScore) setScore(parseInt(savedScore, 10));
    if (savedXp) setXp(parseInt(savedXp, 10));
    if (savedLevel) setLevel(parseInt(savedLevel, 10));
    
    if (savedHighScores) {
      try {
        setHighScores(JSON.parse(savedHighScores));
      } catch (e) {
        console.error('Failed reading highscores', e);
      }
    }
    if (savedMasterLevels) {
      try {
        setMasterLevels(JSON.parse(savedMasterLevels));
      } catch (e) {
        console.error('Failed reading master levels', e);
      }
    }
  }, []);

  // Sync with the SkillForge host: request cloud-saved progress on mount and
  // merge it in (cumulative values only ever grow). No-op when standalone.
  useEffect(() => {
    requestProgress();
    const unsub = onRestoreProgress((data) => {
      const remoteScore = Number((data.score ?? data.bestScore) ?? 0) || 0;
      const remoteXp = Number(data.xp ?? 0) || 0;
      const remoteTotalGames = Number(data.totalGames ?? 0) || 0;
      const remoteHigh = (data.highScores ?? {}) as Record<string, number>;
      const remoteMasters = (data.masterLevels ?? {}) as Record<string, number>;

      setScore((p) => Math.max(p, remoteScore));
      setXp((p) => Math.max(p, remoteXp));
      setLevel((p) => Math.max(p, Math.floor(remoteXp / 500) + 1));
      setTotalGames((p) => Math.max(p, remoteTotalGames));
      setHighScores((prev) => {
        const merged = { ...prev };
        (Object.keys(remoteHigh) as GameModeId[]).forEach((k) => {
          if (k in merged) merged[k] = Math.max(merged[k] || 0, Number(remoteHigh[k]) || 0);
        });
        return merged;
      });
      setMasterLevels((prev) => {
        const merged = { ...prev };
        (Object.keys(remoteMasters) as GameModeId[]).forEach((k) => {
          if (k in merged) merged[k] = Math.max(merged[k] || 0, Number(remoteMasters[k]) || 0);
        });
        return merged;
      });
    });
    return unsub;
  }, []);

  // Save changes helper
  const persistStats = (newScore: number, newXp: number, newLv: number, newHighs: any, newMasters: any) => {
    localStorage.setItem('kotoba_overall_score', newScore.toString());
    localStorage.setItem('kotoba_overall_xp', newXp.toString());
    localStorage.setItem('kotoba_overall_level', newLv.toString());
    localStorage.setItem('kotoba_highscores', JSON.stringify(newHighs));
    localStorage.setItem('kotoba_masterlevels', JSON.stringify(newMasters));
  };

  // Reset ALL scores
  const resetStats = () => {
    if (window.confirm("Are you sure you want to restore the Samurai Dojo? This will reset all high scores and levels.")) {
      setScore(0);
      setXp(0);
      setLevel(1);
      const defaultHighs = {
        menu: 0,
        boss_battle: 0,
        memory_match: 0,
        word_forge: 0,
        bubble_burst: 0,
      };
      const defaultMasters = {
        menu: 0,
        boss_battle: 1,
        memory_match: 1,
        word_forge: 1,
        bubble_burst: 1,
      };
      setHighScores(defaultHighs);
      setMasterLevels(defaultMasters);
      
      localStorage.removeItem('kotoba_overall_score');
      localStorage.removeItem('kotoba_overall_xp');
      localStorage.removeItem('kotoba_overall_level');
      localStorage.removeItem('kotoba_highscores');
      localStorage.removeItem('kotoba_masterlevels');
    }
  };

  // Game Completed Trigger Handler
  const handleGameComplete = (gameScore: number, xpGained: number) => {
    const mode = currentMode;
    const gameNameValue = 
      mode === 'boss_battle' ? 'Arcade Boss Battle' :
      mode === 'memory_match' ? 'Elemental Card Match' :
      mode === 'word_forge' ? 'Word Forge' :
      mode === 'bubble_burst' ? 'Particle Bubble Pop' : 'Minigame';

    // Calculate level progression
    const totalScore = score + gameScore;
    const totalXp = xp + xpGained;
    const calculatedLevel = Math.floor(totalXp / 500) + 1;

    // Check highscores
    const previousHighScore = highScores[mode] || 0;
    const isNewHighScore = gameScore > previousHighScore;
    const updatedHighScores = { ...highScores };
    if (isNewHighScore) {
      updatedHighScores[mode] = gameScore;
    }

    // Step up mastery level on clear automatically
    const updatedMasterLevels = { ...masterLevels };
    updatedMasterLevels[mode] = (masterLevels[mode] || 1) + 1;

    setScore(totalScore);
    setXp(totalXp);
    setHighScores(updatedHighScores);
    setMasterLevels(updatedMasterLevels);

    // Persist to store
    persistStats(totalScore, totalXp, calculatedLevel, updatedHighScores, updatedMasterLevels);

    // Report to the SkillForge host (best-effort; no-ops when standalone).
    const newTotalGames = totalGames + 1;
    setTotalGames(newTotalGames);
    reportBestScore(totalScore);
    reportStats({
      score: totalScore,
      bestScore: totalScore,
      xp: totalXp,
      level: calculatedLevel,
      totalGames: newTotalGames,
      highScores: updatedHighScores,
      masterLevels: updatedMasterLevels,
      lastGame: gameNameValue,
    });

    // Show completion summary splash screen
    setCompleteSplash({
      score: gameScore,
      xp: xpGained,
      gameName: gameNameValue
    });

    // Handle LEVEL UP trigger
    if (calculatedLevel > level) {
      setOldLevel(level);
      setLevel(calculatedLevel);
      setTimeout(() => {
        setShowLevelUp(true);
      }, 500);
    }

    setCurrentMode('menu');
  };

  // Learning XP handler — lighter than a battle clear: grants XP/points and may
  // level up, but never touches battle high-scores or mastery levels.
  const handleLearningXp = (xpGained: number) => {
    if (xpGained <= 0) return;
    const totalScore = score + xpGained;
    const totalXp = xp + xpGained;
    const calculatedLevel = Math.floor(totalXp / 500) + 1;

    setScore(totalScore);
    setXp(totalXp);
    persistStats(totalScore, totalXp, calculatedLevel, highScores, masterLevels);

    reportBestScore(totalScore);
    reportStats({
      score: totalScore,
      bestScore: totalScore,
      xp: totalXp,
      level: calculatedLevel,
      totalGames,
      highScores,
      masterLevels,
      lastGame: 'Learning Dojo',
    });

    if (calculatedLevel > level) {
      setOldLevel(level);
      setLevel(calculatedLevel);
      setTimeout(() => setShowLevelUp(true), 400);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* GLOW ATMOSPHERE */}
      <div className="fixed overflow-hidden -left-48 -top-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed overflow-hidden -right-48 -bottom-48 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* COMPACT STYLISH NAV HEADER */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 relative">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentMode('menu')}>
            <span className="text-xl">⛩️</span>
            <span className="text-base font-black tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Hamaru (ハマル)
            </span>
          </div>

          {/* Quick status banner indicator */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Dojo State: Active</span>
            </div>
            
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg text-amber-500">
              <Star size={13} fill="currentColor" />
              <span className="font-bold">Lvl {level}</span>
            </div>
          </div>
        </div>
      </header>

      {/* CORE DISPLAY ROUTING ELEMENT */}
      <main className="flex-1 py-6 px-4 max-w-5xl w-full mx-auto relative z-10">
        
        {/* COMPLETED REWARD SCREEN MODAL */}
        <AnimatePresence>
          {completeSplash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-50 overflow-hidden"
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                className="bg-slate-900 p-6 md:p-8 rounded-2xl max-w-sm w-full text-center border-2 border-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.3)] space-y-5"
              >
                <div className="w-16 h-16 bg-indigo-650/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
                  📜
                </div>

                <div>
                  <h3 className="text-[10px] tracking-widest uppercase text-slate-450 font-mono">Trial Completed</h3>
                  <h2 className="text-2xl font-black text-slate-100 mt-1">{completeSplash.gameName}</h2>
                </div>

                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-850 space-y-2.5 font-mono text-sm text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 text-xs">Trial Score:</span>
                    <span className="text-amber-400 font-bold">+{completeSplash.score} pts</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-450 text-xs">Scroll XP:</span>
                    <span className="text-indigo-400 font-semibold">+{completeSplash.xp} XP</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Your results have been sealed into the Local scrolls vault. Train further inside other arenas to test translation muscle memory!
                </p>

                <button
                  id="btn-close-splash"
                  onClick={() => setCompleteSplash(null)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-colors cursor-pointer"
                >
                  Return to Dojo Hub
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEVEL UP POPUP */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 z-50"
            >
              <div className="text-center space-y-6 max-w-sm">
                <div className="text-8xl animate-bounce">🎇👑⚔️</div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent font-sans tracking-tight">
                  LEVEL UP!
                </h1>
                <p className="text-slate-300">
                  Congratulations! You advanced from Samurai <strong className="text-amber-500">Master Lvl {oldLevel}</strong> to <strong className="text-amber-400">Master Level {level}</strong>!
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 font-mono text-sm inline-block">
                  🔥 New Minigames and glyph pools unlocked!
                </div>
                <button
                  id="btn-close-level-up"
                  onClick={() => setShowLevelUp(false)}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 px-8 rounded-xl transition-all shadow-md tracking-wider uppercase text-xs cursor-pointer"
                >
                  Honorable Progress
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentMode === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
            >
              <GameSelectionMenu
                score={score}
                xp={xp}
                level={level}
                highScores={highScores}
                masterLevels={masterLevels}
                onSelectGame={(mode) => setCurrentMode(mode)}
                onResetStats={resetStats}
                onLearningXp={handleLearningXp}
              />
            </motion.div>
          )}

          {currentMode === 'boss_battle' && (
            <motion.div
              key="boss_battle"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <BossBattleEngine
                onComplete={handleGameComplete}
                onBack={() => setCurrentMode('menu')}
              />
            </motion.div>
          )}

          {currentMode === 'memory_match' && (
            <motion.div
              key="memory_match"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <MemoryMatchEngine
                onComplete={handleGameComplete}
                onBack={() => setCurrentMode('menu')}
              />
            </motion.div>
          )}

          {currentMode === 'word_forge' && (
            <motion.div
              key="word_forge"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <WordForgeEngine
                onComplete={handleGameComplete}
                onBack={() => setCurrentMode('menu')}
              />
            </motion.div>
          )}

          {currentMode === 'bubble_burst' && (
            <motion.div
              key="bubble_burst"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <BubbleBurstEngine
                onComplete={handleGameComplete}
                onBack={() => setCurrentMode('menu')}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* SIMPLE DECENT FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/45 py-6 text-center text-xs text-slate-500 font-mono relative">
        <p>© 2026 Hamaru (ハマル) • Japanese Learning Gamified Dojo</p>
        <p className="mt-1 text-[10px] text-slate-600">Built using React, Framer Motion & Tailwind CSS with pixel-perfect game theory.</p>
      </footer>
    </div>
  );
}
