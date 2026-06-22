import React, { useState } from "react";
import { UnifiedQuestion } from "../types/trivia";
import { Lightbulb, ChevronRight, HelpCircle, ArrowRight } from "lucide-react";

interface QuestionCardProps {
  question: UnifiedQuestion;
  selectedOption: string | null;
  onSelectOption: (option: string) => void;
  openTextAnswer: string;
  onChangeOpenText: (text: string) => void;
  isSubmitted: boolean;
  onSubmitAnswer: (forcedValue?: string) => void;
  hasShownHint: boolean;
  onShowHint: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  openTextAnswer,
  onChangeOpenText,
  isSubmitted,
  onSubmitAnswer,
  hasShownHint,
  onShowHint,
}) => {
  const [localInput, setLocalInput] = useState("");

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalInput(e.target.value);
    onChangeOpenText(e.target.value);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSubmitted && localInput.trim() !== "") {
      onSubmitAnswer(localInput);
    }
  };

  const renderMultipleChoice = () => (
    <div className="grid grid-cols-1 gap-2.5 sm:gap-3 my-4 sm:my-5">
      {question.options.map((option, idx) => {
        const isSelected = selectedOption === option;
        const isCorrectAnswer = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

        let btnClass = "bg-slate-900/30 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900/55";

        if (isSelected && !isSubmitted) {
          btnClass = "border-blue-500 bg-blue-950/20 text-blue-300 ring-2 ring-blue-500/20";
        } else if (isSubmitted) {
          if (isCorrectAnswer) {
            btnClass = "border-emerald-500 bg-emerald-950/30 text-emerald-400 font-bold ring-2 ring-emerald-500/20";
          } else if (isSelected) {
            btnClass = "border-rose-500 bg-rose-950/30 text-rose-400 font-bold ring-2 ring-rose-500/20";
          } else {
            btnClass = "border-slate-800 bg-slate-950/20 text-slate-500 opacity-60";
          }
        }

        return (
          <button
            key={idx}
            id={`option-btn-${idx}`}
            disabled={isSubmitted}
            onClick={() => onSelectOption(option)}
            className={`w-full min-h-[52px] p-3.5 sm:p-4 rounded-xl border text-left text-sm leading-snug transition-all duration-200 focus:outline-none flex items-center justify-between ${btnClass} ${
              !isSubmitted ? "active:scale-[0.99] cursor-pointer" : "cursor-default"
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`w-6 h-6 flex items-center justify-center rounded-lg font-mono text-xs font-bold shrink-0 ${
                isSelected
                  ? "bg-blue-500 text-slate-900"
                  : isSubmitted && isCorrectAnswer
                  ? "bg-emerald-500 text-slate-950"
                  : "bg-slate-800 text-slate-400"
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-snug">{option}</span>
            </div>
            {isSubmitted && isCorrectAnswer && (
              <span className="text-emerald-400 text-[10px] font-mono font-bold uppercase py-0.5 px-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0 ml-2">✓</span>
            )}
            {isSubmitted && isSelected && !isCorrectAnswer && (
              <span className="text-rose-400 text-[10px] font-mono font-bold uppercase py-0.5 px-1.5 rounded bg-rose-500/10 border border-rose-500/20 shrink-0 ml-2">✗</span>
            )}
          </button>
        );
      })}
    </div>
  );

  const renderTrueFalse = () => (
    <div className="grid grid-cols-2 gap-3 my-4 sm:my-5">
      {["True", "False"].map((option) => {
        const isSelected = selectedOption?.toLowerCase() === option.toLowerCase();
        const isCorrectAnswer = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();

        let btnClass = "bg-slate-900/30 border-slate-800 text-slate-300";
        let activeStyles = "";

        if (option === "True") {
          activeStyles = isSelected && !isSubmitted
            ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 ring-2 ring-emerald-500/10"
            : "hover:border-emerald-800/40 hover:bg-emerald-950/5";
        } else {
          activeStyles = isSelected && !isSubmitted
            ? "border-rose-500 bg-rose-950/20 text-rose-300 ring-2 ring-rose-500/10"
            : "hover:border-rose-800/40 hover:bg-rose-950/5";
        }

        if (isSubmitted) {
          if (isCorrectAnswer) {
            btnClass = "border-emerald-500 bg-emerald-950/30 text-emerald-400 font-bold ring-1 ring-emerald-500/20";
          } else if (isSelected) {
            btnClass = "border-rose-500 bg-rose-950/40 text-rose-400 font-bold ring-1 ring-rose-500/20";
          } else {
            btnClass = "border-slate-800 bg-slate-950/25 text-slate-500 opacity-55";
          }
        } else {
          btnClass += " " + activeStyles;
        }

        return (
          <button
            key={option}
            id={`tf-btn-${option}`}
            disabled={isSubmitted}
            onClick={() => onSelectOption(option)}
            className={`min-h-[80px] sm:min-h-[100px] p-4 sm:p-6 rounded-2xl border text-center font-bold tracking-wide transition-all duration-200 focus:outline-none flex flex-col items-center justify-center space-y-1.5 ${btnClass} ${
              !isSubmitted ? "active:scale-[0.98] cursor-pointer" : "cursor-default"
            }`}
          >
            <span className="text-lg sm:text-2xl">{option}</span>
            <span className={`text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full uppercase ${
              option === "True" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
            }`}>
              {option === "True" ? "Correct" : "False"}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderOpenText = () => {
    const isCorrect = isSubmitted && (
      localInput.trim().toLowerCase().includes(question.correctAnswer.trim().toLowerCase()) ||
      question.correctAnswer.trim().toLowerCase().includes(localInput.trim().toLowerCase())
    ) && localInput.trim() !== "";

    return (
      <form onSubmit={handleTextSubmit} className="my-4 sm:my-5">
        <div className="bg-slate-950/50 border border-slate-800 p-4 sm:p-5 rounded-2xl">
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-2.5 tracking-wider">
            Type your answer
          </label>
          <div className="flex flex-col gap-2.5">
            <input
              type="text"
              id="open-answer-input"
              disabled={isSubmitted}
              value={localInput}
              onChange={handleTextChange}
              placeholder="e.g. Quezon, Aguinaldo, Jacinto..."
              className={`w-full bg-slate-900 border px-4 py-3.5 rounded-xl text-white font-mono text-sm focus:outline-none transition-all ${
                isSubmitted
                  ? isCorrect
                    ? "border-emerald-500/50 bg-emerald-950/15 text-emerald-400"
                    : "border-rose-500/50 bg-rose-950/15 text-rose-400"
                  : "border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
              }`}
            />
            {!isSubmitted && (
              <button
                type="submit"
                disabled={localInput.trim() === ""}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold px-5 py-3.5 rounded-xl transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>Submit Answer</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-slate-500 font-mono">* Case insensitive. Last name accepted.</p>
        </div>
      </form>
    );
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-xl relative overflow-hidden" id="active-question-card">
      <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 via-amber-400 to-rose-500" />

      {/* Card header */}
      <div className="flex justify-between items-center mb-4 border-b border-slate-800/60 pb-3">
        <div className="flex items-center space-x-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
            {question.type === "multiple-choice" ? "Multiple Choice" : question.type === "true-false" ? "True / False" : "Fill in the Blank"}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          <span className="text-amber-400 font-bold">100+</span> pts
        </span>
      </div>

      {/* Question text */}
      <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-relaxed font-sans whitespace-pre-wrap mb-1">
        {question.questionText}
      </p>

      {question.type === "multiple-choice" && renderMultipleChoice()}
      {question.type === "true-false" && renderTrueFalse()}
      {question.type === "open-text" && renderOpenText()}

      {/* Hint */}
      {question.hint && (
        <div className="mt-4 border-t border-slate-800/60 pt-3">
          {!hasShownHint ? (
            <button
              onClick={onShowHint}
              className="flex items-center space-x-2 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/10 hover:border-amber-500/30 transition-all font-mono"
            >
              <Lightbulb className="w-3.5 h-3.5 fill-amber-400" />
              <span>Show Hint</span>
            </button>
          ) : (
            <div className="bg-slate-950/40 border border-amber-900/30 rounded-xl p-3.5 flex items-start space-x-2.5 text-xs text-amber-300 leading-relaxed font-mono">
              <Lightbulb className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase text-[9px] block text-amber-500 mb-1">HINT:</span>
                <span>{question.hint}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit button for MCQ / T-F */}
      {!isSubmitted && question.type !== "open-text" && (
        <div className="mt-4 pt-3 border-t border-slate-800/30 flex justify-end">
          <button
            onClick={() => onSubmitAnswer()}
            disabled={!selectedOption}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold py-3 px-5 rounded-xl transition duration-200 shadow disabled:opacity-40 enabled:cursor-pointer disabled:cursor-not-allowed text-sm"
          >
            <span>Lock Answer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
