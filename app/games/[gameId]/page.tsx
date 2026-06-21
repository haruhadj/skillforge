'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { defaultGames } from '@/app/games/games'
import { getUserProfile } from '@/app/services/userProfileService'
import { getGlobalRecentActivity } from '@/app/services/gameDataService'
import ThemeToggle from '@/app/components/ThemeToggle'
import { LeaderboardEntry, UserProfile } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

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

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d ago` : date.toLocaleDateString()
}

function RankChip({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none select-none" title="1st">👑</span>
  if (rank === 2) return <span className="text-lg leading-none select-none" title="2nd">🥈</span>
  if (rank === 3) return <span className="text-lg leading-none select-none" title="3rd">🥉</span>
  return (
    <span className="w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold tabular-nums">
      {rank}
    </span>
  )
}

interface ActivityRow {
  userId: string
  lastMode: 'singleplayer' | 'multiplayer' | null
  lastScore: number | null
  updatedAt: Date
  username: string
  photoURL?: string
}

export default function GameDetailsPage() {
  const params = useParams()
  const gameId = params.gameId as string
  const router = useRouter()
  const { currentUser } = useAuth()

  const game = useMemo(() => defaultGames.find((g) => g.id === gameId) ?? null, [gameId])

  const [lbRows, setLbRows] = useState<LeaderboardEntry[]>([])
  const [lbProfiles, setLbProfiles] = useState<Record<string, UserProfile>>({})
  const [lbLoading, setLbLoading] = useState(true)
  const [lbError, setLbError] = useState<string | null>(null)

  const [actItems, setActItems] = useState<ActivityRow[]>([])
  const [actLoading, setActLoading] = useState(true)

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  useEffect(() => {
    if (!gameId) return
    let cancelled = false
    setLbLoading(true); setLbError(null); setLbRows([]); setLbProfiles({})

    fetch(`/api/leaderboard?mode=game&gameId=${encodeURIComponent(gameId)}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || 'Failed to load leaderboard')
        if (cancelled) return
        const entries = (payload.entries ?? []) as LeaderboardEntry[]
        const top = entries.slice(0, 10)
        setLbRows(top)
        const profileMap = await fetchProfiles(top.map((r) => r.uid))
        if (!cancelled) setLbProfiles(profileMap)
      })
      .catch((err: Error) => { if (!cancelled) setLbError(err.message) })
      .finally(() => { if (!cancelled) setLbLoading(false) })

    return () => { cancelled = true }
  }, [gameId])

  useEffect(() => {
    if (!gameId || !currentUser) return
    let cancelled = false
    setActLoading(true)

    getGlobalRecentActivity(100)
      .then(async (all) => {
        if (cancelled) return
        const forGame = all.filter((item) => item.gameId === gameId).slice(0, 15)
        const uids = [...new Set(forGame.map((i) => i.userId))]
        const profileMap = await fetchProfiles(uids)
        if (!cancelled) {
          setActItems(forGame.map((item) => {
            const p = profileMap[item.userId]
            return {
              ...item,
              username: p?.username || p?.email?.split('@')[0] || 'Unknown',
              photoURL: p?.photoThumbURL,
            }
          }))
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setActLoading(false) })

    return () => { cancelled = true }
  }, [gameId, currentUser])

  if (!currentUser) return null

  if (!game) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3 select-none">🎮</p>
          <p className="font-semibold">Game not found</p>
          <Button asChild className="mt-4" size="sm">
            <Link href="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    )
  }

  const maxScore = lbRows[0]?.bestScore ?? 1

  return (
    <div className="min-h-screen gradient-bg">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
            <Link href="/library">
              <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              Back
            </Link>
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-base font-bold tracking-tight truncate max-w-xs">{game.name}</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 pb-12 space-y-6">
        {/* Game info card */}
        <div className="surface overflow-hidden animate-fade-in">
          <div className="flex flex-col sm:flex-row">
            <div className="sm:w-52 lg:w-64 shrink-0">
              <div className="aspect-[4/3] sm:aspect-auto sm:h-full bg-muted relative overflow-hidden min-h-[120px]">
                <img
                  src={`/games/${game.id}/cover.png`}
                  alt={game.name}
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            </div>
            <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  {game.category && (
                    <Badge variant="secondary" className="text-xs">{game.category}</Badge>
                  )}
                  {game.difficulty && (
                    <Badge variant="outline" className="text-xs capitalize">{game.difficulty}</Badge>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight mb-2">{game.name}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{game.description}</p>
              </div>
              <Button asChild size="lg" className="w-full sm:w-auto sm:self-start font-semibold">
                <Link href={`/play/${game.id}`}>Play Now →</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Leaderboard + Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leaderboard */}
          <div className="surface overflow-hidden animate-slide-up" style={{ animationDelay: '80ms' }}>
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="select-none">🏆</span> Top Players
              </h3>
              {!lbLoading && lbRows.length > 0 && (
                <span className="text-xs text-muted-foreground tabular-nums">{lbRows.length} ranked</span>
              )}
            </div>

            {lbLoading ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="flex-1 h-4" />
                    <Skeleton className="h-4 w-12 shrink-0" />
                  </div>
                ))}
              </div>
            ) : lbError ? (
              <div className="py-10 text-center text-sm text-muted-foreground px-4">{lbError}</div>
            ) : lbRows.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-3xl mb-2 select-none">🎮</p>
                <p className="text-sm font-medium">No scores yet</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to play!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {lbRows.map((row, idx) => {
                  const rank = idx + 1
                  const profile = lbProfiles[row.uid]
                  const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
                  const isMe = row.uid === currentUser.uid
                  const pct = maxScore > 0 ? (row.bestScore / maxScore) * 100 : 0
                  const scoreColor = rank === 1 ? 'text-yellow-600 dark:text-yellow-400'
                    : rank === 2 ? 'text-slate-500 dark:text-slate-300'
                    : rank === 3 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-foreground'

                  return (
                    <div
                      key={row.uid}
                      className={`relative flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/8 to-transparent pointer-events-none transition-[width] duration-700"
                        style={{ width: `${pct}%` }}
                      />
                      <div className="w-7 flex items-center justify-center shrink-0 relative z-10">
                        <RankChip rank={rank} />
                      </div>
                      <Link href={isMe ? '/profile' : `/profile/${row.uid}`} className="shrink-0 relative z-10">
                        <Avatar className="h-8 w-8 ring-1 ring-border/60 ring-offset-1 ring-offset-background hover:scale-105 transition-transform">
                          <AvatarImage src={profile?.photoThumbURL} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                            {name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0 relative z-10">
                        <Link
                          href={isMe ? '/profile' : `/profile/${row.uid}`}
                          className="text-sm font-medium truncate hover:text-primary transition-colors flex items-center gap-1.5"
                        >
                          <span className="truncate">{name}</span>
                          {isMe && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">You</Badge>}
                        </Link>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 relative z-10 ${scoreColor}`}>
                        {row.bestScore.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="surface overflow-hidden animate-slide-up" style={{ animationDelay: '140ms' }}>
            <div className="px-4 py-3.5 border-b border-border">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="select-none">⚡</span> Recent Activity
              </h3>
            </div>

            {actLoading ? (
              <div className="divide-y divide-border/60">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-3 w-14 shrink-0" />
                  </div>
                ))}
              </div>
            ) : actItems.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-3xl mb-2 select-none">💤</p>
                <p className="text-sm font-medium">No recent plays</p>
                <p className="text-xs text-muted-foreground mt-1">Start the trend!</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {actItems.map((item, idx) => (
                  <div
                    key={`${item.userId}-${idx}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={item.photoURL} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                        {item.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.username}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {item.lastMode && (
                          <span className="text-[10px] bg-primary/10 text-primary font-medium rounded-full px-1.5 py-0.5">
                            {item.lastMode === 'singleplayer' ? 'Solo' : 'Multi'}
                          </span>
                        )}
                        {item.lastScore != null && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.lastScore.toLocaleString()} pts
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {relativeTime(item.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
