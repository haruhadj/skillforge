import { games } from '../games/games'

export default function GamePlayer({ gameId, onBack }) {
  const game = games.find((g) => g.id === gameId)
  const iframeSrc = game?.iframePath ?? null

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 py-4 backdrop-blur">
        <button
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-200"
          onClick={onBack}
        >
          ← Back to library
        </button>
        <h2 className="text-lg font-semibold text-slate-900">{game?.name ?? 'Game'}</h2>
        <div className="w-16" />
      </header>

      {iframeSrc ? (
        <iframe
          className="flex-1 w-full h-full"
          title={gameId}
          src={iframeSrc}
          frameBorder="0"
          allowFullScreen
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xl font-semibold text-slate-900">Game not available yet.</p>
          <p className="max-w-lg text-slate-600">
            To add a game here, update <code className="rounded bg-slate-100 px-1 py-0.5">src/games/games.js</code> and put the game’s static files under{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5">public/games/{gameId}</code>.
          </p>
        </div>
      )}
    </div>
  )
}
