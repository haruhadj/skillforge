import { Fraction, OperatorType } from '../types';
import * as Frac from './fraction';

interface SolveState {
  val: Fraction;
  str: string;
  hasIntFraction: boolean; // True if any intermediate step resulted in a non-integer fraction
}

export interface SolverResult {
  solutions: string[];
  requiresFractions: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

export function solve24(numbers: number[]): SolverResult {
  const initialStates: SolveState[] = numbers.map(num => ({
    val: Frac.fromInt(num),
    str: `${num}`,
    hasIntFraction: false
  }));

  const solutionsMap = new Map<string, boolean>(); // expression -> hasFraction

  function search(states: SolveState[]) {
    if (states.length === 1) {
      if (Frac.is24(states[0].val)) {
        // Standardize outer spacing and form
        const cleanExpr = states[0].str;
        // Keep track of the minimum fractional requirement
        if (!solutionsMap.has(cleanExpr)) {
          solutionsMap.set(cleanExpr, states[0].hasIntFraction);
        } else {
          // If we found a path that doesn't require fractions, prefer that
          const prev = solutionsMap.get(cleanExpr);
          if (prev && !states[0].hasIntFraction) {
            solutionsMap.set(cleanExpr, false);
          }
        }
      }
      return;
    }

    for (let i = 0; i < states.length; i++) {
      for (let j = 0; j < states.length; j++) {
        if (i === j) continue;

        const s1 = states[i];
        const s2 = states[j];

        const nextStatesBase = states.filter((_, idx) => idx !== i && idx !== j);

        const ops: { op: OperatorType; char: string; func: (f1: Fraction, f2: Fraction) => Fraction | null }[] = [
          { op: '+', char: '+', func: Frac.add },
          { op: '-', char: '−', func: Frac.sub }, // Using correct mathematical minus symbol
          { op: '*', char: '×', func: Frac.mul },
          { op: '/', char: '÷', func: Frac.div }
        ];

        for (const { char, func } of ops) {
          const resVal = func(s1.val, s2.val);
          if (resVal === null || resVal.d === 0) continue;

          // Check if intermediate is a fraction
          const isIntermFraction = resVal.d > 1;
          const hasIntFraction = s1.hasIntFraction || s2.hasIntFraction || isIntermFraction;

          // Format strings beautifully. If the sub-expression has space, wrap in parens
          const s1Str = s1.str.includes(' ') ? `(${s1.str})` : s1.str;
          const s2Str = s2.str.includes(' ') ? `(${s2.str})` : s2.str;
          const nextStr = `${s1Str} ${char} ${s2Str}`;

          search([...nextStatesBase, { val: resVal, str: nextStr, hasIntFraction }]);
        }
      }
    }
  }

  search(initialStates);

  const solutions = Array.from(solutionsMap.keys());
  
  if (solutions.length === 0) {
    return {
      solutions: [],
      requiresFractions: false,
      difficulty: 'expert' // unsolvable but shouldn't happen for our served puzzles
    };
  }

  // If ALL solutions require intermediate fraction calculations, it's definitely hard/expert.
  // If some solutions do not require fractions, it's easy/medium.
  const allRequireFractions = Array.from(solutionsMap.values()).every(v => v === true);

  let difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium';
  if (allRequireFractions) {
    // These are notoriously difficult, e.g. [3, 3, 8, 8] or [1, 5, 5, 5]
    difficulty = 'expert';
  } else {
    // Determine difficulty based on number of solutions or set characteristics
    if (solutions.length > 50) {
      difficulty = 'easy'; // tons of ways to solve (e.g. 2, 3, 4, 10 or 1, 2, 3, 4)
    } else if (solutions.length < 8) {
      difficulty = 'hard'; // few solutions
    } else {
      difficulty = 'medium';
    }
  }

  return {
    solutions,
    requiresFractions: allRequireFractions,
    difficulty
  };
}

// Clean duplicate or redundant representations (e.g., "(1 + 2) + 3" vs "(2 + 1) + 3")
// We can display the shortest or most elegant solution
export function getBestHint(solutions: string[]): string {
  if (solutions.length === 0) return '';
  // Prioritize shorter representations to keep hints readable
  return solutions.reduce((shortest, current) => 
    current.length < shortest.length ? current : shortest, 
    solutions[0]
  );
}
