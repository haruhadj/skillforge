import React, { useState, useEffect, useRef } from "react";
import { QuizCategory, UnifiedQuestion, CategoryResult, PlayerStats } from "../types/trivia";
import { parseAndUnifyQuiz } from "../data/triviaData";
import { reportResult } from "../services/skillforge";
import { QuestionCard } from "./QuestionCard";
import { FeedbackModal } from "./FeedbackModal";
import { ScoreBoard } from "./ScoreBoard";
import { Heart, Zap, ChevronLeft } from "lucide-react";

interface GameControllerProps {
  category: QuizCategory;
  onExit: () => void;
}

export const GameController: React.FC<GameControllerProps> = ({ category, onExit }) => {
  const dataset = useRef<UnifiedQuestion[]>([]);

  const [questions, setQuestions] = useState<UnifiedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openTextAnswer, setOpenTextAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasShownHint, setHasShownHint] = useState(false);

  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);

  const [isGameOver, setIsGameOver] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [missedQuestions, setMissedQuestions] = useState<CategoryResult["missedQuestions"]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasReported = useRef(false);

  useEffect(() => {
    const unified = parseAndUnifyQuiz(category);
    dataset.current = unified;
    setQuestions(unified);
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, isSubmitted, isCompleted, isGameOver]);

  const activeQuestion = questions[currentIndex];

  const handleTimeOut = () => {
    const cleanCorrectAnswer = activeQuestion.correctAnswer.trim();
    setLives((prevLives) => {
      const nextLives = prevLives - 1;
      if (nextLives <= 0) setIsGameOver(true);
      return nextLives;
    });
    setMissedQuestions((prev) => [
      ...prev,
      {
        questionText: activeQuestion.questionText,
        yourAnswer: "[Timer Expired]",
        correctAnswer: cleanCorrectAnswer,
        explanation: activeQuestion.explanation,
      },
    ]);
    setCurrentStreak(0);
    setIsSubmitted(true);
  };

  const handleSubmitAnswer = (forcedValue?: string) => {
    if (isSubmitted) return;
    let playerAnswer = "";
    if (activeQuestion.type === "open-text") {
      playerAnswer = forcedValue !== undefined ? forcedValue : openTextAnswer;
    } else {
      playerAnswer = selectedOption || "";
    }

    const cleanPlayer = playerAnswer.trim().toLowerCase();
    const cleanCorrect = activeQuestion.correctAnswer.trim().toLowerCase();
    let isCorrect = false;

    if (activeQuestion.type === "open-text") {
      isCorrect = cleanPlayer.includes(cleanCorrect) || cleanCorrect.includes(cleanPlayer);
      if (cleanPlayer === "") isCorrect = false;
    } else {
      isCorrect = cleanPlayer === cleanCorrect;
    }

    if (isCorrect) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setScore((prev) => prev + 100 + newStreak * 10);
      setCorrectAnswersCount((prev) => prev + 1);
    } else {
      setLives((prevLives) => prevLives - 1);
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

  const handleNextQuestion = () => {
    const isOutOfLives = lives <= 0;
    const isAtLastQuestion = currentIndex >= questions.length - 1;

    if (isOutOfLives) { setIsGameOver(true); return; }
    if (isAtLastQuestion) {
      setScore((prev) => prev + lives * 150);
      setIsCompleted(true);
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setOpenTextAnswer("");
    setIsSubmitted(false);
    setHasShownHint(false);
    setTimeLeft(20);
  };

  const saveScoresAndStats = (finalScore: number, finalMaxStreak: number, isDefeat: boolean) => {
    const savedScoresStr = localStorage.getItem("ph_trivia_high_scores") || "{}";
    let highScores: { [key: string]: number } = {};
    try { highScores = JSON.parse(savedScoresStr); } catch { highScores = {}; }
    const currentBest = highScores[category.id] || 0;
    if (finalScore > currentBest) {
      highScores[category.id] = finalScore;
      localStorage.setItem("ph_trivia_high_scores", JSON.stringify(highScores));
    }

    const savedStatsStr = localStorage.getItem("ph_trivia_player_stats");
    let stats: PlayerStats = { gamesPlayed: 0, totalScore: 0, maxStreak: 0, correctAnswersCount: 0, wrongAnswersCount: 0 };
    if (savedStatsStr) { try { stats = JSON.parse(savedStatsStr); } catch { /* use default */ } }

    stats.gamesPlayed += 1;
    stats.totalScore += finalScore;
    if (finalMaxStreak > stats.maxStreak) stats.maxStreak = finalMaxStreak;
    stats.correctAnswersCount += correctAnswersCount;
    stats.wrongAnswersCount += (isDefeat ? (currentIndex + 1 - correctAnswersCount) : (questions.length - correctAnswersCount));
    localStorage.setItem("ph_trivia_player_stats", JSON.stringify(stats));
  };

  useEffect(() => {
    if (!isGameOver && !isCompleted) return;
    if (hasReported.current) return;
    hasReported.current = true;
    saveScoresAndStats(score, maxStreak, isGameOver);
    reportResult({ quizId: category.id, score: correctAnswersCount, total: questions.length, points: score });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameOver, isCompleted]);

  if (isCompleted || isGameOver) {
    return (
      <ScoreBoard
        result={{
          categoryId: category.id,
          categoryTitle: category.title,
          score,
          totalQuestions: questions.length,
          perfectScore: correctAnswersCount === questions.length && lives === 3,
          maxStreak,
          remainingHearts: lives,
          missedQuestions,
        }}
        onRestart={onExit}
        isDefeat={isGameOver}
        totalQuestionsAnswered={currentIndex + 1}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500" />
        <p className="mt-3 text-slate-400 font-mono text-xs">Loading quiz...</p>
      </div>
    );
  }

  const isTimeCritical = timeLeft <= 6;
  const isCorrectSubmitted = isSubmitted && (
    activeQuestion.type === "open-text"
      ? (openTextAnswer.trim().toLowerCase().includes(activeQuestion.correctAnswer.trim().toLowerCase()) ||
        activeQuestion.correctAnswer.trim().toLowerCase().includes(openTextAnswer.trim().toLowerCase())) &&
      openTextAnswer.trim() !== ""
      : selectedOption?.trim().toLowerCase() === activeQuestion.correctAnswer.trim().toLowerCase()
  );

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-6 md:py-8" id="game-controller">

      {/* Compact Mobile HUD */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        {/* Exit */}
        <button
          onClick={onExit}
          className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg border border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shrink-0 text-xs font-medium"
        >
          <ChevronLeft className="w-4 h-4 sm:hidden" />
          <span className="hidden sm:inline">← Exit</span>
        </button>

        {/* Category name */}
        <span className="flex-1 text-xs font-bold text-slate-300 truncate min-w-0">{category.title}</span>

        {/* Lives */}
        <div className="flex items-center space-x-0.5 shrink-0">
          {[1, 2, 3].map((heartIdx) => (
            <Heart
              key={heartIdx}
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${
                heartIdx <= lives ? "fill-rose-500 text-rose-500" : "text-slate-700 fill-slate-800/30 scale-90"
              }`}
            />
          ))}
        </div>

        {/* Score */}
        <div className="shrink-0 text-right">
          <span className="text-sm font-bold font-mono text-amber-400">{score}</span>
          <span className="text-[9px] text-slate-500 font-mono ml-0.5">pts</span>
        </div>

        {/* Streak badge */}
        {currentStreak > 1 && (
          <div className="flex items-center space-x-0.5 bg-yellow-500/10 border border-yellow-500/20 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-yellow-400 shrink-0">
            <Zap className="w-3 h-3 fill-yellow-500" />
            <span>x{currentStreak}</span>
          </div>
        )}
      </div>

      {/* Progress & Timer */}
      <div className="mb-3 sm:mb-5">
        <div className="flex justify-between items-center text-[10px] sm:text-xs text-slate-400 mb-1.5 font-mono">
          <span>Q {currentIndex + 1}/{questions.length}</span>
          {activeQuestion.roundName && (
            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 hidden sm:inline">
              {activeQuestion.roundName}
            </span>
          )}
          <span className={`font-bold transition-colors ${isTimeCritical ? "text-rose-400 animate-pulse" : "text-amber-400"}`}>
            {timeLeft}s
          </span>
        </div>

        {/* Question progress bar */}
        <div className="w-full bg-slate-900 h-1.5 sm:h-2 rounded-full overflow-hidden flex border border-slate-800/40">
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

        {/* Countdown strip */}
        <div className="w-full bg-slate-950 h-0.5 sm:h-1 mt-1 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${isTimeCritical ? "bg-rose-500" : "bg-gradient-to-r from-blue-500 to-indigo-500"}`}
            style={{ width: `${(timeLeft / 20) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
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

      {/* Feedback */}
      {isSubmitted && (
        <div className="mt-3 sm:mt-5">
          <FeedbackModal
            isCorrect={
              activeQuestion.type === "open-text"
                ? (openTextAnswer.trim().toLowerCase().includes(activeQuestion.correctAnswer.trim().toLowerCase()) ||
                  activeQuestion.correctAnswer.trim().toLowerCase().includes(openTextAnswer.trim().toLowerCase())) &&
                openTextAnswer.trim() !== ""
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
