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
    <div className="min-h-screen gradient-bg transition-colors duration-500">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <header className="flex items-center justify-between gap-4 mb-8 animate-fade-in">
          <button
            className="btn-secondary px-4 py-2.5 text-sm hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            onClick={onBack}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white tracking-tight text-center">
              My Statistics
            </h2>
          </div>
          <ThemeToggle />
        </header>

        {!currentUser && (
          <div className="mt-12 text-center p-8 glass rounded-2xl">
            <svg className="mx-auto h-12 w-12 mb-3 opacity-40 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-600 dark:text-gray-300 font-medium">Log in to see your game statistics.</p>
          </div>
        )}

        {loading && currentUser && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, idx) => (
              <div key={game.id} className="glass p-6 rounded-2xl animate-pulse" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="h-6 w-32 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-4 h-10 w-24 rounded bg-slate-200 dark:bg-gray-700" />
                <div className="mt-3 h-4 w-40 rounded bg-slate-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-12 p-6 glass rounded-2xl border border-red-200 dark:border-red-800/50">
            <p className="text-center text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {!loading && currentUser && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, idx) => {
              const data = scores[game.id]
              const stats = gameStats[game.id]
              return (
                <div
                  key={game.id}
                  className="glass p-6 rounded-2xl card-hover animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                >
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {game.name}
                  </h3>

                  {data ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-gray-400 font-medium">Best Score</span>
                        <span className="text-2xl font-bold text-gradient">
                          {data.bestScore.toLocaleString()}
                        </span>
                      </div>
                      {data.updatedAt && (
                        <p className="text-xs text-slate-500 dark:text-gray-500 font-350">
                          Last updated: {data.updatedAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : stats?.accuracyPercentage != null ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-gray-400 font-medium">Accuracy</span>
                        <span className="text-2xl font-bold text-gradient">
                          {stats.accuracyPercentage.toFixed(2)}%
                        </span>
                      </div>
                      {stats.updatedAt && (
                        <p className="text-xs text-slate-500 dark:text-gray-500 font-350">
                          Last updated: {stats.updatedAt.toDate().toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-gray-700/30">
                      <p className="text-sm text-slate-500 dark:text-gray-400 font-350">
                        No data yet — play a game!
                      </p>
                    </div>
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
