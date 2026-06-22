import React from "react";
import { CategoryResult } from "../types/trivia";
import {
  Trophy,
  RotateCcw,
  Home,
  Flame,
  Heart,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Compass,
} from "lucide-react";

interface ScoreBoardProps {
  result: CategoryResult;
  onRestart: () => void;
  isDefeat: boolean;
  totalQuestionsAnswered: number;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  result,
  onRestart,
  isDefeat,
  totalQuestionsAnswered,
}) => {
  const incorrectCount = result.missedQuestions.length;
  const totalEncountered = isDefeat ? totalQuestionsAnswered : result.totalQuestions;
  const correctCount = Math.max(0, totalEncountered - incorrectCount);
  const rawPercentage = totalEncountered > 0 ? (correctCount / totalEncountered) * 100 : 0;
  const percentageScore = Math.min(100, Math.round(rawPercentage));

  let messageTitle = "COMPLETED!";
  let messageDesc = "Fantastic effort! You've expanded your knowledge of Philippine heritage.";

  if (isDefeat) {
    messageTitle = "DEFEAT";
    messageDesc = "You ran out of hearts! History is a journey — try again!";
  } else if (percentageScore === 100) {
    messageTitle = "PERFECT SCORE!";
    messageDesc = "Superb mastery! Dr. Jose Rizal would admire your historical accuracy.";
  } else if (percentageScore >= 80) {
    messageTitle = "EXCELLENT!";
    messageDesc = "Your understanding of Philippine history and landmarks is highly commendable.";
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-5 sm:py-8" id="scoreboard-view">

      {/* Header */}
      <div className="text-center mb-6 sm:mb-8 relative">
        {result.perfectScore && !isDefeat && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-yellow-400/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
        )}
        <div className="inline-flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-mono text-slate-400 mb-3 shadow">
          <Compass className="w-3 h-3 text-amber-500" />
          <span>QUIZ RESULTS</span>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-2 uppercase">
          {messageTitle}
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm max-w-sm sm:max-w-lg mx-auto px-2">{messageDesc}</p>
      </div>

      {/* Score summary — stacks on mobile, side-by-side on sm+ */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">

        {/* Accuracy circle */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-row sm:flex-col items-center gap-4 sm:gap-0 sm:justify-center">
          <div className="relative w-24 h-24 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50%" cy="50%" r="42%" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="50%" cy="50%" r="42%"
                className={isDefeat ? "stroke-rose-500" : percentageScore >= 80 ? "stroke-emerald-500" : "stroke-indigo-500"}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={264}
                strokeDashoffset={264 - (264 * percentageScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">{percentageScore}%</span>
              <span className="text-[9px] text-slate-500 font-mono uppercase">Accuracy</span>
            </div>
          </div>
          <div className="sm:mt-3 text-center sm:text-center">
            <p className="text-xs text-slate-400 font-mono">
              <span className="text-emerald-400 font-bold">{correctCount}</span> correct
              {" · "}
              <span className="text-rose-500 font-bold">{incorrectCount}</span> missed
            </p>
          </div>
        </div>

        {/* Score details */}
        <div className="flex-1 bg-slate-900/60 backdrop-blur border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none hidden sm:block">
            <Trophy className="w-20 h-20 text-amber-400" />
          </div>
          <div>
            <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase block mb-0.5">SCORE REPORT</span>
            <h3 className="text-sm sm:text-base font-bold text-slate-200 mb-3 sm:mb-4 leading-snug">{result.categoryTitle}</h3>

            <div className="flex items-start justify-between gap-3 border-t border-b border-slate-800/60 py-3 sm:py-4 mb-3 sm:mb-4">
              <div>
                <p className="text-[9px] text-slate-500 font-mono uppercase mb-0.5">Points</p>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-amber-400">{result.score}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-mono uppercase mb-0.5">Streak</p>
                <p className="text-xl sm:text-2xl font-extrabold font-mono text-yellow-400 flex items-center space-x-1">
                  <span>{result.maxStreak}</span>
                  <Flame className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-mono uppercase mb-0.5">Lives</p>
                <div className="flex items-center space-x-0.5 mt-1">
                  {isDefeat ? (
                    <span className="text-xs font-mono text-rose-500 font-bold uppercase">OUT</span>
                  ) : (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-4 h-4 ${i < result.remainingHearts ? "fill-rose-500 text-rose-500" : "text-slate-800"}`}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-2 text-xs text-slate-400 bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              {isDefeat
                ? "Retake the quiz to study key facts and beat your score."
                : result.perfectScore
                ? "Perfect run — all hearts saved, every question answered correctly!"
                : `You saved ${result.remainingHearts} hearts for a bonus of ${result.remainingHearts * 150} pts!`}
            </p>
          </div>
        </div>
      </div>

      {/* Missed questions */}
      {result.missedQuestions.length > 0 ? (
        <div className="mb-6 sm:mb-8" id="study-guide">
          <h2 className="text-base sm:text-lg font-bold font-display text-slate-200 mb-3 sm:mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
            <span>Review ({incorrectCount} Missed)</span>
          </h2>
          <div className="space-y-3">
            {result.missedQuestions.map((q, idx) => (
              <div key={idx} className="bg-slate-900/30 border border-slate-800/80 rounded-xl sm:rounded-2xl p-4 hover:border-slate-700 transition duration-200">
                <p className="text-xs sm:text-sm font-bold text-slate-200 mb-2 leading-relaxed">Q: {q.questionText}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5 text-xs font-mono">
                  <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-400">You: <strong className="text-rose-400">{q.yourAnswer}</strong></span>
                  </div>
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-400">Answer: <strong className="text-emerald-400">{q.correctAnswer}</strong></span>
                  </div>
                </div>
                <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono block mb-1 uppercase tracking-wider">Context</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{q.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/10 border border-emerald-500/20 p-5 sm:p-6 rounded-2xl sm:rounded-3xl mb-6 sm:mb-8 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2.5 animate-pulse" />
          <h3 className="text-base font-bold text-emerald-400 mb-1">FLAWLESS PERFORMANCE!</h3>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
            You answered every question correctly — outstanding historical knowledge!
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 border-t border-slate-800 pt-6">
        <button
          onClick={onRestart}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-7 rounded-xl transition duration-200 shadow cursor-pointer text-sm"
        >
          <Home className="w-4 h-4" />
          <span>Return to Hub</span>
        </button>
        <button
          onClick={onRestart}
          className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3.5 px-7 rounded-xl border border-slate-700 transition duration-200 cursor-pointer text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Play Another Quiz</span>
        </button>
      </div>
    </div>
  );
};
