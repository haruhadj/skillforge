/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level, GridMap, TileState, TileColor } from './types';

// Helper to create a normal tile
const normalTile = (z: number = 0): TileState => ({
  z,
  isGoal: false,
  color: 'normal',
});

// Helper to create a goal tile
const goalTile = (z: number = 0, color: TileColor = 'normal'): TileState => ({
  z,
  isGoal: true,
  color,
});

// Helper to create colored tiles
const coloredTile = (z: number = 0, color: TileColor = 'normal'): TileState => ({
  z,
  isGoal: false,
  color,
});

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "First Steps",
    concept: "Sequencing",
    conceptDescription: "Compilers execute commands strictly in order. Place your blocks one after another to guide the robot.",
    hint: "Move forward 3 times to stand on the yellow goal node, then press 'Activate' to power it up!",
    difficulty: "Beginner",
    dimensions: { width: 6, height: 6 },
    startPos: { x: 1, y: 3, z: 0 },
    startDir: 'E',
    maxMainSlots: 4,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'ACTIVATE'],
    grid: {
      "1,3": normalTile(0),
      "2,3": normalTile(0),
      "3,3": normalTile(0),
      "4,3": goalTile(0),
    }
  },
  {
    id: 2,
    name: "The Winding Path",
    concept: "Sequencing",
    conceptDescription: "Great navigation requires turning. Turn commands rotate the robot in place without moving it.",
    hint: "Think step-by-step: move, turn left/right, and step forward again. Don't forget to 'Activate' on the goal!",
    difficulty: "Beginner",
    dimensions: { width: 6, height: 6 },
    startPos: { x: 1, y: 1, z: 0 },
    startDir: 'E',
    maxMainSlots: 8,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE'],
    grid: {
      "1,1": normalTile(0),
      "2,1": normalTile(0),
      "2,2": normalTile(0),
      "3,2": normalTile(0),
      "3,3": normalTile(0),
      "4,3": goalTile(0),
    }
  },
  {
    id: 3,
    name: "The Long Walk",
    concept: "Loops",
    conceptDescription: "Loops let you repeat actions without writing them repeatedly. They compress code slots and solve long paths efficiently.",
    hint: "You only have 3 slots in the main workspace! Use a 'Repeat' loop to move multiple times, then activate the final goal.",
    difficulty: "Medium",
    dimensions: { width: 8, height: 6 },
    startPos: { x: 0, y: 2, z: 0 },
    startDir: 'E',
    maxMainSlots: 3,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'ACTIVATE', 'LOOP'],
    grid: {
      "0,2": normalTile(0),
      "1,2": normalTile(0),
      "2,2": normalTile(0),
      "3,2": normalTile(0),
      "4,2": normalTile(0),
      "5,2": normalTile(0),
      "6,2": normalTile(0),
      "7,2": goalTile(0),
    }
  },
  {
    id: 4,
    name: "Ascending the Pyramid",
    concept: "Loops",
    conceptDescription: "Our robot naturally steps up or down exactly one block height (z) at a time. Perfect for stair climbing!",
    hint: "Loop the 'Move Forward' action to scale the pyramid steps, then light up the peak goal node.",
    difficulty: "Medium",
    dimensions: { width: 6, height: 6 },
    startPos: { x: 2, y: 0, z: 0 },
    startDir: 'S',
    maxMainSlots: 3,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'ACTIVATE', 'LOOP'],
    grid: {
      "2,0": normalTile(0),
      "2,1": normalTile(1),
      "2,2": normalTile(2),
      "2,3": normalTile(3),
      "2,4": goalTile(4),
    }
  },
  {
    id: 5,
    name: "The Four Wings",
    concept: "Functions",
    conceptDescription: "Subroutines (like F1) encapsulate a package of logic. You can write it once, and reuse it multiple times in your main code.",
    hint: "Notice the symmetric design. Inside Function 1 (F1), write the instructions to step out, activate the goal, and return to the center facing the next wing.",
    difficulty: "Advanced",
    dimensions: { width: 7, height: 7 },
    startPos: { x: 3, y: 3, z: 0 },
    startDir: 'N',
    maxMainSlots: 4,
    maxFuncSlots: [6, 0],
    availableBlocks: ['MOVE', 'TURN_R', 'ACTIVATE', 'CALL_F1'],
    grid: {
      "3,3": normalTile(0), // Center starting point
      "3,2": normalTile(0), "3,1": goalTile(0),  // North Wing
      "4,3": normalTile(0), "5,3": goalTile(0),  // East Wing
      "3,4": normalTile(0), "3,5": goalTile(0),  // South Wing
      "2,3": normalTile(0), "1,3": goalTile(0),  // West Wing
    }
  },
  {
    id: 6,
    name: "Double Mountains",
    concept: "Functions",
    conceptDescription: "Breaking problems down is called decomposition. Solve one mountain using F1, then coordinate traversing between peaks in Main.",
    hint: "F1 is ideal for climbing up, lighting the goal, and hopping down. Call it twice with a transition in between!",
    difficulty: "Advanced",
    dimensions: { width: 7, height: 7 },
    startPos: { x: 0, y: 3, z: 0 },
    startDir: 'E',
    maxMainSlots: 4,
    maxFuncSlots: [6, 0],
    availableBlocks: ['MOVE', 'TURN_R', 'TURN_L', 'ACTIVATE', 'CALL_F1'],
    grid: {
      "0,3": normalTile(0),
      // Mountain 1
      "1,3": normalTile(1),
      "2,3": goalTile(2),
      "3,3": normalTile(0),
      // Mountain 2
      "4,3": normalTile(1),
      "5,3": goalTile(2),
    }
  },
  {
    id: 7,
    name: "Sensory Crossing",
    concept: "Conditionals",
    conceptDescription: "Conditionals let the robot make decisions based on inputs. For example, check what color tiles it is standing on.",
    hint: "Use an 'If Standing on Blue' conditional: turn left if true, otherwise move ahead. Put this in a loop to steer!",
    difficulty: "Expert",
    dimensions: { width: 6, height: 6 },
    startPos: { x: 1, y: 4, z: 0 },
    startDir: 'E',
    maxMainSlots: 3,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'LOOP', 'IF'],
    grid: {
      "1,4": normalTile(0),
      "2,4": normalTile(0),
      "3,4": coloredTile(0, 'blue'), // Corner 1 -> should turn Left (North)
      "3,3": normalTile(0),
      "3,2": coloredTile(0, 'blue'), // Corner 2 -> should turn Left (West)
      "2,2": normalTile(0),
      "1,2": goalTile(0),
    }
  },
  {
    id: 8,
    name: "The Logic Circuit",
    concept: "Conditionals",
    conceptDescription: "Combine multiple sensors. Blue tiles mean 'Turn Left', Orange tiles mean 'Turn Right', Green tiles mean 'Activate Goal'!",
    hint: "Create a loop that checks each conditional! You can make one logic pass that handles blue, orange, and green correctly.",
    difficulty: "Expert",
    dimensions: { width: 7, height: 7 },
    startPos: { x: 1, y: 1, z: 0 },
    startDir: 'S',
    maxMainSlots: 4,
    maxFuncSlots: [6, 0], // Optional function if they want to group checks
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'LOOP', 'IF', 'CALL_F1'],
    grid: {
      "1,1": normalTile(0),
      "1,2": normalTile(0),
      "1,3": coloredTile(0, 'blue'),  // Blue -> should Turn Left (East)
      "2,3": normalTile(0),
      "3,3": coloredTile(0, 'orange'),// Orange -> should Turn Right (South)
      "3,4": normalTile(0),
      "3,5": goalTile(0, 'green'), // Green -> should Activate! (Corrected to goalTile)
    }
  },
  {
    id: 9,
    name: "The Spiral Tower",
    concept: "Loops",
    conceptDescription: "Repetitive patterns are even more powerful when climbing. Use loops to navigate a spiraling tower with goals at ascending elevations.",
    hint: "Each section of the spiral goes: Move forward, Turn Left, then Move forward. Put this pattern in a Loop to climb the heights!",
    difficulty: "Medium",
    dimensions: { width: 6, height: 6 },
    startPos: { x: 1, y: 4, z: 0 },
    startDir: 'E',
    maxMainSlots: 4,
    maxFuncSlots: [0, 0],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'LOOP'],
    grid: {
      "1,4": normalTile(0),
      "2,4": normalTile(0),
      "3,4": goalTile(1),
      "3,3": normalTile(1),
      "3,2": goalTile(2),
      "2,2": normalTile(2),
      "1,2": goalTile(3),
    }
  },
  {
    id: 10,
    name: "Divide and Conquer",
    concept: "Functions",
    conceptDescription: "Deconstruct a symmetric double-wing staircase using Subroutines. Create reusable routines to scale towers and return safely.",
    hint: "Create a routine in F1 that steps out, activates the high peak, and turns around to come back to the center!",
    difficulty: "Advanced",
    dimensions: { width: 7, height: 7 },
    startPos: { x: 3, y: 3, z: 0 },
    startDir: 'N',
    maxMainSlots: 4,
    maxFuncSlots: [8, 0],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'CALL_F1'],
    grid: {
      "3,3": normalTile(0),
      "3,2": normalTile(1),
      "3,1": goalTile(2),
      "4,3": normalTile(1),
      "5,3": goalTile(2),
      "2,3": normalTile(1),
      "1,3": goalTile(2),
    }
  },
  {
    id: 11,
    name: "The Rainbow Junction",
    concept: "Conditionals",
    conceptDescription: "Color-coded junctions instruct the robot. Blue means Turn Left, Orange means Turn Right, Green represents your destination goal!",
    hint: "Place your conditional checks inside a recursive function (F1 calling F1) for non-stop sensor updates!",
    difficulty: "Expert",
    dimensions: { width: 7, height: 7 },
    startPos: { x: 0, y: 1, z: 0 },
    startDir: 'E',
    maxMainSlots: 3,
    maxFuncSlots: [7, 0],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'LOOP', 'IF', 'CALL_F1'],
    grid: {
      "0,1": normalTile(0),
      "1,1": normalTile(0),
      "2,1": coloredTile(0, 'orange'),
      "2,2": normalTile(0),
      "2,3": coloredTile(0, 'blue'),
      "3,3": normalTile(0),
      "4,3": coloredTile(0, 'orange'),
      "4,4": normalTile(0),
      "4,5": goalTile(0, 'green'),
    }
  },
  {
    id: 12,
    name: "Grand Temple Labyrinth",
    concept: "Conditionals",
    conceptDescription: "Welcome to the ultimate challenge! Scale high steps, decode dynamic color triggers, and coordinate dual subroutines (F1 & F2) to conquer the Grand Temple.",
    hint: "Analyze the path carefully: it rises and falls. Run a continuous checker in F1 that moves and decodes orange and blue flags, then use F2 as a jump/utility handler.",
    difficulty: "Expert",
    dimensions: { width: 8, height: 8 },
    startPos: { x: 1, y: 6, z: 0 },
    startDir: 'N',
    maxMainSlots: 4,
    maxFuncSlots: [8, 6],
    availableBlocks: ['MOVE', 'TURN_L', 'TURN_R', 'ACTIVATE', 'LOOP', 'IF', 'CALL_F1', 'CALL_F2'],
    grid: {
      "1,6": normalTile(0),
      "1,5": normalTile(1),
      "1,4": coloredTile(2, 'orange'),
      "2,4": normalTile(2),
      "3,4": coloredTile(3, 'blue'),
      "3,3": normalTile(3),
      "3,2": goalTile(4, 'green'),
    }
  }
];
