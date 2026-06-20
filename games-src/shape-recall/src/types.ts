/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShapeType = 'TRIANGLE' | 'CIRCLE' | 'SQUARE';

export type GamePhase = 'MEMORIZE' | 'MANIPULATE' | 'SCORE' | 'SUMMARY';

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
