'use client'

import { useEffect, useMemo, useState } from 'react'
import { User as FirebaseUser } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { getUserProfile } from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import ThemeToggle from '@/app/components/ThemeToggle'
import { GlobalLeaderboardEntry, UserProfile } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'

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
  bronze:   { label: 'Bronze',   dot: 'bg-amber-600',   text: 'text-amber-700 dark:text-amber-500',   ring: 'ring-amber-500/50'   },
  silver:   { label: 'Silver',   dot: 'bg-slate-400',   text: 'text-slate-500 dark:text-slate-300',   ring: 'ring-slate-400/50'   },
  gold:     { label: 'Gold',     dot: 'bg-yellow-500',  text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-500/50'  },
  platinum: { label: 'Platinum', dot: 'bg-cyan-500',    text: 'text-cyan-600 dark:text-cyan-400',     ring: 'ring-cyan-500/50'    },
  master:   { label: 'Master',   dot: 'bg-violet-600',  text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500/50'  },
}

function TierBadge({ tier }: { tier: GlobalLeaderboardEntry['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function RankChip({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-xl leading-none select-none" title="1st place">👑</span>
  if (rank === 2) return <span className="text-lg leading-none select-none" title="2nd place">🥈</span>
  if (rank === 3) return <span className="text-lg leading-none select-none" title="3rd place">🥉</span>
  return (
    <span className="w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold tabular-nums">
      {rank}
    </span>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 rounded-lg" />
    </div>
  )
}

const PODIUM_ORDER = [1, 0, 2]
const PODIUM_PROPS = [
  { barH: 'h-20', avatarSize: 'h-12 w-12', ring: 'ring-slate-400', label: '2nd', glow: '' },
  { barH: 'h-28', avatarSize: 'h-16 w-16', ring: 'ring-yellow-400', label: '1st', glow: 'drop-shadow-[0_0_12px_rgba(250,204,21,0.5)]' },
  { barH: 'h-16', avatarSize: 'h-11 w-11', ring: 'ring-amber-600',  label: '3rd', glow: '' },
]
const PODIUM_GRADIENTS = [
  'from-slate-300/30 to-slate-400/40 dark:from-slate-600/40 dark:to-slate-700/50 border-slate-300/40 dark:border-slate-600/30',
  'from-yellow-300/40 to-amber-400/50 dark:from-yellow-500/30 dark:to-amber-600/40 border-yellow-400/40 dark:border-yellow-500/20',
  'from-amber-400/25 to-orange-400/35 dark:from-amber-700/30 dark:to-orange-700/40 border-amber-400/30 dark:border-amber-700/20',
]

function Podium({ top3, profiles, currentUser }: {
  top3: GlobalLeaderboardEntry[]
  profiles: Record<string, UserProfile>
  currentUser: FirebaseUser | null
}) {
  return (
    <div className="surface p-6 mb-4 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, oklch(0.55 0.22 80 / 0.07) 0%, transparent 70%)' }} />
      <p className="text-center text-[11px] font-bold text-muted-foreground mb-8 uppercase tracking-[0.2em]">Top Players</p>
      <div className="flex items-end justify-center gap-4 sm:gap-8">
        {PODIUM_ORDER.map((idx, i) => {
          const row = top3[idx]
          const profile = profiles[row.uid]
          const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
          const isMe = row.uid === currentUser?.uid
          const score = row.compositeScore ?? 0
          const pp = PODIUM_PROPS[i]

          return (
            <div key={row.uid} className="flex flex-col items-center gap-2.5">
              <Link href={isMe ? '/profile' : `/profile/${row.uid}`} className="flex flex-col items-center gap-2 group">
                <div className="relative">
                  {i === 1 && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl select-none z-10">👑</span>
                  )}
                  <Avatar className={`${pp.avatarSize} ring-2 ${pp.ring} ring-offset-2 ring-offset-background group-hover:scale-105 transition-transform ${pp.glow} ${isMe ? 'ring-primary' : ''}`}>
                    <AvatarImage src={profile?.photoThumbURL} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="text-center space-y-0.5">
                  <p className={`font-semibold truncate ${i === 1 ? 'max-w-[90px] text-sm' : 'max-w-[72px] text-xs'} group-hover:text-primary transition-colors`}>{name}</p>
                  {isMe && <p className="text-[10px] text-primary font-semibold">You</p>}
                  <TierBadge tier={row.tier} />
                </div>
              </Link>
              <div className={`w-[4.5rem] sm:w-20 rounded-t-xl ${pp.barH} bg-gradient-to-t ${PODIUM_GRADIENTS[i]} border flex items-start justify-center pt-2`}>
                <span className={`text-[11px] font-bold tabular-nums ${i === 1 ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                  {score.toLocaleString()}
                </span>
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
  const [rows, setRows] = useState<GlobalLeaderboardEntry[]>([])
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') router.push('/')
  }, [currentUser, router])

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null); setRows([]); setProfiles({}); setSearch('')

    fetch('/api/leaderboard?mode=global')
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || 'Failed to load leaderboard')
        if (cancelled) return
        const entries = (payload.entries ?? []) as GlobalLeaderboardEntry[]
        const top = entries.slice(0, TOP_COUNT)
        setRows(top)
        const profileMap = await fetchProfiles(top.map((r) => r.uid))
        if (!cancelled) setProfiles(profileMap)
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [])

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((row) => {
      const p = profiles[row.uid]
      const name = (p?.username || p?.email?.split('@')[0] || '').toLowerCase()
      return name.includes(q)
    })
  }, [rows, profiles, search])

  if (!currentUser) return null

  const myRank = rows.findIndex((r) => r.uid === currentUser.uid) + 1
  const maxScore = rows[0]?.compositeScore ?? 1

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
          <div className="flex-1 flex items-center justify-center gap-2">
            <span className="text-lg select-none">🏆</span>
            <h1 className="text-lg font-bold tracking-tight">Global Leaderboard</h1>
          </div>
          <ThemeToggle />
        </div>
        {!loading && rows.length > 0 && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-3 flex items-center justify-end">
            <span className="text-xs text-muted-foreground tabular-nums">{rows.length} players ranked</span>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-6 pb-12">
        {error && (
          <div className="surface border border-destructive/30 p-4 text-destructive text-sm text-center mb-4">
            {error.includes('permission') ? 'Missing Firestore permissions.' : error}
          </div>
        )}

        {loading ? (
          <div className="surface overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <Skeleton className="h-5 w-36" />
            </div>
            <div className="divide-y divide-border">
              {Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          </div>
        ) : (
          <>
            {rows.length >= 3 && (
              <Podium top3={rows.slice(0, 3)} profiles={profiles} currentUser={currentUser} />
            )}

            <div className="surface overflow-hidden animate-fade-in">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                <h2 className="font-semibold text-sm flex-1">Global Rankings</h2>
                <div className="relative w-36 sm:w-48 shrink-0">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search players…"
                    className="pl-8 h-8 text-xs bg-muted/50"
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block">Skill Score</span>
              </div>

              <div className="divide-y divide-border/60">
                {filteredRows.length === 0 ? (
                  <div className="py-16 text-center">
                    <p className="text-4xl mb-3 select-none">{search ? '🔍' : '🏆'}</p>
                    <p className="font-semibold">{search ? 'No players found' : 'No scores yet'}</p>
                    <p className="text-sm text-muted-foreground mt-1">{search ? 'Try a different name' : 'Be the first to play!'}</p>
                  </div>
                ) : (
                  filteredRows.map((row, filteredIdx) => {
                    const rank = rows.indexOf(row) + 1
                    const profile = profiles[row.uid]
                    const name = profile?.username || profile?.email?.split('@')[0] || 'Unknown'
                    const isMe = row.uid === currentUser?.uid
                    const score = row.compositeScore ?? 0
                    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
                    const ringClass = TIER_CONFIG[row.tier].ring

                    const scoreColor = rank === 1 ? 'text-yellow-600 dark:text-yellow-400'
                      : rank === 2 ? 'text-slate-500 dark:text-slate-300'
                      : rank === 3 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-foreground'

                    const topBarColor = rank === 1 ? 'bg-yellow-400'
                      : rank === 2 ? 'bg-slate-400'
                      : rank === 3 ? 'bg-amber-600'
                      : 'bg-transparent'

                    return (
                      <div
                        key={row.uid}
                        className={`relative flex items-center gap-3 px-5 py-3.5 transition-colors animate-slide-up ${
                          isMe ? 'bg-primary/5 dark:bg-primary/8' : 'hover:bg-muted/40'
                        }`}
                        style={{ animationDelay: `${filteredIdx * 25}ms` }}
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-r ${isMe ? 'bg-primary' : topBarColor}`} />

                        <div className="w-8 flex items-center justify-center shrink-0">
                          <RankChip rank={rank} />
                        </div>

                        <Link href={isMe ? '/profile' : `/profile/${row.uid}`} className="shrink-0">
                          <Avatar className={`h-10 w-10 ring-1 ${ringClass} ring-offset-1 ring-offset-background hover:scale-105 transition-transform`}>
                            <AvatarImage src={profile?.photoThumbURL} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </Link>

                        <div className="flex-1 min-w-0 relative overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/8 to-transparent rounded-r pointer-events-none transition-[width] duration-700"
                            style={{ width: `${pct}%` }}
                          />
                          <div className="relative">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={isMe ? '/profile' : `/profile/${row.uid}`}
                                className="text-sm font-semibold truncate max-w-[130px] sm:max-w-[180px] hover:text-primary transition-colors"
                              >
                                {name}
                              </Link>
                              {isMe && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">You</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <TierBadge tier={row.tier} />
                              {row.gamesPlayed != null && (
                                <span className="text-[11px] text-muted-foreground">{row.gamesPlayed} game{row.gamesPlayed !== 1 ? 's' : ''}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <span className={`text-sm font-bold tabular-nums shrink-0 ${scoreColor}`}>
                          {score.toLocaleString()}
                        </span>
                      </div>
                    )
                  })
                )}
              </div>

              {myRank > 10 && !search && (
                <div className="border-t border-border/60 bg-primary/5 px-5 py-3 flex items-center gap-2.5">
                  <span className="text-xs text-muted-foreground">Your rank</span>
                  <Badge variant="outline" className="text-xs font-bold px-2">#{myRank}</Badge>
                  <span className="text-xs text-muted-foreground">of {rows.length} players</span>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
