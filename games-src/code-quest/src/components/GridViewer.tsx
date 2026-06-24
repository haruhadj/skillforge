/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, ArrowUp, Sparkles, AlertCircle } from 'lucide-react';
import { Level, Position, Direction, GridMap, TileColor } from '../types';

interface GridViewerProps {
  level: Level;
  robotPos: Position;
  robotDir: Direction;
  grid: GridMap;
  isExecuting: boolean;
  isSuccess: boolean;
  isFailure: boolean;
  compact?: boolean;
}

export default function GridViewer({
  level,
  robotPos,
  robotDir,
  grid,
  isExecuting,
  isSuccess,
  isFailure,
  compact = false,
}: GridViewerProps) {
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [viewMode, setViewMode] = useState<'3d' | '2d'>(compact || isMobileInit ? '2d' : '3d');
  const [isMobile, setIsMobile] = useState(isMobileInit);
  const { width, height } = level.dimensions;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Map direction to rotation angle in degrees
  const getDirAngle = (dir: Direction): number => {
    switch (dir) {
      case 'N': return 0;
      case 'E': return 90;
      case 'S': return 180;
      case 'W': return 270;
    }
  };

  // Convert TileColor to Tailwind theme colors
  const getTileColorClasses = (color: TileColor, isGoal: boolean, activated?: boolean) => {
    if (isGoal) {
      return activated
        ? 'bg-amber-400 border-amber-300 shadow-[0_0_20px_4px_rgba(251,191,36,0.6)] text-amber-950 font-bold'
        : 'bg-slate-700 hover:bg-slate-600 border-amber-500/50 shadow-[inset_0_0_12px_rgba(245,158,11,0.2)] text-amber-500';
    }

    switch (color) {
      case 'blue':
        return 'bg-blue-600/90 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)] text-blue-100';
      case 'orange':
        return 'bg-amber-600/90 border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.4)] text-amber-100';
      case 'green':
        return 'bg-emerald-600/90 border-emerald-400 shadow-[0_0_15px_rgba(5,150,105,0.4)] text-emerald-100';
      case 'normal':
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400';
    }
  };

  // Create grid cells
  const cells: { x: number; y: number; key: string }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      cells.push({ x, y, key: `${x},${y}` });
    }
  }

  return (
    <div className={`relative flex flex-col items-center justify-between h-full w-full bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl ${compact ? 'p-2' : 'p-4'}`}>

      {/* Grid Header Info / Modes — hidden in compact mode */}
      {!compact && (
        <div className="z-10 flex w-full justify-between items-center bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800/60" id="grid_header">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-300 font-medium">GRID WORLD ACTIVE</span>
          </div>

          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800" id="view_mode_toggle_group">
            <button
              id="view_mode_3d"
              onClick={() => setViewMode('3d')}
              className={`px-3 py-1 text-[11px] font-mono font-medium rounded-md transition-all ${
                viewMode === '3d'
                  ? 'bg-slate-800 text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              3D ISOMETRIC
            </button>
            <button
              id="view_mode_2d"
              onClick={() => setViewMode('2d')}
              className={`px-3 py-1 text-[11px] font-mono font-medium rounded-md transition-all ${
                viewMode === '2d'
                  ? 'bg-slate-800 text-purple-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              2D FLAT MAP
            </button>
          </div>
        </div>
      )}

      {/* Primary Simulator Canvas Area */}
      <div className={`relative flex-1 flex items-center justify-center w-full select-none overflow-auto ${compact ? 'min-h-[120px] py-1' : 'min-h-[260px] lg:min-h-[340px] py-4 lg:py-6'}`}>

        {/* Ambient grid lines in 3D background */}
        <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />

        {/* Outer Perspective Wrapper */}
        <div
          className="transition-all duration-700 ease-out flex items-center justify-center"
          style={{
            transform: viewMode === '3d'
              ? 'rotateX(55deg) rotateZ(-45deg) scale(0.95)'
              : 'rotateX(0deg) rotateZ(0deg) scale(1.0)',
            perspective: viewMode === '3d' ? '1200px' : 'none',
          }}
        >
          {/* Real 2D/3D Render Engine */}
          <div
            className="relative grid bg-slate-900/40 p-3 lg:p-4 rounded-2xl border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-300"
            style={{
              gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
              gap: compact ? '3px' : viewMode === '3d' ? (isMobile ? '10px' : '14px') : (isMobile ? '5px' : '6px'),
              width: compact
                ? `${Math.min(width * 26, 200)}px`
                : `${Math.min(width * (viewMode === '3d' ? (isMobile ? 50 : 62) : (isMobile ? 40 : 46)), isMobile ? 340 : 460)}px`,
              height: compact
                ? `${Math.min(height * 26, 200)}px`
                : `${Math.min(height * (viewMode === '3d' ? (isMobile ? 50 : 62) : (isMobile ? 40 : 46)), isMobile ? 340 : 430)}px`,
            }}
          >
            {cells.map(({ x, y, key }) => {
              const tileState = grid[key];
              const exists = !!tileState;
              
              if (!exists) {
                // Invisible tile to maintain spacing
                return <div key={key} className="invisible" />;
              }

              const { z, isGoal, color, activated } = tileState;
              const hasRobot = robotPos.x === x && robotPos.y === y;
              const tileColorClass = getTileColorClasses(color, isGoal, activated);

              // 3D Isometric box stacking rendering calculations
              const stackLevels = Array.from({ length: Math.max(1, z) });

              return (
                <div
                  key={key}
                  id={`tile-${x}-${y}`}
                  className="relative group flex items-center justify-center transition-all duration-300"
                  style={{
                    transform: viewMode === '3d' ? `translateZ(${z * 16}px)` : 'none',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {/* Visual Pillars for stacked columns in 3D Mode */}
                  {viewMode === '3d' && z > 0 && (
                    <div 
                      className="absolute bottom-0 inset-x-0 bg-slate-950 border-r border-b border-slate-800/50 -z-10 rounded-b-md"
                      style={{
                        height: `${z * 16}px`,
                        transform: 'rotateX(-90deg) translateZ(20px)',
                      }}
                    />
                  )}

                  {/* Surface Face of the Grid Node */}
                  <div
                    className={`relative w-full aspect-square rounded-xl border-b-[3px] border-r-2 border-slate-900 flex flex-col items-center justify-center ${tileColorClass} text-[10px] font-mono transition-all duration-500 select-none overflow-hidden`}
                  >
                    {/* Goal Signal Animation Layer */}
                    {isGoal && !activated && (
                      <div className="absolute inset-0 bg-amber-500/10 animate-pulse pointer-events-none" />
                    )}

                    {/* Coordinate Indicator on hover */}
                    <span className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-60 text-[8px] tracking-tighter text-slate-500 transition-opacity">
                      {x},{y}
                    </span>

                    {/* Z Height Display inside map tile */}
                    {z > 0 && (
                      <div className="absolute top-1 left-1 text-[8px] font-bold px-1 py-0.2 select-none bg-slate-950/40 rounded border border-slate-700/30 text-indigo-300">
                        H:{z}
                      </div>
                    )}

                    {/* Standalone sensor icon / color highlight */}
                    {!isGoal && color !== 'normal' && (
                      <div className="absolute inset-x-0 top-0.5 flex justify-center">
                        <div className="h-1 w-4 bg-white/70 rounded-full animate-pulse" />
                      </div>
                    )}

                    {/* Simple node center icon */}
                    {isGoal && !hasRobot && (
                      <div className="flex flex-col items-center justify-center gap-0.5 animate-bounce">
                        <Sparkles className={`h-4 w-4 ${activated ? 'text-amber-950' : 'text-amber-400'}`} />
                        <span className="text-[7px] font-extrabold uppercase tracking-widest leading-none">
                          {activated ? 'LIT' : 'GOAL'}
                        </span>
                      </div>
                    )}

                    {/* Inside-Tile Robot overlay sprite */}
                    {hasRobot && (
                      <motion.div
                        id="robot_sprite"
                        className="relative z-20 flex items-center justify-center w-full h-full p-1"
                        layoutId="robot"
                        transition={{
                          type: 'spring',
                          stiffness: 140,
                          damping: 18,
                        }}
                      >
                        {/* Shaking Fail Overlay wrapper */}
                        <div
                          className={`flex items-center justify-center py-1.5 px-2 rounded-xl bg-slate-900 border border-purple-500 shadow-xl ${
                            isFailure ? 'animate-bounce border-rose-500' : ''
                          }`}
                          style={{
                            transform: `rotate(${viewMode === '3d' ? getDirAngle(robotDir) + 45 : getDirAngle(robotDir)}deg)`,
                            transition: 'transform 0.3s ease-out',
                          }}
                        >
                          <Bot className={`h-6 w-6 ${isFailure ? 'text-rose-400' : isSuccess ? 'text-emerald-400' : 'text-purple-400'}`} />
                          
                          {/* Compass direction indicator beacon inside robot container */}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-purple-400 text-slate-950 rounded-full p-0.5 border border-slate-950 shadow">
                            <ArrowUp className="h-1.5 w-1.5 rotate-0 text-[6px]" />
                          </div>
                        </div>

                        {/* Stand-on target custom active status pulse radar ring */}
                        <div className="absolute -inset-1 border border-purple-500/30 rounded-full animate-ping pointer-events-none" />
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Success / Fallback Shaker Screens */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            id="success_banner_overlay"
            className={`absolute inset-x-2 bg-emerald-950/95 border border-emerald-500/40 rounded-xl flex items-center gap-2 z-30 shadow-xl ${compact ? 'bottom-1 p-2' : 'bottom-4 p-4 gap-3'}`}
          >
            <div className={`bg-emerald-800/40 rounded-lg text-emerald-300 shrink-0 ${compact ? 'p-1' : 'p-2'}`}>
              <Sparkles className={`text-emerald-400 animate-spin ${compact ? 'h-3 w-3' : 'h-5 w-5'}`} />
            </div>
            <div>
              <h4 className={`font-display font-semibold text-emerald-300 select-none ${compact ? 'text-[10px]' : 'text-xs'}`}>CODE QUEST PASSED!</h4>
              {!compact && (
                <p className="text-[10px] text-emerald-400/90 leading-tight select-none">
                  All puzzle goals successfully illuminated. Brilliant execution.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {isFailure && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            id="failure_banner_overlay"
            className={`absolute inset-x-2 bg-rose-950/95 border border-rose-500/40 rounded-xl flex items-center gap-2 z-30 shadow-xl animate-shake ${compact ? 'bottom-1 p-2' : 'bottom-4 p-4 gap-3'}`}
          >
            <div className={`bg-rose-800/40 rounded-lg text-rose-300 shrink-0 ${compact ? 'p-1' : 'p-2'}`}>
              <AlertCircle className={`text-rose-400 ${compact ? 'h-3 w-3' : 'h-5 w-5'}`} />
            </div>
            <div>
              <h4 className={`font-display font-semibold text-rose-300 select-none ${compact ? 'text-[10px]' : 'text-xs'}`}>TEST RUN FAILED</h4>
              {!compact && (
                <p className="text-[10px] text-rose-400/90 leading-tight select-none">
                  The compiled commands ended without powering all nodes. Press Reset and re-structure!
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
