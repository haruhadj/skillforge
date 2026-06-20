import React, { useMemo } from "react";
import { BarChart3, Trophy, Users, Award, TrendingUp } from "lucide-react";
import { QuizAnalytics as Analytics } from "../services/skillforge";

interface QuizAnalyticsProps {
  data?: Analytics;
  totalQuestions: number;
  loading?: boolean;
}

interface Bar {
  label: string;
  count: number;
}

function fmtDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .replace(",", "");
}

// Raw-score bars when the quiz is short; compressed into 10 deciles otherwise.
function buildBars(dist: Record<string, number>, total: number): Bar[] {
  if (total <= 0) return [];
  if (total <= 12) {
    return Array.from({ length: total + 1 }, (_, i) => ({
      label: String(i),
      count: dist[String(i)] || 0,
    }));
  }
  const buckets = Array.from({ length: 10 }, () => 0);
  for (const [k, v] of Object.entries(dist)) {
    const idx = Math.min(9, Math.max(0, Math.floor((Number(k) / total) * 10)));
    buckets[idx] += v;
  }
  return buckets.map((count, i) => ({ label: `${i * 10}%`, count }));
}

export const QuizAnalytics: React.FC<QuizAnalyticsProps> = ({ data, totalQuestions, loading }) => {
  const bars = useMemo(
    () => buildBars(data?.dist || {}, totalQuestions),
    [data?.dist, totalQuestions],
  );
  const maxCount = Math.max(1, ...bars.map((b) => b.count));

  const plays = data?.plays || 0;
  const avg = data && data.plays > 0 ? data.avgScore : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-500 font-mono text-xs">
        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-amber-500 mr-3" />
        Loading community stats…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Score Distribution */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
            Score Distribution
          </span>
        </div>

        {plays > 0 ? (
          <div className="flex items-end justify-between gap-0.5 sm:gap-1 h-24 bg-slate-950/40 border border-slate-800/60 rounded-xl p-3">
            {bars.map((b, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full group"
                title={`${b.label}${totalQuestions <= 12 ? `/${totalQuestions}` : ""}: ${b.count} play${b.count === 1 ? "" : "s"}`}
              >
                <div
                  className="w-full rounded-t bg-gradient-to-t from-blue-600 to-amber-400 group-hover:from-blue-500 group-hover:to-amber-300 transition-all min-h-[2px]"
                  style={{ height: `${(b.count / maxCount) * 100}%` }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs font-mono">
            No plays yet — be the first to set the curve!
          </div>
        )}
        <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-1 px-1">
          <span>low</span>
          <span>score →</span>
          <span>high</span>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatTile
          icon={<Trophy className="w-3.5 h-3.5" />}
          label="Avg Score"
          value={plays > 0 ? `${avg.toFixed(1)} / ${totalQuestions}` : "—"}
          accent="text-amber-400"
        />
        <StatTile
          icon={<Users className="w-3.5 h-3.5" />}
          label="Plays"
          value={plays.toLocaleString()}
          accent="text-blue-400"
        />
        <StatTile
          icon={<Award className="w-3.5 h-3.5" />}
          label="Awards"
          value={(data?.awards || 0).toLocaleString()}
          accent="text-emerald-400"
        />
        <StatTile
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          label="Ranking"
          value={data?.topPercent != null ? `Top ${data.topPercent}%` : "—"}
          accent="text-rose-400"
        />
      </div>

      {/* Most Recent Scores */}
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-slate-300 block mb-2">
          Most Recent Scores
        </span>
        {data && data.recent.length > 0 ? (
          <ul className="divide-y divide-slate-800/60 bg-slate-950/30 border border-slate-800/60 rounded-xl overflow-hidden">
            {data.recent.map((r, i) => {
              const perfect = r.score >= r.total && r.total > 0;
              return (
                <li
                  key={i}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-900/40 transition-colors"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="text-slate-600 font-mono shrink-0 w-[68px]">{fmtDate(r.at)}</span>
                    <span className="text-slate-300 truncate">{r.name || "Player"}</span>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ml-2 ${
                      perfect ? "text-emerald-400" : "text-slate-200"
                    }`}
                  >
                    {r.score}/{r.total}
                    {perfect && <span className="ml-1">★</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-slate-600 text-xs font-mono italic px-1 py-2">
            No recent plays yet.
          </p>
        )}
      </div>
    </div>
  );
};

const StatTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}> = ({ icon, label, value, accent }) => (
  <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl px-3 py-2.5">
    <div className={`flex items-center space-x-1.5 mb-1 ${accent}`}>
      {icon}
      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    <span className={`text-sm sm:text-base font-bold font-mono ${accent}`}>{value}</span>
  </div>
);
