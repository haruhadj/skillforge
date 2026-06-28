'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import ThemeToggle from '@/app/components/ThemeToggle'
import { defaultGames } from '@/app/games/games'
import {
  saveGameStats,
  getGameStats,
} from '@/app/services/gameDataService'
import { Game } from '@/app/types'

// Mirror the server route's bound (`app/api/games/score/route.ts` MAX_SCORE) so a
// non-finite/out-of-range value from a crafted postMessage or a buggy game is dropped
// before it ever reaches the wire (the server route clamps again authoritatively).
const MAX_SCORE = 1_000_000

// Returns a finite score clamped to 0..MAX_SCORE, or null for non-finite input
// (in which case the caller skips the write entirely).
function clampScore(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.min(Math.max(n, 0), MAX_SCORE)
}

// S2: route every leaderboard-relevant score write through the server-authoritative
// endpoint (verified ID token, gameId allowlist, range clamp, mode enum, per-uid rate
// limit) instead of writing users/{uid}/scores + gameStats directly via the client SDK.
// Fire-and-forget: a failed score write must never block gameplay.
async function postScore(
  getToken: () => Promise<string>,
  gameId: string,
  score: number,
  mode = 'singleplayer',
): Promise<void> {
  try {
    const token = await getToken()
    await fetch('/api/games/score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ gameId, score, mode }),
    })
  } catch {
    /* score write failure is non-fatal */
  }
}

// Score-like fields a game may report inside a free-form stats blob.
const SCORE_LIKE_KEYS = ['bestScore', 'score', 'lastScore']

// Pull the first finite score-like value out of a stats blob (for the server-routed
// leaderboard write), or null if the blob carries no score.
function extractScore(data: Record<string, unknown>): number | null {
  for (const key of SCORE_LIKE_KEYS) {
    if (key in data) {
      const clamped = clampScore(data[key])
      if (clamped != null) return clamped
    }
  }
  return null
}

// Drop the score-like keys (they go through the server route) and keep only the
// progress/resume fields, which the client SDK still persists for REQUEST_PROGRESS.
function progressBlob(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const out: Record<string, unknown> = { ...(data as Record<string, unknown>) }
  for (const key of SCORE_LIKE_KEYS) delete out[key]
  return out
}

export default function PlayGameClient() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const game = defaultGames.find((g) => g.id === gameId)
  const baseIframeSrc = game?.iframePath ?? null
  const { currentUser } = useAuth()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const playerName = currentUser?.displayName || currentUser?.email || 'Player'
  const playerUid = currentUser?.uid ?? null
  const playerEmail = currentUser?.email ?? null

  // Get chess socket URL
  const chessSocketBaseUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const defaultChessSocketUrl = isLocalHost
      ? `${window.location.protocol}//${window.location.hostname}:3004`
      : window.location.origin
    const envUrl = process.env.NEXT_PUBLIC_CHESS_SOCKET_URL || defaultChessSocketUrl
    return envUrl.replace(/\/$/, '')
  }, [])

  const postPlayerInfoToIframe = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow || typeof window === 'undefined') return false

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

    // Send Google Maps API key to GeoGuessr clone
    if (gameId === 'geoguessr-clone') {
      const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
      iframeWindow.postMessage(
        {
          type: 'GOOGLE_MAPS_API_KEY',
          data: { apiKey: googleMapsApiKey },
        },
        window.location.origin,
      )
    }

    return true
  }, [playerEmail, playerName, playerUid, gameId])

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
    if (!currentUser || !iframeSrc || typeof window === 'undefined') return

    const uid = currentUser.uid
    const authedUser = currentUser
    const allowedOrigin = window.location.origin

    function handleMessage(event: MessageEvent) {
      const iframeWindow = iframeRef.current?.contentWindow
      if (!iframeWindow || event.source !== iframeWindow) return
      if (event.origin !== allowedOrigin) return

      const msg = event.data
      if (!msg) return

      if (msg.type === 'REQUEST_PLAYER_INFO') {
        postPlayerInfoToIframe()
        return
      }

      // Handle API key request from GeoGuessr clone
      if (msg.type === 'REQUEST_GOOGLE_MAPS_API_KEY' && gameId === 'geoguessr-clone') {
        const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
        iframeWindow.postMessage(
          {
            type: 'GOOGLE_MAPS_API_KEY',
            data: { apiKey: googleMapsApiKey },
          },
          allowedOrigin,
        )
        return
      }

      // Handle Jose Rizal quiz scores
      if (msg.type === 'gameScore' && msg.gameId === 'jose-rizal') {
        const score = clampScore(msg.score)
        if (score == null) return
        // S2: best score + weighted stats are written server-side. The former custom
        // `totalGames` counter is dropped — it never fed the leaderboard composite;
        // buildWeightedModeStats (server route) tracks per-mode play counts instead.
        postScore(() => authedUser.getIdToken(), 'jose-rizal', score)
        return
      }

      if (msg.type !== 'GAME_EVENT') return

      if (msg.event === 'BEST_SCORE') {
        if (gameId === 'chroma-memory') return
        const bestScore = clampScore(msg.data?.bestScore)
        if (bestScore == null) return
        // S2: server route writes both scores + weighted gameStats.
        postScore(() => authedUser.getIdToken(), gameId, bestScore, 'singleplayer')
      }

      if (msg.event === 'GAME_STATS') {
        if (gameId === 'chroma-memory') {
          const mode = msg.data?.mode
          const normalizedMode = mode === 'multiplayer' ? 'multiplayer' : 'singleplayer'
          const rawScore = msg.data?.accuracyPercentage
            ?? msg.data?.score
            ?? msg.data?.averageScore
            ?? msg.data?.finalScore
          const clamped = clampScore(rawScore)
          if (clamped == null) return
          // S2: server route writes both scores + weighted gameStats.
          postScore(() => authedUser.getIdToken(), gameId, clamped, normalizedMode)
          return
        }
        // S2: the leaderboard-relevant score (if any) goes through the server route;
        // the remaining progress/resume fields are still persisted client-side so
        // REQUEST_PROGRESS can restore them.
        const score = extractScore(
          (msg.data && typeof msg.data === 'object') ? (msg.data as Record<string, unknown>) : {},
        )
        if (score != null) {
          postScore(() => authedUser.getIdToken(), gameId, score, 'singleplayer')
        }
        // S2-b: gameStats resume blob is still client-writable — lock once a progress
        // API exists. Score-like keys are stripped so they can't bypass the route.
        const progress = progressBlob(msg.data)
        if (Object.keys(progress).length > 0) {
          saveGameStats(uid, gameId, progress)
        }
      }

      // Per-quiz community analytics for the Philippine Trivia game. Best-effort:
      // recorded server-side via an authenticated route, never blocks gameplay.
      if (msg.event === 'TRIVIA_PLAY' && gameId === 'philippine-trivia') {
        const { quizId, score, total } = msg.data || {}
        authedUser
          .getIdToken()
          .then((token) =>
            fetch(`/api/games/${gameId}/plays`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ quizId, score, total }),
            }),
          )
          .catch(() => {
            /* analytics is non-critical */
          })
        return
      }

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

  if (!currentUser) {
    return null
  }

  return (
    <div className="fixed inset-0 flex flex-col gradient-bg transition-colors duration-500">
      <header className="flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-200/50 dark:border-gray-700/50 glass px-3 sm:px-6 py-2.5 sm:py-4 shadow-sm">
        <button
          className="rounded-xl border border-border bg-secondary text-secondary-foreground px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold hover:bg-secondary/80 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 shrink-0"
          onClick={() => router.push('/library')}
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.56l3.47 3.47a.75.75 0 11-1.06 1.06l-4.75-4.75a.75.75 0 010-1.06l4.75-4.75a.75.75 0 011.06 1.06L5.56 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <h2 className="text-sm sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate min-w-0 text-center">{game?.name ?? 'Game'}</h2>
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
          allowFullScreen
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-lg glass p-8 max-w-md">
            <p className="text-xl font-bold text-slate-900 dark:text-white">Game not available yet.</p>
            <p className="mt-3 text-slate-600 dark:text-gray-400 text-sm">
              To add a game here, update <code className="rounded bg-slate-100 dark:bg-gray-800 px-2 py-1 text-slate-800 dark:text-gray-300 font-mono text-xs">app/games/games.ts</code> and put the game&apos;s static files under{' '}
              <code className="rounded bg-slate-100 dark:bg-gray-800 px-2 py-1 text-slate-800 dark:text-gray-300 font-mono text-xs">public/games/{gameId}</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
