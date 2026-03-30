import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllScores } from '../services/gameDataService'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'

export default function StatsPage({ onBack }) {
  const { currentUser } = useAuth()
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }
    getAllScores(currentUser.uid)
      .then(setScores)
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

        {loading && (
          <p className="mt-12 text-center text-slate-500 dark:text-gray-400">Loading…</p>
        )}

        {!loading && currentUser && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {games.map((game) => {
              const data = scores[game.id]
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
