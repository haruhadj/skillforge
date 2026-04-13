import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/useAuth'
import { getGameLeaderboard, getGlobalLeaderboard } from '../services/gameDataService'
import { getUserProfile } from '../services/userProfileService'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'

const TOP_COUNT = 50

function Medal({ rank }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold">🥇</span>
  if (rank === 2) return <span className="text-slate-400 font-bold">🥈</span>
  if (rank === 3) return <span className="text-amber-600 font-bold">🥉</span>
  return <span className="text-slate-500 dark:text-gray-400 text-sm font-medium w-6 text-center">{rank}</span>
}

function Avatar({ url, name, sizeClass = 'h-9 w-9' }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  return url ? (
    <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

// Cache to avoid re-fetching the same profiles during the session
const profileCache = {}

async function fetchProfiles(uids) {
  const missing = uids.filter((uid) => !profileCache[uid])
  await Promise.all(
    missing.map((uid) =>
      getUserProfile(uid)
        .then((p) => { profileCache[uid] = p || { username: 'Unknown' } })
        .catch(() => { profileCache[uid] = { username: 'Unknown' } })
    )
  )
  return Object.fromEntries(uids.map((uid) => [uid, profileCache[uid]]))
}

export default function LeaderboardPage({ onBack }) {
  const { currentUser } = useAuth()
  const [viewMode, setViewMode] = useState('global')
  const [selectedGameId, setSelectedGameId] = useState(games[0]?.id || '')
  const [rows, setRows] = useState([])
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || null,
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
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedGameId, viewMode])

  const metricLabel = viewMode === 'global' ? 'Total Matches' : 'Best Score'

  return (
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-slate-200/50 dark:border-gray-700/50">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center gap-3 animate-fade-in">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hover:-translate-y-0.5"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </button>
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
                {games.map((game) => (
                  <option key={game.id} value={game.id}>{game.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl glass animate-pulse" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-5 py-4 text-red-700 dark:text-red-400 text-sm">
            Could not load leaderboard: {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-gray-500">
            <svg className="mx-auto h-12 w-12 mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.496m0 0L12 12m0 0V3.75" />
            </svg>
            <p className="text-base font-medium">No scores yet</p>
            <p className="text-sm mt-1">Be the first to play and claim the top spot!</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-2">
            {/* Column header */}
            <div className="flex items-center gap-3 px-4 text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wide mb-1">
              <span className="w-6 text-center">#</span>
              <span className="flex-1">Player</span>
              <span>{metricLabel}</span>
            </div>

            {rows.map((row, index) => {
              const rank = index + 1
              const profile = profiles[row.uid] || {}
              const isCurrentUser = currentUser?.uid === row.uid
              const metricValue = viewMode === 'global'
                ? row.totalMatchCount
                : row.bestScore
              const avatarUrl = profile.photoThumbURL
                || profile.photoURL
                || (isCurrentUser ? currentUser?.photoURL : null)

              return (
                <div
                  key={row.uid}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 border transition-colors ${
                    isCurrentUser
                      ? 'bg-indigo-50 dark:bg-indigo-900/25 border-indigo-200 dark:border-indigo-700'
                      : rank <= 3
                        ? 'bg-white dark:bg-gray-800/80 border-slate-200 dark:border-gray-700 shadow-sm'
                        : 'bg-white dark:bg-gray-800/60 border-slate-100 dark:border-gray-700/50'
                  }`}
                >
                  <div className="w-6 flex justify-center shrink-0">
                    <Medal rank={rank} />
                  </div>

                  <Avatar
                    url={avatarUrl}
                    name={profile.username}
                    sizeClass="h-9 w-9"
                  />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>
                      {profile.username || 'Unknown'}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs font-normal text-indigo-500 dark:text-indigo-400">(you)</span>
                      )}
                    </p>
                  </div>

                  <span className={`text-sm font-bold tabular-nums shrink-0 ${isCurrentUser ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-gray-200'}`}>
                    {typeof metricValue === 'number' ? metricValue.toLocaleString() : '—'}
                  </span>
                </div>
              )
            })}

            <p className="text-center text-xs text-slate-400 dark:text-gray-600 pt-2">
              Showing top {rows.length} player{rows.length !== 1 ? 's' : ''}
            </p>
            <p className="text-center text-xs text-slate-400 dark:text-gray-600">
              {viewMode === 'global' ? 'Ranked by total matches played' : `Ranked by best score in ${activeGame?.name || 'selected game'}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
