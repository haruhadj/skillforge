/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GamePhase, ShapeTransform, ShapeType } from '../types';
import ShapeRenderer from './ShapeRenderer';
import { getPerformanceCommentary } from '../utils';
import { Check, ArrowRight, HelpCircle, Move } from 'lucide-react';

interface PlayCanvasProps {
  phase: GamePhase;
  roundNumber: number;
  shapeType: ShapeType;
  targetTransform: ShapeTransform;
  userTransform: ShapeTransform;
  onUserTransformChange: (transform: ShapeTransform) => void;
  onSubmit: () => void;
  onNextRound: () => void;
  timerCount: number; // 3.00 down to 0.00
  roundScore?: { posScore: number; sizeScore: number; totalScore: number };
}

interface DragTouchState {
  type: 'DRAG' | 'RESIZE';
  handle?: string;
  startX: number;
  startY: number;
  startShape: ShapeTransform;
}

// Conic-gradient swatch reused in the score legend so the legend matches the on-board target shape.
const GRADIENT_SWATCH = 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)';

// Starting transform for the intro fly-in animation (center of the board, small).
const CENTER_XFORM: ShapeTransform = { x: 40, y: 40, width: 20, height: 20 };

type ReadyWord = 'READY' | 'SET' | 'GO';

export default function PlayCanvas({
  phase,
  roundNumber,
  shapeType,
  targetTransform,
  userTransform,
  onUserTransformChange,
  onSubmit,
  onNextRound,
  timerCount,
  roundScore
}: PlayCanvasProps) {

  // `canvasRef` is the square play board; `boardWrapRef` is the flexible area it is centered within.
  const canvasRef = useRef<HTMLDivElement>(null);
  const boardWrapRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragTouchState | null>(null);
  const pinchStateRef = useRef<{
    startDist: number;
    startMidXpct: number;
    startMidYpct: number;
    startShape: ShapeTransform;
  } | null>(null);
  const [showHelperGrid, setShowHelperGrid] = useState(true);
  // SCORE-phase magnifier: frames the target↔guess pair so small deviations are visible.
  const [isZoomed, setIsZoomed] = useState(false);

  // Largest square that fits the available area. Keeping the board square means a 20%×20%
  // shape renders as a true square/circle and the target↔guess comparison is geometrically faithful.
  const [boardSize, setBoardSize] = useState(0);

  // READY phase — cycles through READY → SET → GO words.
  const [readyWord, setReadyWord] = useState<ReadyWord | null>(null);

  // MEMORIZE intro — shape flies from center to target.
  // false = render at CENTER (start), true = render at target (animate there).
  const [introStarted, setIntroStarted] = useState(false);

  useEffect(() => {
    if (phase !== 'READY') { setReadyWord(null); return; }
    setReadyWord('READY');
    const t1 = setTimeout(() => setReadyWord('SET'), 700);
    const t2 = setTimeout(() => setReadyWord('GO'),  1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, roundNumber]);

  useEffect(() => {
    if (phase !== 'MEMORIZE') {
      setIntroStarted(false);
      return;
    }
    // The shape MUST first be committed AND painted at CENTER (introStarted=false),
    // otherwise there is no "before" state for the CSS transition and the move to the
    // target looks instant. So we keep the first MEMORIZE render at center, then after
    // ~60 ms (a real macro-task — long enough that the center frame has painted) flip
    // to the target, which animates center → target over the transition duration.
    setIntroStarted(false);
    const trigger = setTimeout(() => setIntroStarted(true), 60);
    return () => clearTimeout(trigger);
  }, [phase, roundNumber]);

  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setBoardSize(Math.max(0, Math.floor(Math.min(rect.width, rect.height))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Auto-zoom: after a guess, reveal the full board briefly (spatial context), then
  // smoothly magnify the target↔guess deviation. Resets whenever we leave the scoring screen.
  useEffect(() => {
    if (phase !== 'SCORE') {
      setIsZoomed(false);
      return;
    }
    setIsZoomed(false);
    const timer = setTimeout(() => setIsZoomed(true), 700);
    return () => clearTimeout(timer);
  }, [phase, roundNumber]);

  // Center coordinates for the target & guess (used by the SCORE connector overlay).
  const targetCX = targetTransform.x + targetTransform.width / 2;
  const targetCY = targetTransform.y + targetTransform.height / 2;
  const userCX = userTransform.x + userTransform.width / 2;
  const userCY = userTransform.y + userTransform.height / 2;

  // Straight-line gap between the two centers, in board-percent units.
  const centerDistance = Math.sqrt((targetCX - userCX) ** 2 + (targetCY - userCY) ** 2);

  // When zoomed, auto-frame the union of the target + guess (with breathing room) so the
  // board shows just the deviation. `s` is the scale, `L`/`T` the top-left of the framed
  // box in board-%. Identity transform (1 / 0 / 0) whenever zoom is off.
  const zoom = (() => {
    if (phase !== 'SCORE' || !isZoomed) return { s: 1, L: 0, T: 0 };
    const minX = Math.min(targetTransform.x, userTransform.x);
    const minY = Math.min(targetTransform.y, userTransform.y);
    const maxX = Math.max(targetTransform.x + targetTransform.width, userTransform.x + userTransform.width);
    const maxY = Math.max(targetTransform.y + targetTransform.height, userTransform.y + userTransform.height);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // 1.5× padding around the union; clamp the framed side to [26, 100] (≈ max 3.8× zoom).
    const side = Math.min(100, Math.max(26, Math.max(maxX - minX, maxY - minY) * 1.5));
    const L = Math.min(100 - side, Math.max(0, cx - side / 2));
    const T = Math.min(100 - side, Math.max(0, cy - side / 2));
    return { s: 100 / side, L, T };
  })();

  // Handle Drag / Resize mechanics
  const handlePointerStart = (
    e: React.MouseEvent | React.TouchEvent,
    type: 'DRAG' | 'RESIZE',
    handleName?: string
  ) => {
    if (phase !== 'MANIPULATE') return;

    // Retrieve client coordinates depending on Mouse or Touch events
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStateRef.current = {
      type,
      handle: handleName,
      startX: clientX,
      startY: clientY,
      startShape: { ...userTransform }
    };

    // Prevent default scrolling on touch devices
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  // Two-finger pinch: detected at canvas level so it works regardless of where fingers land.
  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'MANIPULATE' || e.touches.length !== 2) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const midXpct = ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width * 100;
    const midYpct = ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height * 100;
    dragStateRef.current = null;
    pinchStateRef.current = {
      startDist: dist,
      startMidXpct: midXpct,
      startMidYpct: midYpct,
      startShape: { ...userTransform },
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Two-finger pinch to resize
      if ('touches' in e && e.touches.length === 2 && pinchStateRef.current) {
        const pinch = pinchStateRef.current;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scaleFactor = dist / pinch.startDist;
        const midXpct = ((t1.clientX + t2.clientX) / 2 - rect.left) / rect.width * 100;
        const midYpct = ((t1.clientY + t2.clientY) / 2 - rect.top) / rect.height * 100;
        const ar = pinch.startShape.width / pinch.startShape.height;
        const minDim = 6;
        let newWidth = Math.max(minDim, Math.min(90, pinch.startShape.width * scaleFactor));
        let newHeight = newWidth / ar;
        if (newHeight < minDim) { newHeight = minDim; newWidth = newHeight * ar; }
        if (newHeight > 90)     { newHeight = 90;     newWidth = newHeight * ar; }
        const newX = Math.max(-newWidth / 2, Math.min(100 - newWidth / 2, midXpct - newWidth / 2));
        const newY = Math.max(-newHeight / 2, Math.min(100 - newHeight / 2, midYpct - newHeight / 2));
        onUserTransformChange({
          x: Math.round(newX * 100) / 100,
          y: Math.round(newY * 100) / 100,
          width: Math.round(newWidth * 100) / 100,
          height: Math.round(newHeight * 100) / 100,
        });
        return;
      }

      const state = dragStateRef.current;
      if (!state) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Deltas in pixels
      const dx = clientX - state.startX;
      const dy = clientY - state.startY;

      // Deltas converted into canvas percentage coordinates
      const pctDx = (dx / rect.width) * 100;
      const pctDy = (dy / rect.height) * 100;

      const start = state.startShape;
      const minDimension = 6; // minimum shape percentage to prevent collapsing to zero
      let updated = { ...userTransform };

      if (state.type === 'DRAG') {
        // Allow overflow so the user can match targets that spawn beyond the border.
        // Clamp so the shape center stays within [0, 100] (at least half always visible).
        let newX = start.x + pctDx;
        let newY = start.y + pctDy;

        newX = Math.max(-start.width / 2, Math.min(100 - start.width / 2, newX));
        newY = Math.max(-start.height / 2, Math.min(100 - start.height / 2, newY));

        updated = {
          ...start,
          x: Math.round(newX * 100) / 100,
          y: Math.round(newY * 100) / 100,
        };
      } else if (state.type === 'RESIZE' && state.handle) {
        // Absolute position corner boundaries
        const fixedRight = start.x + start.width;
        const fixedBottom = start.y + start.height;
        const ar = start.width / start.height;

        switch (state.handle) {
          case 'tl': {
            let nextWidth = start.width - pctDx;
            const maxWidth = fixedRight;
            const maxHeight = fixedBottom;

            let clampedWidth = Math.max(minDimension, Math.min(maxWidth, nextWidth));
            let clampedHeight = clampedWidth / ar;

            if (clampedHeight > maxHeight) {
              clampedHeight = maxHeight;
              clampedWidth = clampedHeight * ar;
            }
            if (clampedHeight < minDimension) {
              clampedHeight = minDimension;
              clampedWidth = clampedHeight * ar;
            }

            updated = {
              x: Math.round((fixedRight - clampedWidth) * 100) / 100,
              y: Math.round((fixedBottom - clampedHeight) * 100) / 100,
              width: Math.round(clampedWidth * 100) / 100,
              height: Math.round(clampedHeight * 100) / 100,
            };
            break;
          }
          case 'tr': {
            let nextWidth = start.width + pctDx;
            const maxWidth = 100 - start.x;
            const maxHeight = fixedBottom;

            let clampedWidth = Math.max(minDimension, Math.min(maxWidth, nextWidth));
            let clampedHeight = clampedWidth / ar;

            if (clampedHeight > maxHeight) {
              clampedHeight = maxHeight;
              clampedWidth = clampedHeight * ar;
            }
            if (clampedHeight < minDimension) {
              clampedHeight = minDimension;
              clampedWidth = clampedHeight * ar;
            }

            updated = {
              x: start.x,
              y: Math.round((fixedBottom - clampedHeight) * 100) / 100,
              width: Math.round(clampedWidth * 100) / 100,
              height: Math.round(clampedHeight * 100) / 100,
            };
            break;
          }
          case 'bl': {
            let nextWidth = start.width - pctDx;
            const maxWidth = fixedRight;
            const maxHeight = 100 - start.y;

            let clampedWidth = Math.max(minDimension, Math.min(maxWidth, nextWidth));
            let clampedHeight = clampedWidth / ar;

            if (clampedHeight > maxHeight) {
              clampedHeight = maxHeight;
              clampedWidth = clampedHeight * ar;
            }
            if (clampedHeight < minDimension) {
              clampedHeight = minDimension;
              clampedWidth = clampedHeight * ar;
            }

            updated = {
              x: Math.round((fixedRight - clampedWidth) * 100) / 100,
              y: start.y,
              width: Math.round(clampedWidth * 100) / 100,
              height: Math.round(clampedHeight * 100) / 100,
            };
            break;
          }
          case 'br': {
            let nextWidth = start.width + pctDx;
            const maxWidth = 100 - start.x;
            const maxHeight = 100 - start.y;

            let clampedWidth = Math.max(minDimension, Math.min(maxWidth, nextWidth));
            let clampedHeight = clampedWidth / ar;

            if (clampedHeight > maxHeight) {
              clampedHeight = maxHeight;
              clampedWidth = clampedHeight * ar;
            }
            if (clampedHeight < minDimension) {
              clampedHeight = minDimension;
              clampedWidth = clampedHeight * ar;
            }

            updated = {
              x: start.x,
              y: start.y,
              width: Math.round(clampedWidth * 100) / 100,
              height: Math.round(clampedHeight * 100) / 100,
            };
            break;
          }
        }
      }

      onUserTransformChange(updated);
    };

    const handlePointerEnd = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) {
        if (e.touches.length < 2) pinchStateRef.current = null;
        if (e.touches.length === 0) dragStateRef.current = null;
        return;
      }
      dragStateRef.current = null;
      pinchStateRef.current = null;
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerEnd);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerEnd);
    window.addEventListener('touchcancel', handlePointerEnd);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerEnd);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerEnd);
      window.removeEventListener('touchcancel', handlePointerEnd);
    };
  }, [userTransform, onUserTransformChange, phase]);

  const commentary = roundScore ? getPerformanceCommentary(roundScore.totalScore) : null;

  return (
    <div className="flex h-full w-full flex-col font-sans select-none overflow-hidden">

      {/* ── Top Header: round / shape / grid toggle (compact on mobile) ── */}
      <header
        id="game-hud"
        className="flex flex-none items-center justify-between gap-3 border-b border-zinc-800/60 bg-zinc-900/60 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
              Round
            </span>
            <div className="font-display text-xl font-bold leading-none tracking-tight text-white sm:text-2xl">
              {roundNumber}<span className="text-base text-zinc-600"> / 5</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-400 sm:text-xs">
              Shape
            </span>
            <div className="mt-0.5 font-display text-sm font-semibold leading-none text-cyan-400 sm:text-base">
              {shapeType}
            </div>
          </div>
        </div>

        <button
          id="helper-grid-toggle"
          onClick={() => setShowHelperGrid(!showHelperGrid)}
          title="Toggle Calibration Grid"
          aria-pressed={showHelperGrid}
          className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-all ${
            showHelperGrid
              ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.1)]'
              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:bg-zinc-900'
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Reference Grid</span>
        </button>
      </header>

      {/* ── Board area: a square canvas centered in the remaining space ── */}
      <div
        ref={boardWrapRef}
        className="relative flex min-h-0 flex-1 items-center justify-center bg-[#050505] p-3 sm:p-5"
      >
        <div
          ref={canvasRef}
          id="play-canvas-container"
          className="relative overflow-hidden rounded-xl border border-zinc-800/70 bg-black touch-none sm:rounded-2xl"
          style={{ width: boardSize || undefined, height: boardSize || undefined, touchAction: 'none' }}
          onTouchStart={handleCanvasTouchStart}
        >
          {/* Zoomable content layer — identity transform unless the SCORE magnifier is on */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out"
            style={{ transformOrigin: '0 0', transform: `scale(${zoom.s}) translate(${-zoom.L}%, ${-zoom.T}%)` }}
          >
            {/* Spatial background templates */}
            <div className={`absolute inset-0 transition-opacity duration-300 ${showHelperGrid ? 'grid-bg opacity-100' : 'opacity-0'}`} />
            <div className="absolute inset-0 dot-bg opacity-40" />

            {/* 0. READY — dim ghost at center + READY/SET/GO word */}
            {phase === 'READY' && (
              <>
                <div className="opacity-20">
                  <ShapeRenderer type={shapeType} transform={CENTER_XFORM} styleMode="GRADIENT" idPrefix="ready-preview" />
                </div>
                {readyWord && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <span
                      key={readyWord}
                      className="word-pop font-display font-black select-none"
                      style={{
                        fontSize: 'clamp(2.8rem, 11vw, 5.5rem)',
                        color: readyWord === 'READY' ? '#06b6d4' : readyWord === 'SET' ? '#eab308' : '#22c55e',
                        textShadow: `0 0 40px ${readyWord === 'READY' ? 'rgba(6,182,212,0.5)' : readyWord === 'SET' ? 'rgba(234,179,8,0.5)' : 'rgba(34,197,94,0.6)'}`,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {readyWord}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* 1. MEMORIZE — shape flies from center to target, then stays for the timer.
                 Renders at CENTER on the first commit, then animates to the target. */}
            {phase === 'MEMORIZE' && (
              <ShapeRenderer
                type={shapeType}
                transform={introStarted ? targetTransform : CENTER_XFORM}
                styleMode="GRADIENT"
                isEditable={false}
                withTransition={true}
                idPrefix="target-memorize"
              />
            )}

            {/* 2. MANIPULATE — interactive user shape */}
            {phase === 'MANIPULATE' && (
              <ShapeRenderer
                type={shapeType}
                transform={userTransform}
                styleMode="GRADIENT"
                isEditable={true}
                onHandleMouseDown={(e, handle) => handlePointerStart(e, 'RESIZE', handle)}
                onShapeMouseDown={(e) => handlePointerStart(e, 'DRAG')}
                idPrefix="user-manipulate"
              />
            )}

            {/* 3. SCORE — precise target vs guess comparison */}
            {phase === 'SCORE' && roundScore && (
              <>
                {/* Underlay: the true target (dim gradient) */}
                <div className="opacity-50">
                  <ShapeRenderer
                    type={shapeType}
                    transform={targetTransform}
                    styleMode="GRADIENT"
                    isEditable={false}
                    idPrefix="target-overlay"
                  />
                </div>

                {/* Overlay: the user's guess (translucent purple) */}
                <ShapeRenderer
                  type={shapeType}
                  transform={userTransform}
                  styleMode="GUESSED_OVERLAY"
                  isEditable={false}
                  idPrefix="user-overlay"
                />

                {/* Connector line between the two centers + endpoint markers.
                    Stroke/radius are divided by the zoom scale so they stay visually crisp when magnified. */}
                <svg id="vector-feedback-overlay" className="pointer-events-none absolute inset-0 z-10 h-full w-full">
                  <line
                    id="vector-distance-line"
                    x1={`${targetCX}%`}
                    y1={`${targetCY}%`}
                    x2={`${userCX}%`}
                    y2={`${userCY}%`}
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth={2 / zoom.s}
                    strokeDasharray={`${6 / zoom.s},${6 / zoom.s}`}
                    className="animate-[dash_2s_linear_infinite]"
                  />
                  <circle cx={`${targetCX}%`} cy={`${targetCY}%`} r={5 / zoom.s} fill="#10b981" stroke="#020202" strokeWidth={2 / zoom.s} />
                  <circle cx={`${userCX}%`} cy={`${userCY}%`} r={5 / zoom.s} fill="#a855f7" stroke="#020202" strokeWidth={2 / zoom.s} />
                </svg>
              </>
            )}
          </div>

          {/* Fixed board corner labels (excluded from zoom; hidden while zoomed since the frame no longer spans 0–100) */}
          {showHelperGrid && !isZoomed && (
            <>
              <div className="pointer-events-none absolute left-2 top-2 font-mono text-[9px] tracking-widest text-zinc-700 sm:text-[10px]">0,0</div>
              <div className="pointer-events-none absolute right-2 top-2 font-mono text-[9px] tracking-widest text-zinc-700 sm:text-[10px]">100,0</div>
              <div className="pointer-events-none absolute bottom-2 left-2 font-mono text-[9px] tracking-widest text-zinc-700 sm:text-[10px]">0,100</div>
              <div className="pointer-events-none absolute bottom-2 right-2 font-mono text-[9px] tracking-widest text-zinc-700 sm:text-[10px]">100,100</div>
            </>
          )}

        </div>
      </div>

      {/* ── Docked console: phase controls / readout (never overlaps the board) ── */}
      <div
        id="game-console"
        className="flex-none border-t border-zinc-800/60 bg-zinc-900/70 px-4 py-4 backdrop-blur-md sm:px-6"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex min-h-[136px] w-full max-w-2xl flex-col justify-center sm:min-h-[148px]">

          {/* READY console */}
          {phase === 'READY' && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500 sm:text-xs">
                  Round {roundNumber} of 5 &nbsp;·&nbsp; {shapeType}
                </div>
                <div className="mt-2 font-display text-lg font-bold text-zinc-400 sm:text-xl">
                  Prepare to memorize
                </div>
              </div>
            </div>
          )}

          {/* MEMORIZE console */}
          {phase === 'MEMORIZE' && (
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="font-mono text-5xl font-bold leading-none tabular-nums text-white sm:text-6xl">
                {timerCount.toFixed(2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  Memorize
                </div>
                <div className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs">
                  Lock in the shape's size &amp; position before it disappears.
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${Math.max(0, Math.min(100, (timerCount / 3) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* MANIPULATE console */}
          {phase === 'MANIPULATE' && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-white">
                  <Move className="h-4 w-4 shrink-0 text-cyan-400" /> Recreate the shape
                </div>
                <div className="mt-1 text-[11px] leading-snug text-zinc-400 sm:text-xs">
                  Drag to move · pinch or pull corners to resize · then submit.
                </div>
              </div>
              <button
                id="submit-guess-button"
                onClick={onSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black uppercase tracking-wider text-black transition-all hover:bg-zinc-200 active:scale-95 sm:w-auto"
                title="Submit Reconstruction Coordinate"
              >
                <Check className="h-5 w-5 stroke-[3]" /> Submit
              </button>
            </div>
          )}

          {/* SCORE console */}
          {phase === 'SCORE' && roundScore && (
            <div className="flex flex-col gap-3">
              {/* Score headline + advance */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
                    {roundScore.totalScore.toFixed(2)}
                  </span>
                  <span className="font-mono text-sm text-zinc-500">/ 10.00</span>
                  {commentary && (
                    <span className={`ml-1 hidden font-display text-sm font-semibold sm:inline ${commentary.color}`}>
                      {commentary.title}
                    </span>
                  )}
                </div>
                <button
                  id="next-round-button"
                  onClick={onNextRound}
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition-all hover:bg-cyan-900 active:scale-95"
                >
                  <span>{roundNumber < 5 ? 'Next' : 'Results'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Position + Size accuracy bars */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-400 sm:text-[11px]">
                    <span>Position</span>
                    <span className="text-zinc-300">{(roundScore.posScore * 20).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                      style={{ width: `${(roundScore.posScore / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between font-mono text-[10px] text-zinc-400 sm:text-[11px]">
                    <span>Size</span>
                    <span className="text-zinc-300">{(roundScore.sizeScore * 20).toFixed(0)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-purple-500 transition-all duration-700"
                      style={{ width: `${(roundScore.sizeScore / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Legend (maps to on-board shapes) + commentary on mobile */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: GRADIENT_SWATCH }} />
                    Target
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-3 w-3 shrink-0 rounded-sm border border-dashed border-purple-400 bg-purple-600/40" />
                    You
                  </span>
                  <span className="text-zinc-300" title="Center-to-center offset">Δ {centerDistance.toFixed(1)}%</span>
                </div>
                {commentary && (
                  <span className={`truncate font-display text-xs font-semibold sm:hidden ${commentary.color}`}>
                    {commentary.title}
                  </span>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
