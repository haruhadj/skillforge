/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'N' | 'E' | 'S' | 'W';

export interface Position {
  x: number;
  y: number;
  z: number; // Elevation/height stack (0 = flat ground, 1 = 1-block high, etc.)
}

export type CommandType =
  | 'MOVE'       // Move forward 1 step
  | 'TURN_L'     // Turn left 90 deg
  | 'TURN_R'     // Turn right 90 deg
  | 'ACTIVATE'   // Light up/activate blue goal node
  | 'LOOP'       // Repeat actions inside payload
  | 'IF'         // Conditional execution based on standing tile color
  | 'CALL_F1'    // Run function 1
  | 'CALL_F2';   // Run function 2

export type TileColor = 'normal' | 'blue' | 'orange' | 'green';

export interface TileState {
  z: number;              // Coordinate height
  isGoal: boolean;        // Is this a goal target
  color: TileColor;       // Color of the tile for conditionals or visual theme
  activated?: boolean;    // Has the goal been activated in the current run?
}

export interface GridMap {
  [key: string]: TileState; // key is in format "x,y"
}

export interface Command {
  id: string;
  type: CommandType;
  // payload can store:
  // - for 'LOOP': { count: number, commands: Command[] }
  // - for 'IF': { condition: TileColor | 'isGoal' | 'isElevated', command: Command }
  payload?: any;
}

export interface Level {
  id: number;
  name: string;
  concept: 'Sequencing' | 'Loops' | 'Functions' | 'Conditionals';
  conceptDescription: string;
  hint: string;
  dimensions: { width: number; height: number };
  grid: GridMap;
  startPos: Position;
  startDir: Direction;
  maxMainSlots: number;
  maxFuncSlots: number[]; // Index 0 for F1 slots, Index 1 for F2 slots
  availableBlocks: CommandType[];
  difficulty: 'Beginner' | 'Medium' | 'Advanced' | 'Expert';
}

export interface ExecutionState {
  robotPos: Position;
  robotDir: Direction;
  grid: GridMap;
  currentInstructionIndex: number; // pointer in flat execution sequence
  activeSlotInfo: {
    stackIndex: number; // cursor within the instruction trace
    sourceType: 'MAIN' | 'F1' | 'F2';
    blockId: string;
  } | null;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILURE' | 'ERROR';
  errorMessage: string;
}

export interface ExecutionFrame {
  robotPos: Position;
  robotDir: Direction;
  grid: GridMap;
  activeBlockId: string | null;
  activeSourceUnit: 'MAIN' | 'F1' | 'F2' | null;
  activeSourceIndex: number | null;
  activatedGoalsCount: number;
  totalGoalsCount: number;
  message: string;
}
