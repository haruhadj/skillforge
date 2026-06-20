/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Trophy, 
  Lightbulb, 
  BookOpen, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { Level, CommandType, Command } from '../types';
import { LEVELS } from '../levels';
import { getBlockColorClasses } from './CommandBlockItem';

interface SidebarProps {
  levels: Level[];
  activeLevelId: number;
  onSelectLevel: (id: number) => void;
  completedLevelIds: number[];
  selectedContainer: 'MAIN' | 'F1' | 'F2';
  onAddBlockToWorkspace: (type: CommandType) => void;
}

export default function Sidebar({
  levels,
  activeLevelId,
  onSelectLevel,
  completedLevelIds,
  selectedContainer,
  onAddBlockToWorkspace,
}: SidebarProps) {
  const currentLevel = levels.find((l) => l.id === activeLevelId) || levels[0];

  const getDifficultyColor = (diff: Level['difficulty']) => {
    switch (diff) {
      case 'Beginner': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Medium': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Advanced': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Expert': return 'text-indigo-400 bg-indigo-500/10 border-indigo-400/20';
    }
  };

  const getBlockDescription = (type: CommandType): string => {
    switch (type) {
      case 'MOVE': return 'Steps robot forward 1 cell in direction indicator';
      case 'TURN_L': return 'Rotates 90° left in place';
      case 'TURN_R': return 'Rotates 90° right in place';
      case 'ACTIVATE': return 'Illuminates the custom glowing node below';
      case 'LOOP': return 'Repeats action blocks up to 12 times';
      case 'IF': return 'Triggers decision if standing color matches';
      case 'CALL_F1': return 'Runs encapsulated Function 1 commands';
      case 'CALL_F2': return 'Runs encapsulated Function 2 commands';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-fade-in" id="sidebar_controls_outer">
      
      {/* Sidebar Game Header Info */}
      <div className="bg-slate-950 p-4 border-b border-slate-800" id="game_logo_hero">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-purple-600 to-indigo-500 p-2 rounded-xl border border-purple-400/30">
            <GraduationCap className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-display font-bold text-slate-100 tracking-wider uppercase">CODE QUEST</h1>
            <p className="text-[10px] font-mono text-slate-400">Logic Blocks Engine v1.40</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5">
        
        {/* Dynamic Concept Explanation */}
        <div className="bg-slate-950/40 border border-slate-800/80 p-3.5 rounded-xl flex flex-col gap-2 shadow-sm" id="pedagogical_lesson_module">
          <div className="flex items-center gap-1.5 text-purple-400 font-mono text-xs font-bold leading-none">
            <BookOpen className="h-4 w-4" />
            <span>TOPIC: {currentLevel.concept}</span>
          </div>
          
          <h2 className="text-xs font-display font-medium text-slate-200 mt-1">
            {currentLevel.name}
          </h2>

          <p className="text-[10.5px] text-slate-350 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-850">
            {currentLevel.conceptDescription}
          </p>

          <div className="flex items-start gap-2 bg-indigo-950/15 border border-indigo-500/20 p-2.5 rounded-lg text-[10.5px] mt-1 text-slate-300">
            <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-400 font-bold block mb-0.5">OBJECTIVE HINT:</strong>
              {currentLevel.hint}
            </div>
          </div>
        </div>

        {/* Level Path Selector Track */}
        <div className="flex flex-col gap-2.5" id="level_selector_group">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300">
            <span className="font-bold">MISSION ROADMAP</span>
            <span className="text-[10px] text-slate-500">
              {completedLevelIds.length} / {levels.length} SOLVED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2" id="levels_grid_path">
            {levels.map((lvl) => {
              const isCurrent = lvl.id === activeLevelId;
              const isCompleted = completedLevelIds.includes(lvl.id);
              const diffColor = getDifficultyColor(lvl.difficulty);

              return (
                <button
                  key={lvl.id}
                  id={`btn-select-level-${lvl.id}`}
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`relative flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                    isCurrent
                      ? 'bg-gradient-to-r from-slate-800 to-indigo-950 border-indigo-500 shadow-md text-white'
                      : 'bg-slate-950/50 hover:bg-slate-800/30 border-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono font-bold text-slate-400">
                        {lvl.id}.
                      </span>
                      <span className="text-[11px] font-display font-medium truncate">
                        {lvl.name}
                      </span>
                    </div>
                    <span className={`inline-block mt-1 text-[8px] font-mono font-medium rounded-md px-1.5 py-0.5 border w-max uppercase ${diffColor}`}>
                      {lvl.concept}
                    </span>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 fill-emerald-950/50" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Command Toolbox */}
        <div className="flex flex-col gap-2.5 border-t border-slate-850 pt-4" id="commands_toolbox_group">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-300">COMMAND TOOLBOX</span>
              <span className="text-[10px] font-mono bg-indigo-950 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase">
                TARGET: WRITER IS {selectedContainer}
              </span>
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-1 leading-normal">
              Click a block to append it safely. Writing is constrained by slot limits.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2" id="toolbox_items_pool">
            {currentLevel.availableBlocks.map((blockType) => {
              const bgClass = getBlockColorClasses(blockType);
              const desc = getBlockDescription(blockType);
              
              return (
                <button
                  key={blockType}
                  id={`toolbox-block-${blockType}`}
                  onClick={() => onAddBlockToWorkspace(blockType)}
                  className={`group flex flex-col p-2 rounded-xl text-left border cursor-pointer border-b-4 border-b-black/20 ${bgClass} transition shadow-sm`}
                  title={`Append ${blockType} to target panel`}
                >
                  <span className="text-[11px] font-mono font-bold uppercase tracking-tight">
                    {blockType === 'LOOP' ? 'Repeat' : blockType === 'IF' ? 'If Color' : blockType}
                  </span>
                  <span className="text-[8px] opacity-75 leading-tight font-mono truncate mt-0.5 text-ellipsis block">
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Completion Trophy Showcase Banner */}
      {completedLevelIds.length === levels.length && (
        <div className="bg-gradient-to-r from-amber-600/95 to-indigo-950/95 p-3.5 border-t border-amber-500/30 flex items-center gap-2.5 select-none animate-bounce" id="completion_badge">
          <Trophy className="h-5 w-5 text-amber-300 animate-spin shrink-0" />
          <div className="flex-1">
            <h4 className="text-[11px] font-bold text-amber-200 uppercase leading-none">ALL CHALLENGES SOLVED!</h4>
            <p className="text-[9.5px] text-amber-100/90 leading-tight mt-0.5">
              Outstanding computer scientist achievement unlocked.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
