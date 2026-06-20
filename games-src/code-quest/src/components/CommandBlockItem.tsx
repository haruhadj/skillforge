/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowUp, 
  RotateCcw, 
  RotateCw, 
  Sparkle, 
  Repeat, 
  Eye, 
  Play, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Layers 
} from 'lucide-react';
import { CommandType, Command, TileColor } from '../types';

interface CommandBlockItemProps {
  key?: string | number;
  command: Command;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUpdatePayload?: (payload: any) => void;
  isToolboxItem?: boolean;
  onAppend?: () => void;
  isActiveStep?: boolean; 
  availableBlocks?: CommandType[]; // for conditionals inside loops/ifs
}

export const getBlockColorClasses = (type: CommandType): string => {
  switch (type) {
    case 'MOVE':
    case 'TURN_L':
    case 'TURN_R':
      return 'bg-blue-600/90 hover:bg-blue-500 border-blue-400 text-blue-50';
    case 'ACTIVATE':
      return 'bg-emerald-600/90 hover:bg-emerald-500 border-emerald-400 text-emerald-50';
    case 'LOOP':
      return 'bg-amber-600/90 hover:bg-amber-500 border-amber-400 text-amber-50';
    case 'IF':
      return 'bg-rose-600/90 hover:bg-rose-500 border-rose-400 text-rose-50';
    case 'CALL_F1':
      return 'bg-indigo-600/90 hover:bg-indigo-500 border-indigo-400 text-indigo-50';
    case 'CALL_F2':
      return 'bg-fuchsia-600/90 hover:bg-fuchsia-500 border-fuchsia-400 text-fuchsia-100';
    default:
      return 'bg-slate-700 border-slate-500 text-slate-150';
  }
};

const getBlockLabel = (type: CommandType): string => {
  switch (type) {
    case 'MOVE': return 'Move Forward';
    case 'TURN_L': return 'Turn Left';
    case 'TURN_R': return 'Turn Right';
    case 'ACTIVATE': return 'Activate Node';
    case 'LOOP': return 'Repeat Loop';
    case 'IF': return 'Sensor Branch';
    case 'CALL_F1': return 'Call F1';
    case 'CALL_F2': return 'Call F2';
    default: return type;
  }
};

const getBlockIcon = (type: CommandType, size = "h-4 w-4") => {
  switch (type) {
    case 'MOVE': return <ArrowUp className={size} />;
    case 'TURN_L': return <RotateCcw className={size} />;
    case 'TURN_R': return <RotateCw className={size} />;
    case 'ACTIVATE': return <Sparkle className={size} />;
    case 'LOOP': return <Repeat className={size} />;
    case 'IF': return <Eye className={size} />;
    case 'CALL_F1': return <Layers className={`${size} text-indigo-200`} />;
    case 'CALL_F2': return <Layers className={`${size} text-fuchsia-200`} />;
  }
};

export default function CommandBlockItem({
  command,
  onDelete,
  onMoveUp,
  onMoveDown,
  onUpdatePayload,
  isToolboxItem = false,
  onAppend,
  isActiveStep = false,
  availableBlocks = []
}: CommandBlockItemProps) {
  const { type, payload } = command;
  const colorClass = getBlockColorClasses(type);

  // Handle appending if click-to-add
  const handleClick = () => {
    if (isToolboxItem && onAppend) {
      onAppend();
    }
  };

  return (
    <motion.div
      id={`block-${command.id}`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`relative group flex flex-col p-2.5 rounded-xl border border-b-4 ${colorClass} ${
        isActiveStep 
          ? 'ring-4 ring-pink-500/80 ring-offset-2 ring-offset-slate-900 border-b-pink-400 scale-[1.04]' 
          : 'border-b-black/30'
      } cursor-pointer shadow-lg select-none transition-all duration-200`}
      onClick={handleClick}
    >
      {/* Active executing frame arrow indicator overlay */}
      {isActiveStep && (
        <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center bg-pink-500 text-white p-0.5 rounded-full shadow-lg z-20 animate-pulse">
          <Play className="h-2 w-2 fill-current rotate-0" />
        </div>
      )}

      <div className="flex items-center justify-between w-full gap-2">
        <div className="flex items-center gap-2">
          <div className="bg-black/25 p-1 rounded-lg">
            {getBlockIcon(type)}
          </div>
          <span className="text-[11px] font-mono font-bold tracking-tight uppercase">
            {getBlockLabel(type)}
          </span>
        </div>

        {/* Workspace controls: Delete & Move arrows */}
        {!isToolboxItem && (
          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {onMoveUp && (
              <button 
                onClick={onMoveUp}
                className="hover:bg-black/20 p-0.5 rounded transition text-white/80 hover:text-white"
                title="Move step back"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
            )}
            {onMoveDown && (
              <button 
                onClick={onMoveDown}
                className="hover:bg-black/20 p-0.5 rounded transition text-white/80 hover:text-white"
                title="Move step forward"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={onDelete}
                className="hover:bg-rose-500/30 hover:text-rose-200 p-0.5 rounded transition text-white/70"
                title="Remove block"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Embedded configuration slots for complex block types (LOOP & IF) */}
      {!isToolboxItem && (type === 'LOOP' || type === 'IF') && (
        <div 
          className="mt-2.5 p-2 bg-black/20 rounded-lg border border-white/5 flex flex-col gap-2"
          onClick={e => e.stopPropagation()}
        >
          {/* Loop Count multiplier configuration */}
          {type === 'LOOP' && (
            <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
              <span className="text-white/70">Repeat Count:</span>
              <select
                id={`loop-select-${command.id}`}
                value={payload?.count || 4}
                onChange={(e) => {
                  if (onUpdatePayload) {
                    onUpdatePayload({
                      ...payload,
                      count: parseInt(e.target.value, 10)
                    });
                  }
                }}
                className="bg-slate-900 border border-amber-500/30 rounded px-1.5 py-0.5 text-amber-300 font-bold outline-none"
              >
                {[2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                  <option key={n} value={n}>{n}x</option>
                ))}
              </select>
            </div>
          )}

          {/* Loop Inner single sub-command selector */}
          {type === 'LOOP' && (
            <div className="flex flex-col gap-1 text-[10px] font-mono">
              <span className="text-white/60">Repetitive Command:</span>
              <select
                id={`loop-cmd-select-${command.id}`}
                value={payload?.commands?.[0]?.type || 'MOVE'}
                onChange={(e) => {
                  if (onUpdatePayload) {
                    onUpdatePayload({
                      ...payload,
                      commands: [{ id: `loop-sub-${Date.now()}`, type: e.target.value as CommandType }]
                    });
                  }
                }}
                className="bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-slate-200 outline-none"
              >
                {['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'CALL_F1'].map(actionType => (
                  <option key={actionType} value={actionType}>
                    {getBlockLabel(actionType as CommandType)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* If standing color conditional filter configuration */}
          {type === 'IF' && (
            <div className="flex flex-col gap-1.5 text-[10px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Standing on Color:</span>
                <select
                  id={`if-color-select-${command.id}`}
                  value={payload?.condition || 'blue'}
                  onChange={(e) => {
                    if (onUpdatePayload) {
                      onUpdatePayload({
                        ...payload,
                        condition: e.target.value as TileColor
                      });
                    }
                  }}
                  className="bg-slate-900 border border-rose-500/30 rounded px-1 py-0.5 text-rose-300 font-bold outline-none uppercase"
                >
                  <option value="blue">Blue Tile</option>
                  <option value="orange">Orange Tile</option>
                  <option value="green">Green Tile</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-white/60 text-[9px]">Then Execute Action:</span>
                <select
                  id={`if-action-select-${command.id}`}
                  value={payload?.command?.type || 'MOVE'}
                  onChange={(e) => {
                    if (onUpdatePayload) {
                      onUpdatePayload({
                        ...payload,
                        command: { id: `if-sub-${Date.now()}`, type: e.target.value as CommandType }
                      });
                    }
                  }}
                  className="bg-slate-950 border border-slate-850 rounded px-1 py-0.5 text-white outline-none"
                >
                  {['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'CALL_F1'].map(action => (
                    <option key={action} value={action}>{getBlockLabel(action as CommandType)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sub-block hint texts for visual feedback */}
      {isToolboxItem && type === 'LOOP' && (
        <span className="text-[9px] font-mono text-amber-200/60 mt-1 italic">
          Embedded repeat loop multiplier block
        </span>
      )}
      {isToolboxItem && type === 'IF' && (
        <span className="text-[9px] font-mono text-rose-200/60 mt-1 italic">
          Executes action on matching floor color
        </span>
      )}
    </motion.div>
  );
}
