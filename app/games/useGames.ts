'use client'

import { useCallback, useEffect, useState } from 'react'
import { defaultGames, mergeGamesWithFirestore } from './games'
import { getGameRegistry } from '@/app/services/adminService'
import { Game } from '@/app/types'

interface UseGamesReturn {
  games: Game[]
  loading: boolean
  refresh: () => Promise<void>
}

/**
 * React hook that loads the game list from the static defaults
 * and overlays any Firestore `gameRegistry` documents on top.
 *
 * Returns { games, loading, refresh }.
 */
export function useGames(): UseGamesReturn {
  const [games, setGames] = useState<Game[]>(defaultGames)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const firestoreGames = await getGameRegistry()
      setGames(mergeGamesWithFirestore(firestoreGames))
    } catch {
      // On error, fall back to the static list
      setGames(defaultGames)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { games, loading, refresh: load }
}
