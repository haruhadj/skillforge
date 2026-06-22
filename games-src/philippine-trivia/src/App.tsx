import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { GameController } from "./components/GameController";
import { QuizCategory } from "./types/trivia";
import { initBridge } from "./services/skillforge";

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);

  useEffect(() => {
    initBridge();
  }, []);

  return (
    <div className="min-h-screen flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center space-x-2 group focus:outline-none min-w-0"
          >
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg overflow-hidden flex items-center justify-center font-bold text-slate-100 bg-gradient-to-tr from-blue-700 via-amber-400 to-rose-600 transition-transform duration-300 group-hover:scale-105">
              <span className="relative z-10 font-mono text-sm leading-none text-slate-950">PH</span>
              <div className="absolute inset-[1.5px] bg-slate-950 rounded-[7px] flex items-center justify-center">
                <span className="font-display text-xs font-bold text-amber-400">☼</span>
              </div>
            </div>
            <div className="text-left font-sans min-w-0">
              <span className="font-black text-xs sm:text-sm text-slate-100 uppercase tracking-widest block leading-none truncate">
                Philippine Trivia
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono block uppercase hidden xs:block">
                Kasaysayan at Heograpiya
              </span>
            </div>
          </button>

          <div className="flex items-center shrink-0 text-xs text-slate-400 font-mono">
            {selectedCategory ? (
              <div className="flex items-center space-x-1.5 bg-indigo-500/15 border border-indigo-500/20 px-2 py-1 rounded text-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">In Progress</span>
                <span className="sm:hidden">Live</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>Hub</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {selectedCategory ? (
          <GameController
            category={selectedCategory}
            onExit={() => setSelectedCategory(null)}
          />
        ) : (
          <Dashboard onSelectCategory={setSelectedCategory} />
        )}
      </main>
    </div>
  );
}
