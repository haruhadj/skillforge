/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cell, Player } from '../types';
import { BOARD_SIZE, getNeighbors } from '../gameLogic';

interface GameBoardProps {
  board: Cell[][];
  currentPlayer: Player;
  winner: Player | null;
  winningPath: string[];
  onCellClick: (q: number, r: number) => void;
}

export default function GameBoard({
  board,
  currentPlayer,
  winner,
  winningPath,
  onCellClick,
}: GameBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Hexagon sizing geometry
  const R = 23; // Radius to vertex
  const W = Math.sqrt(3) * R; // Hexagon width (~39.83px)
  const H = 2 * R; // Hexagon height (46px)
  const verticalSpacing = 1.5 * R; // Vertical center-to-center (~34.5px)

  // Margins to prevent clipping of borders, shadows and coordinate labels
  const offsetX = 55;
  const offsetY = 45;

  // Calculate center of a cell at (q, r)
  const getCellCenter = (q: number, r: number) => {
    const cx = W * (q + r / 2) + offsetX;
    const cy = verticalSpacing * r + offsetY;
    return { cx, cy };
  };

  // Get SVG points string for a pointy-topped hexagon
  const getHexPointsString = (cx: number, cy: number, radius: number) => {
    const points: string[] = [];
    const width = Math.sqrt(3) * radius;
    // 6 vertices of a pointy-topped hexagon (starting from top, clockwise)
    points.push(`${cx},${cy - radius}`); // Top
    points.push(`${cx + width / 2},${cy - radius / 2}`); // Top Right
    points.push(`${cx + width / 2},${cy + radius / 2}`); // Bottom Right
    points.push(`${cx},${cy + radius}`); // Bottom
    points.push(`${cx - width / 2},${cy + radius / 2}`); // Bottom Left
    points.push(`${cx - width / 2},${cy - radius / 2}`); // Top Left
    return points.join(' ');
  };

  // Generate paths for the 4 border colored bands (perimeter goals)
  const generatePerimeterPaths = () => {
    const topPoints: string[] = [];
    for (let q = 0; q < BOARD_SIZE; q++) {
      const { cx, cy } = getCellCenter(q, 0);
      const w = Math.sqrt(3) * R;
      if (q === 0) {
        topPoints.push(`${cx - w / 2 - 3},${cy - R / 2 - 10}`);
      }
      topPoints.push(`${cx},${cy - R - 12}`);
      if (q === BOARD_SIZE - 1) {
        topPoints.push(`${cx + w / 2 + 3},${cy - R / 2 - 10}`);
      }
    }

    const bottomPoints: string[] = [];
    for (let q = 0; q < BOARD_SIZE; q++) {
      const { cx, cy } = getCellCenter(q, BOARD_SIZE - 1);
      const w = Math.sqrt(3) * R;
      if (q === 0) {
        bottomPoints.push(`${cx - w / 2 - 3},${cy + R / 2 + 10}`);
      }
      bottomPoints.push(`${cx},${cy + R + 12}`);
      if (q === BOARD_SIZE - 1) {
        bottomPoints.push(`${cx + w / 2 + 3},${cy + R / 2 + 10}`);
      }
    }

    const leftPoints: string[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const { cx, cy } = getCellCenter(0, r);
      const w = Math.sqrt(3) * R;
      if (r === 0) {
        leftPoints.push(`${cx - 10},${cy - R - 3}`);
      }
      leftPoints.push(`${cx - w / 2 - 12},${cy}`);
      if (r === BOARD_SIZE - 1) {
        leftPoints.push(`${cx - 10},${cy + R + 3}`);
      }
    }

    const rightPoints: string[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      const { cx, cy } = getCellCenter(BOARD_SIZE - 1, r);
      const w = Math.sqrt(3) * R;
      if (r === 0) {
        rightPoints.push(`${cx + 10},${cy - R - 3}`);
      }
      rightPoints.push(`${cx + w / 2 + 12},${cy}`);
      if (r === BOARD_SIZE - 1) {
        rightPoints.push(`${cx + 10},${cy + R + 3}`);
      }
    }

    return {
      topPath: 'M ' + topPoints.join(' L '),
      bottomPath: 'M ' + bottomPoints.join(' L '),
      leftPath: 'M ' + leftPoints.join(' L '),
      rightPath: 'M ' + rightPoints.join(' L '),
    };
  };

  const { topPath, bottomPath, leftPath, rightPath } = generatePerimeterPaths();

  // Winning path polyline coordinator points
  const getWinningPolylinePoints = () => {
    return winningPath
      .map(id => {
        const [q, r] = id.split(',').map(Number);
        const { cx, cy } = getCellCenter(q, r);
        return `${cx},${cy}`;
      })
      .join(' ');
  };

  return (
    <div className="w-full flex flex-col items-center select-none" id="hex-board-container">
      {/* Board Framing & Guide */}
      <div className="w-full flex items-center justify-between px-3 sm:px-1 mb-2">
        <div className="text-[10px] font-mono text-stone-500 uppercase flex items-center gap-1">
          <span>Active Goals:</span>
          <span className="text-rose-400 font-semibold">T-B</span>
          <span className="text-stone-600">|</span>
          <span className="text-sky-400 font-semibold">L-R</span>
        </div>
        
        {/* Zoom Assist Control */}
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all duration-150 cursor-pointer flex items-center gap-1 ${
            isZoomed
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-stone-800 text-stone-400 border-white/5 hover:text-white'
          }`}
          id="toggle-zoom-btn"
        >
          <span>🔍</span>
          <span>{isZoomed ? 'Fit Board' : 'Precision Zoom'}</span>
        </button>
      </div>

      <div className="w-full bg-[#121110] rounded-none sm:rounded-xl border-x-0 sm:border border-white/5 relative overflow-hidden flex flex-col">
        {/* Scrollable Container Wrapper */}
        <div className="w-full overflow-x-auto scrollbar-none py-2 px-0 flex justify-start items-center">
          <div
            className="transition-all duration-300 origin-center shrink-0"
            style={{
              width: isZoomed ? '145%' : '100%',
              minWidth: isZoomed ? '550px' : '100%',
            }}
          >
            {/* Board SVG canvas */}
            <svg
              viewBox="0 0 740 450"
              className="w-full h-auto drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)]"
              id="hex-grid-svg"
            >
          {/* Defs for glossy marble stones */}
          <defs>
            {/* Red Stone Gradient */}
            <radialGradient id="redStone" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ff6b8b" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="85%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>

            {/* Blue Stone Gradient */}
            <radialGradient id="blueStone" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="40%" stopColor="#2563eb" />
              <stop offset="85%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#172554" />
            </radialGradient>

            {/* Empty Hex Wood/Felt Texture Gradient */}
            <radialGradient id="emptyHex" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#fcfbf9" />
              <stop offset="70%" stopColor="#f3efea" />
              <stop offset="100%" stopColor="#e5ded4" />
            </radialGradient>

            {/* Glow Filter for Winner path */}
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            {/* Soft Shadow for Stones */}
            <filter id="stoneShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Coordinate Labels: Columns (1-11) along Top edge */}
          {Array.from({ length: BOARD_SIZE }).map((_, q) => {
            const { cx, cy } = getCellCenter(q, 0);
            return (
              <text
                key={`col-label-${q}`}
                x={cx}
                y={cy - R - 20}
                className="font-mono text-[10px] font-bold fill-stone-400 text-center"
                textAnchor="middle"
              >
                {q + 1}
              </text>
            );
          })}

          {/* Coordinate Labels: Rows (A-K) along Left edge */}
          {Array.from({ length: BOARD_SIZE }).map((_, r) => {
            const { cx, cy } = getCellCenter(0, r);
            const w = Math.sqrt(3) * R;
            const letter = String.fromCharCode(65 + r); // A, B, C...
            return (
              <text
                key={`row-label-${r}`}
                x={cx - w / 2 - 20}
                y={cy + 4}
                className="font-mono text-[10px] font-bold fill-stone-400"
                textAnchor="middle"
              >
                {letter}
              </text>
            );
          })}

          {/* Render the Outer Colored Goal Perimeters */}
          {/* Top Goal (Red) */}
          <path
            d={topPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Bottom Goal (Red) */}
          <path
            d={bottomPath}
            fill="none"
            stroke="#f43f5e"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Left Goal (Blue) */}
          <path
            d={leftPath}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />
          {/* Right Goal (Blue) */}
          <path
            d={rightPath}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-90"
          />

          {/* Draw connecting lines of Hex board grid cells in background for premium layout */}
          {board.map((row, r) =>
            row.map((cell, q) => {
              const { cx, cy } = getCellCenter(q, r);
              const neighbors = getNeighbors(q, r, BOARD_SIZE);
              
              return neighbors.map(n => {
                // Only draw connections to neighbors with larger indices to avoid drawing twice
                if (n.r < r || (n.r === r && n.q < q)) return null;
                const targetCenter = getCellCenter(n.q, n.r);
                return (
                  <line
                    key={`line-${q}-${r}-${n.q}-${n.r}`}
                    x1={cx}
                    y1={cy}
                    x2={targetCenter.cx}
                    y2={targetCenter.cy}
                    stroke="#d6ccc2"
                    strokeWidth="0.7"
                    className="opacity-40"
                  />
                );
              });
            })
          )}

          {/* Render interlocking hexagons */}
          {board.map((row, r) =>
            row.map((cell, q) => {
              const { cx, cy } = getCellCenter(q, r);
              const hexPoints = getHexPointsString(cx, cy, R);
              const isHovered = hoveredCell === cell.id;
              const isWinning = winningPath.includes(cell.id);

              return (
                <g
                  key={cell.id}
                  className="cursor-pointer group"
                  onClick={() => !winner && cell.owner === null && onCellClick(q, r)}
                  onMouseEnter={() => setHoveredCell(cell.id)}
                  onMouseLeave={() => setHoveredCell(null)}
                  id={`cell-group-${q}-${r}`}
                >
                  {/* Hexagon Shadow / Background Base (creates a beautiful depth card effect) */}
                  <polygon
                    points={hexPoints}
                    fill="#1e1b18"
                    transform="translate(1, 2.5)"
                    className="opacity-25 transition-transform duration-200 group-hover:translate-y-[3.5px]"
                  />

                  {/* Hexagon Ceramic Tile */}
                  <polygon
                    points={hexPoints}
                    fill={
                      cell.owner === 'red'
                        ? '#ffe4e6' // Light pinkish-red tile base
                        : cell.owner === 'blue'
                        ? '#e0f2fe' // Light sky-blue tile base
                        : isWinning
                        ? '#fef08a' // Golden tile
                        : 'url(#emptyHex)'
                    }
                    stroke={
                      isWinning
                        ? '#eab308'
                        : cell.owner === 'red'
                        ? '#f43f5e'
                        : cell.owner === 'blue'
                        ? '#38bdf8'
                        : isHovered
                        ? currentPlayer === 'red'
                          ? '#fda4af'
                          : '#7dd3fc'
                        : '#cbd5e1'
                    }
                    strokeWidth={isWinning ? '3' : isHovered ? '2' : '1.2'}
                    className="transition-all duration-200 hover:-translate-y-[1px]"
                  />

                  {/* Render Stone/Marble if owned */}
                  {cell.owner && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={R * 0.68}
                      fill={cell.owner === 'red' ? 'url(#redStone)' : 'url(#blueStone)'}
                      filter="url(#stoneShadow)"
                      className="animate-in fade-in zoom-in-50 duration-300"
                    />
                  )}

                  {/* Hover stone preview (Faint translucent placeholder) */}
                  {!cell.owner && isHovered && !winner && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={R * 0.6}
                      fill={currentPlayer === 'red' ? '#e11d48' : '#2563eb'}
                      fillOpacity="0.25"
                      stroke={currentPlayer === 'red' ? '#be123c' : '#1d4ed8'}
                      strokeWidth="1.5"
                      strokeDasharray="2, 2"
                      className="animate-pulse"
                    />
                  )}

                  {/* Glowing winner ring highlight */}
                  {isWinning && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={R * 0.8}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      className="animate-ping opacity-60"
                      style={{ animationDuration: '2s' }}
                    />
                  )}
                </g>
              );
            })
          )}

          {/* Draw golden glowing line connecting the winning path centers */}
          {winner && winningPath.length > 0 && (
            <polyline
              points={getWinningPolylinePoints()}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#goldGlow)"
              className="pointer-events-none opacity-90 animate-in fade-in duration-1000"
              strokeDasharray="12, 6"
            />
          )}
        </svg>
          </div>
        </div>
      </div>

      {/* Grid Coordinates Legend Tip */}
      <div className="mt-2.5 flex justify-center gap-6 text-[11px] font-sans text-stone-400">
        <div className="flex items-center gap-1.5">
          <span className="font-mono bg-stone-800 border border-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">1 - 11</span>
          <span>Columns (Left to Right)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-mono bg-stone-800 border border-white/10 text-white px-1.5 py-0.5 rounded text-[10px]">A - K</span>
          <span>Rows (Top to Bottom)</span>
        </div>
      </div>
    </div>
  );
}
