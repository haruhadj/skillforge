/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Gauge, 
  Terminal 
} from 'lucide-react';

interface ExecutionControlsProps {
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  isPlaying: boolean;
  speedMs: number;
  setSpeedMs: (speed: number) => void;
  currentFrameIndex: number;
  totalFramesCount: number;
  logMessage: string;
  hasProgram: boolean;
}

export default function ExecutionControls({
  onPlay,
  onPause,
  onReset,
  onStepForward,
  onStepBackward,
  isPlaying,
  speedMs,
  setSpeedMs,
  currentFrameIndex,
  totalFramesCount,
  logMessage,
  hasProgram,
}: ExecutionControlsProps) {

  // Percentage for step progress track bar
  const progressPercent = totalFramesCount > 1 
    ? (currentFrameIndex / (totalFramesCount - 1)) * 100 
    : 0;

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-4 shadow-xl" id="execution_controls_panel">
      
      {/* Top Slider and Progress Tracking bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
        
        {/* Speed Adjustment Sliders */}
        <div className="flex items-center gap-2.5 flex-1 select-none">
          <Gauge className="h-4 w-4 text-purple-400 shrink-0" />
          <span className="text-xs font-mono text-slate-300 font-medium shrink-0">EXECUTION TICK:</span>
          <input
            id="speed_range_slider"
            type="range"
            min={100}
            max={1000}
            step={50}
            value={speedMs}
            onChange={(e) => setSpeedMs(Number(e.target.value))}
            className="w-full max-w-[160px] accent-indigo-500 bg-slate-950 cursor-pointer h-1.5 rounded-lg appearance-none"
            title="Adjust robot step execution interval speed (ms)"
          />
          <span className="text-[10px] font-mono text-indigo-400 font-bold shrink-0 w-[42px] text-right">
            {speedMs}ms
          </span>
        </div>

        {/* Dynamic Stepping progress tracker */}
        <div className="flex items-center gap-3 select-none shrink-0">
          <span className="text-[10px] font-mono text-slate-400">
            FRAME: <strong className="text-slate-200">{currentFrameIndex}</strong> / {Math.max(0, totalFramesCount - 1)}
          </span>
          <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div 
              id="progress-bar-fill"
              className="bg-purple-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Button controls row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Step Backward / Reset Rewinders */}
        <div className="flex items-center gap-2">
          <button
            id="control_reset_btn"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 hover:border-slate-700 transition font-mono text-xs font-bold shadow"
            title="Rewind blocks and reset position"
          >
            <RotateCcw className="h-4 w-4 text-rose-400" />
            RESET
          </button>

          <button
            id="control_step_back_btn"
            onClick={onStepBackward}
            disabled={currentFrameIndex === 0 || isPlaying}
            className="p-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-300 rounded-xl border border-slate-800 transition shadow"
            title="Step-by-step backward (Debugger debug)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Primary Play-Pause Launch Control */}
        <div className="flex items-center justify-center">
          {isPlaying ? (
            <button
              id="control_pause_btn"
              onClick={onPause}
              className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] transition duration-150 animate-pulse"
              title="Pause robot compiler executions"
            >
              <Pause className="h-4 w-4 fill-current" />
              PAUSE SPEED
            </button>
          ) : (
            <button
              id="control_play_btn"
              onClick={onPlay}
              disabled={!hasProgram}
              className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-450 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold font-mono text-xs rounded-xl shadow-lg shadow-indigo-650/15 transition-all duration-300"
              title="Compile workspace and launch compiler ticks"
            >
              <Play className="h-4 w-4 fill-current" />
              COMPILED RUN
            </button>
          )}
        </div>

        {/* Step Forward debugging advance */}
        <div className="flex items-center">
          <button
            id="control_step_forward_btn"
            onClick={onStepForward}
            disabled={currentFrameIndex >= totalFramesCount - 1 || isPlaying || !hasProgram}
            className="flex items-center gap-1 px-3 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-300 rounded-xl border border-slate-800 transition font-mono text-xs font-bold shadow"
            title="Step-by-step forward debugging tick"
          >
            STEP
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compiler Log Console output view */}
      <div className="flex items-start gap-2.5 bg-slate-950 px-3.5 py-3 rounded-xl border border-slate-800/80 font-mono text-[11px] leading-relaxed select-text" id="execution_console_prompt">
        <Terminal className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col">
          <span className="text-slate-500 text-[9px] font-bold tracking-widest uppercase mb-0.5">CONSOLE PIPELINE LOG</span>
          <p className="text-slate-350 min-h-[16px]">
            {logMessage || "No commands compiled in workspace yet. Append blocks to proceed!"}
          </p>
        </div>
      </div>
    </div>
  );
}
