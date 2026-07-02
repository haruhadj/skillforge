/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AccuracyTier, AccuracyTierId } from './types';

export const ACCURACY_TIERS: Record<AccuracyTierId, AccuracyTier> = {
  GOD_TIER: {
    id: 'GOD_TIER',
    label: '🎯 GOD TIER',
    badge: 'GOD TIER',
    colorClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    glowClass: 'shadow-emerald-500/20 text-emerald-400',
    textColorClass: 'text-emerald-400',
    maxDelta: 0.05,
    description: 'Perfect timing! Your internal clock is synced with reality.'
  },
  EXCELLENT: {
    id: 'EXCELLENT',
    label: '⚡ EXCELLENT',
    badge: 'EXCELLENT',
    colorClass: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    glowClass: 'shadow-teal-500/20 text-teal-400',
    textColorClass: 'text-teal-400',
    maxDelta: 0.20,
    description: 'Incredible speed perception. Extremely close!'
  },
  GOOD_EFFORT: {
    id: 'GOOD_EFFORT',
    label: '🪵 GOOD EFFORT',
    badge: 'GOOD EFFORT',
    colorClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    glowClass: 'shadow-amber-500/20 text-amber-400',
    textColorClass: 'text-amber-400',
    maxDelta: 0.50,
    description: 'Not bad! Just a tiny adjustment is needed.'
  },
  WAY_OFF: {
    id: 'WAY_OFF',
    label: '🐌 WAY OFF',
    badge: 'WAY OFF',
    colorClass: 'bg-red-500/10 border-red-500/20 text-red-400',
    glowClass: 'shadow-red-500/20 text-red-400',
    textColorClass: 'text-red-400',
    maxDelta: Infinity,
    description: 'Your internal clock drifted. Try counting slower or faster.'
  }
};

export function getAccuracyTier(delta: number): AccuracyTier {
  const absDelta = Math.abs(delta);
  if (absDelta <= 0.05) return ACCURACY_TIERS.GOD_TIER;
  if (absDelta <= 0.20) return ACCURACY_TIERS.EXCELLENT;
  if (absDelta <= 0.50) return ACCURACY_TIERS.GOOD_EFFORT;
  return ACCURACY_TIERS.WAY_OFF;
}

export function generateTargetTime(): number {
  // Use high-resolution timestamps via performance.now() as factor/entropy source
  const seed = performance.now();
  const rand = Math.random();
  // Mix performance.now() with Math.random() for high variation
  const mix = (seed % 1 + rand) % 1;
  const val = 2.00 + (mix * 5.00); // Map to [2.00, 7.00] range
  return parseFloat(val.toFixed(2));
}

export function formatTime(seconds: number): string {
  return seconds.toFixed(3);
}

export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}s`;
}
