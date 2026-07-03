'use client'

import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { defaultGames } from '@/app/games/games'
import { Game } from '@/app/types'
import GameCover from '@/app/components/GameCover'

// ==========================================
// Service functions
// ==========================================
async function getGameVisibility(): Promise<Record<string, boolean>> {
  const { db } = await import('@/app/lib/firebase')
  const { collection, getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(db, 'gameVisibility'))
  const visibility: Record<string, boolean> = {}
  snap.forEach((doc) => { visibility[doc.id] = doc.data().enabled !== false })
  return visibility
}

async function setGameVisibility(gameId: string, enabled: boolean): Promise<void> {
  const { db } = await import('@/app/lib/firebase')
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  await setDoc(doc(db, 'gameVisibility', gameId), { enabled, updatedAt: serverTimestamp() })
}

async function getFeaturedGameIds(): Promise<string[]> {
  const { db } = await import('@/app/lib/firebase')
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, 'featuredGames', 'config'))
  return snap.exists() ? (snap.data().gameIds ?? []) : []
}

async function saveFeaturedGameIds(gameIds: string[]): Promise<void> {
  const { db } = await import('@/app/lib/firebase')
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  await setDoc(doc(db, 'featuredGames', 'config'), { gameIds, updatedAt: serverTimestamp() })
}

// ==========================================
// Component
// ==========================================
export default function AdminGamesTab() {
  const [games] = useState<Game[]>(defaultGames)
  const [visibility, setVisibility] = useState<Record<string, boolean>>({})
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const [vis, ids] = await Promise.all([getGameVisibility(), getFeaturedGameIds()])
        if (isMounted) { setVisibility(vis); setFeaturedIds(ids) }
      } catch (err) {
        console.error('Failed to load game settings:', err)
        toast.error('Failed to load game settings')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const handleToggle = useCallback(async (gameId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled
    const gameName = games.find(g => g.id === gameId)?.name || 'Game'
    setVisibility((prev) => ({ ...prev, [gameId]: newEnabled }))
    try {
      await setGameVisibility(gameId, newEnabled)
      toast.success(`${newEnabled ? 'Enabled' : 'Disabled'} ${gameName}`)
    } catch (err) {
      setVisibility((prev) => ({ ...prev, [gameId]: currentEnabled }))
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }, [games])

  const updateFeatured = useCallback(async (newIds: string[], prevIds: string[]) => {
    setFeaturedIds(newIds)
    try {
      await saveFeaturedGameIds(newIds)
    } catch {
      setFeaturedIds(prevIds)
      toast.error('Failed to save featured games')
    }
  }, [])

  const handlePin = useCallback((gameId: string) => {
    if (featuredIds.includes(gameId)) return
    const gameName = games.find(g => g.id === gameId)?.name || 'Game'
    updateFeatured([...featuredIds, gameId], featuredIds)
    toast.success(`Pinned ${gameName} to Creator's Picks`)
  }, [featuredIds, games, updateFeatured])

  const handleUnpin = useCallback((gameId: string) => {
    updateFeatured(featuredIds.filter(id => id !== gameId), featuredIds)
  }, [featuredIds, updateFeatured])

  const handleMoveUp = useCallback((gameId: string) => {
    const idx = featuredIds.indexOf(gameId)
    if (idx <= 0) return
    const newIds = [...featuredIds]
      ;[newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]]
    updateFeatured(newIds, featuredIds)
  }, [featuredIds, updateFeatured])

  const handleMoveDown = useCallback((gameId: string) => {
    const idx = featuredIds.indexOf(gameId)
    if (idx < 0 || idx >= featuredIds.length - 1) return
    const newIds = [...featuredIds]
      ;[newIds[idx], newIds[idx + 1]] = [newIds[idx + 1], newIds[idx]]
    updateFeatured(newIds, featuredIds)
  }, [featuredIds, updateFeatured])

  if (loading) {
    return (
      <div className="space-y-3" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl glass animate-pulse" />
        ))}
      </div>
    )
  }

  const featuredGames = featuredIds
    .map(id => games.find(g => g.id === id))
    .filter(Boolean) as Game[]

  return (
    <div className="space-y-8 w-full max-w-full">

      {/* ── Creator's Picks ── */}
      <div className="w-full">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Creator's Picks</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Pin games to feature them at the top of the library. Use the arrows to reorder.
        </p>

        {featuredGames.length === 0 ? (
          <div className="mt-4 glass rounded-xl p-8 text-center text-sm text-slate-500 dark:text-gray-400 border border-dashed border-slate-600/50">
            No games pinned yet. Use the ★ button on any game below to feature it here.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 w-full">
            {featuredGames.map((game, idx) => (
              <div
                key={game.id}
                className="glass p-4 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 w-full box-border"
              >
                {/* Fixed Index Column */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono text-slate-400 w-5 text-center select-none">{idx + 1}</span>
                  <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/10 shadow-md">
                    <GameCover gameId={game.id} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                </div>

                {/* Content Track */}
                <div className="min-w-0 w-full">
                  <h3 className="font-semibold text-base text-slate-100 truncate">{game.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Pinned Pick</p>
                </div>

                {/* Controls Column */}
                <div className="flex items-center justify-end gap-3 shrink-0 border-t border-white/5 pt-3 sm:pt-0 sm:border-0 sm:w-36">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(game.id)}
                    disabled={idx === 0}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label="Move up"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(game.id)}
                    disabled={idx === featuredGames.length - 1}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                    aria-label="Move down"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnpin(game.id)}
                    className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    aria-label={`Remove ${game.name} from Creator's Picks`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-slate-700/50" />

      {/* ── Game Visibility ── */}
      <div className="w-full">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Game Visibility</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          Toggle games on/off for players. Star (★) a game to pin it to Creator's Picks above.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 w-full">
          {games.map((game) => {
            const enabled = visibility[game.id] !== false
            const isPinned = featuredIds.includes(game.id)

            return (
              <div
                key={game.id}
                className={`glass p-4 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] items-center gap-4 transition-all duration-200 rounded-xl border border-white/5 w-full box-border ${enabled ? 'opacity-100 bg-white/[0.02]' : 'opacity-40 bg-black/20'
                  }`}
              >
                {/* Identical Layout Structure matching Creator's Picks above */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-5 shrink-0 hidden sm:block" />
                  <div className="h-12 w-12 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center border border-white/10 shadow-md">
                    <GameCover gameId={game.id} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </div>
                </div>

                {/* Content Track matches grid definition */}
                <div className="min-w-0 w-full">
                  <h3 className="font-semibold text-base text-slate-100 truncate">{game.name}</h3>
                  {game.description && (
                    <p className="text-sm text-slate-400 line-clamp-1 truncate mt-0.5 whitespace-normal sm:whitespace-nowrap">
                      {game.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {game.id}</p>
                </div>

                {/* Controls Column locked to uniform sm:w-36 size */}
                <div className="flex items-center justify-end gap-3 shrink-0 border-t border-white/5 pt-3 sm:pt-0 sm:border-0 sm:w-36">
                  {/* Pin / unpin */}
                  <button
                    type="button"
                    onClick={() => isPinned ? handleUnpin(game.id) : handlePin(game.id)}
                    className={`h-10 w-10 flex items-center justify-center rounded-lg transition-colors ${isPinned
                        ? 'text-amber-400 bg-amber-500/15 hover:bg-red-500/15 hover:text-red-400'
                        : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/15'
                      }`}
                    title={isPinned ? "Remove from Creator's Picks" : "Add to Creator's Picks"}
                    aria-label={isPinned ? `Unpin ${game.name}` : `Pin ${game.name} to Creator's Picks`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={isPinned ? 0 : 1.5}>
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>

                  {/* Visibility toggle alignment wrapper */}
                  <div className="h-10 w-12 flex items-center justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      aria-label={`Toggle visibility for ${game.name}`}
                      onClick={() => handleToggle(game.id, enabled)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-inner ${enabled ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${enabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="glass p-4 text-sm text-slate-500 dark:text-gray-400">
        <p><strong>Note:</strong> Changes take effect immediately. Pinned games appear in a Creator's Picks row at the top of the library.</p>
      </div>
    </div>
  )
}