import { GlobalLeaderboardEntry } from '@/app/types'

export type Tier = GlobalLeaderboardEntry['tier']

/**
 * Single source of truth for tier presentation (colors, labels, band floors).
 * Consumed by TierProgress, RankBadge, and the leaderboard so the bronze→master
 * palette stays consistent. Band thresholds mirror `calculateTier` in scoring.ts
 * (20-point bands); keep them in sync.
 */
export interface TierMeta {
  /** Display label, e.g. "Platinum". */
  label: string
  /** Composite-score floor for this tier (band start). */
  min: number
  /** Label of the next tier up, or null at the top. */
  next: string | null
  /** Gradient stops (light → deep) for badges, bars, podium. */
  gradA: string
  gradB: string
  /** Accent text color for the tier label. */
  text: string
}

export const TIER_META: Record<Tier, TierMeta> = {
  bronze:   { label: 'Bronze',   min: 0,  next: 'Silver',   gradA: '#fcd9a8', gradB: '#d97706', text: '#d97706' },
  silver:   { label: 'Silver',   min: 20, next: 'Gold',     gradA: '#e2e8f0', gradB: '#94a3b8', text: '#94a3b8' },
  gold:     { label: 'Gold',     min: 40, next: 'Platinum', gradA: '#fde68a', gradB: '#eab308', text: '#ca8a04' },
  platinum: { label: 'Platinum', min: 60, next: 'Master',   gradA: '#67e8f9', gradB: '#06b6d4', text: '#06b6d4' },
  master:   { label: 'Master',   min: 80, next: null,       gradA: '#a78bfa', gradB: '#7c3aed', text: '#8b5cf6' },
}

/** Width of every tier band on the composite scale. */
export const TIER_BAND_SIZE = 20

/** 0–1 progress through the current tier band. */
export function tierProgress(compositeScore: number, tier: Tier): number {
  const { min } = TIER_META[tier]
  return Math.min(Math.max((compositeScore - min) / TIER_BAND_SIZE, 0), 1)
}

/** Whole points remaining to reach the next tier (0 at the top tier). */
export function pointsToNextTier(compositeScore: number, tier: Tier): number {
  const { min, next } = TIER_META[tier]
  return next ? Math.max(0, Math.ceil(min + TIER_BAND_SIZE - compositeScore)) : 0
}

/** CSS linear-gradient string for a tier (light → deep). */
export function tierGradient(tier: Tier, angle = '135deg'): string {
  const { gradA, gradB } = TIER_META[tier]
  return `linear-gradient(${angle}, ${gradA}, ${gradB})`
}
