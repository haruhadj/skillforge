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
}

export default function ShapeRenderer({
  type,
  transform,
  styleMode,
  isEditable = false,
  onHandleMouseDown,
  onShapeMouseDown,
  idPrefix = 'shape'
}: ShapeRendererProps) {
  
  // Custom styles for clipping and gradient
  const getShapeStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      transition: 'none',
      userSelect: 'none',
    };

    if (styleMode === 'GRADIENT') {
      baseStyle.background = 'conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)';
    } else {
      // GUESSED_OVERLAY: semi-transparent purple overlay representing the user's guess
      baseStyle.backgroundColor = 'rgba(147, 51, 234, 0.45)';
      baseStyle.border = '2px dashed rgba(168, 85, 247, 0.9)';
    }

    if (type === 'TRIANGLE') {
      baseStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
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
