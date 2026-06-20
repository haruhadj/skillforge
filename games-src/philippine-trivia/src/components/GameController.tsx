import React, { useState, useEffect, useRef } from "react";
import { QuizCategory, UnifiedQuestion, CategoryResult, PlayerStats } from "../types/trivia";
import { parseAndUnifyQuiz } from "../data/triviaData";
import { reportResult } from "../services/skillforge";
import { QuestionCard } from "./QuestionCard";
import { FeedbackModal } from "./FeedbackModal";
import { ScoreBoard } from "./ScoreBoard";
import { Heart, Trophy, Zap, AlertCircle, Sparkles } from "lucide-react";

interface GameControllerProps {
  category: QuizCategory;
  onExit: () => void;
}

export const GameController: React.FC<GameControllerProps> = ({ category, onExit }) => {
  const dataset = useRef<UnifiedQuestion[]>([]);
  
  // Game state
  const [questions, setQuestions] = useState<UnifiedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openTextAnswer, setOpenTextAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasShownHint, setHasShownHint] = useState(false);
  
  // Gamified metrics
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  
  // Terminal conditions
  const [isGameOver, setIsGameOver] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Analytics
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState<CategoryResult["missedQuestions"]>([]);
  
  // Timer Reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Guards the one-shot end-of-game submission against double fire (StrictMode).
  const hasReported = useRef(false);

  // Initialize Quiz
  useEffect(() => {
    const unified = parseAndUnifyQuiz(category);
    dataset.current = unified;
    setQuestions(unified);
    
    // Reset states
    setCurrentIndex(0);
    setSelectedOption(null);
    setOpenTextAnswer("");
    setIsSubmitted(false);
    setHasShownHint(false);
    setLives(3);
    setScore(0);
    setCurrentStreak(0);
    setMaxStreak(0);
    setTimeLeft(20);
    setIsGameOver(false);
    setIsCompleted(false);
    setCorrectAnswersCount(0);
    setMissedQuestions([]);
    hasReported.current = false;
  }, [category]);

  // Timer countdown hook
  useEffect(() => {
    if (isCompleted || isGameOver || isSubmitted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isSubmitted, isCompleted, isGameOver]);

  const activeQuestion = questions[currentIndex];

  // Callback if timer runs out
  const handleTimeOut = () => {
    // Treat as incorrect
    const cleanCorrectAnswer = activeQuestion.correctAnswer.trim();
    const formattedExplanation = activeQuestion.explanation;

    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) {
        setIsGameOver(true);
      }
      return nextLives;
    });

    setMissedQuestions((prev) => [
      ...prev,
      {
        questionText: activeQuestion.questionText,
        yourAnswer: "[Timer Expired]",
        correctAnswer: cleanCorrectAnswer,
        explanation: formattedExplanation,
      },
    ]);

    setCurrentStreak(0);
    setIsSubmitted(true);
  };

  // Lock and submit selected or entered answer
  const handleSubmitAnswer = (forcedValue?: string) => {
    if (isSubmitted) return;

    let playerAnswer = "";
    if (activeQuestion.type === "open-text") {
      playerAnswer = forcedValue !== undefined ? forcedValue : openTextAnswer;
    } else {
      playerAnswer = selectedOption || "";
    }

    // Standardize answers for accurate comparison (especially for open-text entries)
    const cleanPlayer = playerAnswer.trim().toLowerCase();
    const cleanCorrect = activeQuestion.correctAnswer.trim().toLowerCase();

    let isCorrect = false;

    if (activeQuestion.type === "open-text") {
      // In open text, if player typing contains the core answer keyword, let it count
      isCorrect = cleanPlayer.includes(cleanCorrect) || cleanCorrect.includes(cleanPlayer);
      // Ensure it is not empty
      if (cleanPlayer === "") isCorrect = false;
    } else {
      isCorrect = cleanPlayer === cleanCorrect;
    }

    if (isCorrect) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) {
        setMaxStreak(newStreak);
      }

      // Base points + streak multiplier
      const awardedPoints = 100 + newStreak * 10;
      setScore((prev) => prev + awardedPoints);
      setCorrectAnswersCount((prev) => prev + 1);
    } else {
      setLives((prevLives) => {
        const nextLives = prevLives - 1;
        if (nextLives <= 0) {
          // Let them review this question first, then game ends upon NEXT click
        }
        return nextLives;
      });

      setMissedQuestions((prev) => [
        ...prev,
        {
          questionText: activeQuestion.questionText,
          yourAnswer: playerAnswer || "[Unanswered]",
          correctAnswer: activeQuestion.correctAnswer,
          explanation: activeQuestion.explanation,
        },
      ]);

      setCurrentStreak(0);
    }

    setIsSubmitted(true);
  };

  // Go to next question, or trigger an end screen. Score + analytics submission
  // happens once in the end-of-game effect below (so timeout deaths count too).
  const handleNextQuestion = () => {
    const isOutOfLives = lives <= 0;
    const isAtLastQuestion = currentIndex >= questions.length - 1;

    if (isOutOfLives) {
      setIsGameOver(true);
      return;
    }

    if (isAtLastQuestion) {
      // Award extra life bonus: 150 points for each remaining heart.
      setScore((prev) => prev + lives * 150);
      setIsCompleted(true);
      return;
    }

    // Go to next question
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setOpenTextAnswer("");
    setIsSubmitted(false);
    setHasShownHint(false);
    setTimeLeft(20);
  };

  // Persists scores and stats in localStorage
  const saveScoresAndStats = (finalScore: number, finalMaxStreak: number, isDefeat: boolean) => {
    // 1. High Score Update
    const savedScoresStr = localStorage.getItem("ph_trivia_high_scores") || "{}";
    let highScores: { [key: string]: number } = {};
    try {
      highScores = JSON.parse(savedScoresStr);
    } catch (e) {
      highScores = {};
    }

    const currentBest = highScores[category.id] || 0;
    if (finalScore > currentBest) {
      highScores[category.id] = finalScore;
      localStorage.setItem("ph_trivia_high_scores", JSON.stringify(highScores));
    }

    // 2. Aggregate Stats Update
    const savedStatsStr = localStorage.getItem("ph_trivia_player_stats");
    let stats: PlayerStats = {
      gamesPlayed: 0,
      totalScore: 0,
      maxStreak: 0,
      correctAnswersCount: 0,
      wrongAnswersCount: 0,
    };

    if (savedStatsStr) {
      try {
        stats = JSON.parse(savedStatsStr);
      } catch (e) {
        // use default stats
      }
    }

    stats.gamesPlayed += 1;
    stats.totalScore += finalScore;
    if (finalMaxStreak > stats.maxStreak) {
      stats.maxStreak = finalMaxStreak;
    }
    stats.correctAnswersCount += correctAnswersCount;
    stats.wrongAnswersCount += (isDefeat ? (currentIndex + 1 - correctAnswersCount) : (questions.length - correctAnswersCount));

    localStorage.setItem("ph_trivia_player_stats", JSON.stringify(stats));
  };

  // Submit local stats + report to SkillForge exactly once when the game ends,
  // by any terminal path (win, ran out of lives, or death by timeout).
  useEffect(() => {
    if (!isGameOver && !isCompleted) return;
    if (hasReported.current) return;
    hasReported.current = true;

    saveScoresAndStats(score, maxStreak, isGameOver);
    reportResult({
      quizId: category.id,
      score: correctAnswersCount,
      total: questions.length,
      points: score,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, isCompleted]);

  const getPercentageScore = () => {
    if (questions.length === 0) return 0;
    return Math.round((correctAnswersCount / questions.length) * 100);
  };

  // Render the finished screens
  if (isCompleted || isGameOver) {
    const finalResult: CategoryResult = {
      categoryId: category.id,
      categoryTitle: category.title,
      score: score,
      totalQuestions: questions.length,
      perfectScore: correctAnswersCount === questions.length && lives === 3,
      maxStreak: maxStreak,
      remainingHearts: lives,
      missedQuestions: missedQuestions,
    };

    return (
      <ScoreBoard 
        result={finalResult} 
        onRestart={onExit} 
        isDefeat={isGameOver}
        totalQuestionsAnswered={currentIndex + 1}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
        <p className="mt-4 text-slate-400 font-mono text-xs">Parsing Dataset Schema...</p>
      </div>
    );
  }

  // Interactive dynamic values
  const isTimeCritical = timeLeft <= 6;
  const isCorrectSubmitted = isSubmitted && (
    activeQuestion.type === "open-text"
      ? (openTextAnswer.trim().toLowerCase().includes(activeQuestion.correctAnswer.trim().toLowerCase()) || activeQuestion.correctAnswer.trim().toLowerCase().includes(openTextAnswer.trim().toLowerCase())) && openTextAnswer.trim() !== ""
      : selectedOption?.trim().toLowerCase() === activeQuestion.correctAnswer.trim().toLowerCase()
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10" id="game-controller">
      {/* Top Controller Bar: Indicators & Hearts */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6 space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-3.5">
          <button 
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-850 transition-all font-medium"
          >
            ← Exit Game
          </button>
          <div className="h-4 w-px bg-slate-850" />
          <div className="text-left">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider block uppercase leading-none">Category</span>
            <span className="text-xs font-bold text-slate-200 truncate max-w-[180px] block">{category.title}</span>
          </div>
        </div>

        {/* Lives Counter (Hearts) */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <span className="text-[10px] text-slate-500 font-mono mr-1">LIVES</span>
            {[1, 2, 3].map((heartIdx) => (
              <Heart
                key={heartIdx}
                className={`w-5 h-5 transition-transform duration-300 ${
                  heartIdx <= lives 
                    ? "fill-rose-500 text-rose-500 scale-100 hover:scale-110" 
                    : "text-slate-700 fill-slate-800/30 scale-90"
                }`}
              />
            ))}
          </div>

          {/* Current Score */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block leading-none uppercase">Score</span>
              <span className="text-sm font-bold font-mono text-amber-400">{score} pts</span>
            </div>
            {currentStreak > 1 && (
              <div className="flex items-center space-x-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-md text-xs font-mono font-bold text-yellow-400 animate-bounce">
                <Zap className="w-3.5 h-3.5 fill-yellow-500" />
                <span>Streak x{currentStreak}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Time Counter */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-mono">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          {activeQuestion.roundName && (
            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {activeQuestion.roundName}
            </span>
          )}
          <span className={`font-bold transition-colors ${isTimeCritical ? "text-rose-400 animate-pulse" : "text-amber-400"}`}>
            Timer: {timeLeft}s
          </span>
        </div>
        
        {/* Progress Bar (Question Index) */}
        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex border border-slate-800/40">
          {questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-full border-r border-slate-950 last:border-0 transition-all duration-300 ${
                idx < currentIndex 
                  ? "bg-indigo-500" 
                  : idx === currentIndex 
                    ? isSubmitted ? (isCorrectSubmitted ? "bg-emerald-500" : "bg-rose-500") : "bg-amber-400" 
                    : "bg-slate-800"
              }`}
              style={{ width: `${100 / questions.length}%` }}
            />
          ))}
        </div>

        {/* Dynamic Countdown Countdown Strip */}
        <div className="w-full bg-slate-950 h-1 mt-1 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${
              isTimeCritical ? "bg-rose-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"
            }`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Question Display Card */}
      <QuestionCard
        question={activeQuestion}
        selectedOption={selectedOption}
        onSelectOption={setSelectedOption}
        openTextAnswer={openTextAnswer}
        onChangeOpenText={setOpenTextAnswer}
        isSubmitted={isSubmitted}
        onSubmitAnswer={handleSubmitAnswer}
        hasShownHint={hasShownHint}
        onShowHint={() => setHasShownHint(true)}
      />

      {/* Feedback Overlay / Docked Frame */}
      {isSubmitted && (
        <div className="mt-6">
          <FeedbackModal
            isCorrect={activeQuestion.type === "open-text"
              ? (openTextAnswer.trim().toLowerCase().includes(activeQuestion.correctAnswer.trim().toLowerCase()) || activeQuestion.correctAnswer.trim().toLowerCase().includes(openTextAnswer.trim().toLowerCase())) && openTextAnswer.trim() !== ""
              : selectedOption?.trim().toLowerCase() === activeQuestion.correctAnswer.trim().toLowerCase()
            }
            correctAnswer={activeQuestion.correctAnswer}
            explanation={activeQuestion.explanation}
            onNext={handleNextQuestion}
            isLast={currentIndex >= questions.length - 1}
            livesRemaining={lives}
          />
        </div>
      )}
    </div>
  );
};
