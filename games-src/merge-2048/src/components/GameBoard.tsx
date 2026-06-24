/**
 * GameBoard.tsx — Merge-2048 physics powered by Matter.js
 *
 * ROOT CAUSE OF "INFINITE SPIN" (old hand-rolled engine):
 *   angularVelocity was only damped on collision contact.
 *   Between contacts — while a block was airborne — no damping was applied,
 *   so blocks spun at constant angular velocity indefinitely.
 *
 * THE FIX — Matter.js frictionAir:
 *   Matter.js applies frictionAir as a per-tick multiplier to BOTH linear
 *   velocity AND angular velocity, regardless of whether the body is touching
 *   anything:
 *
 *     // Inside every Matter.js engine step (~16 ms at 60 fps):
 *     body.angularVelocity *= (1 - body.frictionAir);   // always runs
 *     body.speed           *= (1 - body.frictionAir);   // always runs
 *
 *   At frictionAir = 0.05 and 60 fps:
 *     • Each tick removes 5 % of angular velocity.
 *     • A block at 10 rad/s decays below 0.1 rad/s in ≈90 ticks (≈1.5 s).
 *     • This decay happens even in free-fall — no contact required.
 *     • Blocks arrive at surfaces already nearly still; one or two bounces
 *       (restitution = 0.15) fully arrest remaining motion.
 *
 *   Complementary settings:
 *     restitution    = 0.15  → 85 % of bounce energy absorbed on impact
 *     friction       = 0.5   → blocks grip walls / each other; no slipping
 *     enableSleeping = true  → bodies below sleepThreshold stop simulating
 *                              entirely → zero residual jitter, zero wasted CPU
 *
 * Architecture:
 *   Matter.Runner drives physics independently of the RAF loop.
 *   The RAF loop: drains deferred merge/TNT queues → draws → checks game-over.
 *   All game-control values live in refs so the single RAF closure never goes stale.
 *   Merges and TNT are QUEUED during the Matter.js collisionStart callback and
 *   processed NEXT frame — mutating the world mid-step corrupts the broadphase grid.
 */
import React, { useRef, useEffect, useState } from 'react';
import * as Matter from 'matter-js';
import { Particle, FloatingText, GameMode } from '../types';
import { audio } from '../utils/audio';

// Virtual canvas coordinate space; physics world uses the same units
const VW = 400;
const VH = 600;
const EMITTER_Y = 55;
const WARNING_Y  = 90;   // higher line = less buffer above it → quicker overflow
const DROP_COOLDOWN = 700; // ms minimum between drops — prevents spam

// ─── Physics tuning ──────────────────────────────────────────────────────────
// frictionAir is the PRIMARY anti-spin control — see header.
const PHYS = {
  gravity:        1.0,
  restitution:    0.15,   // bounciness (0 = dead-stop, 1 = perfectly elastic)
  friction:       0.5,    // kinetic surface-to-surface friction coefficient
  frictionAir:    0.05,   // AIR DRAG: damps angular AND linear velocity every tick
  frictionStatic: 0.5,    // extra grip before a body starts sliding
  density:        0.002,  // mass = density × area; heavier blocks push lighter ones
} as const;

// ─── Per-body gameplay metadata ───────────────────────────────────────────────
// Matter bodies hold only physics state; all game logic lives here,
// keyed by body.id in metaRef.
interface BlockMeta {
  level:     number;   // 1–12; value = 2^level
  value:     number;
  isMerging: boolean;  // true once this body is queued for removal (prevents double-queue)
  scale:     number;   // 0.1 → 1.0 spawn pop-in animation
}

// ─── Level visual config ──────────────────────────────────────────────────────
export const LEVEL_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  1:  { bg: 'from-slate-200 to-indigo-100',   text: '#1e1b4b', glow: 'rgba(224,231,255,0.4)' },
  2:  { bg: 'from-amber-200 to-yellow-300',   text: '#451a03', glow: 'rgba(253,224,71,0.5)'  },
  3:  { bg: 'from-orange-300 to-amber-500',   text: '#541212', glow: 'rgba(249,115,22,0.6)'  },
  4:  { bg: 'from-rose-400 to-red-500',       text: '#ffffff', glow: 'rgba(239,68,68,0.7)'   },
  5:  { bg: 'from-red-500 to-orange-500',     text: '#ffffff', glow: 'rgba(249,115,22,0.8)'  },
  6:  { bg: 'from-pink-400 to-rose-600',      text: '#ffffff', glow: 'rgba(244,63,94,0.8)'   },
  7:  { bg: 'from-pink-500 to-fuchsia-600',   text: '#ffffff', glow: 'rgba(217,70,239,0.85)' },
  8:  { bg: 'from-cyan-400 to-teal-500',      text: '#083344', glow: 'rgba(34,211,238,0.9)'  },
  9:  { bg: 'from-sky-500 to-blue-600',       text: '#ffffff', glow: 'rgba(59,130,246,0.9)'  },
  10: { bg: 'from-violet-500 to-purple-600',  text: '#ffffff', glow: 'rgba(139,92,246,0.95)' },
  11: { bg: 'from-emerald-400 to-green-600',  text: '#022c22', glow: 'rgba(16,185,129,1)'    },
  12: { bg: 'from-amber-400 to-yellow-500',   text: '#222222', glow: 'rgba(251,191,36,1)'    },
};

interface GameBoardProps {
  mode:           GameMode;
  isMuted:        boolean;
  onScoreChange:  (n: number) => void;
  onStatChange:   (s: { levelReached: number; mergedCount: number; tntCount: number }) => void;
  onGameOver:     () => void;
  gameActive:     boolean;
  restartTrigger: number;
}

export default function GameBoard({
  mode, isMuted, onScoreChange, onStatChange, onGameOver, gameActive, restartTrigger,
}: GameBoardProps) {

  // ─── DOM ──────────────────────────────────────────────────────────────────
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── Matter.js instances (stable after first mount) ───────────────────────
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // body.id → BlockMeta; the authoritative gameplay-state store
  const metaRef = useRef<Map<number, BlockMeta>>(new Map());

  // Deferred action queues — filled during collisionStart callbacks,
  // drained at the START of each RAF frame (after the engine step).
  // Rationale: mutating the world mid-step corrupts Matter.js's internal
  // broadphase grid and causes clip-through / tunnelling artefacts.
  const pendingMergesRef = useRef<[Matter.Body, Matter.Body][]>([]);

  // ─── Visual-effects state ─────────────────────────────────────────────────
  const particlesRef     = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const screenShakeRef   = useRef(0);
  const gameOverTimerRef = useRef<number | null>(null);
  const overflowValRef   = useRef(0); // read inside RAF without stale closure

  // ─── Game-control refs ────────────────────────────────────────────────────
  // All values the single stable RAF loop needs live in refs.
  // Storing them as React state would cause the loop to restart on every
  // mouse-move / drag event — the root cause of the original engine's stutter.
  const aimXRef        = useRef(VW / 2);
  const isAimingRef    = useRef(false);
  const holdLevelRef   = useRef(1);
  const nextLevelRef   = useRef(1);
  const gameActiveRef  = useRef(gameActive);
  const modeRef        = useRef(mode);
  // Difficulty: anti-spam cooldown + chain-merge combo
  const lastDropRef    = useRef(0);          // timestamp of last drop
  const comboCountRef  = useRef(0);          // consecutive merges within COMBO_WINDOW
  const lastMergeRef   = useRef(0);          // timestamp of last merge
  const COMBO_WINDOW   = 1800;               // ms; merges within this window chain

  // Prop callbacks in refs so the stable RAF closure never holds stale pointers
  const onScoreRef    = useRef(onScoreChange);
  const onStatRef     = useRef(onStatChange);
  const onGameOverRef = useRef(onGameOver);

  // ─── React state — only what JSX needs to re-render ──────────────────────
  const [nextBlockLevel, setNextBlockLevel] = useState(1);
  const [overflowCountdown, setOverflowCountdown] = useState(0);

  // Keep refs in sync with changing props each render
  useEffect(() => { gameActiveRef.current = gameActive;    }, [gameActive]);
  useEffect(() => { modeRef.current       = mode;          }, [mode]);
  useEffect(() => { onScoreRef.current    = onScoreChange; }, [onScoreChange]);
  useEffect(() => { onStatRef.current     = onStatChange;  }, [onStatChange]);
  useEffect(() => { onGameOverRef.current = onGameOver;    }, [onGameOver]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getRadius = (level: number): number => {
    // Larger base + steeper per-level growth → container fills faster = harder
    const base = 22 + level * 8;
    if (modeRef.current !== 'shape') return base;
    const mods = [0, 0.96, 1.18, 1.05, 1.14, 1.02, 1.10, 1.05, 1.15, 1.12, 1.20, 1.25, 1.15];
    return base * (mods[level] ?? 1.15);
  };

  const getShapeForLevel = (level: number): string => {
    const shapes = [
      '', 'circle', 'triangle', 'square', 'pentagon', 'hexagon',
      'octagon', 'heptagon', 'star-5', 'star-6', 'star-8', 'star-12',
    ];
    return shapes[level] ?? 'circle';
  };

  const draftLevel = (): number => {
    // Less level-1 (easy instant-merge), more level-2 & 3 (diverse, fills space)
    // Old: 40% L1 / 25% L2 / 18% L3 / 12% L4 / 5% L5
    // New: 25% L1 / 30% L2 / 27% L3 / 14% L4 / 4% L5
    const r = Math.random();
    if (r < 0.25) return 1;
    if (r < 0.55) return 2;
    if (r < 0.82) return 3;
    if (r < 0.96) return 4;
    return 5;
  };

  // ─── Matter.js body factory ───────────────────────────────────────────────
  //
  // Shape-matching strategy per mode:
  //
  //   classic mode        → chamfered rectangle    (matches rounded-rect visual)
  //   shape / circle      → Bodies.circle          (exact match)
  //   shape / tri–octagon → Bodies.polygon(sides)  (exact convex polygon match)
  //   shape / star-N      → Bodies.polygon(N)      (convex hull of star outer points)
  //
  // Why convex polygons for stars instead of fromVertices?
  //   Star shapes are concave. Matter.js's fromVertices requires the poly-decomp
  //   library to decompose concave shapes into convex sub-bodies. Without it,
  //   fromVertices silently falls back to the convex hull anyway. Using a convex
  //   polygon explicitly is clearer, avoids the dependency, and is actually
  //   better for gameplay (blocks don't snag on visual star notches).
  //
  //   To enable exact concave hitboxes later:
  //     npm install poly-decomp
  //     import decomp from 'poly-decomp';
  //     Matter.Common.setDecomp(decomp);
  //   then replace the star-N branch with:
  //     body = Matter.Bodies.fromVertices(x, y, buildStarVerts(pts, r, r*0.52), opts);
  const spawnBody = (
    x: number,
    y: number,
    level: number,
    initVy = 1.5,
  ): Matter.Body => {
    const engine = engineRef.current!;
    const r = getRadius(level);

    const opts: Matter.IChamferableBodyDefinition = {
      restitution:     PHYS.restitution,
      friction:        PHYS.friction,
      // frictionAir is applied by Matter.js every engine step to BOTH
      // linear and angular velocity:
      //   angularVelocity *= (1 - frictionAir)  // ← this is what stops infinite spin
      //   speed           *= (1 - frictionAir)  // ← this stops endless sliding
      // The old custom engine only did this on collision — now it's every tick.
      frictionAir:     PHYS.frictionAir,
      frictionStatic:  PHYS.frictionStatic,
      density:         PHYS.density,
      angle:           Math.random() * Math.PI * 2,
      sleepThreshold:  30,
      label:           'block',
    };

    let body: Matter.Body;

    if (modeRef.current === 'classic') {
      // Chamfered rectangle: the chamfer makes the hitbox match the
      // visually rounded corner exactly (chamfer radius = 25% of block radius)
      body = Matter.Bodies.rectangle(x, y, r * 2, r * 2, {
        ...opts,
        chamfer: { radius: r * 0.25 },
      });
    } else {
      const shape = getShapeForLevel(level);
      if (shape === 'circle') {
        body = Matter.Bodies.circle(x, y, r, opts);
      } else if (shape.startsWith('star-')) {
        // Circle at the star's outer-tip radius: the visual star never exceeds
        // this boundary, so tips can't visually clip into walls or other blocks.
        body = Matter.Bodies.circle(x, y, r, opts);
      } else {
        const sideMap: Record<string, number> = {
          triangle: 3, square: 4, pentagon: 5,
          hexagon: 6,  heptagon: 7, octagon: 8,
        };
        body = Matter.Bodies.polygon(x, y, sideMap[shape] ?? 4, r, opts);
      }
    }

    Matter.Body.setVelocity(body, { x: 0, y: initVy });
    metaRef.current.set(body.id, {
      level, value: Math.pow(2, level),
      isMerging: false, scale: 0.1,
    });
    Matter.Composite.add(engine.world, body);
    return body;
  };

  // ─── Engine initialisation ────────────────────────────────────────────────
  const initEngine = () => {
    if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
    if (engineRef.current) Matter.Engine.clear(engineRef.current);

    const engine = Matter.Engine.create({
      // enableSleeping: once a body's kinetic energy stays below sleepThreshold
      // for several consecutive frames Matter.js marks it as "sleeping" and
      // removes it from the simulation until it is disturbed.
      // This eliminates residual micro-jitter on settled blocks and saves CPU.
      enableSleeping: true,
      gravity: { x: 0, y: PHYS.gravity },
    });

    // Static boundary walls (infinite mass; never move)
    const T = 60; // wall thickness in world units
    Matter.Composite.add(engine.world, [
      Matter.Bodies.rectangle(VW / 2,   VH + T / 2, VW + 200, T,    { isStatic: true, friction: 0.6, label: 'floor'      }),
      Matter.Bodies.rectangle(-T / 2,   VH / 2,     T, VH * 2,      { isStatic: true, friction: 0.5, label: 'wall_left'  }),
      Matter.Bodies.rectangle(VW + T/2, VH / 2,     T, VH * 2,      { isStatic: true, friction: 0.5, label: 'wall_right' }),
    ]);

    // ── Collision event: detect merges — NEVER mutate world here ──────────
    //
    // ┌─── MERGING STUB: how same-value collision detection works ───────────┐
    // │  Detection (inside this callback):                                   │
    // │    1. mA.level === mB.level  → same value                           │
    // │    2. Neither already flagged isMerging                             │
    // │    3. Flag isMerging = true on both → subsequent contacts skipped   │
    // │    4. Push [bodyA, bodyB] onto pendingMergesRef                     │
    // │  Execution (processPendingMerges, next RAF frame):                   │
    // │    a. Compute midpoint:  (bA.position + bB.position) / 2            │
    // │    b. Remove both:  Composite.remove(engine.world, bA / bB)         │
    // │    c. Spawn upgrade:  spawnBody(midX, midY, meta.level + 1)         │
    // │    d. Award score:  2^(level + 1)                                   │
    // │  Why deferred? Matter fires this callback mid-step. Removing bodies  │
    // │  here corrupts the broadphase grid → tunnelling and clipping.        │
    // └──────────────────────────────────────────────────────────────────────┘
    Matter.Events.on(engine, 'collisionStart', (evt) => {
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const mA = metaRef.current.get(bodyA.id);
        const mB = metaRef.current.get(bodyB.id);
        if (!mA || !mB) continue;            // wall contact: only one side has meta
        if (mA.isMerging || mB.isMerging) continue;

        // Same-level pair → queue a merge (processed next frame)
        if (mA.level === mB.level) {
          mA.isMerging = true;
          mB.isMerging = true;
          pendingMergesRef.current.push([bodyA, bodyB]);
        }
      }
    });

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);
    engineRef.current = engine;
    runnerRef.current = runner;
  };

  // ─── Game reset ───────────────────────────────────────────────────────────
  const initGame = () => {
    const engine = engineRef.current;
    if (!engine) return;
    // Remove all non-static (dynamic) bodies from the world
    const dynamic = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
    if (dynamic.length) Matter.Composite.remove(engine.world, dynamic as unknown as Matter.Body);
    metaRef.current.clear();
    pendingMergesRef.current = [];
    particlesRef.current     = [];
    floatingTextsRef.current = [];
    screenShakeRef.current   = 0;
    gameOverTimerRef.current = null;
    overflowValRef.current   = 0;
    lastDropRef.current      = 0;
    comboCountRef.current    = 0;
    lastMergeRef.current     = 0;
    setOverflowCountdown(0);
    aimXRef.current = VW / 2;

    holdLevelRef.current = draftLevel();
    nextLevelRef.current = draftLevel();
    setNextBlockLevel(nextLevelRef.current);
  };

  // ─── Drop mechanic ────────────────────────────────────────────────────────
  // Spawns the held block at aimX, then advances the queue.
  // DROP_COOLDOWN enforces a minimum time between drops — kills the spam loop.
  const dropBlock = () => {
    if (!gameActiveRef.current || !engineRef.current) return;
    const now = Date.now();
    if (now - lastDropRef.current < DROP_COOLDOWN) return; // cooldown not ready
    lastDropRef.current = now;

    const r = getRadius(holdLevelRef.current);
    spawnBody(aimXRef.current, EMITTER_Y + r, holdLevelRef.current);
    audio.playDrop();

    // Advance queue
    holdLevelRef.current = nextLevelRef.current;
    nextLevelRef.current = draftLevel();
    setNextBlockLevel(nextLevelRef.current);
  };

  // ─── VFX helpers ──────────────────────────────────────────────────────────
  const spawnExplosion = (x: number, y: number, color: string, count = 20, big = false) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = big ? Math.random() * 8 + 4 : Math.random() * 3 + 1;
      particlesRef.current.push({
        id: Math.random().toString(), x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - (big ? 1 : 0.5),
        radius: big ? Math.random() * 6 + 3 : Math.random() * 4 + 2,
        color, alpha: 1, life: 1,
        decay:   big ? Math.random() * 0.02 + 0.015 : Math.random() * 0.04 + 0.02,
        gravity: big ? 0.12 : 0.08,
      });
    }
  };

  const triggerFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({ id: Math.random().toString(), x, y, text, color, life: 1, size: 18 });
  };

  // ─── Input handlers ───────────────────────────────────────────────────────
  // Write to refs only — never setState — so no re-render on drag.
  const handleDrag = (clientX: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rx   = ((clientX - rect.left) / rect.width) * VW;
    const r    = getRadius(holdLevelRef.current);
    aimXRef.current = Math.max(r + 5, Math.min(VW - r - 5, rx));
  };
  const onMouseDown  = (e: React.MouseEvent<HTMLCanvasElement>) => { if (!gameActiveRef.current) return; isAimingRef.current = true;  handleDrag(e.clientX); };
  const onMouseMove  = (e: React.MouseEvent<HTMLCanvasElement>) => { if (isAimingRef.current) handleDrag(e.clientX); };
  const onMouseUp    = () => { if (!isAimingRef.current) return; isAimingRef.current = false; dropBlock(); };
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => { if (!gameActiveRef.current) return; isAimingRef.current = true;  if (e.touches[0]) handleDrag(e.touches[0].clientX); };
  const onTouchMove  = (e: React.TouchEvent<HTMLCanvasElement>) => { if (isAimingRef.current && e.touches[0]) handleDrag(e.touches[0].clientX); };
  const onTouchEnd   = () => { if (!isAimingRef.current) return; isAimingRef.current = false; dropBlock(); };

  // ─── Mount / unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    initEngine();
    initGame();
    return () => {
      if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
      if (engineRef.current) Matter.Engine.clear(engineRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (engineRef.current) initGame();
  }, [restartTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Main RAF loop ────────────────────────────────────────────────────────
  // Physics is driven by Matter.Runner (separate from RAF).
  // This loop: drain queues → draw → check game-over.
  // Empty deps [] → created once; accesses all live data via refs.
  useEffect(() => {
    let rafId: number;

    // 1. Process pending merges ─────────────────────────────────────────────
    const processPendingMerges = () => {
      const engine = engineRef.current;
      if (!engine) return;
      const batch = pendingMergesRef.current.splice(0);
      for (const [bA, bB] of batch) {
        const mA = metaRef.current.get(bA.id);
        const mB = metaRef.current.get(bB.id);
        if (!mA || !mB) continue; // already processed or cleaned up

        const midX  = (bA.position.x + bB.position.x) * 0.5;
        const midY  = (bA.position.y + bB.position.y) * 0.5;
        const avgVx = (bA.velocity.x  + bB.velocity.x)  * 0.5;
        const avgVy = (bA.velocity.y  + bB.velocity.y)  * 0.5 - 2.5; // slight upward pop

        const nextLevel = mA.level + 1;
        const baseScore = Math.pow(2, nextLevel);

        // ── Combo chain multiplier ─────────────────────────────────────────
        // Each merge that fires within COMBO_WINDOW ms of the previous one
        // increments the chain counter. Higher chains → bigger multiplier.
        // This rewards setting up cascade merges over mindless dropping.
        const now = Date.now();
        if (now - lastMergeRef.current < COMBO_WINDOW) {
          comboCountRef.current++;
        } else {
          comboCountRef.current = 1;
        }
        lastMergeRef.current = now;

        const combo = comboCountRef.current;
        // 1× at 1 merge, 1.5× at 2, 2× at 3, 3× at 4+
        const mult  = combo >= 4 ? 3 : combo === 3 ? 2 : combo === 2 ? 1.5 : 1;
        const scoreAdd = Math.round(baseScore * mult);

        // Remove both merged bodies from the world
        Matter.Composite.remove(engine.world, bA);
        Matter.Composite.remove(engine.world, bB);
        metaRef.current.delete(bA.id);
        metaRef.current.delete(bB.id);

        // Spawn upgraded block at midpoint with inherited velocity
        const nb = spawnBody(midX, midY, nextLevel, avgVy);
        Matter.Body.setVelocity(nb, { x: avgVx, y: avgVy });

        const color = LEVEL_COLORS[nextLevel] ?? LEVEL_COLORS[12];
        spawnExplosion(midX, midY, color.glow, combo >= 2 ? 24 : 16);
        if (mult > 1) {
          // Show the multiplier banner above the score pop
          triggerFloatingText(midX, midY - 30, `×${mult} COMBO!`, '#fbbf24');
        }
        triggerFloatingText(midX, midY - 10, `+${scoreAdd}`, color.text);
        audio.playMerge(nextLevel);
        onScoreRef.current(scoreAdd);
        onStatRef.current({ levelReached: nextLevel, mergedCount: 1, tntCount: 0 });
      }
    };

    // 2. Game-over overflow check ───────────────────────────────────────────
    const checkGameOver = () => {
      const engine = engineRef.current;
      if (!engine || !gameActiveRef.current) return;
      const above = Matter.Composite.allBodies(engine.world)
        .filter(b => !b.isStatic)
        .some(b => {
          const m = metaRef.current.get(b.id);
          if (!m || m.isMerging) return false;
          return b.position.y - getRadius(m.level) < WARNING_Y && Math.abs(b.velocity.y) < 0.6;
        });
      if (above) {
        if (gameOverTimerRef.current === null) gameOverTimerRef.current = Date.now();
        const remain = Math.max(0, 2.0 - (Date.now() - gameOverTimerRef.current) / 1000);
        overflowValRef.current = remain;
        setOverflowCountdown(remain);
        if (remain <= 0) {
          audio.playGameOver();
          onGameOverRef.current();
          gameOverTimerRef.current = null;
          overflowValRef.current   = 0;
          setOverflowCountdown(0);
        }
      } else {
        gameOverTimerRef.current = null;
        overflowValRef.current   = 0;
        setOverflowCountdown(0);
      }
    };

    // 4. Canvas rendering ───────────────────────────────────────────────────
    // Drawing helpers live inside this useEffect so they share the
    // same stable closure and access modeRef without stale captures.

    const getFontSize = (s: string, r: number) => {
      const l = s.length;
      if (l === 1) return r * 1.1;
      if (l === 2) return r * 0.95;
      if (l === 3) return r * 0.77;
      return r * 0.62;
    };

    const glowAmount = (v: number) => v >= 2048 ? 18 : v >= 512 ? 12 : v >= 64 ? 6 : 0;

    const gradHexes = (bg: string): [string, string] => {
      if (bg.includes('from-slate-200'))  return ['#cbd5e1', '#e0e7ff'];
      if (bg.includes('from-amber-200'))  return ['#fde047', '#f59e0b'];
      if (bg.includes('from-orange-300')) return ['#fdba74', '#ea580c'];
      if (bg.includes('from-rose-400'))   return ['#fb7185', '#dc2626'];
      if (bg.includes('from-red-500'))    return ['#ef4444', '#f97316'];
      if (bg.includes('from-pink-400'))   return ['#f472b6', '#be185d'];
      if (bg.includes('from-pink-500'))   return ['#ec4899', '#a21caf'];
      if (bg.includes('from-cyan-400'))   return ['#22d3ee', '#0ea5e9'];
      if (bg.includes('from-sky-500'))    return ['#0ea5e9', '#1d4ed8'];
      if (bg.includes('from-violet-500')) return ['#8b5cf6', '#5b21b6'];
      if (bg.includes('from-emerald-400'))return ['#34d399', '#047857'];
      return ['#fbbf24', '#d97706'];
    };

    const drawPolygon = (ctx: CanvasRenderingContext2D, sides: number, r: number) => {
      ctx.beginPath();
      const step = (Math.PI * 2) / sides;
      for (let i = 0; i < sides; i++) {
        // Start at angle 0 (east) to match Matter.Bodies.polygon vertex layout —
        // keeps the visual outline in sync with the physics hitbox at all rotations.
        const a = i * step;
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
    };

    const drawStar = (ctx: CanvasRenderingContext2D, pts: number, outer: number, inner: number) => {
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / pts;
      ctx.beginPath();
      for (let i = 0; i < pts; i++) {
        ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
        rot += step;
      }
      ctx.closePath();
    };

    const renderBlock = (ctx: CanvasRenderingContext2D, level: number) => {
      const r   = getRadius(level);
      const col = LEVEL_COLORS[level] ?? LEVEL_COLORS[12];
      const val = Math.pow(2, level).toString();
      const [startColor, endColor] = gradHexes(col.bg);

      if (modeRef.current === 'classic') {
        // Rounded rectangle (chamfered to match physics body)
        ctx.beginPath();
        if ((ctx as any).roundRect) {
          (ctx as any).roundRect(-r, -r, r * 2, r * 2, r * 0.25);
        } else {
          const rr = r * 0.25;
          ctx.moveTo(-r + rr, -r);
          ctx.lineTo(r - rr, -r);  ctx.quadraticCurveTo(r, -r, r, -r + rr);
          ctx.lineTo(r, r - rr);   ctx.quadraticCurveTo(r, r, r - rr, r);
          ctx.lineTo(-r + rr, r);  ctx.quadraticCurveTo(-r, r, -r, r - rr);
          ctx.lineTo(-r, -r + rr); ctx.quadraticCurveTo(-r, -r, -r + rr, -r);
          ctx.closePath();
        }
        const lg = ctx.createLinearGradient(-r, -r, -r, r);
        lg.addColorStop(0, startColor); lg.addColorStop(1, endColor);
        ctx.fillStyle = lg;
        ctx.shadowBlur = glowAmount(parseInt(val)); ctx.shadowColor = col.glow;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        // Shape mode — draw the polygon / star
        const shape = getShapeForLevel(level);
        const rg = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
        rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.3, startColor); rg.addColorStop(1, endColor);
        ctx.save();
        ctx.shadowBlur = glowAmount(parseInt(val)) + 4; ctx.shadowColor = col.glow;
        ctx.fillStyle = rg; ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5;
        if (shape === 'circle') {
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        } else if (shape.startsWith('star-')) {
          drawStar(ctx, parseInt(shape.split('-')[1]), r, r * 0.52);
          ctx.fill(); ctx.stroke();
        } else {
          const sides: Record<string, number> = {
            triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8,
          };
          drawPolygon(ctx, sides[shape] ?? 4, r);
          ctx.fill(); ctx.stroke();
        }
        ctx.restore();
      }

      ctx.fillStyle = col.text;
      ctx.font = `bold ${getFontSize(val, r) * 0.95}px font-mono, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(val, 0, 0);
    };

    const drawFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const engine = engineRef.current;

      const dpr    = window.devicePixelRatio || 1;
      const scaleX = canvas.clientWidth  / VW;
      const scaleY = canvas.clientHeight / VH;
      const shake  = screenShakeRef.current;
      if (shake > 0) {
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      ctx.scale(scaleX, scaleY);

      // Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, VW, VH);

      // Subtle grid
      ctx.strokeStyle = 'rgba(30,41,59,0.5)'; ctx.lineWidth = 1;
      for (let i = 25; i < VW; i += 25) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, VH); ctx.stroke(); }
      for (let j = 25; j < VH; j += 25) { ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(VW, j); ctx.stroke(); }

      // Overflow warning dashed line
      const oc = overflowValRef.current;
      ctx.strokeStyle = oc > 0 ? 'rgba(239,68,68,0.8)' : 'rgba(239,68,68,0.2)';
      ctx.lineWidth   = oc > 0 ? 3 : 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(0, WARNING_Y); ctx.lineTo(VW, WARNING_Y); ctx.stroke();
      ctx.setLineDash([]);
      if (oc > 0) {
        ctx.fillStyle = 'rgba(239,68,68,0.06)'; ctx.fillRect(0, 0, VW, WARNING_Y);
        ctx.fillStyle = '#f87171'; ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`OVERFILL! ${oc.toFixed(1)}s`, VW / 2, WARNING_Y - 14);
      }

      // Drop aim line — a vertical dashed guide showing where the block will land
      if (isAimingRef.current && gameActiveRef.current) {
        ctx.strokeStyle = 'rgba(129,140,248,0.35)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(aimXRef.current, EMITTER_Y); ctx.lineTo(aimXRef.current, VH); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Held block preview at emitter position + cooldown ring
      if (gameActiveRef.current) {
        const r    = getRadius(holdLevelRef.current);
        const prog = Math.min(1, (Date.now() - lastDropRef.current) / DROP_COOLDOWN);
        ctx.save();
        ctx.translate(aimXRef.current, EMITTER_Y);

        // Grey ring base (always visible)
        ctx.strokeStyle = 'rgba(148,163,184,0.25)';
        ctx.lineWidth   = 3;
        ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2); ctx.stroke();

        // Colored fill arc grows as cooldown resolves
        if (prog < 1) {
          ctx.strokeStyle = prog > 0.6 ? '#4ade80' : prog > 0.3 ? '#fbbf24' : '#f87171';
          ctx.lineWidth   = 3;
          ctx.beginPath();
          ctx.arc(0, 0, r + 5, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
          ctx.stroke();
        }

        // Dim the block itself while on cooldown
        if (prog < 1) ctx.globalAlpha = 0.45 + prog * 0.55;
        // Rotate shape-mode preview so polygons appear upright in the aim indicator
        // (drawPolygon now starts at 0°/east; rotating -90° puts vertex 0 at top)
        if (modeRef.current === 'shape') ctx.rotate(-Math.PI / 2);
        renderBlock(ctx, holdLevelRef.current);
        ctx.restore();

        // Active combo glow indicator (bottom-left of emitter)
        if (comboCountRef.current >= 2) {
          const comboStr = `×${comboCountRef.current >= 4 ? 3 : comboCountRef.current === 3 ? 2 : 1.5}`;
          ctx.save();
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fbbf24';
          ctx.shadowBlur = 8; ctx.shadowColor = '#fbbf24';
          ctx.fillText(`${comboStr} COMBO`, aimXRef.current, EMITTER_Y + r + 14);
          ctx.restore();
        }
      }

      // Physics bodies — positions and angles come directly from Matter.js
      if (engine) {
        for (const body of Matter.Composite.allBodies(engine.world)) {
          if (body.isStatic) continue;
          const m = metaRef.current.get(body.id);
          if (!m) continue;
          // Animate spawn pop-in: scale grows from 0.1 → 1.0 each frame
          if (m.scale < 1) m.scale = Math.min(1, m.scale + 0.09);
          ctx.save();
          ctx.translate(body.position.x, body.position.y);
          // body.angle is updated by Matter.js each step with frictionAir applied,
          // so spin naturally decays — no special angle-handling code needed here.
          ctx.rotate(body.angle);
          ctx.scale(m.scale, m.scale);
          renderBlock(ctx, m.level);
          ctx.restore();
        }
      }

      // Particle burst effects
      for (const p of particlesRef.current) {
        p.x += p.vx; p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
        p.life -= p.decay; p.alpha = Math.max(0, p.life);
        if (p.life > 0) {
          ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Floating score labels
      for (const t of floatingTextsRef.current) {
        t.y -= 1.2; t.life -= 0.025;
        if (t.life > 0) {
          ctx.save(); ctx.globalAlpha = t.life;
          ctx.font = `bold ${t.size}px system-ui, sans-serif`;
          ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center';
          ctx.shadowBlur = 4; ctx.shadowColor = t.color;
          ctx.fillText(t.text, t.x, t.y);
          ctx.restore();
        }
      }
      floatingTextsRef.current = floatingTextsRef.current.filter(t => t.life > 0);

      ctx.restore();
    };

    // Main frame loop — physics runs separately in Matter.Runner
    const loop = () => {
      processPendingMerges();
      drawFrame();
      checkGameOver();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — all live data via refs

  // ─── Canvas resize ────────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const cont   = containerRef.current;
      if (!canvas || !cont) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = cont.clientWidth;
      const h   = cont.clientHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width  = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      id="canvas-viewport-container"
      className="relative w-full aspect-[2/3] max-w-[340px] xs:max-w-[360px] md:max-w-[380px] bg-slate-950 rounded-2xl md:rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden cursor-crosshair touch-none select-none"
    >
      <canvas
        id="physics-canvas"
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="block bg-slate-950"
      />

      {/* "Next:" block queue preview — top-right overlay */}
      {gameActive && (
        <div
          id="queue-preview-widget"
          className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur"
        >
          <span className="text-[10px] font-mono text-slate-400">Next:</span>
          <div
            className={`w-5 h-5 rounded bg-gradient-to-br ${
              LEVEL_COLORS[nextBlockLevel]?.bg ?? 'from-indigo-300 to-indigo-500'
            } flex items-center justify-center font-bold text-[10px] text-indigo-950`}
          >
            {Math.pow(2, nextBlockLevel)}
          </div>
        </div>
      )}
    </div>
  );
}
