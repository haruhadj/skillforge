'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { getGameLeaderboard, getGlobalLeaderboard } from '@/app/services/gameDataService'
import { getUserProfile } from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import ThemeToggle from '@/app/components/ThemeToggle'
import { LeaderboardEntry, GlobalLeaderboardEntry, UserProfile } from '@/app/types'

const TOP_COUNT = 50

// Cache to avoid re-fetching the same profiles during the session
const profileCache: Record<string, UserProfile> = {}

async function fetchProfiles(uids: string[]): Promise<Record<string, UserProfile>> {
  const missing = uids.filter((uid) => !profileCache[uid])
  await Promise.all(
    missing.map((uid) =>
      getUserProfile(uid)
        .then((p) => { profileCache[uid] = p || { uid, username: 'Unknown', email: null } })
        .catch(() => { profileCache[uid] = { uid, username: 'Unknown', email: null } })
    )
  )
  return Object.fromEntries(uids.map((uid) => [uid, profileCache[uid]]))
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>
  if (rank === 2) return <span className="text-slate-400 font-bold text-lg">🥈</span>
  if (rank === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>
  return <span className="text-slate-500 dark:text-gray-400 text-sm font-medium w-6 text-center">{rank}</span>
}

function Avatar({ url, name }: { url?: string; name?: string }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return url ? (
    <img src={url} alt={name} className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="h-9 w-9 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
      {initials}
    </div>
  )
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [viewMode, setViewMode] = useState<'global' | 'game'>('global')
  const [selectedGameId, setSelectedGameId] = useState(defaultGames[0]?.id || '')
  const [rows, setRows] = useState<(LeaderboardEntry | GlobalLeaderboardEntry)[]>([])
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Protect route
  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      router.push('/')
    }
  }, [currentUser, router])

  const activeGame = useMemo(
    () => defaultGames.find((game) => game.id === selectedGameId) || null,
    [selectedGameId],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRows([])
    setProfiles({})

    const fetch = viewMode === 'global'
      ? getGlobalLeaderboard()
      : getGameLeaderboard(selectedGameId)

    fetch
      .then(async (data) => {
        if (cancelled) return
        const top = data.slice(0, TOP_COUNT)
        setRows(top)
        const uids = top.map((r) => r.uid)
        const profileMap = await fetchProfiles(uids)
        if (!cancelled) setProfiles(profileMap)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedGameId, viewMode])

  const metricLabel = viewMode === 'global' ? 'Total Matches' : 'Best Score'

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3">
          <Link
            href="/library"
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex-1 text-center tracking-tight">Leaderboard</h1>
          <ThemeToggle />
        </div>

        {/* Filter bar */}
        <div className="mx-auto max-w-4xl px-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-gray-600 glass p-1">
              <button
                type="button"
                onClick={() => setViewMode('global')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  viewMode === 'global'
                    ? 'bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                All Games
              </button>
              <button
                type="button"
                onClick={() => setViewMode('game')}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  viewMode === 'game'
                    ? 'bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/30 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                By Game
              </button>
            </div>

            <div className="sm:min-w-64">
              <label className="sr-only" htmlFor="leaderboard-game-filter">Choose game</label>
              <select
                id="leaderboard-game-filter"
                value={selectedGameId}
                onChange={(event) => {
                  setSelectedGameId(event.target.value)
                  setViewMode('game')
                }}
                disabled={viewMode !== 'game'}
                className="w-full rounded-lg border border-slate-200 dark:border-gray-600 glass px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-200 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {defaultGames.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard list */}
      <main className="mx-auto max-w-4xl px-6 py-6 pb-12">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-300 text-center">
            <p className="font-medium">{error.includes('permission') ? 'Missing or insufficient permissions.' : error}</p>
            {error.includes('permission') && (
              <p className="mt-2 text-sm opacity-80">
                Firestore security rules need to be updated. Run: <code className="bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded">firebase deploy --only firestore:rules</code>
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="glass p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-gray-400">Loading leaderboard...</p>
          </div>
        ) : (
          <div className="glass overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {viewMode === 'global' ? 'Global Rankings' : activeGame?.name}
              </h2>
              <span className="text-sm text-slate-500 dark:text-gray-400">{metricLabel}</span>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-gray-700">
              {rows.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-gray-400">
                  No scores yet. Be the first to play!
                </div>
              ) : (
                rows.map((row, index) => {
                  const rank = index + 1
                  const profile = profiles[row.uid]
                  const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
                  const value = viewMode === 'global'
                    ? (row as GlobalLeaderboardEntry).totalMatchCount ?? 0
                    : (row as LeaderboardEntry).bestScore ?? 0

                  return (
                    <div
                      key={row.uid}
                      className={`flex items-center gap-4 p-4 ${row.uid === currentUser?.uid ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                    >
                      <Medal rank={rank} />
                      <Avatar url={profile?.photoThumbURL} name={name} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {name}
                          {row.uid === currentUser?.uid && (
                            <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(You)</span>
                          )}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {value.toLocaleString()}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
