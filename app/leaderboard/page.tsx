'use client'

import { useEffect, useMemo, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { getUserProfile } from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import ThemeToggle from '@/app/components/ThemeToggle'
import { LeaderboardEntry, GlobalLeaderboardEntry, UserProfile } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TOP_COUNT = 50
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

const TIER_CONFIG = {
  bronze: { label: 'Bronze', className: 'bg-amber-700/90 text-white' },
  silver: { label: 'Silver', className: 'bg-slate-400/90 text-white' },
  gold: { label: 'Gold', className: 'bg-yellow-500/90 text-white' },
  platinum: { label: 'Platinum', className: 'bg-cyan-500/90 text-white' },
  master: { label: 'Master', className: 'bg-violet-600/90 text-white' },
}

function TierBadge({ tier }: { tier: GlobalLeaderboardEntry['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${cfg.className}`}>{cfg.label}</span>
}

function RankDisplay({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[rank]) return <span className="text-xl w-8 text-center">{medals[rank]}</span>
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-semibold">
      {rank}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  )
}

function Podium({ top3, profiles, viewMode, currentUser }: {
  top3: (LeaderboardEntry | GlobalLeaderboardEntry)[]
  profiles: Record<string, UserProfile>
  viewMode: 'global' | 'game'
  currentUser: FirebaseUser | null
}) {
  const order = [1, 0, 2]
  const heights = ['h-24', 'h-32', 'h-20']
  const medals = ['🥈', '🥇', '🥉']
  const gradients = [
    'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600',
    'from-yellow-200 to-amber-300 dark:from-yellow-600/60 dark:to-amber-500/60',
    'from-orange-200 to-orange-300 dark:from-orange-700/50 dark:to-orange-600/50',
  ]

  return (
    <div className="surface p-6 mb-4">
      <p className="text-center text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">Top Players</p>
      <div className="flex items-end justify-center gap-6">
        {order.map((idx, i) => {
          const row = top3[idx]
          const profile = profiles[row.uid]
          const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
          const isMe = row.uid === currentUser?.uid
          const score = viewMode === 'global'
            ? (row as GlobalLeaderboardEntry).compositeScore ?? 0
            : (row as LeaderboardEntry).bestScore ?? 0
          const tier = viewMode === 'global' ? (row as GlobalLeaderboardEntry).tier : null

          return (
            <div key={row.uid} className={`flex flex-col items-center gap-2 ${isMe ? 'ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl p-1' : ''}`}>
              <span className="text-2xl">{medals[i]}</span>
              <Avatar className="h-14 w-14 ring-2 ring-border">
                <AvatarImage src={profile?.photoThumbURL} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm font-semibold truncate max-w-[90px]">{name}</p>
                {isMe && <p className="text-xs text-primary">You</p>}
                {tier && <TierBadge tier={tier} />}
              </div>
              <div className={`w-20 rounded-t-lg ${heights[i]} bg-gradient-to-t ${gradients[i]} flex items-end justify-center pb-2`}>
                <span className="text-xs font-bold">{score.toLocaleString()}</span>
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

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  const activeGame = useMemo(() => defaultGames.find((g) => g.id === selectedGameId) || null, [selectedGameId])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setRows([]); setProfiles({})

    const url = viewMode === 'global'
      ? '/api/leaderboard?mode=global'
      : `/api/leaderboard?mode=game&gameId=${encodeURIComponent(selectedGameId)}`

    fetch(url)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || 'Failed to load leaderboard')
        if (cancelled) return
        const entries = (payload.entries ?? []) as (LeaderboardEntry | GlobalLeaderboardEntry)[]
        const top = entries.slice(0, TOP_COUNT)
        setRows(top)
        const profileMap = await fetchProfiles(top.map((r) => r.uid))
        if (!cancelled) setProfiles(profileMap)
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedGameId, viewMode])

  if (!currentUser) return null

  const metricLabel = viewMode === 'global' ? 'Skill Score' : 'Best Score'

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
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
          <h1 className="text-lg font-bold flex-1 text-center">Leaderboard</h1>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-3">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="global" className="text-xs px-4">All Games</TabsTrigger>
              <TabsTrigger value="game" className="text-xs px-4">By Game</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 pb-12">
        {error && (
          <div className="surface border-destructive/30 p-4 text-destructive text-sm text-center mb-4 rounded-xl">
            {error.includes('permission') ? 'Missing Firestore permissions.' : error}
          </div>
        )}

        <div className="flex gap-5">
          {/* Game sidebar — desktop */}
          {viewMode === 'game' && (
            <aside className="hidden lg:block w-56 shrink-0">
              <div className="surface sticky top-28 overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Select Game</p>
                </div>
                <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
                  {defaultGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => setSelectedGameId(game.id)}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-l-2 ${
                        selectedGameId === game.id
                          ? 'bg-accent text-accent-foreground border-primary font-medium'
                          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main */}
          <div className="flex-1 min-w-0">
            {/* Mobile game selector */}
            {viewMode === 'game' && (
              <div className="lg:hidden mb-4">
                <Select value={selectedGameId} onValueChange={setSelectedGameId}>
                  <SelectTrigger className="w-full h-10 font-medium text-sm">
                    <SelectValue placeholder="Select a game" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[40vh] overflow-y-auto">
                    {defaultGames.map((game) => (
                      <SelectItem key={game.id} value={game.id}>{game.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loading ? (
              <div className="surface overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              </div>
            ) : (
              <>
                {rows.length >= 3 && (
                  <Podium top3={rows.slice(0, 3)} profiles={profiles} viewMode={viewMode} currentUser={currentUser} />
                )}

                <div className="surface overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h2 className="font-semibold text-sm">
                      {viewMode === 'global' ? 'Global Rankings' : activeGame?.name}
                    </h2>
                    <span className="text-xs text-muted-foreground font-medium">{metricLabel}</span>
                  </div>

                  <div className="divide-y divide-border">
                    {rows.length === 0 ? (
                      <div className="py-16 text-center">
                        <p className="text-4xl mb-3">🏆</p>
                        <p className="font-semibold">No scores yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Be the first to play!</p>
                      </div>
                    ) : (
                      rows.map((row, index) => {
                        const rank = index + 1
                        const profile = profiles[row.uid]
                        const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
                        const isMe = row.uid === currentUser?.uid
                        const score = viewMode === 'global'
                          ? (row as GlobalLeaderboardEntry).compositeScore ?? 0
                          : (row as LeaderboardEntry).bestScore ?? 0
                        const maxScore = rows[0] ? (viewMode === 'global'
                          ? (rows[0] as GlobalLeaderboardEntry).compositeScore ?? 0
                          : (rows[0] as LeaderboardEntry).bestScore ?? 0) : 1
                        const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
                        const tier = viewMode === 'global' ? (row as GlobalLeaderboardEntry).tier : null
                        const gamesPlayed = viewMode === 'global' ? (row as GlobalLeaderboardEntry).gamesPlayed ?? 0 : null
                        const totalMatches = viewMode === 'global' ? (row as GlobalLeaderboardEntry).totalMatchCount ?? 0 : null

                        return (
                          <div
                            key={row.uid}
                            className={`relative flex items-center gap-3 px-4 py-3 transition-colors animate-slide-up ${
                              isMe ? 'bg-accent/40' : 'hover:bg-muted/50'
                            }`}
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            {isMe && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-r" />}

                            <RankDisplay rank={rank} />

                            <Link href={isMe ? '/profile' : `/profile/${row.uid}`} className="shrink-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={profile?.photoThumbURL} />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            </Link>

                            <div className="flex-1 min-w-0 relative">
                              <div
                                className="absolute inset-y-0 left-0 bg-primary/5 dark:bg-primary/10 rounded-r pointer-events-none"
                                style={{ width: `${pct}%` }}
                              />
                              <div className="relative">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={isMe ? '/profile' : `/profile/${row.uid}`}
                                    className="text-sm font-medium truncate hover:text-primary transition-colors"
                                  >
                                    {name}
                                  </Link>
                                  {isMe && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">You</Badge>}
                                </div>
                                {tier && (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <TierBadge tier={tier} />
                                    {gamesPlayed !== null && (
                                      <span className="text-[11px] text-muted-foreground">{gamesPlayed} games · {totalMatches?.toLocaleString()} matches</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <span className={`text-sm font-bold tabular-nums ${
                              rank === 1 ? 'text-yellow-600 dark:text-yellow-400' :
                              rank === 2 ? 'text-slate-500 dark:text-slate-300' :
                              rank === 3 ? 'text-amber-600 dark:text-amber-400' :
                              'text-foreground'
                            }`}>
                              {score.toLocaleString()}
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
    </div>
  )
}
