'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import MobileNav from '@/app/components/MobileNav'
import TopNav from '@/app/components/TopNav'
import GameCard from '@/app/components/GameCard'
import RankBadge from '@/app/components/RankBadge'
import { getRecentlyPlayed, saveRecentlyPlayed } from '@/app/services/userProfileService'
import { getAllScores } from '@/app/services/gameDataService'
import { getActiveAnnouncements } from '@/app/services/adminService'
import { defaultGames, mergeGamesWithFirestore } from '@/app/games/games'
import { Announcement, Game, GlobalLeaderboardEntry } from '@/app/types'
import { TIER_META, tierProgress, pointsToNextTier } from '@/app/services/tiers'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'recent', label: 'Recently Played' },
  { value: 'popular', label: 'Most Popular' },
] as const

function LibraryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { currentUser } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([])
  const [games, setGames] = useState<Game[]>(defaultGames)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'popular'>('name')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([])
  const [gamePopularity, setGamePopularity] = useState<Record<string, number>>({})
  const [bestScores, setBestScores] = useState<Record<string, number>>({})
  const [userGlobalStats, setUserGlobalStats] = useState<GlobalLeaderboardEntry | null>(null)
  const [myRank, setMyRank] = useState<{ rank: number; total: number } | null>(null)
  const [search, setSearch] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  useEffect(() => {
    getActiveAnnouncements().then(setAnnouncements).catch(() => {})
  }, [])

  useEffect(() => {
    async function loadGameVisibility() {
      try {
        setGamesLoading(true)
        const { db } = await import('@/app/lib/firebase')
        const { collection, getDocs } = await import('firebase/firestore')
        const snap = await getDocs(collection(db, 'gameVisibility'))
        const visibility: { id: string; enabled: boolean }[] = []
        snap.forEach((doc) => visibility.push({ id: doc.id, enabled: doc.data().enabled !== false }))
        setGames(mergeGamesWithFirestore(visibility))
      } catch {
        setGames(defaultGames)
      } finally {
        setGamesLoading(false)
      }
    }
    loadGameVisibility()
  }, [])

  useEffect(() => {
    if (!currentUser?.uid) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('recentlyPlayed')
        if (stored) { try { setRecentlyPlayed(JSON.parse(stored)) } catch { setRecentlyPlayed([]) } }
      }
      return
    }
    getRecentlyPlayed(currentUser.uid).then((ids) => {
      if (ids.length > 0) {
        setRecentlyPlayed(ids)
      } else if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('recentlyPlayed')
        if (stored) { try { setRecentlyPlayed(JSON.parse(stored)) } catch { setRecentlyPlayed([]) } }
      }
    }).catch(() => {})
  }, [currentUser?.uid])

  useEffect(() => {
    if (!currentUser?.uid) return
    const uid = currentUser.uid
    const fetchScores = () =>
      getAllScores(uid)
        .then((scores) => {
          const map: Record<string, number> = {}
          for (const [gameId, data] of Object.entries(scores)) map[gameId] = data.bestScore
          setBestScores(map)
        })
        .catch(() => {})
    fetchScores()
    // Re-fetch after a short delay to catch scores written just before navigation
    const timer = setTimeout(fetchScores, 1500)
    return () => clearTimeout(timer)
  }, [currentUser?.uid])

  useEffect(() => {
    fetch('/api/leaderboard?mode=popularity')
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => setGamePopularity(payload.popularity ?? {}))
      .catch(() => setGamePopularity({}))
  }, [])

  useEffect(() => {
    if (!currentUser?.uid) return
    fetch('/api/leaderboard?mode=global')
      .then((r) => r.json())
      .then(({ entries }) => {
        if (!Array.isArray(entries)) return
        const idx = entries.findIndex((e: GlobalLeaderboardEntry) => e.uid === currentUser.uid)
        setUserGlobalStats(idx >= 0 ? entries[idx] : null)
        if (idx >= 0) setMyRank({ rank: idx + 1, total: entries.length })
      })
      .catch(() => {})
  }, [currentUser?.uid])

  const trackGamePlay = (gameId: string) => {
    const updated = [gameId, ...recentlyPlayed.filter((id) => id !== gameId)].slice(0, 10)
    setRecentlyPlayed(updated)
    if (typeof window !== 'undefined') localStorage.setItem('recentlyPlayed', JSON.stringify(updated))
    if (currentUser?.uid) saveRecentlyPlayed(currentUser.uid, updated).catch(() => {})
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(games.filter((g) => g.enabled !== false && g.category).map((g) => g.category as string))).sort()
    return ['all', ...cats]
  }, [games])

  const sortedGames = useMemo(() => {
    const q = search.trim().toLowerCase()
    const enabled = games.filter((g) =>
      g.enabled !== false &&
      (selectedCategory === 'all' || g.category === selectedCategory) &&
      (q === '' || g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q))
    )
    if (sortBy === 'recent') return [...enabled].sort((a, b) => {
      const ai = recentlyPlayed.indexOf(a.id), bi = recentlyPlayed.indexOf(b.id)
      if (ai === -1 && bi === -1) return 0
      if (ai === -1) return 1; if (bi === -1) return -1
      return ai - bi
    })
    if (sortBy === 'popular') return [...enabled].sort((a, b) => {
      const ac = gamePopularity[a.id] || 0, bc = gamePopularity[b.id] || 0
      return ac === bc ? a.name.localeCompare(b.name) : bc - ac
    })
    return [...enabled].sort((a, b) => a.name.localeCompare(b.name))
  }, [games, sortBy, selectedCategory, recentlyPlayed, gamePopularity, search])

  const featured = useMemo(() => {
    const enabled = games.filter((g) => g.enabled !== false && g.iframePath)
    return enabled.find((g) => g.id === recentlyPlayed[0]) ?? enabled[0] ?? null
  }, [games, recentlyPlayed])

  const visibleAnnouncements = announcements.filter((a) => !dismissedAnnouncements.includes(a.id))

  if (!currentUser) return null

  const meta = userGlobalStats ? TIER_META[userGlobalStats.tier] : null

  return (
    <div className="min-h-screen gradient-bg">
      <TopNav searchValue={search} onSearch={setSearch} />

      {/* Announcements */}
      {visibleAnnouncements.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 space-y-2">
          {visibleAnnouncements.map((ann) => {
            const styles = {
              info: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300',
              warning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300',
              success: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300',
            }
            return (
              <div key={ann.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-slide-up ${styles[ann.type] || styles.info}`}>
                <span className="mt-0.5 shrink-0 opacity-70">📣</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{ann.title}</span>
                  {ann.message && (
                    <span className="opacity-80">
                      {' — '}
                      {ann.linkUrl ? (
                        <>
                          {ann.message}{' '}
                          <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium opacity-100 hover:opacity-80 transition-opacity">Learn more ↗</a>
                        </>
                      ) : ann.message}
                    </span>
                  )}
                </div>
                {!ann.sticky && (
                  <button type="button" onClick={() => setDismissedAnnouncements((p) => [...p, ann.id])} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none">×</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-24 md:pb-8">
        {/* Hero: continue playing + rank panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 mb-8 animate-slide-up">
          {/* Continue playing */}
          {featured ? (
            <div className="relative rounded-3xl overflow-hidden hero-gradient min-h-[220px] flex flex-col justify-between p-6">
              <div className="absolute -bottom-16 -right-8 w-60 h-60 rounded-full bg-white/10 blur-3xl" />
              <p className="relative z-10 mono text-[11px] tracking-[0.16em] uppercase text-white/80">
                {recentlyPlayed[0] === featured.id ? 'Continue playing' : 'Featured game'}
              </p>
              <div className="relative z-10">
                {featured.category && (
                  <span className="inline-flex h-6 px-2.5 items-center rounded-md text-[11px] font-semibold bg-white/20 text-white backdrop-blur-sm mb-3">{featured.category}</span>
                )}
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1.5">{featured.name}</h2>
                <p className="text-sm leading-relaxed text-white/85 max-w-md mb-4 line-clamp-2">{featured.description}</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link
                    href={`/games/${featured.id}`}
                    onClick={() => trackGamePlay(featured.id)}
                    className="h-10 px-6 inline-flex items-center rounded-xl bg-white text-violet-800 text-sm font-bold hover:bg-white/90 transition-colors"
                  >
                    {recentlyPlayed[0] === featured.id ? 'Resume ▸' : 'Play ▸'}
                  </Link>
                  {(bestScores[featured.id] ?? 0) > 0 && (
                    <span className="mono text-xs text-white/85">Best {bestScores[featured.id].toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl surface min-h-[220px]" />
          )}

          {/* Rank / skill panel */}
          <div
            className="rounded-3xl border border-border p-6 flex flex-col justify-center"
            style={{ background: 'radial-gradient(130% 130% at 100% 0%, var(--accent) 0%, var(--card) 58%)' }}
          >
            {userGlobalStats && meta ? (
              <>
                <div className="flex items-center gap-3.5 mb-5">
                  <RankBadge tier={userGlobalStats.tier} size={56} />
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Rank</p>
                    <p className="text-xl font-extrabold tracking-tight" style={{ color: meta.text }}>{meta.label}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground">Skill</p>
                    <p className="mono text-2xl font-semibold tracking-tight">{userGlobalStats.compositeScore}</p>
                  </div>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${tierProgress(userGlobalStats.compositeScore, userGlobalStats.tier) * 100}%`, background: 'linear-gradient(90deg, var(--primary), #06b6d4)' }}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-[11px] text-muted-foreground">
                  <span>
                    {meta.next
                      ? <><span className="text-primary font-semibold mono">{pointsToNextTier(userGlobalStats.compositeScore, userGlobalStats.tier)} pts</span> to {meta.next}</>
                      : 'Maximum tier reached'}
                  </span>
                  {myRank && <span>Rank <span className="mono">#{myRank.rank}</span> of <span className="mono">{myRank.total}</span></span>}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm font-semibold mb-1">No ranking yet</p>
                <p className="text-xs text-muted-foreground">Play a few games to earn your first skill score and tier.</p>
              </div>
            )}
          </div>
        </div>

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Browse games</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {gamesLoading ? 'Loading…' : `${sortedGames.length} ${sortedGames.length === 1 ? 'game' : 'games'} available`}
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category filter */}
        {!gamesLoading && (
          <div className="flex flex-wrap gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Games grid */}
        {gamesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedGames.length === 0 ? (
          <div className="surface p-16 text-center">
            <p className="text-4xl mb-3">🎮</p>
            <p className="text-muted-foreground">{search.trim() ? 'No games match your search.' : 'No games available at the moment.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedGames.map((game, idx) => (
              <div key={game.id} className="animate-slide-up" style={{ animationDelay: `${Math.min(idx * 40, 280)}ms` }}>
                <GameCard
                  game={game}
                  isRecent={recentlyPlayed.includes(game.id)}
                  plays={gamePopularity[game.id] || 0}
                  best={bestScores[game.id] ?? null}
                  onPlay={() => trackGamePlay(game.id)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen gradient-bg" />}>
      <LibraryContent />
    </Suspense>
  )
}
