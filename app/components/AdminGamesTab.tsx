'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { defaultGames } from '@/app/games/games'
import { Game } from '@/app/types'

// ==========================================
// Service functions (Ideally move these to @/app/services/admin)
// ==========================================
async function getGameVisibility(): Promise<Record<string, boolean>> {
  const { db } = await import('@/app/lib/firebase')
  const { collection, getDocs } = await import('firebase/firestore')

  const snap = await getDocs(collection(db, 'gameVisibility'))
  const visibility: Record<string, boolean> = {}
  snap.forEach((doc) => {
    visibility[doc.id] = doc.data().enabled !== false
  })
  return visibility
}

async function setGameVisibility(gameId: string, enabled: boolean): Promise<void> {
  const { db } = await import('@/app/lib/firebase')
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')

  await setDoc(doc(db, 'gameVisibility', gameId), {
    enabled,
    updatedAt: serverTimestamp(),
  })
}

// ==========================================
// Component
// ==========================================
export default function AdminGamesTab() {
  const [games] = useState<Game[]>(defaultGames)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  // Fetch initial visibility on mount
  useEffect(() => {
    let isMounted = true

    const loadVisibility = async () => {
      try {
        const vis = await getGameVisibility()
        if (isMounted) setVisibility(vis)
      } catch (err) {
        console.error('Failed to load game visibility:', err)
        toast.error('Failed to load game visibility settings')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadVisibility()
    return () => { isMounted = false }
  }, [])

  // Optimistic toggle handler
  const handleToggle = useCallback(async (gameId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled
    const gameName = games.find(g => g.id === gameId)?.name || 'Game'

    // 1. Optimistically update UI state immediately
    setVisibility((prev) => ({ ...prev, [gameId]: newEnabled }))

    try {
      // 2. Make network request in background
      await setGameVisibility(gameId, newEnabled)
      toast.success(`${newEnabled ? 'Enabled' : 'Disabled'} ${gameName}`)
    } catch (err) {
      // 3. Rollback state if db write fails
      setVisibility((prev) => ({ ...prev, [gameId]: currentEnabled }))
      toast.error(err instanceof Error ? err.message : 'Failed to update changes')
    }
  }, [games])

  if (loading) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl glass animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Game Visibility</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Toggle games on/off to control what players see. Disabled games are hidden from the library.
        </p>
      </div>

      <div className="grid gap-4">
        {games.map((game) => {
          const enabled = visibility[game.id] !== false

          return (
            <div
              key={game.id}
              className={`glass p-4 flex items-center justify-between gap-4 transition-all duration-200 rounded-xl border border-white/5 ${enabled ? 'opacity-100 bg-white/[0.02]' : 'opacity-40 bg-black/20'
                }`}
            >
              {/* Left Side: Image & Text Group */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Game Cover Preview */}
                <div className="h-14 w-14 rounded-lg bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-white/10 shadow-md">
                  <img
                    src={`/games/${game.id}/cover.png`}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>

                {/* Game Info */}
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-slate-100 truncate">
                    {game.name}
                  </h3>
                  {game.description && (
                    <p className="text-sm text-slate-400 truncate hidden xs:block mt-0.5">
                      {game.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    ID: {game.id}
                  </p>
                </div>
              </div>

              {/* Right Side: Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`Toggle visibility for ${game.name}`}
                onClick={() => handleToggle(game.id, enabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shrink-0 shadow-inner ${enabled ? 'bg-indigo-600' : 'bg-slate-700'
                  }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      <div className="glass p-4 text-sm text-slate-500 dark:text-gray-400">
        <p>
          <strong>Note:</strong> Changes take effect immediately. Players will see only enabled games in the library.
        </p>
      </div>
    </div>
  )
}