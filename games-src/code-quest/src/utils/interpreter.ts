/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level, Command, CommandType, Direction, Position, GridMap, ExecutionFrame, TileColor } from '../types';

export function runInterpreter(
  level: Level,
  mainProgram: Command[],
  f1Program: Command[],
  f2Program: Command[]
): ExecutionFrame[] {
  const frames: ExecutionFrame[] = [];
  
  // Clone initial grid state to avoid mutating source levels
  const currentGridState: GridMap = {};
  Object.keys(level.grid).forEach((key) => {
    currentGridState[key] = { ...level.grid[key], activated: false };
  });

  let robotPos: Position = { ...level.startPos };
  let robotDir: Direction = level.startDir;

  const totalGoals = Object.values(level.grid).filter(t => t.isGoal).length;
  let activatedCount = 0;

  let totalTicks = 0;
  const tickLimit = 400; // Safe threshold to prevent infinite recursion or loops

  // Initial starting frame
  frames.push({
    robotPos: { ...robotPos },
    robotDir,
    grid: cloneGrid(currentGridState),
    activeBlockId: null,
    activeSourceUnit: null,
    activeSourceIndex: null,
    activatedGoalsCount: 0,
    totalGoalsCount: totalGoals,
    message: "Robot initialized. Ready for commands!",
  });

  // Helper to clone grid
  function cloneGrid(grid: GridMap): GridMap {
    const next: GridMap = {};
    Object.keys(grid).forEach((key) => {
      next[key] = { ...grid[key] };
    });
    return next;
  }

  // Turn logic helpers
  function rotateLeft(dir: Direction): Direction {
    switch (dir) {
      case 'N': return 'W';
      case 'W': return 'S';
      case 'S': return 'E';
      case 'E': return 'N';
    }
  }

  function rotateRight(dir: Direction): Direction {
    switch (dir) {
      case 'N': return 'E';
      case 'E': return 'S';
      case 'S': return 'W';
      case 'W': return 'N';
    }
  }

  // Check if robot can move to target coordinates
  function canMoveTo(curr: Position, targetKey: string): { allowed: boolean; nextZ: number; reason: string } {
    const targetTile = currentGridState[targetKey];
    if (!targetTile) {
      return { allowed: false, nextZ: curr.z, reason: "No floor tiles ahead! Critical fallback safety." };
    }
    // Check height constraints
    const heightDiff = targetTile.z - curr.z;
    if (heightDiff > 1) {
      return { allowed: false, nextZ: curr.z, reason: "Too high! Need a step or ramp." };
    }
    if (heightDiff < -1) {
      // Allow dropping down larger heights but limit it to -1 for simplicity or just let it fly down safely!
      // In Cargobot and Lightbot, dropped steps are allowed. Let's make dropping down 1 unit smooth,
      // and allow larger falls or restrict to <= -1. Let's allow drops safely but restrict climb to <= +1.
      return { allowed: true, nextZ: targetTile.z, reason: "Descending step." };
    }
    return { allowed: true, nextZ: targetTile.z, reason: "Stepping to next tile." };
  }

  // Execute an array of commands (used internally with subroutines & stacks)
  // We model the call stack to highlight currently running instructions accurately
  function executeBlockList(
    commands: Command[],
    sourceUnit: 'MAIN' | 'F1' | 'F2'
  ): boolean {
    for (let index = 0; index < commands.length; index++) {
      if (totalTicks >= tickLimit) {
        return false; // loop exceeded
      }
      
      const cmd = commands[index];
      if (!cmd) continue;

      // Handle individual command type
      const success = executeCommand(cmd, sourceUnit, index);
      if (!success) {
        return false;
      }
    }
    return true;
  }

  function executeCommand(
    cmd: Command,
    sourceUnit: 'MAIN' | 'F1' | 'F2',
    sourceIndex: number
  ): boolean {
    totalTicks++;
    if (totalTicks >= tickLimit) {
      // Add a final stack-limit warning frame
      frames.push({
        robotPos: { ...robotPos },
        robotDir,
        grid: cloneGrid(currentGridState),
        activeBlockId: cmd.id,
        activeSourceUnit: sourceUnit,
        activeSourceIndex: sourceIndex,
        activatedGoalsCount: activatedCount,
        totalGoalsCount: totalGoals,
        message: "⚠️ Safe limits reached! Potential infinite loop or deeply recursive calls.",
      });
      return false; // halt execution
    }

    // Capture state at start of executing this command
    const currentOnTile = currentGridState[`${robotPos.x},${robotPos.y}`];
    const standingColor: TileColor = currentOnTile ? currentOnTile.color : 'normal';

    switch (cmd.type) {
      case 'MOVE': {
        let tx = robotPos.x;
        let ty = robotPos.y;
        if (robotDir === 'N') ty -= 1;
        else if (robotDir === 'S') ty += 1;
        else if (robotDir === 'W') tx -= 1;
        else if (robotDir === 'E') tx += 1;

        const targetKey = `${tx},${ty}`;
        const check = canMoveTo(robotPos, targetKey);

        let msg = "";
        if (check.allowed) {
          robotPos = { x: tx, y: ty, z: check.nextZ };
          msg = `Moved forward to (${tx}, ${ty}) at height ${check.nextZ}.`;
        } else {
          msg = `Blocked: ${check.reason} Robot remains at (${robotPos.x}, ${robotPos.y}).`;
        }

        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: msg,
        });
        break;
      }

      case 'TURN_L': {
        robotDir = rotateLeft(robotDir);
        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: "Turned Left.",
        });
        break;
      }

      case 'TURN_R': {
        robotDir = rotateRight(robotDir);
        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: "Turned Right.",
        });
        break;
      }

      case 'ACTIVATE': {
        const key = `${robotPos.x},${robotPos.y}`;
        const tile = currentGridState[key];
        let msg = "Pressed ACTIVATE.";
        if (tile && tile.isGoal) {
          if (!tile.activated) {
            tile.activated = true;
            activatedCount = Object.values(currentGridState).filter((t) => t.isGoal && t.activated).length;
            msg = "✨ Correct! Light-up Goal activated!";
          } else {
            msg = "Goal is already lit up.";
          }
        } else {
          msg = "Nothing to activate here (no goal tile underneath).";
        }

        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: msg,
        });
        break;
      }

      case 'LOOP': {
        // payload: { count: number, commands: Command[] }
        const count = cmd.payload?.count || 2;
        const subCommands: Command[] = cmd.payload?.commands || [];
        
        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: `Starting loop repetition (Repeat ${count} times).`,
        });

        for (let i = 0; i < count; i++) {
          if (totalTicks >= tickLimit) return false;
          // Execute the nested command stack block
          const loopSuccess = executeBlockList(subCommands, sourceUnit);
          if (!loopSuccess) return false;
        }
        break;
      }

      case 'IF': {
        // payload: { condition: TileColor | 'isGoal', command: Command }
        const matchingColor: TileColor = cmd.payload?.condition || 'blue';
        const conditionalCmd: Command = cmd.payload?.command;

        const isMatch = standingColor === matchingColor;
        let msg = `Sensor check: Standing on ${standingColor} tile. (Matches condition '${matchingColor}': ${isMatch ? 'Yes' : 'No'})`;

        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: msg + (isMatch ? " Executing action..." : " Skipping action."),
        });

        if (isMatch && conditionalCmd) {
          const runCondSuccess = executeCommand(conditionalCmd, sourceUnit, sourceIndex);
          if (!runCondSuccess) return false;
        }
        break;
      }

      case 'CALL_F1': {
        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: "Calling Function 1 (F1 subroutine).",
        });

        const f1Success = executeBlockList(f1Program, 'F1');
        if (!f1Success) return false;
        break;
      }

      case 'CALL_F2': {
        frames.push({
          robotPos: { ...robotPos },
          robotDir,
          grid: cloneGrid(currentGridState),
          activeBlockId: cmd.id,
          activeSourceUnit: sourceUnit,
          activeSourceIndex: sourceIndex,
          activatedGoalsCount: activatedCount,
          totalGoalsCount: totalGoals,
          message: "Calling Function 2 (F2 subroutine).",
        });

        const f2Success = executeBlockList(f2Program, 'F2');
        if (!f2Success) return false;
        break;
      }
    }

    return true;
  }

  // Start executing the main program loop
  executeBlockList(mainProgram, 'MAIN');

  // Evaluate final status verification
  const finalFrame = frames[frames.length - 1];
  if (finalFrame) {
    const goalsCompleted = Object.values(finalFrame.grid).filter(t => t.isGoal && t.activated).length;
    if (goalsCompleted === totalGoals && totalGoals > 0) {
      // Append a final successful complete frame
      frames.push({
        ...finalFrame,
        activeBlockId: null,
        activeSourceUnit: null,
        activeSourceIndex: null,
        message: "🎉 Level Complete! Brilliant modular programming! You activated all goal nodes.",
      });
    } else if (frames.length > 1 && totalTicks < tickLimit) {
      // Appended standard failure checking
      frames.push({
        ...finalFrame,
        activeBlockId: null,
        activeSourceUnit: null,
        activeSourceIndex: null,
        message: "❌ Execution halted. Some goal nodes remain unlit. Press reset and refine your code blocks!",
      });
    }
  }

  return frames;
}
