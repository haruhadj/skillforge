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

// Helper component for category icons
export const CategoryIcon: React.FC<{ name: string; className?: string }> = ({ name, className = "w-6 h-6" }) => {
  switch (name) {
    case "Compass":
      return <Compass className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "MapPin":
      return <MapPin className={className} />;
    case "Scroll":
      return <Scroll className={className} />;
    case "Landmark":
      return <Landmark className={className} />;
    default:
      return <Compass className={className} />;
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

  // Community analytics (per quiz) pulled from the SkillForge backend.
  const [analytics, setAnalytics] = useState<Record<string, Analytics>>({});
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load local personal statistics and high scores.
    const savedStats = localStorage.getItem("ph_trivia_player_stats");
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Failed to parse player stats", e);
      }
    }

    const savedScores = localStorage.getItem("ph_trivia_high_scores");
    if (savedScores) {
      try {
        setHighScores(JSON.parse(savedScores));
      } catch (e) {
        console.error("Failed to parse high scores", e);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchAllAnalytics().then((map) => {
      if (active) {
        setAnalytics(map);
        setAnalyticsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const resetStats = () => {
    if (window.confirm("Are you sure you want to reset all your stats and high scores? This action cannot be undone.")) {
      localStorage.removeItem("ph_trivia_player_stats");
      localStorage.removeItem("ph_trivia_high_scores");
      setStats({
        gamesPlayed: 0,
        totalScore: 0,
        maxStreak: 0,
        correctAnswersCount: 0,
        wrongAnswersCount: 0,
      });
      setHighScores({});
    }
  };

  // Bring the stats panel into view when a quiz is opened (esp. on mobile).
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
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12" id="trivia-dashboard">
      {/* Decorative Traditional Philippine Sun Motif integrated subtly */}
      <div className="text-center mb-12 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center justify-center space-x-2 bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-amber-400 font-mono mb-4 shadow-lg">
          <Activity className="w-3.5 h-3.5 animate-pulse text-rose-500" />
          <span>PILIPINAS HISTORICAL QUIZ SUITE</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold font-display tracking-tight leading-none text-white drop-shadow-sm mb-4">
          The <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-amber-300 to-rose-400">Philippine Trivia</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          Embark on a dynamic journey through colonial history, geography, provincial seats, and the life of national hero Dr. Jose Rizal.
        </p>
      </div>

      {/* Personal Stats Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700">
          <div className="absolute bottom-0 right-0 p-3 opacity-10">
            <Trophy className="w-16 h-16 text-amber-400" />
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Total Score</p>
          <p className="text-2xl md:text-3xl font-bold font-mono text-amber-400">{stats.totalScore.toLocaleString()}</p>
          <span className="text-[10px] text-slate-400 italic block mt-1">Your accumulated points</span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700">
          <div className="absolute bottom-0 right-0 p-3 opacity-10">
            <Zap className="w-16 h-16 text-yellow-400" />
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Highest Streak</p>
          <div className="flex items-baseline space-x-1">
            <p className="text-2xl md:text-3xl font-bold font-mono text-yellow-400">{stats.maxStreak}</p>
            <span className="text-xs text-amber-500 font-bold font-mono">🔥</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Consecutive correct answers</span>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700">
          <div className="absolute bottom-0 right-0 p-3 opacity-10">
            <Award className="w-16 h-16 text-blue-400" />
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Accuracy</p>
          <p className="text-2xl md:text-3xl font-bold font-mono text-emerald-400">{accuracyPercent}%</p>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${accuracyPercent}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-700">
          <div className="absolute bottom-0 right-0 p-3 opacity-10">
            <Play className="w-16 h-16 text-rose-400" />
          </div>
          <p className="text-xs text-slate-500 font-mono tracking-wider uppercase mb-1">Games Played</p>
          <p className="text-2xl md:text-3xl font-bold font-mono text-rose-400">{stats.gamesPlayed}</p>
          <span className="text-[10px] text-slate-400 block mt-1">Completed quiz sessions</span>
        </div>
      </div>

      {/* Main Categories Section */}
      <h2 className="text-xl md:text-2xl font-bold font-display text-slate-200 mb-6 flex items-center space-x-2">
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
        <span>Select a Trivia Quiz</span>
        <span className="text-xs font-mono text-slate-500 font-normal">({categories.length} available)</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {categories.map((category) => {
          const personalBest = highScores[category.id] || 0;
          const a = analytics[category.id];
          const plays = a?.plays || 0;
          const isExpanded = expandedId === category.id;

          return (
            <div
              key={category.id}
              className={`group bg-slate-900/40 hover:bg-slate-900/85 backdrop-blur-md border rounded-2xl p-6 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col justify-between ${
                isExpanded ? "border-amber-500/40 bg-slate-900/85" : "border-slate-800/80 hover:border-slate-700/80 hover:-translate-y-1"
              }`}
              id={`category-card-${category.id}`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-xl bg-slate-800 group-hover:bg-slate-700 transition-colors duration-200">
                    <CategoryIcon name={category.iconName} className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-slate-800/80 text-[10px] text-slate-400 font-mono px-2.5 py-1 rounded-md tracking-wide uppercase border border-slate-700/35">
                      {category.questionCount} Qs
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                      category.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      category.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                      "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {category.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-bold text-white mb-2 group-hover:text-amber-100 transition-colors duration-300">
                  {category.title}
                </h3>

                <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-5">
                  {category.description}
                </p>
              </div>

              <div className="border-t border-slate-800/60 pt-4 mt-auto">
                {/* Community + personal stat strip */}
                <div className="flex items-center justify-between text-[11px] font-mono mb-4 gap-2">
                  <span className="flex items-center space-x-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{plays.toLocaleString()} plays</span>
                  </span>
                  <span className="text-slate-400">
                    {plays > 0 ? `Avg ${a!.avgScore.toFixed(1)}/${category.questionCount}` : `${category.estimatedTime}`}
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
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-md group-hover:shadow-lg active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white text-white" />
                    <span>Begin</span>
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : category.id)}
                    aria-expanded={isExpanded}
                    className={`flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl border transition-all duration-200 text-sm font-medium ${
                      isExpanded
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                        : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Stats</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed community analytics for the selected quiz */}
      {expandedCategory && (
        <div
          ref={panelRef}
          className="mb-12 bg-slate-900/70 backdrop-blur border border-amber-500/30 rounded-2xl p-5 md:p-7 shadow-xl relative scroll-mt-24"
          id="quiz-analytics-panel"
        >
          <div className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-slate-800 shrink-0">
                <CategoryIcon name={expandedCategory.iconName} className="w-5 h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-white truncate">{expandedCategory.title}</h3>
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Community Analytics</span>
              </div>
            </div>
            <button
              onClick={() => setExpandedId(null)}
              className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>

          <QuizAnalytics
            data={analytics[expandedCategory.id]}
            totalQuestions={expandedCategory.questionCount}
            loading={analyticsLoading}
          />
        </div>
      )}

      {/* Bottom Option Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-800/80 pt-6 text-xs text-slate-500">
        <p className="mb-4 sm:mb-0">
          Philippine Trivia Quiz · Stats reflect plays from across SkillForge.
        </p>

        {stats.gamesPlayed > 0 && (
          <button
            onClick={resetStats}
            className="flex items-center space-x-1.5 py-1 px-3.5 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-rose-950/20 hover:border-rose-900/50 hover:text-rose-400 transition-all duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset My Statistics</span>
          </button>
        )}
      </div>
    </div>
  );
};
