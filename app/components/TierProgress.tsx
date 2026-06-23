'use client'

import { GlobalLeaderboardEntry } from '@/app/types'
import { TIER_META, tierProgress, pointsToNextTier, tierGradient } from '@/app/services/tiers'

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
  const meta = TIER_META[tier]
  const progress = tierProgress(compositeScore, tier)
  const ptsToNext = pointsToNextTier(compositeScore, tier)

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ background: tierGradient(tier) }}
        >
          {meta.label}
        </span>
        <span className="text-sm text-muted-foreground">
          Skill Score: <span className="mono font-semibold text-primary">{compositeScore}</span>
          {meta.next && <> · {ptsToNext} pts to {meta.next}</>}
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
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: tierGradient(tier) }}
        >
          {meta.label}
        </span>
        <span className="text-sm text-muted-foreground">
          Skill Score: <span className="mono font-semibold text-primary">{compositeScore}</span>
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress * 100}%`, background: tierGradient(tier, '90deg') }}
        />
      </div>

      <div className="flex flex-wrap justify-between items-center gap-1 mt-1.5">
        <span className="text-xs text-muted-foreground">
          {meta.next ? `${ptsToNext} pts to ${meta.next}` : 'Maximum tier reached'}
        </span>
        <span className="text-xs text-muted-foreground">
          {gamesPlayed} {gamesPlayed === 1 ? 'game' : 'games'} · <span className="mono">{totalMatchCount.toLocaleString()}</span> {totalMatchCount === 1 ? 'match' : 'matches'}
        </span>
      </div>
    </div>
  )
}
