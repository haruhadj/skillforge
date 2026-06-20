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
      className={`rounded-2xl border p-5 md:p-6 transition-all duration-300 relative overflow-hidden ${
        isCorrect
          ? "bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border-emerald-500/30 shadow-emerald-950/20 shadow-md"
          : "bg-gradient-to-br from-slate-900 via-rose-950/20 to-slate-900 border-rose-500/30 shadow-rose-950/20 shadow-md"
      }`}
      id="feedback-panel"
    >
      {/* Decorative pulse for correct answers */}
      {isCorrect && (
        <div className="absolute top-0 right-0 p-2 opacity-15">
          <Sparkles className="w-24 h-24 text-emerald-400 animate-pulse" />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start space-x-4">
          <div className="shrink-0 mt-0.5">
            {isCorrect ? (
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6 animate-glow text-emerald-400" />
              </div>
            ) : (
              <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20 text-rose-400 animate-bounce">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span
                className={`text-sm md:text-base font-extrabold tracking-wide uppercase ${
                  isCorrect ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isCorrect ? "TAMÀ! (Correct)" : "MALI! (Incorrect)"}
              </span>
              
              {!isCorrect && livesRemaining > 0 && (
                <span className="flex items-center text-[10px] uppercase font-mono text-rose-500 bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">
                  -1 Heart
                </span>
              )}
            </div>

            {/* Answer Display Capsule */}
            <div className="mb-3">
              <span className="text-xs text-slate-400 font-mono">CORRECT ANSWER:</span>
              <p className={`text-sm md:text-base font-mono font-bold ${isCorrect ? "text-emerald-300" : "text-emerald-400"}`}>
                {correctAnswer}
              </p>
            </div>

            {/* Historical Lesson Explanation */}
            <div>
              <span className="text-xs text-slate-500 font-mono block mb-1 uppercase tracking-wider">Historical Context & Explanation:</span>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-2xl font-sans">
                {explanation}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Segment */}
        <div className="shrink-0 flex flex-col justify-end items-stretch md:items-end w-full md:w-auto self-stretch md:self-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/40">
          {livesRemaining <= 0 ? (
            <div className="flex flex-col items-stretch space-y-2">
              <p className="text-[10px] text-rose-500 font-mono text-center md:text-right flex items-center justify-center md:justify-end space-x-1">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                <span>NO HEARTS REMAINING</span>
              </p>
              <button
                type="button"
                onClick={onNext}
                className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 text-sm tracking-wide shadow flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Reveal Defeat Report</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className={`w-full text-center font-bold py-3.5 px-6 rounded-xl transition duration-200 text-sm tracking-wide shadow flex items-center justify-center space-x-2 cursor-pointer ${
                isLast
                  ? "bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-extrabold"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white"
              }`}
            >
              <span>{isLast ? "View Complete Score Card" : "Continue to Next Question"}</span>
              <ArrowRight className={`w-4 h-4 ${isLast ? "text-slate-950" : "text-white"}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
