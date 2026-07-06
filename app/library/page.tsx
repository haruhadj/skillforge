'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import MobileNav from '@/app/components/MobileNav'
import TopNav from '@/app/components/TopNav'
import GameCard from '@/app/components/GameCard'
import SurveyPrompt, { SURVEY_FORM_URL } from '@/app/components/SurveyPrompt'
import { getRecentlyPlayed, saveRecentlyPlayed } from '@/app/services/userProfileService'
import { getAllScores } from '@/app/services/gameDataService'
import { getLibrarySettings } from '@/app/services/adminService'
import { defaultGames, mergeGamesWithFirestore } from '@/app/games/games'
import { Game } from '@/app/types'
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
  const [games, setGames] = useState<Game[]>(defaultGames)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'popular'>('name')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([])
  const [gamePopularity, setGamePopularity] = useState<Record<string, number>>({})
  const [bestScores, setBestScores] = useState<Record<string, number>>({})
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [showPicks, setShowPicks] = useState(false)
  const [showContinuePlaying, setShowContinuePlaying] = useState(true)
  const [globalSortMode, setGlobalSortMode] = useState<'name' | 'recent' | 'popular' | null>(null)

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  // Restore the sort selection + picks disclosure chosen on a previous visit
  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('library:sortBy')
    if (stored && SORT_OPTIONS.some((o) => o.value === stored)) {
      setSortBy(stored as typeof sortBy)
    }
    if (localStorage.getItem('library:showPicks') === '1') setShowPicks(true)
  }, [])

  useEffect(() => {
    getLibrarySettings().then((s) => {
      setShowContinuePlaying(s.showContinuePlaying)
      setGlobalSortMode(s.globalSortMode ?? null)
      if (s.globalSortMode) setSortBy(s.globalSortMode)
    }).catch(() => {})
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
    async function loadFeatured() {
      try {
        const { db } = await import('@/app/lib/firebase')
        const { doc, getDoc } = await import('firebase/firestore')
        const snap = await getDoc(doc(db, 'featuredGames', 'config'))
        if (snap.exists()) setFeaturedIds(snap.data().gameIds ?? [])
      } catch { /* silently ignore — featured section just won't render */ }
    }
    loadFeatured()
  }, [])

  useEffect(() => {
    fetch('/api/leaderboard?mode=popularity')
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => setGamePopularity(payload.popularity ?? {}))
      .catch(() => setGamePopularity({}))
  }, [])

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

  const featuredGames = useMemo(() => {
    if (!featuredIds.length) return []
    const enabledMap = new Map(games.filter(g => g.enabled !== false).map(g => [g.id, g]))
    return featuredIds.map(id => enabledMap.get(id)).filter(Boolean) as Game[]
  }, [games, featuredIds])

  const featured = useMemo(() => {
    const enabled = games.filter((g) => g.enabled !== false && g.iframePath)
    return enabled.find((g) => g.id === recentlyPlayed[0]) ?? enabled[0] ?? null
  }, [games, recentlyPlayed])

  if (!currentUser) return null

  return (
    <div className="min-h-screen gradient-bg">
      <TopNav searchValue={search} onSearch={setSearch} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-24 md:pb-8">
        {/* Continue playing — compact, full width (keeps Browse near the top on mobile) */}
        {featured && showContinuePlaying && (
          <div className="relative rounded-2xl overflow-hidden hero-gradient min-h-[112px] flex items-center justify-between gap-4 p-4 sm:p-5 mb-6 animate-slide-up">
            <div className="absolute -bottom-16 -right-8 w-52 h-52 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 min-w-0">
              <p className="mono text-[10px] tracking-[0.16em] uppercase text-white/80 mb-1">
                {recentlyPlayed[0] === featured.id ? 'Continue playing' : 'Featured game'}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white truncate">{featured.name}</h2>
                {featured.category && (
                  <span className="inline-flex h-5 px-2 items-center rounded-md text-[10px] font-semibold bg-white/20 text-white backdrop-blur-sm">{featured.category}</span>
                )}
              </div>
              {(bestScores[featured.id] ?? 0) > 0 && (
                <span className="mono text-xs text-white/85">Best {bestScores[featured.id].toLocaleString()}</span>
              )}
            </div>
            <Link
              href={`/games/${featured.id}`}
              prefetch={false}
              onClick={() => trackGamePlay(featured.id)}
              className="relative z-10 shrink-0 h-10 px-5 sm:px-6 inline-flex items-center rounded-xl bg-white text-violet-800 text-sm font-bold hover:bg-white/90 transition-colors"
            >
              {recentlyPlayed[0] === featured.id ? 'Resume ▸' : 'Play ▸'}
            </Link>
          </div>
        )}

        {/* Creator's Picks — collapsed disclosure so Browse stays near the top */}
        {!search.trim() && featuredGames.length > 0 && (
          <section className="mb-6 animate-slide-up">
            <button
              type="button"
              onClick={() => {
                const next = !showPicks
                setShowPicks(next)
                if (typeof window !== 'undefined') localStorage.setItem('library:showPicks', next ? '1' : '0')
              }}
              aria-expanded={showPicks}
              className="flex w-full items-center gap-2 rounded-xl surface px-4 h-11 text-left hover:border-primary/40 transition-colors"
            >
              <svg className="h-4 w-4 text-amber-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-bold tracking-tight">Creator's Picks</span>
              <span className="text-xs text-muted-foreground mono">({featuredGames.length})</span>
              <svg className={`ml-auto h-4 w-4 text-muted-foreground shrink-0 transition-transform ${showPicks ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {showPicks && (
              <div className="flex gap-4 overflow-x-auto pt-3 pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {featuredGames.map((game) => (
                  <div key={game.id} className="w-44 shrink-0">
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
          </section>
        )}

        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Browse games</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {gamesLoading ? 'Loading…' : `${sortedGames.length} ${sortedGames.length === 1 ? 'game' : 'games'} available`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={SURVEY_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              📝 Survey
            </a>
            {globalSortMode ? (
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-muted-foreground">
                Sorted by {SORT_OPTIONS.find((o) => o.value === globalSortMode)?.label ?? globalSortMode}
                <span className="text-xs">(set by admin)</span>
              </span>
            ) : (
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  const next = v as typeof sortBy
                  setSortBy(next)
                  if (typeof window !== 'undefined') localStorage.setItem('library:sortBy', next)
                }}
              >
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
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
                  isCreatorsPick={featuredIds.includes(game.id)}
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
      <SurveyPrompt />
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
