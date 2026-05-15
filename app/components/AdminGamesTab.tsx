'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { defaultGames } from '@/app/games/games'
import { Game } from '@/app/types'

// Service functions (inline for now, can be moved to adminService)
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

export default function AdminGamesTab() {
  const [games, setGames] = useState<Game[]>(defaultGames)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    loadVisibility()
  }, [])

  const loadVisibility = async () => {
    try {
      setLoading(true)
      const vis = await getGameVisibility()
      setVisibility(vis)
    } catch (err) {
      console.error('Failed to load game visibility:', err)
      toast.error('Failed to load game visibility settings')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (gameId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled
    try {
      setSaving(gameId)
      await setGameVisibility(gameId, newEnabled)
      setVisibility((prev) => ({ ...prev, [gameId]: newEnabled }))
      toast.success(`${newEnabled ? 'Enabled' : 'Disabled'} ${games.find(g => g.id === gameId)?.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(null)
    }
  }

  const isEnabled = (gameId: string) => {
    // If not in visibility map, default to true (enabled)
    return visibility[gameId] !== false
  }

  if (loading) {
    return (
      <div className="space-y-3">
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
          const enabled = isEnabled(game.id)
          const isSaving = saving === game.id

          return (
            <div
              key={game.id}
              className={`glass p-4 flex items-center gap-4 transition-all ${enabled ? '' : 'opacity-60'}`}
            >
              {/* Game Cover Preview */}
              <div className="h-16 w-16 rounded-lg bg-slate-100 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={`/games/${game.id}/cover.png`}
                  alt={game.name}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>

              {/* Game Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white truncate">{game.name}</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 truncate">{game.description}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">ID: {game.id}</p>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle(game.id, enabled)}
                disabled={isSaving}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 ${
                  enabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
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
