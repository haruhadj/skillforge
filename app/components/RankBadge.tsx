'use client'

import { Tier, tierGradient, TIER_META } from '@/app/services/tiers'

interface RankBadgeProps {
  tier: Tier
  /** Badge height in px (width auto-derived ~0.9×). Default 60. */
  size?: number
  className?: string
}

const HEX_CLIP = 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)'

/**
 * Hexagonal tier badge with a star, gradient-filled per tier — mirrors the
 * reference rank emblem. Color is single-sourced from `TIER_META`.
 */
export default function RankBadge({ tier, size = 60, className }: RankBadgeProps) {
  const width = Math.round(size * 0.9)
  const glow = TIER_META[tier].gradB
  return (
    <div
      className={className}
      style={{
        width,
        height: size,
        flex: 'none',
        clipPath: HEX_CLIP,
        background: tierGradient(tier, '150deg'),
        boxShadow: `0 6px 18px ${glow}59`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: size * 0.38,
      }}
      aria-label={`${TIER_META[tier].label} tier`}
    >
      ★
    </div>
  )
}
