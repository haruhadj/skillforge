'use client'

import Link from 'next/link'
import { Game } from '@/app/types'
import GameCover from '@/app/components/GameCover'

interface GameCardProps {
  game: Game
  isRecent?: boolean
  /** Total plays across all users (popularity). */
  plays?: number
  /** Signed-in user's best score for this game, or null if unplayed. */
  best?: number | null
  onPlay?: () => void
}

const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n))

/**
 * Library game card — cover (tap/click to play) with category chip + optional
 * "Recent" marker, title, and a mono Plays/Best stat strip.
 */
export default function GameCard({ game, isRecent, plays = 0, best = null, onPlay }: GameCardProps) {
  const playable = !!game.iframePath

  const cover = (
    <div className="aspect-[4/3] relative overflow-hidden bg-muted">
      <GameCover
        gameId={game.id}
        alt={game.name}
        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      {game.category && (
        <span className="absolute top-2 left-2 h-5 px-2 inline-flex items-center rounded-md text-[10px] font-semibold bg-background/85 backdrop-blur-sm text-foreground/80">
          {game.category}
        </span>
      )}
      {isRecent && (
        <span className="absolute top-2 right-2 h-5 px-2 inline-flex items-center gap-1 rounded-md text-[10px] font-semibold bg-foreground/40 text-white backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Recent
        </span>
      )}
      {!playable && (
        <span className="absolute inset-x-2 bottom-2 h-5 px-2 inline-flex items-center justify-center rounded-md text-[10px] font-semibold bg-background/85 backdrop-blur-sm text-foreground/70">
          Coming Soon
        </span>
      )}
    </div>
  )

  return (
    <div className="group surface overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30">
      {playable ? (
        <Link href={`/games/${game.id}`} prefetch={false} onClick={onPlay} aria-label={`Play ${game.name}`}>
          {cover}
        </Link>
      ) : (
        cover
      )}

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="text-sm font-semibold leading-tight line-clamp-1">{game.name}</h3>

        <div className="mt-auto flex gap-4 px-3 py-2 rounded-xl surface-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground">Plays</p>
            <p className="mono text-xs font-semibold mt-0.5">{fmt(plays)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wide font-semibold text-muted-foreground">Best</p>
            <p className="mono text-xs font-semibold mt-0.5">{best != null && best > 0 ? best.toLocaleString() : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
