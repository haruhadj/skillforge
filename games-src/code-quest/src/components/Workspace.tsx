/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, Play, Trash2, Code } from 'lucide-react';
import { Command, CommandType, Level } from '../types';
import CommandBlockItem from './CommandBlockItem';

interface WorkspaceProps {
  level: Level;
  mainProgram: Command[];
  f1Program: Command[];
  f2Program: Command[];
  onUpdateMain: (cmds: Command[]) => void;
  onUpdateF1: (cmds: Command[]) => void;
  onUpdateF2: (cmds: Command[]) => void;
  activeBlockId: string | null;
  activeSourceUnit: 'MAIN' | 'F1' | 'F2' | null;
  selectedContainer: 'MAIN' | 'F1' | 'F2';
  setSelectedContainer: (container: 'MAIN' | 'F1' | 'F2') => void;
}

export default function Workspace({
  level,
  mainProgram,
  f1Program,
  f2Program,
  onUpdateMain,
  onUpdateF1,
  onUpdateF2,
  activeBlockId,
  activeSourceUnit,
  selectedContainer,
  setSelectedContainer,
}: WorkspaceProps) {
  const { maxMainSlots, maxFuncSlots } = level;
  const hasF1 = maxFuncSlots[0] > 0;
  const hasF2 = maxFuncSlots[1] > 0;

  // Manage updating arrays based on index reordering
  const handleMoveUp = (array: Command[], index: number, updateFn: (arr: Command[]) => void) => {
    if (index === 0) return;
    const next = [...array];
    const temp = next[index];
    next[index] = next[index - 1];
    next[index - 1] = temp;
    updateFn(next);
  };

  const handleMoveDown = (array: Command[], index: number, updateFn: (arr: Command[]) => void) => {
    if (index === array.length - 1) return;
    const next = [...array];
    const temp = next[index];
    next[index] = next[index + 1];
    next[index + 1] = temp;
    updateFn(next);
  };

  const handleDelete = (array: Command[], index: number, updateFn: (arr: Command[]) => void) => {
    const next = array.filter((_, i) => i !== index);
    updateFn(next);
  };

  const handleUpdatePayload = (array: Command[], index: number, payload: any, updateFn: (arr: Command[]) => void) => {
    const next = [...array];
    next[index] = { ...next[index], payload };
    updateFn(next);
  };

  // Clear program scope
  const handleClear = (container: 'MAIN' | 'F1' | 'F2') => {
    if (container === 'MAIN') onUpdateMain([]);
    else if (container === 'F1') onUpdateF1([]);
    else if (container === 'F2') onUpdateF2([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-4 gap-4">
      
      {/* Workspace Header Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3" id="workspace_header">
        <div className="flex items-center gap-2">
          <Code className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-display font-bold text-slate-100 tracking-wide">ACTIVE WORKSPACE</h3>
        </div>
        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700/50 hidden sm:inline">
          SELECT WRITER CONTAINER TO TARGET
        </span>
        <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-1 rounded-md border border-indigo-500/30 sm:hidden">
          TAP PANEL BELOW
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        
        {/* Main Program Section */}
        <div 
          onClick={() => setSelectedContainer('MAIN')}
          className={`flex flex-col p-3 rounded-xl border transition-all ${
            selectedContainer === 'MAIN' 
              ? 'bg-slate-800/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
              : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/20'
          }`}
          id="main_program_container"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${selectedContainer === 'MAIN' ? 'bg-indigo-500 animate-pulse' : 'bg-slate-600'}`} />
              <h4 className="text-xs font-mono font-bold text-slate-200">
                MAIN PROGRAM 
                <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                  ({mainProgram.length} / {maxMainSlots} slots)
                </span>
              </h4>
            </div>

            <button
              id="clear_main_btn"
              onClick={(e) => {
                e.stopPropagation();
                handleClear('MAIN');
              }}
              className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 hover:border-rose-500/20"
              title="Clear all main program slots"
            >
              <Trash2 className="h-3 w-3" />
              CLEAR
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 min-h-[60px] bg-slate-950/40 p-2 rounded-lg border border-slate-900">
            {mainProgram.map((cmd, idx) => (
              <CommandBlockItem
                key={cmd.id}
                command={cmd}
                onDelete={() => handleDelete(mainProgram, idx, onUpdateMain)}
                onMoveUp={idx > 0 ? () => handleMoveUp(mainProgram, idx, onUpdateMain) : undefined}
                onMoveDown={idx < mainProgram.length - 1 ? () => handleMoveDown(mainProgram, idx, onUpdateMain) : undefined}
                onUpdatePayload={(payload) => handleUpdatePayload(mainProgram, idx, payload, onUpdateMain)}
                isActiveStep={activeSourceUnit === 'MAIN' && activeBlockId === cmd.id}
              />
            ))}

            {/* Empty slots placeholders */}
            {Array.from({ length: Math.max(0, maxMainSlots - mainProgram.length) }).map((_, idx) => (
              <div
                key={`empty-main-${idx}`}
                className="border border-dashed border-slate-800 rounded-xl flex items-center justify-center py-3 sm:py-5 px-3 text-[10px] text-slate-600 font-mono"
              >
                Slot {mainProgram.length + idx + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Function 1 Panel */}
        {hasF1 && (
          <div 
            onClick={() => setSelectedContainer('F1')}
            className={`flex flex-col p-3 rounded-xl border transition-all ${
              selectedContainer === 'F1' 
                ? 'bg-slate-800/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/20'
            }`}
            id="f1_program_container"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${selectedContainer === 'F1' ? 'bg-purple-500 animate-pulse' : 'bg-slate-600'}`} />
                <h4 className="text-xs font-mono font-bold text-slate-200">
                  FUNCTION F1 
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                    ({f1Program.length} / {maxFuncSlots[0]} slots)
                  </span>
                </h4>
              </div>

              <button
                id="clear_f1_btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear('F1');
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 hover:border-rose-500/20"
                title="Clear F1 subroutine slots"
              >
                <Trash2 className="h-3 w-3" />
                CLEAR
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 min-h-[60px] bg-slate-950/40 p-2 rounded-lg border border-slate-900">
              {f1Program.map((cmd, idx) => (
                <CommandBlockItem
                  key={cmd.id}
                  command={cmd}
                  onDelete={() => handleDelete(f1Program, idx, onUpdateF1)}
                  onMoveUp={idx > 0 ? () => handleMoveUp(f1Program, idx, onUpdateF1) : undefined}
                  onMoveDown={idx < f1Program.length - 1 ? () => handleMoveDown(f1Program, idx, onUpdateF1) : undefined}
                  onUpdatePayload={(payload) => handleUpdatePayload(f1Program, idx, payload, onUpdateF1)}
                  isActiveStep={activeSourceUnit === 'F1' && activeBlockId === cmd.id}
                />
              ))}

              {Array.from({ length: Math.max(0, maxFuncSlots[0] - f1Program.length) }).map((_, idx) => (
                <div
                  key={`empty-f1-${idx}`}
                  className="border border-dashed border-slate-800 rounded-xl flex items-center justify-center py-3 sm:py-5 px-3 text-[10px] text-slate-600 font-mono"
                >
                  F1 Slot {f1Program.length + idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Function 2 Panel */}
        {hasF2 && (
          <div 
            onClick={() => setSelectedContainer('F2')}
            className={`flex flex-col p-3 rounded-xl border transition-all ${
              selectedContainer === 'F2' 
                ? 'bg-slate-800/40 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.05)]' 
                : 'bg-slate-900/60 border-slate-800/50 hover:bg-slate-800/20'
            }`}
            id="f2_program_container"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${selectedContainer === 'F2' ? 'bg-fuchsia-500 animate-pulse' : 'bg-slate-600'}`} />
                <h4 className="text-xs font-mono font-bold text-slate-200">
                  FUNCTION F2 
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                    ({f2Program.length} / {maxFuncSlots[1]} slots)
                  </span>
                </h4>
              </div>

              <button
                id="clear_f2_btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear('F2');
                }}
                className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px] bg-slate-950 px-2 py-1 rounded border border-slate-800 hover:border-rose-500/20"
                title="Clear F2 subroutine slots"
              >
                <Trash2 className="h-3 w-3" />
                CLEAR
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 min-h-[60px] bg-slate-950/40 p-2 rounded-lg border border-slate-900">
              {f2Program.map((cmd, idx) => (
                <CommandBlockItem
                  key={cmd.id}
                  command={cmd}
                  onDelete={() => handleDelete(f2Program, idx, onUpdateF2)}
                  onMoveUp={idx > 0 ? () => handleMoveUp(f2Program, idx, onUpdateF2) : undefined}
                  onMoveDown={idx < f2Program.length - 1 ? () => handleMoveDown(f2Program, idx, onUpdateF2) : undefined}
                  onUpdatePayload={(payload) => handleUpdatePayload(f2Program, idx, payload, onUpdateF2)}
                  isActiveStep={activeSourceUnit === 'F2' && activeBlockId === cmd.id}
                />
              ))}

              {Array.from({ length: Math.max(0, maxFuncSlots[1] - f2Program.length) }).map((_, idx) => (
                <div
                  key={`empty-f2-${idx}`}
                  className="border border-dashed border-slate-800 rounded-xl flex items-center justify-center py-3 sm:py-5 px-3 text-[10px] text-slate-600 font-mono"
                >
                  F2 Slot {f2Program.length + idx + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
