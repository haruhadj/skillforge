/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Trash2, 
  HelpCircle, 
  X, 
  Settings, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { Level, Command, CommandType, ExecutionFrame, TileState } from './types';
import { LEVELS } from './levels';
import { runInterpreter } from './utils/interpreter';
import GridViewer from './components/GridViewer';
import Workspace from './components/Workspace';
import ExecutionControls from './components/ExecutionControls';
import Sidebar from './components/Sidebar';

/**
 * Bridge helper for the SkillForge iframe host. Guarded with
 * `window.parent !== window` so the game still runs correctly when opened
 * standalone (outside the iframe), per the data-collection contract.
 */
function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

export default function App() {
  // Game progression & active state
  const [activeLevelId, setActiveLevelId] = useState<number>(1);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  
  // Custom workspace compiler states
  const [mainProgram, setMainProgram] = useState<Command[]>([]);
  const [f1Program, setF1Program] = useState<Command[]>([]);
  const [f2Program, setF2Program] = useState<Command[]>([]);
  
  // Tab target write container selection
  const [selectedContainer, setSelectedContainer] = useState<'MAIN' | 'F1' | 'F2'>('MAIN');

  // Interactive Playback speed
  const [speedMs, setSpeedMs] = useState<number>(450);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);

  // Help / Onboarding modals
  const [showHelp, setShowHelp] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' | 'success' } | null>(null);

  const activeLevel = useMemo(() => {
    return LEVELS.find((l) => l.id === activeLevelId) || LEVELS[0];
  }, [activeLevelId]);

  // Load user progress on mount
  useEffect(() => {
    const savedCompleted = localStorage.getItem('codequest_completed_levels');
    if (savedCompleted) {
      try {
        setCompletedLevels(JSON.parse(savedCompleted));
      } catch (err) {
        console.error("Failed to parse levels progress", err);
      }
    }
  }, []);

  // Bridge with the SkillForge host: request any cloud-saved progress on load,
  // then merge restored completions back in (union by level id, no duplicates).
  useEffect(() => {
    postToParent('REQUEST_PROGRESS', undefined);

    function onHostMessage(event: MessageEvent) {
      const msg = event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'RESTORE_PROGRESS') return;
      const remote = msg.data && Array.isArray(msg.data.completedLevels)
        ? (msg.data.completedLevels as number[])
        : [];
      if (remote.length === 0) return;
      setCompletedLevels((prev) => {
        const merged = Array.from(new Set([...prev, ...remote])).sort((a, b) => a - b);
        localStorage.setItem('codequest_completed_levels', JSON.stringify(merged));
        return merged;
      });
    }

    window.addEventListener('message', onHostMessage);
    return () => window.removeEventListener('message', onHostMessage);
  }, []);

  // Set-up saving completed level state
  const setLevelAsCompleted = (levelId: number) => {
    if (!completedLevels.includes(levelId)) {
      const next = [...completedLevels, levelId];
      setCompletedLevels(next);
      localStorage.setItem('codequest_completed_levels', JSON.stringify(next));
      triggerNotification("🏆 Milestone unlocked: Level completed successfully!", "success");

      // Report score & stats to the SkillForge host via the postMessage bridge.
      const levelsCompleted = next.length;
      postToParent('BEST_SCORE', { bestScore: levelsCompleted });
      postToParent('GAME_STATS', {
        levelsCompleted,
        totalLevels: LEVELS.length,
        totalGames: levelsCompleted, // required: drives the "Matches" counter on the profile
        completedLevels: next,       // full set, for cross-device progress restore
        lastLevelId: levelId,
      });
    }
  };

  // Safe UI notification trigger
  const triggerNotification = (message: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setNotification({ message, type });
  };

  // Toast auto-dismisser
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Save/Load user workspace logic programs for each specific level to localStorage
  // This allows the student to switch back and forth without losing the code they wrote!
  useEffect(() => {
    // On level change, load previously saved logic if available
    const savedState = localStorage.getItem(`codequest_level_save_${activeLevelId}`);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setMainProgram(parsed.main || []);
        setF1Program(parsed.f1 || []);
        setF2Program(parsed.f2 || []);
      } catch (err) {
        setMainProgram([]);
        setF1Program([]);
        setF2Program([]);
      }
    } else {
      // Clear workspace if no save exists for this level
      setMainProgram([]);
      setF1Program([]);
      setF2Program([]);
    }

    // Reset runtime stepper on switching levels
    setIsPlaying(false);
    setCurrentFrameIndex(0);
    
    // Automatically switch target block writing mode depending on level capabilities
    setSelectedContainer('MAIN');
  }, [activeLevelId]);

  // Sync current programs to localStorage whenever they change
  useEffect(() => {
    const programState = {
      main: mainProgram,
      f1: f1Program,
      f2: f2Program
    };
    localStorage.setItem(`codequest_level_save_${activeLevelId}`, JSON.stringify(programState));
  }, [mainProgram, f1Program, f2Program, activeLevelId]);

  // Compile active workspace commands to linear virtual machine execution frames
  const compiledFrames = useMemo<ExecutionFrame[]>(() => {
    return runInterpreter(activeLevel, mainProgram, f1Program, f2Program);
  }, [activeLevel, mainProgram, f1Program, f2Program]);

  const activeFrame = useMemo<ExecutionFrame>(() => {
    if (compiledFrames.length === 0) {
      return {
        robotPos: { ...activeLevel.startPos },
        robotDir: activeLevel.startDir,
        grid: { ...activeLevel.grid },
        activeBlockId: null,
        activeSourceUnit: null,
        activeSourceIndex: null,
        activatedGoalsCount: 0,
        totalGoalsCount: (Object.values(activeLevel.grid) as TileState[]).filter(t => t.isGoal).length,
        message: "No instructions compiled. Press blocks to build layout.",
      };
    }
    return compiledFrames[Math.min(currentFrameIndex, compiledFrames.length - 1)];
  }, [compiledFrames, currentFrameIndex, activeLevel]);

  // Playback timer ticker loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentFrameIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= compiledFrames.length) {
            setIsPlaying(false);
            
            // Check if final frame state represents level victory!
            const lastFrame = compiledFrames[compiledFrames.length - 1];
            if (lastFrame && lastFrame.activatedGoalsCount === lastFrame.totalGoalsCount && lastFrame.totalGoalsCount > 0) {
              setLevelAsCompleted(activeLevelId);
            }
            return prevIndex; // Hold of the last frame
          }
          return nextIndex;
        });
      }, speedMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, compiledFrames, speedMs, activeLevelId]);

  // Workspace Actions Click handlers
  const handleAddBlockToWorkspace = (type: CommandType) => {
    const maxMain = activeLevel.maxMainSlots;
    const maxF1 = activeLevel.maxFuncSlots[0];
    const maxF2 = activeLevel.maxFuncSlots[1];

    const newBlock: Command = {
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      payload: type === 'LOOP'
        ? { count: 3, commands: [{ id: `loop-sub-${Date.now()}`, type: 'MOVE' }] }
        : type === 'IF'
          ? { condition: 'blue', command: { id: `if-sub-${Date.now()}`, type: 'TURN_L' } }
          : undefined
    };

    if (selectedContainer === 'MAIN') {
      if (mainProgram.length >= maxMain) {
        triggerNotification(`Max Limit reached! Main Workspace is capped at ${maxMain} lines. Try refactoring or loop optimization!`, 'warning');
        return;
      }
      setMainProgram([...mainProgram, newBlock]);
    } else if (selectedContainer === 'F1') {
      if (!f1Program || f1Program.length >= maxF1) {
        triggerNotification(`Subroutine limit reached! F1 is capped at ${maxF1} lines.`, 'warning');
        return;
      }
      setF1Program([...f1Program, newBlock]);
    } else if (selectedContainer === 'F2') {
      if (!f2Program || f2Program.length >= maxF2) {
        triggerNotification(`Subroutine limit reached! F2 is capped at ${maxF2} lines.`, 'warning');
        return;
      }
      setF2Program([...f2Program, newBlock]);
    }

    // Rewind runner back to start state as compiled structure changed
    setCurrentFrameIndex(0);
    setIsPlaying(false);
  };

  // Execution controls triggers
  const handlePlay = () => {
    if (compiledFrames.length <= 1) {
      triggerNotification("Your program workspace is currently empty! Add blocks from the Toolbox first.", "warning");
      return;
    }
    if (currentFrameIndex >= compiledFrames.length - 1) {
      setCurrentFrameIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const handleStepForward = () => {
    if (currentFrameIndex < compiledFrames.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    }
  };

  const handleResetProgressAll = () => {
    if (window.confirm("Are you sure you want to clear your entire progress roadmap? This resets all stars and solved levels.")) {
      setCompletedLevels([]);
      localStorage.removeItem('codequest_completed_levels');
      LEVELS.forEach(l => localStorage.removeItem(`codequest_level_save_${l.id}`));
      setMainProgram([]);
      setF1Program([]);
      setF2Program([]);
      setActiveLevelId(1);
      triggerNotification(" रोडमैप - Level Roadmap & solutions successfully reset.", "info");
    }
  };

  // Calculate current run success conditions
  const isFinalStep = currentFrameIndex === compiledFrames.length - 1;
  const lastStateFrame = compiledFrames[compiledFrames.length - 1];
  const isRunSuccess = isFinalStep && lastStateFrame && lastStateFrame.activatedGoalsCount === lastStateFrame.totalGoalsCount && lastStateFrame.totalGoalsCount > 0;
  const isRunFailure = isFinalStep && lastStateFrame && lastStateFrame.activatedGoalsCount < lastStateFrame.totalGoalsCount;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      
      {/* Dynamic Floating Toast Notifications */}
      {notification && (
        <div 
          id="toast_notification"
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium max-w-sm transition-all duration-300 animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-300' 
              : notification.type === 'warning' 
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-300' 
                : 'bg-slate-900 border-indigo-500/40 text-indigo-200'
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 hover:bg-white/10 p-0.5 rounded transition text-slate-400"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Main Game Executive Header Navigation row */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-indigo-500 rounded-full animate-ping" />
          <h2 className="text-sm font-display font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-300 to-rose-300">
            CODE QUEST / LOGIC BLOCKS
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Dashboard action utilities */}
          <button
            id="help_guide_btn"
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition text-xs font-mono"
            title="Read computational thinking tutorial guide"
          >
            <HelpCircle className="h-4 w-4 text-purple-400" />
            LESSON COMPANION
          </button>

          <button
            id="clear_progress_btn"
            onClick={handleResetProgressAll}
            className="flex items-center gap-1 p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-rose-950/20 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 transition"
            title="Reset level completions and active saves"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Game Interface Board Grid layout */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Bento: Code Lesson, Roadmap, & Command Toolbox */}
        <div className="lg:col-span-4 h-full flex flex-col gap-4">
          <Sidebar
            levels={LEVELS}
            activeLevelId={activeLevelId}
            onSelectLevel={setActiveLevelId}
            completedLevelIds={completedLevels}
            selectedContainer={selectedContainer}
            onAddBlockToWorkspace={handleAddBlockToWorkspace}
          />
        </div>

        {/* Center Bento: Simulator Grid Canvas viewport */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full min-h-[460px]">
          <GridViewer
            level={activeLevel}
            robotPos={activeFrame.robotPos}
            robotDir={activeFrame.robotDir}
            grid={activeFrame.grid}
            isExecuting={isPlaying}
            isSuccess={isRunSuccess}
            isFailure={isRunFailure}
          />
        </div>

        {/* Right Bento: Target Program Editor workspace & Playback details */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          
          <div className="flex-1">
            <Workspace
              level={activeLevel}
              mainProgram={mainProgram}
              f1Program={f1Program}
              f2Program={f2Program}
              onUpdateMain={setMainProgram}
              onUpdateF1={setF1Program}
              onUpdateF2={setF2Program}
              activeBlockId={activeFrame.activeBlockId}
              activeSourceUnit={activeFrame.activeSourceUnit}
              selectedContainer={selectedContainer}
              setSelectedContainer={setSelectedContainer}
            />
          </div>

          <div className="shrink-0">
            <ExecutionControls
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
              isPlaying={isPlaying}
              speedMs={speedMs}
              setSpeedMs={setSpeedMs}
              currentFrameIndex={currentFrameIndex}
              totalFramesCount={compiledFrames.length}
              logMessage={activeFrame.message}
              hasProgram={compiledFrames.length > 1}
            />
          </div>

        </div>

      </main>

      {/* Core Onboarding Interactive Lesson Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-lg w-full shadow-2xl relative flex flex-col gap-4 animate-fade-in" id="help_modal_layout">
            <button
              id="close_help_modal_btn"
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600/30 p-2 rounded-xl text-indigo-400 border border-indigo-500/20">
                <GraduationCap className="h-5 w-5 animate-bounce" />
              </div>
              <h3 className="text-base font-display font-bold text-slate-100 tracking-wide uppercase">
                WELCOME TO CODE QUEST!
              </h3>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed">
              Help the robot navigate complex grid worlds and light up the gold target nodes! You will learn core Computer Science principles using visual command blocks.
            </p>

            {/* Quick manual of symbols */}
            <div className="flex flex-col gap-3.5 bg-slate-950 p-4 rounded-xl border border-slate-850">
              <h4 className="text-[11px] font-mono font-bold text-indigo-400 tracking-wider">COMMAND MANUAL</h4>
              
              <div className="flex items-start gap-3">
                <span className="text-[10px] bg-blue-600/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-500/30 font-bold uppercase shrink-0">
                  MOVEMENT
                </span>
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  <strong>Move Forward</strong> steps robot straight ahead; <strong>Turn Left/Right</strong> rotates 90° in place.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[10px] bg-emerald-600/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase shrink-0">
                  ACTIVATE
                </span>
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  Stops and illuminates the gold goal tile you are standing on. You must illuminate all goals to win!
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[10px] bg-amber-600/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/30 font-bold uppercase shrink-0">
                  LOOPS
                </span>
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  Select repeat multiplier settings (up to 12 times) to efficiently compress your limited code slots!
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[10px] bg-purple-600/20 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/30 font-bold uppercase shrink-0">
                  SUBROUTINES
                </span>
                <p className="text-[10.5px] text-slate-400 leading-normal">
                  Encapsulate blocks inside <strong>F1 / F2</strong>. You can call them from Main to solve complex, repeating patterns!
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-2">
              <span className="text-[9.5px] font-mono text-slate-500">
                Created for Beginner Programming Students
              </span>
              <button
                id="enter_game_btn"
                onClick={() => setShowHelp(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all duration-200"
              >
                START CHALLENGE (LEVEL 1)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-quality footer credit line */}
      <footer className="bg-slate-900/20 py-2 border-t border-slate-850 text-center select-none shrink-0" id="game_footer_panel">
        <p className="text-[9px] text-slate-600 font-mono">
          Code Quest • Teaching Sequencing, Loops, Functions, and Conditionals with visual modules • Offline Persistent Saves
        </p>
      </footer>
    </div>
  );
}
