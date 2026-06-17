'use client'

import { useEffect, useState } from 'react'
import { getAllUsers } from '@/app/services/adminService'
import { getGlobalRecentActivity } from '@/app/services/gameDataService'
import { defaultGames } from '@/app/games/games'
import { UserProfile } from '@/app/types'

interface EnrichedActivity {
  userId: string
  username: string
  photoURL: string | undefined
  gameId: string
  gameName: string
  lastMode: 'singleplayer' | 'multiplayer' | null
  lastScore: number | null
  updatedAt: Date
}

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function gameNameById(id: string) {
  return defaultGames.find((g) => g.id === id)?.name || id
}

export default function TeacherActivityTab() {
  const [activity, setActivity] = useState<EnrichedActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGlobalRecentActivity(50), getAllUsers()])
      .then(([rawActivity, users]) => {
        const userMap = Object.fromEntries(users.map((u: UserProfile) => [u.uid, u]))
        const enriched: EnrichedActivity[] = rawActivity
          .map((item) => {
            const user = userMap[item.userId]
            if (!user) return null
            return {
              userId: item.userId,
              username: user.username || user.email || 'Unknown',
              photoURL: user.photoURL || user.photoThumbURL,
              gameId: item.gameId,
              gameName: gameNameById(item.gameId),
              lastMode: item.lastMode,
              lastScore: item.lastScore,
              updatedAt: item.updatedAt,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
        setActivity(enriched)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Activity</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Latest game sessions across all students — most recent first
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-xl glass animate-pulse" />)}
        </div>
      ) : activity.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-base font-medium">No activity yet</p>
          <p className="text-sm mt-1">Game sessions will appear here once students start playing.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activity.map((item, idx) => {
            const initials = item.username.slice(0, 2).toUpperCase()
            const modeColor =
              item.lastMode === 'multiplayer'
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                : 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'

            return (
              <div
                key={`${item.userId}-${item.gameId}-${idx}`}
                className="glass flex items-center gap-3 p-3.5"
              >
                {item.photoURL ? (
                  <img src={item.photoURL} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    <span className="font-semibold">{item.username}</span>
                    <span className="text-slate-500 dark:text-gray-400 font-normal"> played </span>
                    <span className="font-semibold">{item.gameName}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.lastMode && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${modeColor}`}>
                        {item.lastMode}
                      </span>
                    )}
                    {item.lastScore !== null && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                        {item.lastScore.toLocaleString()} pts
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-xs text-slate-400 dark:text-gray-500 shrink-0 tabular-nums">
                  {timeAgo(item.updatedAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
