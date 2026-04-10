import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/useAuth'
import * as gameDataService from '../services/gameDataService'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'

export default function StatsPage({ onBack }) {
  const { currentUser } = useAuth()
  const [scores, setScores] = useState({})
  const [gameStats, setGameStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentUser) {
      return
    }

    const loadAllGameStats = gameDataService.getAllGameStats
      ? gameDataService.getAllGameStats(currentUser.uid)
      : Promise.resolve({})

    Promise.all([gameDataService.getAllScores(currentUser.uid), loadAllGameStats])
      .then(([loadedScores, loadedGameStats]) => {
        setScores(loadedScores)
        setGameStats(loadedGameStats)
        setError('')
      })
      .catch((fetchError) => {
        setError('Could not load your statistics right now.')
        toast.error(`Failed to load stats: ${fetchError.message}`)
      })
      .finally(() => setLoading(false))
  }, [currentUser])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 transition-colors duration-300">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between">
          <button
            className="rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-gray-600"
            onClick={onBack}
          >
            ← Back to library
          </button>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            My Statistics
          </h2>
          <ThemeToggle />
        </header>

        {!currentUser && (
          <p className="mt-12 text-center text-slate-500 dark:text-gray-400">
            Log in to see your game statistics.
          </p>
        )}

        {loading && currentUser && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 p-5 shadow-sm dark:shadow-lg dark:shadow-black/20 animate-pulse"
              >
                <div className="h-5 w-32 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-4 h-8 w-24 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-3 h-3 w-40 rounded bg-slate-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <p className="mt-12 text-center text-red-600 dark:text-red-400">{error}</p>
        )}

        {!loading && currentUser && !error && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {games.map((game) => {
              const data = scores[game.id]
              const stats = gameStats[game.id]
              return (
                <div
                  key={game.id}
                  className="rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 p-5 shadow-sm dark:shadow-lg dark:shadow-black/20"
                >
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {game.name}
                  </h3>

                  {data ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-gray-400">Best Score</span>
                        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          {data.bestScore.toLocaleString()}
                        </span>
                      </div>
                      {data.updatedAt && (
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Last updated: {data.updatedAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : stats?.accuracyPercentage != null ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-gray-400">Accuracy</span>
                        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                          {stats.accuracyPercentage.toFixed(2)}%
                        </span>
                      </div>
                      {stats.updatedAt && (
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Last updated: {stats.updatedAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-400 dark:text-gray-500">
                      No data yet — play a game!
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
