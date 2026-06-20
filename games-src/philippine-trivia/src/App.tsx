import { useEffect, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { GameController } from "./components/GameController";
import { QuizCategory } from "./types/trivia";
import { initBridge } from "./services/skillforge";

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<QuizCategory | null>(null);

  // Connect to the SkillForge host (player identity + score/analytics channel).
  useEffect(() => {
    initBridge();
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Dynamic ambient header glow */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center space-x-2.5 group focus:outline-none"
          >
            {/* Minimal Philippine Flag Colors Motif Icon */}
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center font-bold text-slate-100 bg-gradient-to-tr from-blue-700 via-amber-400 to-rose-600 transition-transform duration-300 group-hover:scale-105">
              <span className="relative z-10 font-mono text-sm leading-none text-slate-950">PH</span>
              <div className="absolute inset-[1.5px] bg-slate-950 rounded-[7px] flex items-center justify-center">
                <span className="font-display text-xs font-bold text-amber-400">☼</span>
              </div>
            </div>
            <div className="text-left font-sans">
              <span className="font-black text-sm text-slate-100 uppercase tracking-widest block leading-none">
                The Philippine Trivia
              </span>
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                Kasaysayan at Heograpiya
              </span>
            </div>
          </button>

          {/* Top Quick Status indicators */}
          <div className="flex items-center space-x-3.5 text-xs text-slate-400 font-mono">
            {selectedCategory ? (
              <div className="flex items-center space-x-1.5 bg-indigo-500/15 border border-indigo-500/20 px-2.5 py-1 rounded text-indigo-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span>Trivia In Progress</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                <span>Idle Hub</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body Layout */}
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

      {/* Decorative Traditional Footer */}
      <footer className="border-t border-slate-950 bg-slate-950/80 backdrop-blur py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 mb-4 md:mb-0">
            <span>© 2026 The Philippine Trivia App. Built for students & history enthusiasts.</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-600">Mabuhay ang Pilipinas! 🇵🇭</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
