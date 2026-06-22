'use client'

import { useEffect, useState } from 'react'
import { getAllUsers } from '@/app/services/adminService'
import { getAllScores, getAllGameStats } from '@/app/services/gameDataService'
import { defaultGames } from '@/app/games/games'
import { UserProfile, ScoreData } from '@/app/types'

interface StudentDetail {
  scores: Record<string, ScoreData>
  stats: Record<string, Record<string, unknown>>
}

function formatDate(date: Date | undefined) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function gameName(id: string) {
  return defaultGames.find((g) => g.id === id)?.name || id
}

export default function TeacherStudentsTab() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedUid, setExpandedUid] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detail, setDetail] = useState<StudentDetail | null>(null)

  useEffect(() => {
    getAllUsers()
      .then((all) => setUsers(all.filter((u) => !u.role || u.role === 'user')))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleExpand = async (uid: string) => {
    if (expandedUid === uid) {
      setExpandedUid(null)
      setDetail(null)
      return
    }
    setExpandedUid(uid)
    setDetail(null)
    setDetailLoading(true)
    try {
      const [scores, stats] = await Promise.all([getAllScores(uid), getAllGameStats(uid)])
      setDetail({ scores, stats })
    } catch (err) {
      console.error('Failed to load student detail', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Students</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          {users.length} registered {users.length === 1 ? 'student' : 'students'} — click a row to view their scores
        </p>
      </div>

      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 pl-12 pr-4 py-3 text-slate-900 dark:text-gray-100 shadow-sm focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 transition-colors placeholder:text-slate-400 dark:placeholder:text-gray-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 rounded-xl glass animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-gray-500">
          <p className="text-base font-medium">{search ? 'No students match your search' : 'No students found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const initials = (user.username || user.email || '??').slice(0, 2).toUpperCase()
            const isExpanded = expandedUid === user.uid

            return (
              <div key={user.uid} className="glass overflow-hidden">
                {/* Student row */}
                <button
                  type="button"
                  onClick={() => handleExpand(user.uid)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {user.username || 'No username'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <svg
                    className={`h-5 w-5 text-slate-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-200/60 dark:border-gray-700/60 px-4 pb-4 pt-3">
                    {detailLoading ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-gray-500">
                        <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                        Loading scores…
                      </div>
                    ) : detail && Object.keys(detail.scores).length === 0 ? (
                      <p className="py-4 text-sm text-center text-slate-400 dark:text-gray-500">
                        This student has not played any games yet.
                      </p>
                    ) : detail ? (() => {
                      const entries = Object.entries(detail.scores)
                        .sort((a, b) => (b[1].updatedAt?.getTime() || 0) - (a[1].updatedAt?.getTime() || 0))
                        .map(([gameId, score]) => {
                          const stat = detail.stats[gameId] as Record<string, unknown> | undefined
                          return {
                            gameId,
                            name: gameName(gameId),
                            best: score.bestScore,
                            matches: Number(stat?.totalMatchCount) || 0,
                            avg: Number(stat?.combinedAverageScore) || 0,
                            last: formatDate(score.updatedAt),
                          }
                        })

                      return (
                        <>
                          {/* Mobile: stacked cards */}
                          <div className="space-y-2 sm:hidden">
                            {entries.map((e) => (
                              <div key={e.gameId} className="rounded-xl border border-slate-200/60 dark:border-gray-700/60 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-medium text-sm text-slate-800 dark:text-white truncate">{e.name}</p>
                                  <span className="shrink-0 text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                    {e.best.toLocaleString()}
                                  </span>
                                </div>
                                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                                  <div>
                                    <dt className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-gray-500">Matches</dt>
                                    <dd className="text-sm tabular-nums text-slate-700 dark:text-gray-300">{e.matches}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-gray-500">Avg</dt>
                                    <dd className="text-sm tabular-nums text-slate-700 dark:text-gray-300">{e.avg > 0 ? e.avg.toFixed(0) : '—'}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-gray-500">Last</dt>
                                    <dd className="text-xs text-slate-500 dark:text-gray-400">{e.last}</dd>
                                  </div>
                                </dl>
                              </div>
                            ))}
                          </div>

                          {/* Desktop: table */}
                          <div className="hidden sm:block overflow-x-auto -mx-4 px-4">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                                  <th className="text-left pb-2 pr-4">Game</th>
                                  <th className="text-right pb-2 px-4">Best Score</th>
                                  <th className="text-right pb-2 px-4">Matches</th>
                                  <th className="text-right pb-2 px-4">Avg Score</th>
                                  <th className="text-right pb-2 pl-4">Last Played</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                                {entries.map((e) => (
                                  <tr key={e.gameId} className="text-slate-700 dark:text-gray-300">
                                    <td className="py-2 pr-4 font-medium truncate max-w-[160px]">{e.name}</td>
                                    <td className="py-2 px-4 text-right tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                                      {e.best.toLocaleString()}
                                    </td>
                                    <td className="py-2 px-4 text-right tabular-nums">{e.matches}</td>
                                    <td className="py-2 px-4 text-right tabular-nums">{e.avg > 0 ? e.avg.toFixed(0) : '—'}</td>
                                    <td className="py-2 pl-4 text-right text-xs text-slate-400 dark:text-gray-500">
                                      {e.last}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )
                    })() : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
