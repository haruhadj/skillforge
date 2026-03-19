import { games } from '../games/games'
import { useAuth } from '../contexts/AuthContext'

export default function GameLibrary({ onSelect, onLogout }) {
  const { currentUser } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-900">Game Library</h2>
            {currentUser && (
              <p className="text-sm text-slate-600">
                Welcome back, {currentUser.displayName || currentUser.email}!
              </p>
            )}
          </div>
          <button
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        </header>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {games.map((game) => (
            <div
              key={game.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="aspect-[16/9] w-full bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                <img
                  className="h-full w-full object-contain"
                  src={`/games/${game.id}/cover.png`}
                  alt={`${game.name} cover`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 p-5">
                <h3 className="text-lg font-semibold text-slate-900">{game.name}</h3>
                <button
                  className={`w-full rounded-xl px-5 py-3 text-white transition focus:outline-none focus:ring-4 ${game.iframePath
                      ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-200'
                      : 'cursor-not-allowed bg-slate-300 text-slate-500'
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
