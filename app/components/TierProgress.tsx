'use client'

import { GlobalLeaderboardEntry } from '@/app/types'

const TIER_BANDS: Record<GlobalLeaderboardEntry['tier'], { min: number; next: string | null; bg: string; badge: string }> = {
  bronze:   { min: 0,  next: 'Silver',   bg: 'bg-amber-700',  badge: 'bg-amber-700 text-white' },
  silver:   { min: 20, next: 'Gold',     bg: 'bg-slate-400',  badge: 'bg-slate-400 text-white' },
  gold:     { min: 40, next: 'Platinum', bg: 'bg-yellow-500', badge: 'bg-yellow-500 text-white' },
  platinum: { min: 60, next: 'Master',   bg: 'bg-cyan-500',   badge: 'bg-cyan-500 text-white' },
  master:   { min: 80, next: null,       bg: 'bg-violet-600', badge: 'bg-violet-600 text-white' },
}

interface TierProgressProps {
  compositeScore: number
  tier: GlobalLeaderboardEntry['tier']
  gamesPlayed: number
  totalMatchCount: number
  size?: 'compact' | 'full'
}

export default function TierProgress({
  compositeScore,
  tier,
  gamesPlayed,
  totalMatchCount,
  size = 'full',
}: TierProgressProps) {
  const band = TIER_BANDS[tier]
  const progress = Math.min(Math.max((compositeScore - band.min) / 20, 0), 1)
  const ptsToNext = band.next ? Math.max(0, Math.ceil(band.min + 20 - compositeScore)) : 0
  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1)

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${band.badge}`}>
          {tierLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          Skill Score: <span className="font-semibold text-primary">{compositeScore}</span>
          {band.next && <> · {ptsToNext} pts to {band.next}</>}
        </span>
        <span className="text-xs text-muted-foreground">
          {gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'}
        </span>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${band.badge}`}>
          {tierLabel}
        </span>
        <span className="text-sm text-muted-foreground">
          Skill Score: <span className="font-semibold text-primary">{compositeScore}</span>
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${band.bg}`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex flex-wrap justify-between items-center gap-1 mt-1.5">
        <span className="text-xs text-muted-foreground">
          {band.next ? `${ptsToNext} pts to ${band.next}` : 'Maximum tier reached'}
        </span>
        <span className="text-xs text-muted-foreground">
          {gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'} · {totalMatchCount.toLocaleString()} {totalMatchCount === 1 ? 'match' : 'matches'}
        </span>
      </div>
    </div>
  )
}
