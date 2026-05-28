'use client'

import { useEffect, useMemo, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
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
  return (
    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 text-sm font-semibold">
      {rank}
    </span>
  )
}

function TierBadge({ tier }: { tier: GlobalLeaderboardEntry['tier'] }) {
  const tierConfig = {
    bronze: { bg: 'bg-amber-700', text: 'text-white', label: 'Bronze' },
    silver: { bg: 'bg-slate-400', text: 'text-white', label: 'Silver' },
    gold: { bg: 'bg-yellow-500', text: 'text-white', label: 'Gold' },
    platinum: { bg: 'bg-cyan-500', text: 'text-white', label: 'Platinum' },
    master: { bg: 'bg-purple-600', text: 'text-white', label: 'Master' },
  }
  const config = tierConfig[tier]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

function Avatar({ url, name, size = 'md' }: { url?: string; name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || '?').slice(0, 2).toUpperCase()
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-xs',
    lg: 'h-16 w-16 text-lg'
  }
  return url ? (
    <img src={url} alt={name} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white/20 dark:ring-gray-700/30`} />
  ) : (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 flex items-center justify-center text-white font-semibold shrink-0 ring-2 ring-white/20 dark:ring-gray-700/30`}>
      {initials}
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-gray-700 animate-shimmer" />
      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-gray-700 animate-shimmer" />
      <div className="flex-1 min-w-0">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-gray-700 animate-shimmer mb-2" />
        <div className="h-3 w-24 rounded bg-slate-200 dark:bg-gray-700 animate-shimmer" />
      </div>
      <div className="h-5 w-16 rounded bg-slate-200 dark:bg-gray-700 animate-shimmer" />
    </div>
  )
}

function Podium({ top3, profiles, viewMode, currentUser }: {
  top3: (LeaderboardEntry | GlobalLeaderboardEntry)[]
  profiles: Record<string, UserProfile>
  viewMode: 'global' | 'game'
  currentUser: FirebaseUser | null
}) {
  const podiumOrder = [1, 0, 2] // 2nd, 1st, 3rd for visual layout
  const heights = ['h-32', 'h-40', 'h-28']
  const medals = ['🥈', '🥇', '🥉']
  const bgGradients = [
    'from-slate-200/50 to-slate-300/50 dark:from-gray-700/50 dark:to-gray-600/50',
    'from-yellow-200/50 to-amber-300/50 dark:from-yellow-500/30 dark:to-amber-500/30',
    'from-orange-200/50 to-orange-300/50 dark:from-orange-600/30 dark:to-orange-500/30'
  ]
  const borderColors = [
    'border-slate-300 dark:border-gray-600',
    'border-yellow-400 dark:border-yellow-500',
    'border-orange-400 dark:border-orange-500'
  ]

  return (
    <div className="glass p-6 mb-6 animate-scale-in">
      <h3 className="text-center font-semibold text-slate-900 dark:text-white mb-6">Top Players</h3>
      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((idx, i) => {
          const row = top3[idx]
          const profile = profiles[row.uid]
          const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
          const isCurrentUser = row.uid === currentUser?.uid

          // Show composite score for global, best score for game mode
          const mainValue = viewMode === 'global'
            ? (row as GlobalLeaderboardEntry).compositeScore ?? 0
            : (row as LeaderboardEntry).bestScore ?? 0
          const subValue = viewMode === 'global'
            ? `${(row as GlobalLeaderboardEntry).gamesPlayed ?? 0} games`
            : null
          const tier = viewMode === 'global'
            ? (row as GlobalLeaderboardEntry).tier
            : null

          return (
            <div
              key={row.uid}
              className={`flex flex-col items-center gap-3 ${isCurrentUser ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent rounded-xl' : ''}`}
            >
              <div className="flex flex-col items-center">
                <span className="text-3xl mb-1 animate-bounce-subtle">{medals[i]}</span>
                <Avatar url={profile?.photoThumbURL} name={name} size="lg" />
                <p className="mt-2 font-semibold text-slate-900 dark:text-white text-sm text-center max-w-[120px] truncate">
                  {name}
                  {isCurrentUser && <span className="block text-xs text-indigo-600 dark:text-indigo-400">(You)</span>}
                </p>
                {tier && (
                  <div className="mt-1">
                    <TierBadge tier={tier} />
                  </div>
                )}
              </div>
              <div className={`w-24 rounded-t-lg ${heights[i]} ${bgGradients[i]} ${borderColors[i]} border-2 flex flex-col items-center justify-end pb-2`}>
                <span className="font-bold text-slate-700 dark:text-white text-sm">{mainValue.toLocaleString()}</span>
                {subValue && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{subValue}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
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
  const [mobileGameSelectorOpen, setMobileGameSelectorOpen] = useState(false)

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

  const metricLabel = viewMode === 'global' ? 'Skill Score' : 'Best Score'

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
        </div>
      </div>

      {/* Leaderboard list */}
      <main className="mx-auto max-w-6xl px-6 py-6 pb-12">
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

        <div className="flex gap-6">
          {/* Game Sidebar */}
          {viewMode === 'game' && (
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="glass sticky top-28 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-gray-700">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Select Game</h3>
                </div>
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {defaultGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setSelectedGameId(game.id)}
                      className={`w-full text-left px-4 py-3 text-sm font-medium transition-all ${
                        selectedGameId === game.id
                          ? 'bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-l-4 border-indigo-500'
                          : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800/50 border-l-4 border-transparent'
                      }`}
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Mobile Game Selector */}
            {viewMode === 'game' && (
              <div className="lg:hidden mb-4">
                <button
                  type="button"
                  onClick={() => setMobileGameSelectorOpen(true)}
                  className="w-full rounded-lg border border-slate-200 dark:border-gray-600 glass px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-between"
                >
                  <span>{activeGame?.name || 'Select a game'}</span>
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}

            {loading ? (
              <div className="glass overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-gray-700">
                  <div className="h-6 w-32 rounded bg-slate-200 dark:bg-gray-700 animate-shimmer" />
                </div>
                <div className="divide-y divide-slate-200 dark:divide-gray-700">
                  {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
                </div>
              </div>
            ) : (
              <>
                {rows.length >= 3 && (
                  <Podium
                    top3={rows.slice(0, 3)}
                    profiles={profiles}
                    viewMode={viewMode}
                    currentUser={currentUser}
                  />
                )}

                <div className="glass overflow-hidden animate-fade-in">
                  <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900 dark:text-white">
                      {viewMode === 'global' ? 'Global Rankings' : activeGame?.name}
                    </h2>
                    <div className="flex items-center gap-4 text-sm">
                      {viewMode === 'global' && (
                        <span className="text-slate-400 dark:text-gray-500">Tier • Games • Matches</span>
                      )}
                      <span className="text-slate-500 dark:text-gray-400 font-medium">{metricLabel}</span>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-gray-700">
                    {rows.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="text-5xl mb-4">🏆</div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No scores yet</h3>
                        <p className="text-slate-500 dark:text-gray-400">Be the first to play and claim the top spot!</p>
                      </div>
                    ) : (
                      rows.map((row, index) => {
                        const rank = index + 1
                        const profile = profiles[row.uid]
                        const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
                        const isCurrentUser = row.uid === currentUser?.uid
                        const isTop3 = rank <= 3

                        // Global mode: composite score, game mode: best score
                        const mainValue = viewMode === 'global'
                          ? (row as GlobalLeaderboardEntry).compositeScore ?? 0
                          : (row as LeaderboardEntry).bestScore ?? 0
                        const maxValue = rows[0] ? (viewMode === 'global'
                          ? (rows[0] as GlobalLeaderboardEntry).compositeScore ?? 0
                          : (rows[0] as LeaderboardEntry).bestScore ?? 0
                        ) : 1
                        const percentage = maxValue > 0 ? (mainValue / maxValue) * 100 : 0

                        // Global stats
                        const tier = viewMode === 'global' ? (row as GlobalLeaderboardEntry).tier : null
                        const gamesPlayed = viewMode === 'global' ? (row as GlobalLeaderboardEntry).gamesPlayed ?? 0 : null
                        const totalMatches = viewMode === 'global' ? (row as GlobalLeaderboardEntry).totalMatchCount ?? 0 : null

                        return (
                          <div
                            key={row.uid}
                            className={`group relative flex items-center gap-4 p-4 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-gray-800/50 ${
                              isCurrentUser ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : index % 2 === 0 ? 'bg-white/30 dark:bg-gray-800/30' : ''
                            } animate-slide-up`}
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            {isCurrentUser && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-r" />
                            )}
                            <Medal rank={rank} />
                            <Link
                              href={isCurrentUser ? '/profile' : `/profile/${row.uid}`}
                              className="shrink-0"
                            >
                              <Avatar url={profile?.photoThumbURL} name={name} />
                            </Link>
                            <div className="flex-1 min-w-0 relative">
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-r transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                              <div className="relative flex items-center gap-2">
                                <Link
                                  href={isCurrentUser ? '/profile' : `/profile/${row.uid}`}
                                  className="font-medium text-slate-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                  {name}
                                </Link>
                                {isCurrentUser && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                    You
                                  </span>
                                )}
                              </div>
                              {viewMode === 'global' && tier && (
                                <div className="relative flex items-center gap-2 mt-1">
                                  <TierBadge tier={tier} />
                                  <span className="text-xs text-slate-500 dark:text-gray-400">
                                    {gamesPlayed} games • {totalMatches?.toLocaleString()} matches
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className={`font-semibold ${isTop3 ? 'text-lg' : ''} ${
                              rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                              rank === 2 ? 'text-slate-500 dark:text-slate-300' :
                              rank === 3 ? 'text-amber-600 dark:text-amber-400' :
                              'text-slate-900 dark:text-white'
                            }`}>
                              {mainValue.toLocaleString()}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Game Selector Modal */}
      {mobileGameSelectorOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileGameSelectorOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl animate-slide-up max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white">Select Game</h3>
              <button
                type="button"
                onClick={() => setMobileGameSelectorOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="h-5 w-5 text-slate-500 dark:text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              {defaultGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setSelectedGameId(game.id)
                    setMobileGameSelectorOpen(false)
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    selectedGameId === game.id
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {game.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
