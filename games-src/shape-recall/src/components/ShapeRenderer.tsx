/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShapeTransform, ShapeType } from '../types';

interface ShapeRendererProps {
  type: ShapeType;
  transform: ShapeTransform;
  styleMode: 'GRADIENT' | 'GUESSED_OVERLAY';
  isEditable?: boolean;
  onHandleMouseDown?: (e: React.MouseEvent | React.TouchEvent, handle: string) => void;
  onShapeMouseDown?: (e: React.MouseEvent | React.TouchEvent) => void;
  idPrefix?: string;
  withTransition?: boolean;
}

export default function ShapeRenderer({
  type,
  transform,
  styleMode,
  isEditable = false,
  onHandleMouseDown,
  onShapeMouseDown,
  idPrefix = 'shape',
  withTransition = false,
}: ShapeRendererProps) {
  
  const CLIP_PATHS: Record<string, string> = {
    // Basic polygon family
    TRIANGLE:       'polygon(50% 0%, 0% 100%, 100% 100%)',
    RIGHT_TRIANGLE: 'polygon(0% 0%, 100% 0%, 0% 100%)',
    PENTAGON:       'polygon(50% 0%, 98% 35%, 79% 90%, 21% 90%, 2% 35%)',
    HEXAGON:        'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
    HEPTAGON:       'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)',
    OCTAGON:        'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    NONAGON:        'polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)',
    DECAGON:        'polygon(50% 0%, 80% 10%, 100% 35%, 100% 70%, 80% 90%, 50% 100%, 20% 90%, 0% 70%, 0% 35%, 20% 10%)',
    // Quadrilateral variants
    DIAMOND:        'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    KITE:           'polygon(50% 0%, 100% 30%, 50% 100%, 0% 30%)',
    TRAPEZOID:      'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
    PARALLELOGRAM:  'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
    CHEVRON:        'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    // Stars & sparks
    STAR:           'polygon(50% 0%, 62% 33%, 97% 35%, 70% 56%, 79% 90%, 50% 71%, 21% 90%, 30% 56%, 3% 35%, 38% 33%)',
    STAR_4_POINT:   'polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)',
    STAR_6_POINT:   'polygon(50% 0%, 65% 25%, 100% 25%, 79% 50%, 100% 75%, 65% 75%, 50% 100%, 35% 75%, 0% 75%, 21% 50%, 0% 25%, 35% 25%)',
    SPARKLE:        'polygon(50% 0%, 55% 45%, 100% 50%, 55% 55%, 50% 100%, 45% 55%, 0% 50%, 45% 45%)',
    // Special
    CROSS:          'polygon(33% 0%, 67% 0%, 67% 33%, 100% 33%, 100% 67%, 67% 67%, 67% 100%, 33% 100%, 33% 67%, 0% 67%, 0% 33%, 33% 33%)',
    ARROW:          'polygon(40% 0%, 60% 0%, 60% 70%, 100% 70%, 50% 100%, 0% 70%, 40% 70%)',
    HEART:          'polygon(50% 20%, 65% 0%, 85% 10%, 90% 35%, 75% 55%, 50% 75%, 25% 55%, 10% 35%, 15% 10%, 35% 0%)',
  };

  // Custom styles for clipping and gradient
  const getShapeStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      transition: 'none',
      userSelect: 'none',
    };

    const isPolygon = type in CLIP_PATHS;

    if (styleMode === 'GRADIENT') {
      baseStyle.background = 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)';
    } else {
      // GUESSED_OVERLAY: CSS borders don't follow clip-path, so only show border for SQUARE/CIRCLE.
      baseStyle.backgroundColor = isPolygon ? 'rgba(147, 51, 234, 0.60)' : 'rgba(147, 51, 234, 0.45)';
      if (!isPolygon) {
        baseStyle.border = '2px dashed rgba(168, 85, 247, 0.9)';
      }
    }

    if (isPolygon) {
      baseStyle.clipPath = CLIP_PATHS[type];
    } else if (type === 'CIRCLE') {
      baseStyle.borderRadius = '50%';
    } else {
      baseStyle.borderRadius = '6px';
    }

    return baseStyle;
  };

  // Build handle positions to render when editable
  const handles = [
    { name: 'tl', cursor: 'nwse-resize', classes: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2' },
    { name: 'tr', cursor: 'nesw-resize', classes: 'top-0 right-0 translate-x-1/2 -translate-y-1/2' },
    { name: 'bl', cursor: 'nesw-resize', classes: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2' },
    { name: 'br', cursor: 'nwse-resize', classes: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2' },
  ];

  return (
    <div
      id={`${idPrefix}-container`}
      className="absolute select-none touch-none"
      style={{
        left: `${transform.x}%`,
        top: `${transform.y}%`,
        width: `${transform.width}%`,
        height: `${transform.height}%`,
        touchAction: 'none',
        transition: withTransition
          ? 'left 1.4s cubic-bezier(0.34,1.56,0.64,1), top 1.4s cubic-bezier(0.34,1.56,0.64,1), width 1.4s cubic-bezier(0.34,1.56,0.64,1), height 1.4s cubic-bezier(0.34,1.56,0.64,1)'
          : 'none',
      }}
    >
      {/* Target/Guess shape inner rendering */}
      <div
        id={`${idPrefix}-fill`}
        style={getShapeStyle()}
        className={`relative ${onShapeMouseDown && isEditable ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={(e) => {
          if (isEditable && onShapeMouseDown) {
            onShapeMouseDown(e);
          }
        }}
        onTouchStart={(e) => {
          if (isEditable && onShapeMouseDown) {
            onShapeMouseDown(e);
          }
        }}
      />

      {/* Resize corner handles */}
      {isEditable && onHandleMouseDown && (
        <div id={`${idPrefix}-resize-handles-group`} className="pointer-events-none absolute inset-0">
          {handles.map((h) => (
            <div
              key={h.name}
              id={`${idPrefix}-handle-${h.name}`}
              className={`pointer-events-auto absolute z-30 flex h-10 w-10 items-center justify-center`}
              style={{
                cursor: h.cursor,
                touchAction: 'none',
                ...getHandleOffset(h.name),
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                onHandleMouseDown(e, h.name);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onHandleMouseDown(e, h.name);
              }}
            >
              {/* Outer visual dot tracker (44px equivalent hover boundary is simulated by parent hit area) */}
              <div 
                className={`h-3 w-3 rounded-full border-2 border-zinc-950 bg-white transition-all shadow-[0_0_8px_rgba(255,255,255,0.6)] ${
                  h.name === 'br' ? 'bg-cyan-400 scale-110 border-white' : ''
                }`} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Returns exact offset styling to position centered on the corners
 */
function getHandleOffset(name: string): React.CSSProperties {
  switch (name) {
    case 'tl': return { top: 0, left: 0, transform: 'translate(-50%, -50%)' };
    case 'tr': return { top: 0, right: 0, transform: 'translate(50%, -50%)' };
    case 'bl': return { bottom: 0, left: 0, transform: 'translate(-50%, 50%)' };
    case 'br': return { bottom: 0, right: 0, transform: 'translate(50%, 50%)' };
    default: return {};
  }
}
