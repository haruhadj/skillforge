/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'IDLE' | 'COUNTING' | 'RESULT';

export type AccuracyTierId = 'GOD_TIER' | 'EXCELLENT' | 'GOOD_EFFORT' | 'WAY_OFF';

export interface AccuracyTier {
  id: AccuracyTierId;
  label: string;
  badge: string;
  colorClass: string;
  glowClass: string;
  textColorClass: string;
  maxDelta: number;
  description: string;
}

export interface Attempt {
  id: string;
  target: number;
  actual: number;
  delta: number;
  tierId: AccuracyTierId;
  timestamp: number;
}
