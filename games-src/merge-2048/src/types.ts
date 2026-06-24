/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameMode = 'classic' | 'shape';

export interface PhysicsBlock {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  level: number; // 1 to 12+ (1: 2, 2: 4, 3: 8, 4: 16, 5: 32, 6: 64, 7: 128, 8: 256, 9: 512, 10: 1024, 11: 2048)
  value: number; // 2^level
  angle: number; // in radians
  angularVelocity: number;
  isTNT: boolean;
  isMerging: boolean;
  scale: number; // used for spawning scale-in and merge scale-up animations
  color: string;
  shapeType: string; // 'rounded-rect' | 'circle' | 'triangle' | 'pentagon' | 'hexagon' | 'star'
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number; // 0 to 1
  decay: number;
  gravity?: number;
  isSpark?: boolean;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number; // 0 to 1
  size: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  peakLevel: number;
  blocksMerged: number;
  tntUsed: number;
}
