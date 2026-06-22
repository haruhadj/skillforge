import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, Heart, Sparkles } from "lucide-react";

interface FeedbackModalProps {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  onNext: () => void;
  isLast: boolean;
  livesRemaining: number;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isCorrect,
  correctAnswer,
  explanation,
  onNext,
  isLast,
  livesRemaining,
}) => {
  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 relative overflow-hidden ${
        isCorrect
          ? "bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/30"
          : "bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900 border-rose-500/30"
      }`}
      id="feedback-panel"
    >
      {isCorrect && (
        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
          <Sparkles className="w-20 h-20 text-emerald-400 animate-pulse" />
        </div>
      )}

      {/* Status + answer info */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="shrink-0 mt-0.5">
          {isCorrect ? (
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
            <span className={`text-sm font-extrabold tracking-wide uppercase ${isCorrect ? "text-emerald-400" : "text-rose-400"}`}>
              {isCorrect ? "TAMÀ! (Correct)" : "MALI! (Incorrect)"}
            </span>
            {!isCorrect && livesRemaining > 0 && (
              <span className="flex items-center text-[10px] uppercase font-mono text-rose-500 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">
                -1 Heart
              </span>
            )}
          </div>

          <div className="mb-2">
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Correct Answer:</span>
            <p className={`text-sm font-mono font-bold ${isCorrect ? "text-emerald-300" : "text-emerald-400"}`}>
              {correctAnswer}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-mono block mb-0.5 uppercase tracking-wider">Context:</span>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">{explanation}</p>
          </div>
        </div>
      </div>

      {/* CTA button */}
      <div className="mt-1">
        {livesRemaining <= 0 ? (
          <div className="space-y-2">
            <p className="text-[10px] text-rose-500 font-mono flex items-center space-x-1">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
              <span>NO HEARTS REMAINING</span>
            </p>
            <button
              type="button"
              onClick={onNext}
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 text-sm flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Reveal Defeat Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className={`w-full font-bold py-3.5 px-6 rounded-xl transition duration-200 text-sm flex items-center justify-center space-x-2 cursor-pointer ${
              isLast
                ? "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            <span>{isLast ? "View Score Card" : "Next Question"}</span>
            <ArrowRight className={`w-4 h-4 ${isLast ? "text-slate-950" : "text-white"}`} />
          </button>
        )}
      </div>
    </div>
  );
};
