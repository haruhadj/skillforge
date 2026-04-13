import { useCallback, useEffect, useMemo, useRef } from 'react'
import { games } from '../games/games'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../contexts/useAuth'
import {
  saveBestScore,
  saveGameStats,
  saveModeScoreStats,
  getGameStats,
} from '../services/gameDataService'

export default function GamePlayer({ gameId, onBack, playerNameOverride }) {
  const game = games.find((g) => g.id === gameId)
  const baseIframeSrc = game?.iframePath ?? null
  const { currentUser } = useAuth()
  const iframeRef = useRef(null)
  const playerName = playerNameOverride || currentUser?.displayName || currentUser?.email || 'Player'
  const playerUid = currentUser?.uid ?? null
  const playerEmail = currentUser?.email ?? null
  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const defaultChessSocketUrl = isLocalHost
    ? `${window.location.protocol}//${window.location.hostname}:3004`
    : window.location.origin
  const chessSocketBaseUrl = (
    import.meta.env.VITE_CHESS_SOCKET_URL
    || defaultChessSocketUrl
  ).replace(/\/$/, '')

  const postPlayerInfoToIframe = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) return false

    iframeWindow.postMessage(
      {
        type: 'PLAYER_INFO',
        data: {
          name: playerName,
          uid: playerUid,
          email: playerEmail,
        },
      },
      window.location.origin,
    )

    return true
  }, [playerEmail, playerName, playerUid])

  const iframeSrc = useMemo(() => {
    if (!baseIframeSrc) return null
    if (gameId !== 'chess') return baseIframeSrc

    const params = new URLSearchParams()
    if (playerUid) params.set('uid', playerUid)
    if (playerName) params.set('name', playerName)
    if (playerEmail) params.set('email', playerEmail)
    params.set('socketUrl', chessSocketBaseUrl)

    const query = params.toString()
    return query ? `${baseIframeSrc}?${query}` : baseIframeSrc
  }, [baseIframeSrc, chessSocketBaseUrl, gameId, playerEmail, playerName, playerUid])

  useEffect(() => {
    if (!currentUser || !iframeSrc) return

    const uid = currentUser.uid
    const allowedOrigin = window.location.origin

    function handleMessage(event) {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || event.source !== iframeWindow) return
      if (event.origin !== allowedOrigin) return

      const msg = event.data
      if (!msg) return

      if (msg.type === 'REQUEST_PLAYER_INFO') {
        postPlayerInfoToIframe()
        return
      }

      if (msg.type !== 'GAME_EVENT') return

      if (msg.event === 'BEST_SCORE') {
        if (gameId === 'chroma-memory') return
        saveBestScore(uid, gameId, msg.data.bestScore)
      }

      if (msg.event === 'GAME_STATS') {
        if (gameId === 'chroma-memory') {
          const mode = msg.data?.mode
          const normalizedMode = mode === 'multiplayer' ? 'multiplayer' : 'singleplayer'
          const rawScore = msg.data?.accuracyPercentage
            ?? msg.data?.score
            ?? msg.data?.averageScore
            ?? msg.data?.finalScore
          const score = Number(rawScore)

          if (Number.isNaN(score)) {
            return
          }

          saveModeScoreStats(uid, gameId, normalizedMode, score)
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
  }, [currentUser, gameId, iframeSrc, postPlayerInfoToIframe])

  useEffect(() => {
    if (!iframeSrc) return

    postPlayerInfoToIframe()

    // Retry for a short period so embedded apps reliably receive identity
    // even if their message listener initializes after iframe load.
    let attempts = 0
    const maxAttempts = 12
    const retryTimer = window.setInterval(() => {
      attempts += 1
      postPlayerInfoToIframe()
      if (attempts >= maxAttempts) {
        window.clearInterval(retryTimer)
      }
    }, 250)

    return () => window.clearInterval(retryTimer)
  }, [iframeSrc, postPlayerInfoToIframe])

  return (
    <div className="fixed inset-0 flex flex-col gradient-bg transition-colors duration-500">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200/50 dark:border-gray-700/50 glass px-6 py-4 shadow-sm">
        <button
          className="btn-secondary px-4 py-2.5 text-sm hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
          onClick={onBack}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{game?.name ?? 'Game'}</h2>
        <ThemeToggle />
      </header>

      {iframeSrc ? (
        <iframe
          ref={iframeRef}
          className="flex-1 w-full h-full"
          title={gameId}
          src={iframeSrc}
          onLoad={() => {
            postPlayerInfoToIframe()
          }}
          frameBorder="0"
          allowFullScreen
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-lg glass p-8 max-w-md">
            <p className="text-xl font-bold text-slate-900 dark:text-white">Game not available yet.</p>
            <p className="mt-3 text-slate-600 dark:text-gray-400 text-sm font-350">
              To add a game here, update <code className="rounded bg-slate-100 dark:bg-gray-800 px-2 py-1 text-slate-800 dark:text-gray-300 font-mono text-xs">src/games/games.js</code> and put the game's static files under{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-2 py-1 text-slate-800 dark:text-gray-300 font-mono text-xs">public/games/{gameId}</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}