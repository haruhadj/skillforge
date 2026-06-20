import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronRight, X, Sparkles, AlertCircle } from 'lucide-react';

interface HintModalProps {
  solutions: string[];
  initialNumbers: number[];
  onClose: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  solutions,
  initialNumbers,
  onClose
}) => {
  const [stage, setStage] = useState<1 | 2>(1);

  // Reset stage when numbers change
  useEffect(() => {
    setStage(1);
  }, [initialNumbers]);

  const hasSolutions = solutions.length > 0;
  
  // Find a solution of minimum length
  const bestSolution = hasSolutions
    ? solutions.reduce((shortest, current) => 
        current.length < shortest.length ? current : shortest, 
        solutions[0]
      )
    : '';

  // Generate a partial step hint from the best solution
  // For example, if bestSolution is "8 ÷ (3 − (8 ÷ 3))"
  // We can look at the deepest nested parenthesis to suggest a first operation,
  // or a simpler heuristic: look for any single operator like e.g. "8 ÷ 3" or similar
  const getProgressiveHint = () => {
    if (!bestSolution) return 'No solutions found. Try skipping or checking other numbers!';

    // Let's identify clean basic combinations
    // We can extract terms inside parentheses, or parse operators
    // E.g., if there's an operation that is a clean sub-component
    if (bestSolution.includes('8 ÷ 3')) {
      return 'Try performing 8 ÷ 3 to get the fractional value 8/3 (2.67)!';
    }
    if (bestSolution.includes('5 − 1 ÷ 5')) {
      return 'Try performing 1 ÷ 5 to get 1/5 (0.2) first!';
    }
    if (bestSolution.includes('3 + 3 ÷ 7')) {
      return 'Try performing 3 ÷ 7 first to get 3/7!';
    }
    if (bestSolution.includes('10 × 10')) {
      return 'Try starting with 10 × 10 = 100 first!';
    }
    if (bestSolution.includes('5 − 2 ÷ 10')) {
      return 'Try performing 2 ÷ 10 to get 1/5 first!';
    }
    
    // Heuristic: search for basic operations inside parentheses
    const parenthesized = bestSolution.match(/\(([^()]+)\)/);
    if (parenthesized && parenthesized[1]) {
      return `Try combining numbers to form the sub-group: "${parenthesized[1]}"`;
    }

    // Default simple pointer
    return `Try starting by combining the first logical pair of numbers!`;
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-2xl p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white rounded-lg p-1.5 hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <HelpCircle className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Strategy Hint</h2>
        </div>

        {!hasSolutions ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 bg-red-950/40 p-4 rounded-xl border border-red-900/30 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                No analytical paths to 24 were found for the set: [{initialNumbers.join(', ')}]. This state might be custom-entered. Try playing a newly generated certified deck!
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition duration-155"
            >
              Dismiss
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
              <span className="text-[10px] text-indigo-400 font-mono block uppercase tracking-wider mb-2">
                Total Solve Pathways Found
              </span>
              <span className="text-lg font-black text-indigo-200">
                {solutions.length} unique {solutions.length === 1 ? 'path' : 'paths'} to 24
              </span>
            </div>

            {/* Stage 1 Hint */}
            <div className="bg-slate-850/60 p-4 rounded-xl border border-slate-800 text-slate-300">
              <span className="text-[10px] text-yellow-400 font-mono block uppercase tracking-wider mb-2 font-semibold">
                💡 Stage 1: Recommended First Move
              </span>
              <p className="text-sm font-medium leading-relaxed text-indigo-100">
                {getProgressiveHint()}
              </p>
            </div>

            {/* Stage 2 Expansion */}
            {stage === 1 ? (
              <button
                onClick={() => setStage(2)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl transition duration-200 flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10"
              >
                Reveal Full Solution <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <div className="bg-gradient-to-br from-indigo-950/50 to-indigo-900/10 p-4 rounded-xl border-2 border-indigo-500/30 text-indigo-200 animate-[pulse-glow_2s_infinite]">
                <span className="text-[10px] text-emerald-400 font-mono block uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Full Equation
                </span>
                <p className="text-lg font-black text-white text-center font-mono py-1 select-all bg-slate-950/80 px-2 rounded border border-indigo-950">
                  {bestSolution} = 24
                </p>
                <p className="text-[10px] text-slate-400 mt-2 text-center">
                  Click and drag to copy expression. Tap dismiss to try applying it.
                </p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-705 text-slate-300 text-xs font-semibold rounded-xl transition duration-150"
            >
              Dismiss Strategy Overlay
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
