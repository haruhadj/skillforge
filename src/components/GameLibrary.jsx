import { games } from '../games/games'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function GameLibrary({ onSelect, onLogout, onStats }) {
  const { currentUser } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6 transition-colors duration-300">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Game Library</h2>
            {currentUser && (
              <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
                Welcome back, {currentUser.displayName || currentUser.email}!
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              className="rounded-xl bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-200 dark:focus:ring-indigo-800"
              onClick={onStats}
              type="button"
            >
              My Stats
            </button>
            <button
              className="rounded-xl bg-slate-900 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 dark:hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-slate-300 dark:focus:ring-gray-600"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/80 shadow-sm dark:shadow-lg dark:shadow-black/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 dark:hover:shadow-black/40 dark:hover:border-gray-600"
            >
              <div className="aspect-video w-full bg-linear-to-br from-slate-100 to-slate-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                <img
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  src={`/games/${game.id}/cover.png`}
                  alt={`${game.name} cover`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{game.name}</h3>
                <button
                  className={`w-full rounded-xl px-5 py-3 font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${game.iframePath
                      ? 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 hover:shadow-lg hover:shadow-indigo-500/25 focus:ring-indigo-200 dark:focus:ring-indigo-800'
                      : 'cursor-not-allowed bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500'
                    }`}
                  disabled={!game.iframePath}
                  onClick={() => onSelect(game.id)}
                >
                  {game.iframePath ? 'Play' : 'Coming Soon'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
