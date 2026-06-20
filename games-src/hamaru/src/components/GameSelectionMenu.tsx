import React, { useState } from 'react';
import { Sword, Sparkles, Hammer, Info, Award, Star, Flame, Compass, Lock, Unlock, LogOut, ChevronRight, BookOpen } from 'lucide-react';
import { GameModeId } from '../types';
import { FLASHCARDS, PARTICLE_QUESTIONS } from '../data';

interface GameSelectionMenuProps {
  score: number;
  xp: number;
  level: number;
  highScores: Record<GameModeId, number>;
  masterLevels: Record<GameModeId, number>;
  onSelectGame: (mode: GameModeId) => void;
  onResetStats: () => void;
}

export default function GameSelectionMenu({
  score,
  xp,
  level,
  highScores,
  masterLevels,
  onSelectGame,
  onResetStats
}: GameSelectionMenuProps) {
  const [activeTab, setActiveTab] = useState<'games' | 'scrolls'>('games');
  const [selectedScrollFilter, setSelectedScrollFilter] = useState<'all' | 'hiragana' | 'katakana' | 'kanji' | 'vocab' | 'grammar'>('all');

  // Definition of the 4 Minigames
  const GAMES = [
    {
      id: 'boss_battle' as GameModeId,
      name: 'Arcade Boss Battle',
      focus: 'Speed & Quick Speed Recall',
      description5: 'The classic battle setup with a ticking timer. Good for building instant character recognition.',
      icon: <Sword className="text-red-400 group-hover:rotate-12 transition-transform" size={24} />,
      border: 'hover:border-red-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]',
      gradient: 'from-red-500/10 to-red-600/5',
      requiredXp: 0, // Unlocked always
      accentColor: 'text-red-400',
      badge: 'Speed'
    },
    {
      id: 'memory_match' as GameModeId,
      name: 'Elemental Card Match',
      focus: 'Spatial & Visual Memory',
      description5: 'A memory match game designed to link Kana shapes to Romaji or Kanji to meanings.',
      icon: <Sparkles className="text-emerald-400 group-hover:scale-110 transition-transform" size={24} />,
      border: 'hover:border-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]',
      gradient: 'from-emerald-500/10 to-teal-600/5',
      requiredXp: 200, // Level lock representation
      accentColor: 'text-emerald-400',
      badge: 'Memory'
    },
    {
      id: 'word_forge' as GameModeId,
      name: 'Word Forge',
      focus: 'Spelling & Production',
      description5: 'Instead of picking options, build Japanese vocabulary blocks chronological by syllable.',
      icon: <Hammer className="text-orange-400 group-hover:-rotate-12 transition-transform" size={24} />,
      border: 'hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]',
      gradient: 'from-orange-500/10 to-amber-600/5',
      requiredXp: 400, // Level lock representation
      accentColor: 'text-orange-400',
      badge: 'Production'
    },
    {
      id: 'bubble_burst' as GameModeId,
      name: 'Particle Bubble Pop',
      focus: 'Grammar & Context Gaps',
      description5: 'A fast-paced parsing action to master particles は, が, を, に, and で.',
      icon: <Flame className="text-sky-400 group-hover:animate-pulse" size={24} />,
      border: 'hover:border-sky-500 hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]',
      gradient: 'from-sky-500/10 to-indigo-600/5',
      requiredXp: 600, // Level lock representation
      accentColor: 'text-sky-400',
      badge: 'Syntax'
    }
  ];

  // Map Filter scrolls
  const filteredScrolls = FLASHCARDS.filter(
    item => selectedScrollFilter === 'all' || item.type === selectedScrollFilter
  );

  return (
    <div id="game-selection-menu" className="w-full max-w-5xl mx-auto space-y-6">
      
      {/* GLOBAL PROGRESS HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
        {/* Glow corner decoration */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-3xl shadow-lg border border-indigo-400/20">
            💮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-100 tracking-tight">KotobaQuest</h1>
              <span className="text-xs bg-indigo-950/80 text-indigo-400 font-mono font-bold px-2.5 py-0.5 rounded-full border border-indigo-900/60">
                Expanded Edition
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Level {level} Samurai Instructor • Practice your scrolls and claim levels
            </p>
          </div>
        </div>

        {/* PROGRESS METER */}
        <div className="w-full md:w-auto flex-1 max-w-sm">
          <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-1.5">
            <span>EXPERIENCE PROGRESS ({xp} XP)</span>
            <span className="text-indigo-400 font-bold">NEXT LEVEL: {level * 500} XP</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-850 p-[1px] overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (xp / (level * 500)) * 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 text-right mt-1 font-mono">
            Total Points Acclaimed: {score}
          </p>
        </div>
      </div>

      {/* TABS SELECT */}
      <div className="flex border-b border-slate-800">
        <button
          id="tab-games"
          onClick={() => setActiveTab('games')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'games'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass size={16} /> Learning Arenas
        </button>
        <button
          id="tab-scrolls"
          onClick={() => setActiveTab('scrolls')}
          className={`px-5 py-3 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'scrolls'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-950/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen size={16} /> Character Encyclopedia
        </button>
      </div>

      {/* GAMES TAB */}
      {activeTab === 'games' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {GAMES.map((game) => {
              const isLocked = xp < game.requiredXp;
              
              return (
                <div
                  key={game.id}
                  id={`card-game-link-${game.id}`}
                  className={`group rounded-2xl border-2 p-5 flex flex-col justify-between transition-all relative overflow-hidden bg-gradient-to-b ${game.gradient} ${
                    isLocked 
                      ? 'border-slate-850 opacity-60' 
                      : `border-slate-800 cursor-pointer ${game.border}`
                  }`}
                  onClick={() => !isLocked && onSelectGame(game.id)}
                >
                  {/* Lock symbol badge overlay */}
                  {isLocked && (
                    <div className="absolute top-3.5 right-3.5 flex items-center gap-1 bg-slate-950/80 text-orange-400 font-mono text-[10px] py-1 px-2.5 rounded-lg border border-orange-950/50">
                      <Lock size={11} /> Requires {game.requiredXp} XP
                    </div>
                  )}

                  {!isLocked && (
                    <div className={`absolute top-3.5 right-3.5 font-mono text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border bg-slate-900 border-indigo-950 text-indigo-400`}>
                      {game.badge}
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-3.5 mb-3.5">
                      <div className="w-11 h-11 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center">
                        {game.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                          {game.name}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-medium font-mono">
                          {game.focus}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {game.description5}
                    </p>
                  </div>

                  <div className="border-t border-slate-800/60 pt-3.5 mt-3.5 flex justify-between items-center text-xs font-mono">
                    <div className="flex items-center gap-4 text-slate-500">
                      <div>
                        <span>HI-SCORE: </span>
                        <strong className="text-slate-350">{highScores[game.id] || 0}</strong>
                      </div>
                      <div>
                        <span>MASTERY: </span>
                        <strong className="text-slate-350">Lvl {masterLevels[game.id] || 0}</strong>
                      </div>
                    </div>
                    
                    {!isLocked ? (
                      <span className="text-indigo-400 group-hover:text-indigo-300 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-all">
                        Train <ChevronRight size={14} />
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Cheat sheet reminder/utility */}
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono text-slate-450 text-center sm:text-left">
            <span className="flex items-center gap-1 text-slate-400 text-xs">
              <Info size={14} className="text-indigo-400" />
              Tip: Gain XP by completing matches in Element Match, spelling words in Forge, or battling.
            </span>
            <button
              id="btn-reset-stats"
              onClick={onResetStats}
              className="text-red-400 bg-red-950/10 hover:bg-red-950/20 px-3.5 py-1.5 rounded-lg border border-red-950/40 font-bold tracking-wider text-[11px]"
            >
              RESET ALL HIGH SCORES
            </button>
          </div>
        </div>
      )}

      {/* CHARACTER SCROLLS ENCYCLOPEDIA TAB */}
      {activeTab === 'scrolls' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-200">Samurai Dojo Scrolls Study</h2>
              <p className="text-xs text-slate-400">Unlock your muscle memory before heading to Boss Battles</p>
            </div>

            {/* FILTERS DIALECTS */}
            <div className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
              {(['all', 'hiragana', 'katakana', 'kanji', 'vocab'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedScrollFilter(f)}
                  className={`px-3 py-1 text-[11px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                    selectedScrollFilter === f
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* CHARACTER TILES SCROLLER */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredScrolls.map((card, idx) => (
              <div
                key={card.id}
                id={`encyclo-tile-${idx}`}
                className="bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 text-center transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[9px] font-bold font-mono tracking-wide uppercase text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/10 block mb-2 w-max mx-auto">
                    {card.type}
                  </span>
                  <div className="text-3xl font-bold font-sans text-amber-300 my-2">
                    {card.japanese}
                  </div>
                </div>
                <div className="border-t border-slate-900 pt-2 text-xs">
                  <p className="font-semibold text-slate-200">{card.english}</p>
                  <p className="text-[10px] text-slate-450 font-mono italic">romaji: {card.romaji}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-850 space-y-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest font-mono">⚡ Master Particles Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {PARTICLE_QUESTIONS.slice(0, 4).map((q, i) => (
                <div key={i} className="text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between font-mono text-[10px] text-indigo-400 font-bold mb-1">
                    <span>PARTICLE: [{q.correctParticle}]</span>
                    <span>Q #{i+1}</span>
                  </div>
                  <p className="font-sans text-slate-200 font-semibold">{q.sentenceBefore} <span className="text-amber-400 font-extrabold underline">{q.correctParticle}</span> {q.sentenceAfter}</p>
                  <p className="text-[10px] text-slate-450 mt-1 italic">"{q.englishTranslation}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
