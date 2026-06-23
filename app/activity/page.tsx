'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { getUserProfile } from '@/app/services/userProfileService'
import MobileNav from '@/app/components/MobileNav'
import TopNav from '@/app/components/TopNav'
import { getRecentActivity, getGlobalRecentActivity } from '@/app/services/gameDataService'
import { defaultGames } from '@/app/games/games'
import { RecentActivityItem, UserProfile } from '@/app/types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'

function relativeTime(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days < 7 ? `${days}d ago` : date.toLocaleDateString()
}

interface GlobalActivityItemWithUser {
  userId: string
  gameId: string
  lastMode: 'singleplayer' | 'multiplayer' | null
  lastScore: number | null
  updatedAt: Date
  username: string
  photoURL?: string
}

export default function ActivityPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const [tab, setTab] = useState<'personal' | 'global'>('personal')

  // Personal activity state
  const [items, setItems] = useState<RecentActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Global activity state
  const [globalItems, setGlobalItems] = useState<GlobalActivityItemWithUser[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const gameById = useMemo(
    () => Object.fromEntries(defaultGames.map((g) => [g.id, g])),
    []
  )

  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      router.push('/')
    }
  }, [currentUser, router])

  // Fetch personal activity
  useEffect(() => {
    if (!currentUser?.uid) return

    let cancelled = false
    setLoading(true)
    setError(null)

    getRecentActivity(currentUser.uid, 20)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [currentUser?.uid])

  // Fetch global activity
  useEffect(() => {
    if (tab !== 'global') return

    let cancelled = false
    setGlobalLoading(true)
    setGlobalError(null)

    getGlobalRecentActivity(50)
      .then(async (data) => {
        if (cancelled) return

        // Fetch user profiles for all unique users
        const userIds = [...new Set(data.map((item) => item.userId))]
        const profileMap: Record<string, UserProfile | null> = {}

        await Promise.all(
          userIds.map((uid) =>
            getUserProfile(uid)
              .then((p) => {
                profileMap[uid] = p
              })
              .catch(() => {
                profileMap[uid] = null
              })
          )
        )

        if (!cancelled) {
          const withProfiles: GlobalActivityItemWithUser[] = data.map((item) => {
            const profile = profileMap[item.userId]
            return {
              ...item,
              username: profile?.username || profile?.email?.split('@')[0] || 'Unknown',
              photoURL: profile?.photoThumbURL,
            }
          })
          setGlobalItems(withProfiles)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setGlobalError(err.message)
      })
      .finally(() => {
        if (!cancelled) setGlobalLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [tab])

  if (!currentUser) return null

  const isLoading = tab === 'personal' ? loading : globalLoading
  const isError = tab === 'personal' ? error : globalError
  const displayItems: (RecentActivityItem | GlobalActivityItemWithUser)[] =
    tab === 'personal' ? items : globalItems
  const isEmpty = displayItems.length === 0

  return (
    <div className="min-h-screen gradient-bg">
      <TopNav />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-6 pb-24 md:pb-12 min-h-[calc(100vh-140px)]">
        <h1 className="text-2xl font-extrabold tracking-tight mb-4">Activity</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={tab === 'personal' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('personal')}
            className="text-sm"
          >
            My Activity
          </Button>
          <Button
            variant={tab === 'global' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTab('global')}
            className="text-sm"
          >
            Global Activity
          </Button>
        </div>

        {isLoading ? (
          <div className="surface overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-b-0">
                <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-10 w-20 hidden sm:block shrink-0" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="surface p-8 text-center">
            <p className="font-semibold text-destructive">Failed to load activity</p>
            <p className="text-sm text-muted-foreground mt-2">{isError}</p>
          </div>
        ) : isEmpty ? (
          <div className="surface p-16 text-center">
            <p className="text-4xl mb-3">🎮</p>
            <p className="font-semibold">
              {tab === 'personal' ? 'No activity yet' : 'No global activity'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {tab === 'personal'
                ? 'Play a game to see your history here.'
                : 'Check back later to see what others are playing.'}
            </p>
            {tab === 'personal' && (
              <Button asChild className="mt-6" size="sm">
                <Link href="/library">Browse Games</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="surface overflow-hidden">
            {displayItems.map((item, idx) => {
              const game = gameById[item.gameId]
              const gameName = game?.name ?? item.gameId
              const isGlobal = tab === 'global'
              const globalItem = isGlobal ? (item as GlobalActivityItemWithUser) : null
              const itemKey = `${item.gameId}-${isGlobal && globalItem ? globalItem.userId : 'personal'}-${idx}`

              return (
                <div
                  key={itemKey}
                  className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-b-0 animate-slide-up transition-colors hover:bg-muted/50"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* User avatar for global activity */}
                  {isGlobal && globalItem && (
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={globalItem.photoURL ?? undefined} alt={globalItem.username} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {globalItem.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Cover image */}
                  <img
                    src={`/games/${item.gameId}/cover.png`}
                    alt={gameName}
                    className="h-12 w-12 rounded-lg object-cover shrink-0 bg-muted"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />

                  {/* Game info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{gameName}</p>
                      {isGlobal && globalItem && (
                        <p className="text-xs text-muted-foreground truncate">
                          {globalItem.username}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.lastMode && (
                        <span className="inline-flex items-center bg-accent text-accent-foreground text-[10px] font-semibold rounded-md px-2 py-0.5">
                          {item.lastMode === 'singleplayer' ? 'Singleplayer' : 'Multiplayer'}
                        </span>
                      )}
                      {item.lastScore != null && (
                        <span className="inline-flex items-center surface-2 text-muted-foreground text-[10px] font-medium rounded-md px-2 py-0.5">
                          Score <span className="mono ml-1">{item.lastScore.toLocaleString()}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Time and action */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-foreground">{relativeTime(item.updatedAt)}</p>
                    <p className="text-[11px] text-muted-foreground">{item.updatedAt.toLocaleDateString()}</p>
                  </div>

                  {/* Play Again button — hidden on mobile */}
                  {game && tab === 'personal' && (
                    <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex shrink-0">
                      <Link href={`/play/${item.gameId}`}>Play Again</Link>
                    </Button>
                  )}
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
