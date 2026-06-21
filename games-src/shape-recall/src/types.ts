/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShapeType =
  // Basic
  | 'TRIANGLE' | 'CIRCLE' | 'SQUARE'
  // Polygons
  | 'PENTAGON' | 'HEXAGON' | 'HEPTAGON' | 'OCTAGON' | 'NONAGON' | 'DECAGON'
  // Derived / irregular
  | 'DIAMOND' | 'KITE' | 'TRAPEZOID' | 'PARALLELOGRAM' | 'RIGHT_TRIANGLE'
  // Stars & sparks
  | 'STAR' | 'STAR_4_POINT' | 'STAR_6_POINT' | 'SPARKLE'
  // Special
  | 'CROSS' | 'ARROW' | 'HEART' | 'CHEVRON';

export type GamePhase = 'READY' | 'MEMORIZE' | 'MANIPULATE' | 'SCORE' | 'SUMMARY';

export interface ShapeTransform {
  x: number;      // percentage from left (0 - 100)
  y: number;      // percentage from top (0 - 100)
  width: number;  // width percentage (0 - 100)
  height: number; // height percentage (0 - 100)
}

export interface RoundData {
  roundNumber: number;
  shapeType: ShapeType;
  target: ShapeTransform;
  guess: ShapeTransform;
  posScore: number;
  sizeScore: number;
  totalScore: number;
}
