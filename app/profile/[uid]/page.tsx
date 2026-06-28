'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import MobileNav from '@/app/components/MobileNav'
import TierProgress from '@/app/components/TierProgress'
import RankBadge from '@/app/components/RankBadge'
import * as gameDataService from '@/app/services/gameDataService'
import { getUserProfile } from '@/app/services/userProfileService'
import { defaultGames } from '@/app/games/games'
import { UserProfile, GlobalLeaderboardEntry, RecentActivityItem } from '@/app/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

export default function OtherUserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params)
  const { currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [scores, setScores] = useState<Record<string, { bestScore: number }>>({})
  const [gameStats, setGameStats] = useState<Record<string, unknown>>({})
  const [globalStats, setGlobalStats] = useState<GlobalLeaderboardEntry | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [statSort, setStatSort] = useState<'name' | 'score' | 'matches' | 'played'>('played')

  useEffect(() => {
    if (!uid) return
    async function loadProfile() {
      try {
        setLoading(true)
        const [loadedProfile, loadedScores, loadedGameStats, loadedActivity] = await Promise.all([
          getUserProfile(uid),
          gameDataService.getAllScores(uid),
          gameDataService.getAllGameStats(uid),
          gameDataService.getRecentActivity(uid, 5),
        ])

        if (!loadedProfile) {
          setNotFound(true)
          return
        }

        setProfile(loadedProfile)
        setScores(loadedScores)
        setGameStats(loadedGameStats)
        setRecentActivity(loadedActivity)

        // Fetch this user's global stats from the materialized leaderboard (1 read, cached)
        fetch('/api/leaderboard?mode=global')
          .then((r) => r.json())
          .then(({ entries }) => {
            if (!Array.isArray(entries)) return
            const entry = entries.find((e: GlobalLeaderboardEntry) => e.uid === uid) ?? null
            setGlobalStats(entry)
          })
          .catch(() => {})
      } catch (error) {
        console.error('Failed to load profile:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [uid])

  if (!currentUser) return null

  const header = (
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 h-14 flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground -ml-2">
          <Link href="/leaderboard">
            <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </Link>
        </Button>
        <h1 className="text-lg font-bold flex-1 text-center">Player Profile</h1>
        <ThemeToggle />
      </div>
    </header>
  )

  if (loading) {
    return (
      <div className="min-h-screen gradient-bg">
        {header}
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-5">
          <div className="surface p-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-32" />
              </div>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen gradient-bg">
        {header}
        <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-24 md:pb-8">
          <div className="surface p-12 text-center">
            <p className="text-4xl mb-4">👤</p>
            <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
            <p className="text-muted-foreground">This user profile could not be found.</p>
          </div>
        </main>
        <MobileNav />
      </div>
    )
  }

  const name = profile.username || profile.email?.split('@')[0] || 'Unknown'
  const initials = name.slice(0, 2).toUpperCase()
  const photoURL = profile.photoThumbURL || profile.photoURL
  const isOwnProfile = profile.uid === currentUser.uid

  return (
    <div className="min-h-screen gradient-bg">
      {header}

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 pb-24 md:pb-8 space-y-5">
        {/* Profile card */}
        <div className="surface p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden ring-2 ring-border shrink-0 bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {photoURL ? (
                <img src={photoURL} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="text-center sm:text-left flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{name}</h2>
              {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
              {profile.email && !isOwnProfile && (
                <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
              )}
              {isOwnProfile && (
                <Link href="/profile" className="inline-block mt-1 text-sm text-primary hover:underline font-medium">
                  Edit your profile →
                </Link>
              )}
              {globalStats && (
                <div className="mt-4 flex items-center gap-3 justify-center sm:justify-start">
                  <RankBadge tier={globalStats.tier} size={46} className="hidden sm:flex" />
                  <div className="flex-1 w-full sm:max-w-sm">
                    <TierProgress
                      compositeScore={globalStats.compositeScore}
                      tier={globalStats.tier}
                      gamesPlayed={globalStats.gamesPlayed}
                      totalMatchCount={globalStats.totalMatchCount}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        {recentActivity.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-3">Recent Activity</h3>
            <div className="surface overflow-hidden divide-y divide-border">
              {recentActivity.map((item) => {
                const game = defaultGames.find((g) => g.id === item.gameId)
                const secs = Math.floor((Date.now() - item.updatedAt.getTime()) / 1000)
                const mins = Math.floor(secs / 60)
                const hrs = Math.floor(mins / 60)
                const days = Math.floor(hrs / 24)
                const relTime = secs < 60 ? 'just now' : mins < 60 ? `${mins}m ago` : hrs < 24 ? `${hrs}h ago` : days < 7 ? `${days}d ago` : item.updatedAt.toLocaleDateString()
                return (
                  <div key={item.gameId} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    <img
                      src={`/games/${item.gameId}/cover.png`}
                      alt={game?.name || item.gameId}
                      className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{game?.name || item.gameId}</p>
                      <div className="flex gap-1.5 mt-0.5 flex-wrap">
                        {item.lastMode && (
                          <span className="text-[10px] font-semibold bg-accent text-accent-foreground px-2 py-0.5 rounded-md">
                            {item.lastMode}
                          </span>
                        )}
                        {item.lastScore !== null && (
                          <span className="text-[10px] surface-2 text-muted-foreground px-2 py-0.5 rounded-md mono">
                            {item.lastScore.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{relTime}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Game stats */}
        <div className="surface p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="text-base font-semibold">Game Statistics</h3>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {(['played', 'score', 'matches', 'name'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setStatSort(opt)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    statSort === opt
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt === 'played' ? 'Played' : opt === 'score' ? 'Score' : opt === 'matches' ? 'Matches' : 'A–Z'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...defaultGames].sort((a, b) => {
              const aScore = scores[a.id]?.bestScore ?? -1
              const bScore = scores[b.id]?.bestScore ?? -1
              const aStats = gameStats[a.id] as Record<string, unknown> | undefined
              const bStats = gameStats[b.id] as Record<string, unknown> | undefined
              const aMatches = (aStats?.totalMatchCount as number) || (aStats?.matchCount as number) || (aStats?.totalGames as number) || (Array.isArray(aStats?.history) ? (aStats.history as unknown[]).length : 0) || 0
              const bMatches = (bStats?.totalMatchCount as number) || (bStats?.matchCount as number) || (bStats?.totalGames as number) || (Array.isArray(bStats?.history) ? (bStats.history as unknown[]).length : 0) || 0
              if (statSort === 'score') return bScore - aScore
              if (statSort === 'matches') return bMatches - aMatches
              if (statSort === 'name') return a.name.localeCompare(b.name)
              const aPlayed = aScore >= 0 || aMatches > 0
              const bPlayed = bScore >= 0 || bMatches > 0
              if (aPlayed !== bPlayed) return aPlayed ? -1 : 1
              return a.name.localeCompare(b.name)
            }).map((game) => {
              const gameScore = scores[game.id]?.bestScore
              const stats = gameStats[game.id] as Record<string, unknown> | undefined
              const histLen = Array.isArray(stats?.history) ? (stats.history as unknown[]).length : 0
              const matchCount = (stats?.totalMatchCount as number) || (stats?.matchCount as number) || (stats?.totalGames as number) || histLen || 0
              const hasPlayed = gameScore !== undefined || matchCount > 0

              return (
                <div key={game.id} className={`surface overflow-hidden transition-opacity ${hasPlayed ? '' : 'opacity-40'}`}>
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={`/games/${game.id}/cover.png`}
                      alt={game.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    {!hasPlayed && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <span className="text-xs text-white/80 font-medium">Not played</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-semibold truncate mb-2">{game.name}</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="surface-2 px-2.5 py-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Score</p>
                        <p className={`text-sm font-bold mono mt-0.5 ${hasPlayed ? 'text-primary' : 'text-muted-foreground'}`}>
                          {gameScore !== undefined ? gameScore.toLocaleString() : '—'}
                        </p>
                      </div>
                      <div className="surface-2 px-2.5 py-2">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Matches</p>
                        <p className={`text-sm font-bold mono mt-0.5 ${matchCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {matchCount > 0 ? matchCount.toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  )
}
