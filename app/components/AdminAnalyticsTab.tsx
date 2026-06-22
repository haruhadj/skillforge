'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getLearningGapReport,
  LearningGapReport,
  GameLearningAnalytics,
  DeviceStats,
  SUBJECT_COLORS,
} from '@/app/services/analyticsService'

type SortKey = 'gapScore' | 'engagementRate' | 'normalizedAvgScore' | 'playCount'

const GAP_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const GAP_BAR: Record<string, string> = {
  critical: 'bg-red-500',
  moderate: 'bg-amber-400',
  low: 'bg-emerald-500',
}

const RISK_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
}

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="glass p-5 flex items-start gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function PerformanceBar({ score, gapLevel }: { score: number; gapLevel: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${GAP_BAR[gapLevel] ?? 'bg-slate-400'}`}
          style={{ width: `${Math.max(score, 2)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-10 text-right text-slate-600 dark:text-gray-400">
        {score.toFixed(1)}%
      </span>
    </div>
  )
}

function GameRow({ g, rank }: { g: GameLearningAnalytics; rank: number }) {
  const subjectColor = SUBJECT_COLORS[g.subject] || 'slate'
  return (
    <tr className="border-t border-slate-100 dark:border-gray-700/50 hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-colors">
      <td className="py-3 pl-4 pr-2 text-xs text-slate-400 dark:text-gray-500 tabular-nums w-8">{rank}</td>
      <td className="py-3 pr-3">
        <div className="font-medium text-sm text-slate-800 dark:text-white">{g.gameName}</div>
        <div className={`mt-0.5 text-[10px] font-medium text-${subjectColor}-600 dark:text-${subjectColor}-400`}>
          {g.subject}
        </div>
      </td>
      <td className="py-3 pr-3 text-sm text-slate-600 dark:text-gray-300 tabular-nums text-center">
        {g.playCount}
      </td>
      <td className="py-3 pr-4 hidden sm:table-cell">
        <PerformanceBar score={g.normalizedAvgScore} gapLevel={g.gapLevel} />
      </td>
      <td className="py-3 pr-4">
        <GapBadge gapLevel={g.gapLevel} />
      </td>
    </tr>
  )
}

function GapBadge({ gapLevel }: { gapLevel: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${GAP_BADGE[gapLevel]}`}>
      {gapLevel === 'critical' && (
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )}
      {gapLevel}
    </span>
  )
}

function GameCard({ g, rank }: { g: GameLearningAnalytics; rank: number }) {
  const subjectColor = SUBJECT_COLORS[g.subject] || 'slate'
  return (
    <div className="rounded-xl border border-slate-100 dark:border-gray-700/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-gray-500 tabular-nums shrink-0">#{rank}</span>
            <span className="font-medium text-sm text-slate-800 dark:text-white truncate">{g.gameName}</span>
          </div>
          <div className={`mt-0.5 text-[10px] font-medium text-${subjectColor}-600 dark:text-${subjectColor}-400`}>
            {g.subject}
          </div>
        </div>
        <div className="shrink-0">
          <GapBadge gapLevel={g.gapLevel} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="text-xs text-slate-500 dark:text-gray-400 shrink-0 tabular-nums">
          {g.playCount} player{g.playCount !== 1 ? 's' : ''}
        </span>
        <PerformanceBar score={g.normalizedAvgScore} gapLevel={g.gapLevel} />
      </div>
    </div>
  )
}

function generateInsights(report: LearningGapReport): string[] {
  const insights: string[] = []
  const critical = report.gameAnalytics.filter((g) => g.gapLevel === 'critical')
  const worstSubject = report.subjectAnalytics[0]
  const bestSubject = [...report.subjectAnalytics].sort((a, b) => b.avgNormalizedScore - a.avgNormalizedScore)[0]

  if (critical.length > 0) {
    insights.push(`${critical.length} game${critical.length > 1 ? 's' : ''} show critical learning gaps — students score below 35% on average in ${critical.slice(0, 2).map((g) => g.gameName).join(' and ')}.`)
  }
  if (worstSubject) {
    insights.push(`"${worstSubject.subject}" is the most challenging subject area with an average performance of ${worstSubject.avgNormalizedScore.toFixed(1)}%. Consider increasing instructional support in this area.`)
  }
  if (bestSubject && bestSubject.subject !== worstSubject?.subject) {
    insights.push(`Students perform best in "${bestSubject.subject}" (avg ${bestSubject.avgNormalizedScore.toFixed(1)}%), suggesting strong foundational knowledge in this domain.`)
  }
  if (report.atRiskStudents.length > 0) {
    const highRisk = report.atRiskStudents.filter((s) => s.riskLevel === 'high')
    if (highRisk.length > 0) {
      insights.push(`${highRisk.length} student${highRisk.length > 1 ? 's are' : ' is'} at high risk with below 30% average performance — immediate intervention is recommended.`)
    }
  }
  const lowEngagementCritical = report.gameAnalytics.filter(
    (g) => g.gapLevel === 'critical' && g.engagementLevel === 'high'
  )
  if (lowEngagementCritical.length > 0) {
    insights.push(`${lowEngagementCritical.map((g) => g.gameName).join(', ')} ${lowEngagementCritical.length > 1 ? 'are' : 'is'} widely played but show poor performance — these games may need difficulty calibration or targeted review.`)
  }
  return insights.slice(0, 4)
}

const DEVICE_COLORS: Record<string, string> = {
  mobile: 'bg-indigo-500',
  tablet: 'bg-violet-500',
  desktop: 'bg-cyan-500',
}

const DEVICE_TEXT: Record<string, string> = {
  mobile: 'text-indigo-600 dark:text-indigo-400',
  tablet: 'text-violet-600 dark:text-violet-400',
  desktop: 'text-cyan-600 dark:text-cyan-400',
}

function DeviceUsageCard({ stats }: { stats: DeviceStats }) {
  if (stats.total === 0) {
    return (
      <div className="glass p-5">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm10 0a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          Device Usage
        </h3>
        <p className="text-sm text-slate-500 dark:text-gray-400">No device data yet — will populate as users sign in.</p>
      </div>
    )
  }

  const deviceOrder = ['mobile', 'tablet', 'desktop']
  const sortedDevices = deviceOrder
    .filter((d) => stats.deviceTypes[d] !== undefined)
    .concat(Object.keys(stats.deviceTypes).filter((d) => !deviceOrder.includes(d)))

  const topOses = Object.entries(stats.oses).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topBrowsers = Object.entries(stats.browsers).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return (
    <div className="glass p-5 space-y-5">
      <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
        <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm10 0a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
        Device Usage
        <span className="ml-auto text-xs font-normal text-slate-400 dark:text-gray-500">{stats.total} users tracked</span>
      </h3>

      {/* Device type segmented bar */}
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">Device Type</p>
        <div className="flex h-3 w-full rounded-full overflow-hidden gap-0.5">
          {sortedDevices.map((d) => {
            const pct = (stats.deviceTypes[d] / stats.total) * 100
            return (
              <div
                key={d}
                className={`${DEVICE_COLORS[d] ?? 'bg-slate-400'} transition-all duration-700`}
                style={{ width: `${pct}%` }}
                title={`${d}: ${stats.deviceTypes[d]} (${pct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {sortedDevices.map((d) => {
            const pct = ((stats.deviceTypes[d] / stats.total) * 100).toFixed(1)
            return (
              <div key={d} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${DEVICE_COLORS[d] ?? 'bg-slate-400'}`} />
                <span className={`text-xs font-medium capitalize ${DEVICE_TEXT[d] ?? 'text-slate-600 dark:text-gray-300'}`}>
                  {d}
                </span>
                <span className="text-xs text-slate-400 dark:text-gray-500 tabular-nums">
                  {pct}% ({stats.deviceTypes[d]})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* OS + Browser side by side */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">Operating System</p>
          <div className="space-y-2">
            {topOses.map(([os, count]) => {
              const pct = (count / stats.total) * 100
              return (
                <div key={os}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-slate-700 dark:text-gray-200 truncate max-w-[120px]">{os}</span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-indigo-400 dark:bg-indigo-500 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">Browser</p>
          <div className="space-y-2">
            {topBrowsers.map(([browser, count]) => {
              const pct = (count / stats.total) * 100
              return (
                <div key={browser}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-slate-700 dark:text-gray-200 truncate max-w-[120px]">{browser}</span>
                    <span className="text-xs tabular-nums text-slate-500 dark:text-gray-400 ml-2">{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-1.5 bg-violet-400 dark:bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAnalyticsTab() {
  const [report, setReport] = useState<LearningGapReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('gapScore')
  const [sortAsc, setSortAsc] = useState(false)

  const loadReport = useCallback(() => {
    setLoading(true)
    setError(null)
    getLearningGapReport()
      .then(setReport)
      .catch((err) => setError(err?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const sortedGames = report
    ? [...report.gameAnalytics].sort((a, b) => {
        const diff = a[sortKey] - b[sortKey]
        return sortAsc ? diff : -diff
      })
    : []

  const criticalCount = report?.gameAnalytics.filter((g) => g.gapLevel === 'critical').length ?? 0
  const worstSubject = report?.subjectAnalytics[0]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-56 rounded-lg bg-slate-200 dark:bg-gray-700 animate-pulse" />
            <div className="mt-1 h-4 w-72 rounded bg-slate-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 glass animate-pulse rounded-2xl" />
          ))}
        </div>
        <div className="h-96 glass animate-pulse rounded-2xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass p-8 text-center space-y-3">
        <p className="text-red-500 font-medium">Failed to load analytics</p>
        <p className="text-sm text-slate-500 dark:text-gray-400">{error}</p>
        <button
          onClick={loadReport}
          className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!report || report.gameAnalytics.length === 0) {
    return (
      <div className="glass p-8 text-center space-y-2">
        <p className="text-slate-600 dark:text-gray-300 font-medium">No game activity data yet</p>
        <p className="text-sm text-slate-500 dark:text-gray-400">Analytics will appear once students start playing games.</p>
      </div>
    )
  }

  const insights = generateInsights(report)

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
        sortKey === k
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
      }`}
    >
      {label}
      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d={sortAsc && sortKey === k ? 'M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z' : 'M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'} clipRule="evenodd" />
      </svg>
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Learning Gap Analytics
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Identifies which games reveal the most student learning gaps — updated{' '}
            {report.generatedAt.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadReport}
          className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Games Analyzed"
          value={report.gameAnalytics.length}
          sub={`across ${report.totalStudents} students`}
          color="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
          icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M6.75 2.5A3.25 3.25 0 003.5 5.75v8.5a3.25 3.25 0 003.25 3.25h6.5a3.25 3.25 0 003.25-3.25v-8.5A3.25 3.25 0 0013.25 2.5h-6.5zM8 7a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0zm-5 5a1 1 0 11-2 0 1 1 0 012 0zm5 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
        />
        <KpiCard
          label="Critical Gaps"
          value={criticalCount}
          sub={`${report.gameAnalytics.filter((g) => g.gapLevel === 'moderate').length} moderate gaps`}
          color="bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
          icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>}
        />
        <KpiCard
          label="Platform Avg Score"
          value={`${report.platformAvgScore}%`}
          sub="normalized across all games"
          color="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400"
          icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" /></svg>}
        />
        <KpiCard
          label="Needs Most Support"
          value={worstSubject?.subject ?? '—'}
          sub={worstSubject ? `avg ${worstSubject.avgNormalizedScore}%` : undefined}
          color="bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
          icon={<svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.33.615z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.845v-.052a.75.75 0 00-1.5 0v.055c-.592.126-1.141.368-1.588.71-.566.435-.912 1.044-.912 1.745 0 .655.262 1.482 1.037 2.026.215.148.44.268.663.373v2.595c-.43-.101-.77-.333-.969-.568a.75.75 0 00-1.162.945c.388.478 1.059.95 1.908 1.084V15a.75.75 0 001.5 0v-.049c.676-.086 1.31-.361 1.78-.767a2.895 2.895 0 00.94-2.184c0-.7-.293-1.39-.863-1.892a4.677 4.677 0 00-1.6-.81v-2.469c.134.042.26.092.377.152.23.117.38.269.47.425a.75.75 0 001.29-.764c-.317-.536-.82-.924-1.387-1.167z" clipRule="evenodd" /></svg>}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Learning Gap Matrix */}
        <div className="glass lg:col-span-2 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-700/50">
            <h3 className="font-semibold text-slate-900 dark:text-white">Learning Gap Matrix</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">Ranked by gap severity — click columns to sort</p>
          </div>
          {/* Mobile: sort control + stacked cards */}
          <div className="sm:hidden">
            <div className="flex items-center justify-end gap-4 px-4 py-2 border-b border-slate-100 dark:border-gray-700/50">
              <SortBtn k="playCount" label="Players" />
              <SortBtn k="normalizedAvgScore" label="Avg" />
              <SortBtn k="gapScore" label="Gap" />
            </div>
            <div className="space-y-2 p-3">
              {sortedGames.map((g, i) => (
                <GameCard key={g.gameId} g={g} rank={i + 1} />
              ))}
            </div>
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-gray-800/50">
                  <th className="py-2.5 pl-4 pr-2 text-[10px] text-slate-400 dark:text-gray-500 w-8">#</th>
                  <th className="py-2.5 pr-3 text-[10px] text-slate-400 dark:text-gray-500">Game / Subject</th>
                  <th className="py-2.5 pr-3 text-center">
                    <SortBtn k="playCount" label="Players" />
                  </th>
                  <th className="py-2.5 pr-4 hidden sm:table-cell">
                    <SortBtn k="normalizedAvgScore" label="Avg Score" />
                  </th>
                  <th className="py-2.5 pr-4">
                    <SortBtn k="gapScore" label="Gap" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedGames.map((g, i) => (
                  <GameRow key={g.gameId} g={g} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subject Performance */}
        <div className="glass flex flex-col">
          <div className="px-4 py-4 border-b border-slate-100 dark:border-gray-700/50">
            <h3 className="font-semibold text-slate-900 dark:text-white">Subject Performance</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">Average normalized score per subject</p>
          </div>
          <div className="flex-1 px-4 py-4 space-y-4">
            {report.subjectAnalytics.map((s) => {
              const color = SUBJECT_COLORS[s.subject] || 'slate'
              const gapLevel = s.avgNormalizedScore < 35 ? 'critical' : s.avgNormalizedScore < 65 ? 'moderate' : 'low'
              return (
                <div key={s.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold text-${color}-600 dark:text-${color}-400`}>
                      {s.subject}
                    </span>
                    <div className="flex items-center gap-2">
                      {s.criticalGameCount > 0 && (
                        <span className="text-[10px] font-medium text-red-500 dark:text-red-400">
                          {s.criticalGameCount} critical
                        </span>
                      )}
                      <span className="text-xs tabular-nums text-slate-600 dark:text-gray-300 font-medium">
                        {s.avgNormalizedScore.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${GAP_BAR[gapLevel]}`}
                      style={{ width: `${Math.max(s.avgNormalizedScore, 2)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500">
                    {s.totalPlays} play{s.totalPlays !== 1 ? 's' : ''} across {s.games.length} game{s.games.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Device Usage */}
      <DeviceUsageCard stats={report.deviceStats} />

      {/* Insights + At-Risk */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Auto-generated Insights */}
        <div className="glass p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 1a6 6 0 00-3.815 10.631C7.237 12.5 8 13.443 8 14.456v.644a.75.75 0 00.572.729 6.016 6.016 0 002.856 0A.75.75 0 0012 15.1v-.644c0-1.013.762-1.957 3.815-2.825A6 6 0 0010 1zM8.863 17.414a.75.75 0 00-.226 1.483 9.066 9.066 0 002.726 0 .75.75 0 00-.226-1.483 7.553 7.553 0 01-2.274 0z" />
            </svg>
            Key Insights
          </h3>
          <ul className="mt-3 space-y-2.5">
            {insights.map((insight, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-gray-300">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                  {i + 1}
                </span>
                {insight}
              </li>
            ))}
          </ul>
        </div>

        {/* At-Risk Students */}
        <div className="glass p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
            Students Needing Attention
          </h3>
          {report.atRiskStudents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-gray-400">No at-risk students identified.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {report.atRiskStudents.map((s) => (
                <li key={s.uid} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{s.username}</p>
                    <p className="text-[10px] text-slate-400 dark:text-gray-500">
                      {s.gamesPlayed} game{s.gamesPlayed !== 1 ? 's' : ''} · avg {s.avgNormalizedScore}%
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RISK_BADGE[s.riskLevel]}`}>
                    {s.riskLevel} risk
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
