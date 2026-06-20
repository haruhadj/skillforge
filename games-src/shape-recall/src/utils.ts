/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ShapeTransform, ShapeType } from './types';

/**
 * Creates a randomized transformation within reasonable boundaries of the canvas card.
 * Bounded so the shape is fully visible (10% margins).
 */
export function generateRandomTarget(shapeType: ShapeType): ShapeTransform {
  // Custom widths based on shape to make them look aesthetically balanced
  const minSize = 15;
  const maxSize = 38;

  const width = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
  // All shapes possess a cohesive 1:1 aspect ratio so that squares are authentic squares,
  // circles are authentic circles, and triangles can be perfectly matched by the uniform scaling.
  const height = width;

  // Compute boundaries
  const maxStartX = 100 - width - 10;
  const maxStartY = 100 - height - 10;

  const x = Math.floor(Math.random() * (maxStartX - 10 + 1)) + 10;
  const y = Math.floor(Math.random() * (maxStartY - 10 + 1)) + 10;

  return { x, y, width, height };
}

/**
 * Computes individual accuracy elements and yields an overall score out of 10.00.
 */
export function calculateScore(target: ShapeTransform, guess: ShapeTransform) {
  // 1. Position Accuracy
  const targetCX = target.x + target.width / 2;
  const targetCY = target.y + target.height / 2;
  
  const guessCX = guess.x + guess.width / 2;
  const guessCY = guess.y + guess.height / 2;

  const dx = targetCX - guessCX;
  const dy = targetCY - guessCY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Exponential decay model for distance penalty. 
  // If center is spot on, posFactor = 1.0. If centers are off by 20% of container, factor drops.
  const posFactor = Math.exp(-distance / 15);
  const posScore = Math.round(posFactor * 5 * 100) / 100;

  // 2. Scale / Dimension Accuracy
  const wRatio = Math.min(target.width, guess.width) / Math.max(target.width, guess.width);
  const hRatio = Math.min(target.height, guess.height) / Math.max(target.height, guess.height);

  const scaleFactor = (wRatio + hRatio) / 2;
  const sizeScore = Math.round(scaleFactor * 5 * 100) / 100;

  const totalScore = Math.round((posScore + sizeScore) * 100) / 100;

  return {
    posScore,
    sizeScore,
    totalScore
  };
}

/**
 * Returns performance-based commentary.
 */
export function getPerformanceCommentary(score: number): { title: string; desc: string; color: string } {
  if (score >= 9.8) {
    return {
      title: "Omnipresent Awareness 👁️",
      desc: "Perfect precision. Your eyes are literal CAD software scales.",
      color: "text-emerald-400 group-hover:text-emerald-300"
    };
  }
  if (score >= 9.5) {
    return {
      title: "Pixel Perfect Spark ✨",
      desc: "Sub-pixel levels of alignment. Phenomenal dimensional retention.",
      color: "text-green-400"
    };
  }
  if (score >= 9.0) {
    return {
      title: "Coordinate Dreamer 📐",
      desc: "You dream in Cartesian offsets. That is both useful and slightly alarming.",
      color: "text-cyan-400"
    };
  }
  if (score >= 8.0) {
    return {
      title: "Excellent Projection 🔍",
      desc: "Highly accurate space mapping. A minor margin of variance.",
      color: "text-indigo-400"
    };
  }
  if (score >= 6.5) {
    return {
      title: "Respectable Calibration ⚖️",
      desc: "Solid form logic, though your orientation drifted slightly under pressure.",
      color: "text-purple-400"
    };
  }
  if (score >= 5.0) {
    return {
      title: "Skewed Perspective 🌀",
      desc: "Decent coordinates, but scale and translation boundaries diverged.",
      color: "text-yellow-500"
    };
  }
  if (score >= 3.0) {
    return {
      title: "Spatial Dislocation 🌫️",
      desc: "The geometric targets exist in a separate coordinate region. Look closer at grid units.",
      color: "text-orange-500"
    };
  }
  return {
    title: "Dimensional Collapse 💥",
    desc: "A wild coordinates guess. Re-anchor your mental space and breathe.",
    color: "text-rose-500"
  };
}

/**
 * Lists random shape sequences for a game
 */
export const SHAPE_POOL: ShapeType[] = ['SQUARE', 'CIRCLE', 'TRIANGLE'];

export function getRandomShapeSequence(): ShapeType[] {
  const list: ShapeType[] = [];
  for (let i = 0; i < 5; i++) {
    const rIdx = Math.floor(Math.random() * SHAPE_POOL.length);
    list.push(SHAPE_POOL[rIdx]);
  }
  return list;
}
