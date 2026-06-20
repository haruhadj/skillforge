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
  XOctagon, 
  ChevronDown, 
  AlertTriangle,
  Compass
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
  totalQuestionsAnswered
}) => {
  const incorrectCount = result.missedQuestions.length;
  // If defeated, we count only what they encountered. If victory, totalQuestions.
  const totalEncountered = isDefeat ? totalQuestionsAnswered : result.totalQuestions;
  const correctCount = Math.max(0, totalEncountered - incorrectCount);
  
  const rawPercentage = totalEncountered > 0 ? (correctCount / totalEncountered) * 100 : 0;
  const percentageScore = Math.min(100, Math.round(rawPercentage));

  // Determine feedback messaging
  let messageTitle = "COMPLETED!";
  let messageDesc = "Fantastic effort! You've expanded your knowledge of Philippine heritage.";
  let badgeColor = "from-amber-400 to-yellow-500 text-slate-900";

  if (isDefeat) {
    messageTitle = "DEFEAT";
    messageDesc = "You ran out of hearts! Don't worry, history is a journey of learning. Try again!";
    badgeColor = "from-rose-500 to-red-600 text-white";
  } else if (percentageScore === 100) {
    messageTitle = "PERFECT SCORE!";
    messageDesc = "Superb mastery! Dr. Jose Rizal himself would admire your profound historical accuracy.";
    badgeColor = "from-emerald-400 to-teal-500 text-slate-950";
  } else if (percentageScore >= 80) {
    messageTitle = "EXCELLENT WORK!";
    messageDesc = "Superb! Your understanding of Philippine landmarks and narratives is highly commendable.";
    badgeColor = "from-blue-400 to-indigo-500 text-white";
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pointer-events-auto" id="scoreboard-view">
      {/* Visual Header Banner */}
      <div className="text-center mb-10 relative">
        {result.perfectScore && !isDefeat && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
        )}
        
        <div className="inline-flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-mono text-slate-400 mb-4 shadow">
          <Compass className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          <span>QUIZ COMPLETION RECORDS</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-extrabold font-display text-white tracking-tight mb-2 uppercase">
          {messageTitle}
        </h1>
        <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto">
          {messageDesc}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Circle dial card */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Circle indicator */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="72"
                cy="72"
                r="64"
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="72"
                cy="72"
                r="64"
                className={`transition-all duration-1000 ${
                  isDefeat 
                    ? "stroke-rose-500" 
                    : percentageScore >= 80 
                      ? "stroke-emerald-500" 
                      : "stroke-indigo-500"
                }`}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={402}
                strokeDashoffset={402 - (402 * percentageScore) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold font-mono text-white mb-0.5">{percentageScore}%</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Accuracy</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center font-mono">
            Correct: <span className="text-emerald-400 font-bold">{correctCount}</span> | Incorrect: <span className="text-rose-500 font-bold">{incorrectCount}</span>
          </p>
        </div>

        {/* Detailed scoring card */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-md col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Trophy className="w-24 h-24 text-amber-400" />
          </div>

          <div>
            <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block mb-1">SCORE REPORT CARD</span>
            <h3 className="text-lg font-bold text-slate-200 mb-4">{result.categoryTitle}</h3>
            
            <div className="grid grid-cols-3 gap-4 border-t border-b border-slate-800/60 py-4 mb-4">
              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase mb-0.5">Earned Score</p>
                <p className="text-xl md:text-2xl font-extrabold font-mono text-amber-400">{result.score} pts</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase mb-0.5">Max Streak</p>
                <p className="text-xl md:text-2xl font-extrabold font-mono text-yellow-400 flex items-center space-x-1">
                  <span>{result.maxStreak}</span>
                  <Flame className="w-5 h-5 fill-yellow-500 text-yellow-500 inline shrink-0" />
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 font-mono uppercase mb-0.5">Lives Saved</p>
                <div className="flex items-center space-x-1 mt-0.5">
                  {isDefeat ? (
                    <span className="text-xs font-mono text-rose-500 font-bold uppercase">OUT</span>
                  ) : (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Heart 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < result.remainingHearts ? "fill-rose-500 text-rose-500" : "text-slate-800 fill-transparent"
                        }`} 
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="leading-snug">
              {isDefeat 
                ? "You've scored well! Retake the quiz file to study key facts and set a personal best."
                : result.perfectScore 
                  ? "Perfect run! You have preserved all hearts and answered every single question flawlessly."
                  : `Terrific! You saved ${result.remainingHearts} hearts, earning a bonus ${result.remainingHearts * 150} score points.`
              }
            </p>
          </div>
        </div>
      </div>

      {/* missed questions study guide panel */}
      {result.missedQuestions.length > 0 ? (
        <div className="mb-10" id="study-guide">
          <h2 className="text-lg md:text-xl font-bold font-display text-slate-200 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span>Academic Performance Review ({incorrectCount} Missed)</span>
          </h2>
          
          <div className="space-y-4">
            {result.missedQuestions.map((q, idx) => (
              <div 
                key={idx}
                className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700 transition duration-200"
              >
                <p className="text-sm font-bold text-slate-200 mb-2 leading-relaxed font-sans">
                  Q: {q.questionText}
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs font-mono">
                  <div className="bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-400">Your Answer: <strong className="text-rose-400">{q.yourAnswer}</strong></span>
                  </div>
                  
                  <div className="bg-emerald-950/20 border border-emerald-900/40 p-2.5 rounded-lg flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-400">Correct Answer: <strong className="text-emerald-400">{q.correctAnswer}</strong></span>
                  </div>
                </div>

                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-500 font-mono block mb-1 uppercase tracking-wider">Historical Context Lesson</span>
                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {q.explanation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/10 border border-emerald-500/20 p-6 rounded-3xl mb-10 text-center shadow">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
          <h3 className="text-lg font-bold text-emerald-400 mb-1">IMPECCABLE PERFORMANCE!</h3>
          <p className="text-slate-300 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
            Awesome job! You answered every single trivia question flawlessly and have stored deep historical insight!
          </p>
        </div>
      )}

      {/* Control Buttons Block */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-slate-805 pt-8">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3.5 px-8 rounded-xl transition duration-200 shadow cursor-pointer text-sm"
        >
          <Home className="w-4 h-4 text-white" />
          <span>Return to Hub</span>
        </button>

        <button
          onClick={onRestart}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium py-3.5 px-8 rounded-xl border border-slate-700 transition duration-200 cursor-pointer text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retake another Category</span>
        </button>
      </div>
    </div>
  );
};
