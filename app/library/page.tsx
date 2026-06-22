'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import MobileNav from '@/app/components/MobileNav'
import { getUserProfile, getRecentlyPlayed, saveRecentlyPlayed } from '@/app/services/userProfileService'
import { getActiveAnnouncements } from '@/app/services/adminService'
import { isAdmin } from '@/app/services/adminService'
import { defaultGames, mergeGamesWithFirestore } from '@/app/games/games'
import { UserProfile, Announcement, Game } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

export default function LibraryPage() {
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const [avatarURL, setAvatarURL] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [games, setGames] = useState<Game[]>(defaultGames)
  const [gamesLoading, setGamesLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'name' | 'recent' | 'popular'>('name')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [recentlyPlayed, setRecentlyPlayed] = useState<string[]>([])
  const [gamePopularity, setGamePopularity] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  useEffect(() => {
    if (!currentUser?.uid) return
    getUserProfile(currentUser.uid).then((profile) => {
      setUserProfile(profile)
      setAvatarURL(profile?.photoThumbURL || profile?.photoURL || null)
    }).catch(() => {})
  }, [currentUser?.uid])

  useEffect(() => {
    if (!currentUser?.uid) return
    isAdmin(currentUser.uid).then(setIsAdminUser).catch(() => setIsAdminUser(false))
  }, [currentUser?.uid])

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

  const handleLogout = async () => {
    try { await logout(); router.push('/') } catch { /* noop */ }
  }

  const name = userProfile?.username || currentUser?.displayName || currentUser?.email || 'Player'
  const initials = name.slice(0, 2).toUpperCase()

  const categories = useMemo(() => {
    const cats = Array.from(new Set(games.filter((g) => g.enabled !== false && g.category).map((g) => g.category as string))).sort()
    return ['all', ...cats]
  }, [games])

  const sortedGames = useMemo(() => {
    const enabled = games.filter((g) => g.enabled !== false && (selectedCategory === 'all' || g.category === selectedCategory))
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
  }, [games, sortBy, selectedCategory, recentlyPlayed, gamePopularity])

  const visibleAnnouncements = announcements.filter((a) => !dismissedAnnouncements.includes(a.id))

  if (!currentUser) return null

  return (
    <div className="min-h-screen gradient-bg">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 animate-fade-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/game logo.jpeg"
              alt="SkillForge"
              width={36}
              height={36}
              className="rounded-xl shrink-0"
              priority
            />
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-base leading-none">SkillForge</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">Welcome, {name}</p>
            </div>
          </div>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/library">Library</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
              <Link href="/activity">Activity</Link>
            </Button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 p-0 ring-2 ring-border hover:ring-primary/50 transition-all">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={avatarURL ?? undefined} alt={name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <p className="font-semibold truncate">{name}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{currentUser?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" className="cursor-pointer">Leaderboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/activity" className="cursor-pointer">Activity</Link>
                </DropdownMenuItem>
                {isAdminUser && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">Admin Panel</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

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
                          <a
                            href={ann.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline font-medium opacity-100 hover:opacity-80 transition-opacity"
                          >
                            Learn more ↗
                          </a>
                        </>
                      ) : (
                        ann.message
                      )}
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

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-24 md:pb-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Game Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {gamesLoading ? 'Loading…' : `${sortedGames.length} ${sortedGames.length === 1 ? 'game' : 'games'} available`}
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
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
                className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
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
            <p className="text-muted-foreground">No games available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedGames.map((game, idx) => {
              const isRecent = recentlyPlayed.includes(game.id)
              const popularity = gamePopularity[game.id] || 0
              return (
                <div
                  key={game.id}
                  className="group animate-slide-up"
                  style={{ animationDelay: `${Math.min(idx * 40, 280)}ms` }}
                >
                  <div className="surface overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30">
                    {/* Cover */}
                    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                      <img
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                        src={`/games/${game.id}/cover.png`}
                        alt={game.name}
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      />
                      {/* Badges overlay */}
                      <div className="absolute top-2 left-2 flex gap-1">
                        {isRecent && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-sm">Recent</Badge>
                        )}
                        {popularity >= 10 && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-background/80 backdrop-blur-sm">🔥</Badge>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                      <div>
                        <h3 className="text-sm font-semibold leading-tight line-clamp-1">{game.name}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{game.description}</p>
                      </div>
                      {game.iframePath ? (
                        <Button
                          asChild
                          size="sm"
                          className="w-full h-8 text-xs font-semibold"
                          onClick={() => trackGamePlay(game.id)}
                        >
                          <Link href={`/games/${game.id}`}>Play Now</Link>
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full h-8 text-xs" disabled>
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  )
}
