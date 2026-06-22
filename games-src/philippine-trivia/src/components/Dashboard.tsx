import React, { useEffect, useRef, useState } from "react";
import { categories } from "../data/triviaData";
import { PlayerStats, QuizCategory } from "../types/trivia";
import { fetchAllAnalytics, QuizAnalytics as Analytics } from "../services/skillforge";
import { QuizAnalytics } from "./QuizAnalytics";
import {
  Compass,
  BookOpen,
  MapPin,
  Scroll,
  Landmark,
  Trophy,
  Zap,
  RotateCcw,
  Play,
  Star,
  Activity,
  Award,
  Users,
  BarChart3,
  X,
} from "lucide-react";

export const CategoryIcon: React.FC<{ name: string; className?: string }> = ({ name, className = "w-6 h-6" }) => {
  switch (name) {
    case "Compass": return <Compass className={className} />;
    case "BookOpen": return <BookOpen className={className} />;
    case "MapPin": return <MapPin className={className} />;
    case "Scroll": return <Scroll className={className} />;
    case "Landmark": return <Landmark className={className} />;
    default: return <Compass className={className} />;
  }
};

interface DashboardProps {
  onSelectCategory: (category: QuizCategory) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectCategory }) => {
  const [stats, setStats] = useState<PlayerStats>({
    gamesPlayed: 0,
    totalScore: 0,
    maxStreak: 0,
    correctAnswersCount: 0,
    wrongAnswersCount: 0,
  });
  const [highScores, setHighScores] = useState<{ [key: string]: number }>({});
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedStats = localStorage.getItem("ph_trivia_player_stats");
    if (savedStats) {
      try { setStats(JSON.parse(savedStats)); } catch (e) { /* ignore */ }
    }
    const savedScores = localStorage.getItem("ph_trivia_high_scores");
    if (savedScores) {
      try { setHighScores(JSON.parse(savedScores)); } catch (e) { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAllAnalytics().then((map) => {
      if (active) { setAnalytics(map); setAnalyticsLoading(false); }
    });
    return () => { active = false; };
  }, []);

  const resetStats = () => {
    if (window.confirm("Reset all stats and high scores? This cannot be undone.")) {
      localStorage.removeItem("ph_trivia_player_stats");
      localStorage.removeItem("ph_trivia_high_scores");
      setStats({ gamesPlayed: 0, totalScore: 0, maxStreak: 0, correctAnswersCount: 0, wrongAnswersCount: 0 });
      setHighScores({});
    }
  };

  useEffect(() => {
    if (expandedId) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [expandedId]);

  const accuracyPercent = stats.correctAnswersCount + stats.wrongAnswersCount > 0
    ? Math.round((stats.correctAnswersCount / (stats.correctAnswersCount + stats.wrongAnswersCount)) * 100)
    : 0;

  const expandedCategory = categories.find((c) => c.id === expandedId) || null;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-8 md:py-12" id="trivia-dashboard">

      {/* Hero */}
      <div className="text-center mb-6 sm:mb-10 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="inline-flex items-center justify-center space-x-2 bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-full px-3 py-1 text-[10px] sm:text-xs text-amber-400 font-mono mb-3 shadow-lg">
          <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse text-rose-500" />
          <span>PILIPINAS HISTORICAL QUIZ SUITE</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold font-display tracking-tight leading-none text-white drop-shadow-sm mb-3">
          The{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-amber-300 to-rose-400">
            Philippine Trivia
          </span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm sm:max-w-xl mx-auto px-2">
          Explore colonial history, geography, provincial seats, and the life of Dr. Jose Rizal.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6 sm:mb-10">
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl relative overflow-hidden hover:border-slate-700 transition-colors">
          <div className="absolute bottom-0 right-0 p-2 opacity-10 hidden sm:block">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>
          <p className="text-[9px] sm:text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Total Score</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold font-mono text-amber-400">{stats.totalScore.toLocaleString()}</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 italic block mt-0.5">Accumulated pts</span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl relative overflow-hidden hover:border-slate-700 transition-colors">
          <div className="absolute bottom-0 right-0 p-2 opacity-10 hidden sm:block">
            <Zap className="w-12 h-12 text-yellow-400" />
          </div>
          <p className="text-[9px] sm:text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Best Streak</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-lg sm:text-2xl md:text-3xl font-bold font-mono text-yellow-400">{stats.maxStreak}</p>
            <span className="text-xs text-amber-500 font-bold">🔥</span>
          </div>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Correct in a row</span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl relative overflow-hidden hover:border-slate-700 transition-colors">
          <div className="absolute bottom-0 right-0 p-2 opacity-10 hidden sm:block">
            <Award className="w-12 h-12 text-blue-400" />
          </div>
          <p className="text-[9px] sm:text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Accuracy</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold font-mono text-emerald-400">{accuracyPercent}%</p>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${accuracyPercent}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl relative overflow-hidden hover:border-slate-700 transition-colors">
          <div className="absolute bottom-0 right-0 p-2 opacity-10 hidden sm:block">
            <Play className="w-12 h-12 text-rose-400" />
          </div>
          <p className="text-[9px] sm:text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Games</p>
          <p className="text-lg sm:text-2xl md:text-3xl font-bold font-mono text-rose-400">{stats.gamesPlayed}</p>
          <span className="text-[9px] sm:text-[10px] text-slate-400 block mt-0.5">Completed sessions</span>
        </div>
      </div>

      {/* Categories Heading */}
      <h2 className="text-base sm:text-xl md:text-2xl font-bold font-display text-slate-200 mb-4 sm:mb-6 flex items-center space-x-2">
        <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 fill-amber-400 shrink-0" />
        <span>Select a Quiz</span>
        <span className="text-xs font-mono text-slate-500 font-normal">({categories.length})</span>
      </h2>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 mb-6 sm:mb-8">
        {categories.map((category) => {
          const personalBest = highScores[category.id] || 0;
          const a = analytics[category.id];
          const plays = a?.plays || 0;
          const isExpanded = expandedId === category.id;

          return (
            <div
              key={category.id}
              className={`group bg-slate-900/40 backdrop-blur-md border rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-300 shadow-md flex flex-col justify-between ${
                isExpanded
                  ? "border-amber-500/40 bg-slate-900/85"
                  : "border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/70 active:scale-[0.99]"
              }`}
              id={`category-card-${category.id}`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 sm:p-3 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors duration-200">
                    <CategoryIcon name={category.iconName} className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-slate-800/80 text-[9px] sm:text-[10px] text-slate-400 font-mono px-2 py-0.5 sm:py-1 rounded-md tracking-wide uppercase border border-slate-700/35">
                      {category.questionCount} Qs
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider ${
                      category.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      category.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {category.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1.5 group-hover:text-amber-100 transition-colors duration-300 leading-snug">
                  {category.title}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-4 sm:mb-5 line-clamp-2 sm:line-clamp-none">
                  {category.description}
                </p>
              </div>

              <div className="border-t border-slate-800/60 pt-3">
                <div className="flex items-center justify-between text-[10px] font-mono mb-3 gap-1 flex-wrap">
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Users className="w-3 h-3 text-blue-400" />
                    <span>{plays.toLocaleString()} plays</span>
                  </span>
                  <span className="text-slate-400 hidden sm:inline">
                    {plays > 0 ? `Avg ${a!.avgScore.toFixed(1)}/${category.questionCount}` : category.estimatedTime}
                  </span>
                  {personalBest > 0 ? (
                    <span className="text-amber-500">PB {personalBest.toLocaleString()}</span>
                  ) : a?.topPercent != null ? (
                    <span className="text-rose-400">Top {a.topPercent}%</span>
                  ) : (
                    <span className="text-slate-600">New</span>
                  )}
                </div>

                <div className="flex items-stretch gap-2">
                  <button
                    onClick={() => onSelectCategory(category)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-semibold py-3 sm:py-3 px-4 rounded-xl transition-all duration-200 shadow-md text-sm"
                  >
                    <Play className="w-4 h-4 fill-white text-white shrink-0" />
                    <span>Play</span>
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : category.id)}
                    aria-expanded={isExpanded}
                    className={`flex items-center justify-center space-x-1 px-3.5 sm:px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                      isExpanded
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Panel */}
      {expandedCategory && (
        <div
          ref={panelRef}
          className="mb-8 sm:mb-12 bg-slate-900/70 backdrop-blur border border-amber-500/30 rounded-2xl p-4 sm:p-5 md:p-7 shadow-xl relative scroll-mt-20"
          id="quiz-analytics-panel"
        >
          <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-slate-800 shrink-0">
                <CategoryIcon name={expandedCategory.iconName} className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">{expandedCategory.title}</h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Community Analytics</span>
              </div>
            </div>
            <button
              onClick={() => setExpandedId(null)}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-all shrink-0 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <QuizAnalytics
            data={analytics[expandedCategory.id]}
            totalQuestions={expandedCategory.questionCount}
            loading={analyticsLoading}
          />
        </div>
      )}

      {/* Bottom Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-slate-800/80 pt-5 text-xs text-slate-500 gap-3">
        <p>Philippine Trivia · Stats reflect plays from across SkillForge.</p>
        {stats.gamesPlayed > 0 && (
          <button
            onClick={resetStats}
            className="flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-rose-950/20 hover:border-rose-900/50 hover:text-rose-400 transition-all duration-200 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stats</span>
          </button>
        )}
      </div>
    </div>
  );
};
