import { useCallback, useEffect, useState } from 'react'
import { defaultGames, mergeGamesWithFirestore } from './games'
import { getGameRegistry } from '../services/adminService'

/**
 * React hook that loads the game list from the static defaults
 * and overlays any Firestore `gameRegistry` documents on top.
 *
 * Returns { games, loading, refresh }.
 */
export function useGames() {
  const [games, setGames] = useState(defaultGames)
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
