import { useEffect, useRef } from 'react'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/AuthContext'
import { saveBestScore, saveGameStats, getGameStats } from '../services/gameDataService'

export default function GamePlayer({ gameId, onBack }) {
  const game = games.find((g) => g.id === gameId)
  const iframeSrc = game?.iframePath ?? null
  const { currentUser } = useAuth()
  const iframeRef = useRef(null)
  const playerName = currentUser?.displayName || currentUser?.email || 'Player'

  useEffect(() => {
    if (!currentUser || !iframeSrc) return

    const uid = currentUser.uid
    const allowedOrigin = window.location.origin

    function handleMessage(event) {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || event.source !== iframeWindow) return
      if (event.origin !== allowedOrigin) return

      const msg = event.data
      if (!msg || msg.type !== 'GAME_EVENT') return

      if (msg.event === 'BEST_SCORE') {
        if (gameId === 'chroma-memory') return
        saveBestScore(uid, gameId, msg.data.bestScore)
      }

      if (msg.event === 'GAME_STATS') {
        if (gameId === 'chroma-memory') {
          const isSingleplayer = msg.data?.mode === 'singleplayer'
          const accuracyPercentage = Number(msg.data?.accuracyPercentage)
          if (!isSingleplayer || Number.isNaN(accuracyPercentage)) {
            return
          }
          saveGameStats(uid, gameId, { accuracyPercentage })
          return
        }
        saveGameStats(uid, gameId, msg.data)
      }

      // Game iframe requests its saved progress
      if (msg.event === 'REQUEST_PROGRESS') {
        getGameStats(uid, gameId).then((stats) => {
          iframeRef.current?.contentWindow?.postMessage({
            type: 'RESTORE_PROGRESS',
            data: stats,
          }, allowedOrigin)
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [currentUser, gameId, iframeSrc])

  useEffect(() => {
    if (!iframeSrc) return

    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return

    iframeWindow.postMessage(
      {
        type: 'PLAYER_INFO',
        data: {
          name: playerName,
        },
      },
      window.location.origin,
    )
  }, [iframeSrc, playerName])

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 px-5 py-4 backdrop-blur">
        <button
          className="rounded-xl bg-slate-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-slate-200 dark:focus:ring-gray-600"
          onClick={onBack}
        >
          ← Back to library
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{game?.name ?? 'Game'}</h2>
        <ThemeToggle />
      </header>

      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          className="flex-1 w-full h-full"
          title={gameId}
          src={iframeSrc}
          onLoad={() => {
            iframeRef.current?.contentWindow?.postMessage(
              {
                type: 'PLAYER_INFO',
                data: {
                  name: playerName,
                },
              },
              window.location.origin,
            )
          }}
          frameBorder="0"
          allowFullScreen
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-xl font-semibold text-slate-900 dark:text-white">Game not available yet.</p>
          <p className="max-w-lg text-slate-600 dark:text-gray-400">
            To add a game here, update <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-slate-800 dark:text-gray-300">src/games/games.js</code> and put the game's static files under{' '}
            <code className="rounded bg-slate-100 dark:bg-gray-800 px-1 py-0.5 text-slate-800 dark:text-gray-300">public/games/{gameId}</code>.
          </p>
        </div>
      )}
    </div>
  )
}