/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Trophy, 
  HelpCircle, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Check, 
  Timer, 
  ArrowRight, 
  Play, 
  BookOpen, 
  Calendar, 
  Layers, 
  Info,
  ChevronRight,
  RefreshCw,
  Eye,
  Award
} from "lucide-react";
import {
  VALID_WORDS,
  CURATED_PUZZLES,
  getDailyPuzzleIndex,
  getScrambledLetters,
  isWordValid,
  PuzzleDef
} from "./words";
import { validateWithWordNet, fetchWordDefinition } from "./api";

// Sound effects synthesizer using native Web Audio API
class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {
    // Lazy initialized on first user interaction due to browser policies
  }

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    // Resume context if suspended
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playSwap() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(350, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }

  playRowMatch() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, this.ctx.currentTime + 0.16); // G5

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }

  playSolve() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.05, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }

  playLose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio failed", e);
    }
  }
}

// Global Sound Controller instance
const audio = new SoundEffectsEngine();

interface Tile {
  id: number;
  char: string;
}

interface UserStats {
  dailyGamesPlayed: number;
  dailyCompleted: number;
  dailyStreak: number;
  maxDailyStreak: number;
  lastDailySolveDate?: string; // YYYY-MM-DD
  sprintBestScore: number;
  completedArchiveIds: number[];
}

export default function App() {
  // Game mode
  const [mode, setMode] = useState<"daily" | "sprint" | "archive">("daily");

  // Selection state for click-to-swap fallback (mobile-first friendly!)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Puzzle reference state
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleDef>(CURATED_PUZZLES[0]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [initialScrambled, setInitialScrambled] = useState<Tile[]>([]);
  const [validRows, setValidRows] = useState<boolean[]>([false, false, false, false, false]);

  // Archive and Puzzle track
  const [archiveIndex, setArchiveIndex] = useState<number>(0);

  // Sprint specific states
  const [sprintScore, setSprintScore] = useState<number>(0);
  const [sprintTimeLeft, setSprintTimeLeft] = useState<number>(90);
  const [isSprintActive, setIsSprintActive] = useState<boolean>(false);

  // Time tracked for standard modes
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // General state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showSolutionMode, setShowSolutionMode] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<"help" | "stats" | "success" | "archive_list" | null>(null);

  // User persistence stats
  const [stats, setStats] = useState<UserStats>({
    dailyGamesPlayed: 0,
    dailyCompleted: 0,
    dailyStreak: 0,
    maxDailyStreak: 0,
    sprintBestScore: 0,
    completedArchiveIds: []
  });

  // WordNet-enriched definitions per row, loaded async after a row turns green
  const [rowDefinitions, setRowDefinitions] = useState<(string | null)[]>([null, null, null, null, null]);

  // Drag and Drop drag item reference
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Timer references
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sprintTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Async WordNet validation refs
  const wordnetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordnetGenRef = useRef(0);
  // Prevents win from firing twice per puzzle (e.g. sync + async both detect all-solved)
  const alreadySolvedRef = useRef(false);

  // Load stats and settings on mount
  useEffect(() => {
    // Stats
    const savedStats = localStorage.getItem("smartle_v1_stats");
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (e) {
        console.error("Error parsing stats", e);
      }
    } else {
      // First time user? Let's show instructions modal!
      setActiveModal("help");
    }

    // Sound setting
    const savedSoundSetting = localStorage.getItem("smartle_v1_sound");
    if (savedSoundSetting !== null) {
      const isEnabled = savedSoundSetting === "true";
      setSoundEnabled(isEnabled);
      audio.enabled = isEnabled;
    }

    // Default to the correct daily puzzle
    loadDailyPuzzle();
  }, []);

  // Sync sound setting instance
  useEffect(() => {
    audio.enabled = soundEnabled;
    localStorage.setItem("smartle_v1_sound", soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  // Track timer for standard modes (Daily & Archive)
  useEffect(() => {
    if (activeModal === "success" || showSolutionMode) {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
      return;
    }

    if (mode !== "sprint") {
      // Start counting elapsed time
      mainTimerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    }

    return () => {
      if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    };
  }, [mode, activeModal, showSolutionMode, currentPuzzle.id]);

  // Track Sprint mode timer countdown
  useEffect(() => {
    if (mode === "sprint" && isSprintActive && sprintTimeLeft > 0 && activeModal !== "success") {
      sprintTimerRef.current = setTimeout(() => {
        setSprintTimeLeft(prev => {
          if (prev <= 1) {
            // Sprint Ends!
            audio.playLose();
            setIsSprintActive(false);
            // Save Sprint Best Score to stats
            updateSprintBestScore(sprintScore);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (sprintTimerRef.current) clearTimeout(sprintTimerRef.current);
    }

    return () => {
      if (sprintTimerRef.current) clearTimeout(sprintTimerRef.current);
    };
  }, [mode, isSprintActive, sprintTimeLeft, sprintScore, activeModal]);

  // Sync row validation + queue async WordNet check for rows that fail local set
  useEffect(() => {
    if (tiles.length !== 25) return;

    const rowWords = Array.from({ length: 5 }, (_, r) =>
      tiles.slice(r * 5, r * 5 + 5).map(t => t.char).join("")
    );
    const syncValid = rowWords.map(w => isWordValid(w));

    // Immediate audio for newly-valid rows (sync only; async audio handled below)
    const hasNewSyncMatch = syncValid.some((v, i) => v && !validRows[i]);
    if (hasNewSyncMatch && !showSolutionMode) {
      if (!syncValid.every(Boolean)) audio.playRowMatch();
    }

    setValidRows(syncValid);

    // Cancel any pending WordNet check from a previous tile arrangement
    if (wordnetTimerRef.current) clearTimeout(wordnetTimerRef.current);
    const gen = ++wordnetGenRef.current;

    // 350ms debounce: fire after the user pauses swapping
    wordnetTimerRef.current = setTimeout(async () => {
      const results = await Promise.all(
        rowWords.map(async (w, i) => ({
          i,
          valid: syncValid[i] || await validateWithWordNet(w),
        }))
      );
      if (gen !== wordnetGenRef.current) return; // stale — tiles changed again

      setValidRows(prev => {
        const next = prev.map((v, i) => v || results[i].valid);
        const anyNew = next.some((v, i) => v && !prev[i]);
        if (anyNew && !next.every(Boolean)) audio.playRowMatch();
        return next;
      });

      // Fetch definitions for every row that is now valid
      results.forEach(async ({ i, valid }) => {
        if (!valid) return;
        const def = await fetchWordDefinition(rowWords[i]);
        if (gen !== wordnetGenRef.current) return;
        setRowDefinitions(prev => {
          if (prev[i] === def) return prev;
          const next = [...prev];
          next[i] = def;
          return next;
        });
      });
    }, 350);
  }, [tiles]);

  // Win detection: fires whenever validRows changes, handles both sync and async validation paths
  useEffect(() => {
    if (tiles.length !== 25) return;
    if (!validRows.every(Boolean)) return;
    if (alreadySolvedRef.current) return;
    if (activeModal === "success") return;

    alreadySolvedRef.current = true;

    if (mode === "sprint") {
      audio.playSolve();
      setSprintScore(prev => prev + 1);
      setSprintTimeLeft(prev => Math.min(prev + 30, 150));
      loadNextSprintPuzzle();
    } else if (!showSolutionMode) {
      handleGameComplete();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validRows]);

  // Helpers that reset per-puzzle transient state
  const resetPuzzleRefs = useCallback(() => {
    alreadySolvedRef.current = false;
    wordnetGenRef.current++;
    if (wordnetTimerRef.current) clearTimeout(wordnetTimerRef.current);
  }, []);

  // Run initial state recovery for the day when Daily mode selected
  const loadDailyPuzzle = () => {
    resetPuzzleRefs();
    setRowDefinitions([null, null, null, null, null]);

    const dailyIdx = getDailyPuzzleIndex();
    const puzzle = CURATED_PUZZLES[dailyIdx];
    setCurrentPuzzle(puzzle);

    // Check if daily states are stored in localStorage for today
    const todayStr = getTodayString();
    const storedDailyLayout = localStorage.getItem(`smartle_daily_state_${todayStr}`);

    if (storedDailyLayout) {
      try {
        const layoutObj = JSON.parse(storedDailyLayout);
        setTiles(layoutObj.tiles);
        setInitialScrambled(layoutObj.initial);
        setElapsedSeconds(layoutObj.elapsed || 0);
        return;
      } catch (e) {
        console.error("Failed to parse daily layout storage", e);
      }
    }

    // Otherwise, generate fresh scramble
    const freshScramble = getScrambledLetters(puzzle.solution);
    setTiles(freshScramble);
    setInitialScrambled(freshScramble);
    setElapsedSeconds(0);
    setShowSolutionMode(false);

    // Save initial state
    saveDailyLayoutState(freshScramble, freshScramble, 0);
  };

  const saveDailyLayoutState = (currTiles: Tile[], initTiles: Tile[], sec: number) => {
    const todayStr = getTodayString();
    localStorage.setItem(`smartle_daily_state_${todayStr}`, JSON.stringify({
      tiles: currTiles,
      initial: initTiles,
      elapsed: sec
    }));
  };

  // Helper date string
  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Switch game modes cleanly
  const handleModeChange = (newMode: "daily" | "sprint" | "archive") => {
    setMode(newMode);
    setSelectedIdx(null);
    setShowSolutionMode(false);

    if (newMode === "daily") {
      loadDailyPuzzle();
    } else if (newMode === "sprint") {
      resetPuzzleRefs();
      setRowDefinitions([null, null, null, null, null]);
      // Prepare fresh Sprint board but don't start timer until "Start Sprint" is clicked
      setSprintScore(0);
      setSprintTimeLeft(90);
      setIsSprintActive(false);
      // Pick random puzzle
      const randomPuzzle = CURATED_PUZZLES[Math.floor(Math.random() * CURATED_PUZZLES.length)];
      setCurrentPuzzle(randomPuzzle);
      const scr = getScrambledLetters(randomPuzzle.solution);
      setTiles(scr);
      setInitialScrambled(scr);
    } else if (newMode === "archive") {
      loadArchivePuzzle(archiveIndex);
    }
  };

  // Load explicit Archive Puzzle
  const loadArchivePuzzle = (pIndex: number) => {
    resetPuzzleRefs();
    setRowDefinitions([null, null, null, null, null]);
    setArchiveIndex(pIndex);
    const puzzle = CURATED_PUZZLES[pIndex];
    if (!puzzle) return;
    setCurrentPuzzle(puzzle);
    const scr = getScrambledLetters(puzzle.solution);
    setTiles(scr);
    setInitialScrambled(scr);
    setElapsedSeconds(0);
    setShowSolutionMode(false);
  };

  // Generate next Sprint level
  const loadNextSprintPuzzle = () => {
    resetPuzzleRefs();
    setRowDefinitions([null, null, null, null, null]);
    // Pick another random puzzle (different than current if possible)
    let nextIdx = Math.floor(Math.random() * CURATED_PUZZLES.length);
    if (CURATED_PUZZLES[nextIdx].id === currentPuzzle.id) {
      nextIdx = (nextIdx + 1) % CURATED_PUZZLES.length;
    }
    const nextPuzzle = CURATED_PUZZLES[nextIdx];
    setCurrentPuzzle(nextPuzzle);
    const scr = getScrambledLetters(nextPuzzle.solution);
    setTiles(scr);
    setInitialScrambled(scr);
  };

  // Triggers when Daily or Archive completes successfully
  const handleGameComplete = () => {
    audio.playSolve();
    setActiveModal("success");

    // Update stats structure
    setStats(prev => {
      const updated = { ...prev };
      
      if (mode === "daily") {
        const todayStr = getTodayString();
        // Skip updating if already saved as solved today to avoid stats bloat
        if (updated.lastDailySolveDate !== todayStr) {
          updated.dailyCompleted += 1;
          updated.dailyGamesPlayed += 1;
          
          // Compute streak
          if (updated.lastDailySolveDate) {
            const lastDate = new Date(updated.lastDailySolveDate);
            const dToday = new Date(todayStr);
            const diffTime = Math.abs(dToday.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) {
              updated.dailyStreak += 1;
            } else {
              updated.dailyStreak = 1;
            }
          } else {
            updated.dailyStreak = 1;
          }
          
          updated.maxDailyStreak = Math.max(updated.maxDailyStreak, updated.dailyStreak);
          updated.lastDailySolveDate = todayStr;
        }
      } else if (mode === "archive") {
        if (!updated.completedArchiveIds.includes(currentPuzzle.id)) {
          updated.completedArchiveIds.push(currentPuzzle.id);
        }
      }

      localStorage.setItem("smartle_v1_stats", JSON.stringify(updated));
      return updated;
    });
  };

  // Update high score in Sprint run
  const updateSprintBestScore = (score: number) => {
    setStats(prev => {
      const best = Math.max(prev.sprintBestScore, score);
      const updated = { ...prev, sprintBestScore: best };
      localStorage.setItem("smartle_v1_stats", JSON.stringify(updated));
      return updated;
    });
  };

  // Swap function for general tile operation
  const swapTiles = (idx1: number, idx2: number) => {
    if (idx1 < 0 || idx1 >= 25 || idx2 < 0 || idx2 >= 25) return;
    if (idx1 === idx2) return;

    audio.playSwap();

    const newTiles = [...tiles];
    const temp = newTiles[idx1];
    newTiles[idx1] = newTiles[idx2];
    newTiles[idx2] = temp;

    setTiles(newTiles);

    // Save Daily layout in case of refreshing state
    if (mode === "daily") {
      saveDailyLayoutState(newTiles, initialScrambled, elapsedSeconds);
    }
  };

  // Handle Drag & Drop Events
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    // Standard web data transfer setup
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const sourceIdxStr = e.dataTransfer.getData("text/plain");
    const sourceIdx = parseInt(sourceIdxStr, 10);
    
    if (!isNaN(sourceIdx) && sourceIdx !== index) {
      swapTiles(sourceIdx, index);
    }
    
    // Clear references
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragLeave = (index: number) => {
    if (dragOverIdx === index) {
      setDragOverIdx(null);
    }
  };

  // Touch and Click Tile Actions
  const handleTileClick = (index: number) => {
    // If Sprint is active but hasn't started yet, force start it or ignore
    if (mode === "sprint" && !isSprintActive) {
      setIsSprintActive(true);
    }

    if (selectedIdx === null) {
      setSelectedIdx(index);
    } else {
      if (selectedIdx === index) {
        setSelectedIdx(null);
      } else {
        swapTiles(selectedIdx, index);
        setSelectedIdx(null);
      }
    }
  };

  // Back to raw scrambled puzzle layout state
  const resetBoard = () => {
    setTiles([...initialScrambled]);
    setSelectedIdx(null);
    if (mode === "daily") {
      saveDailyLayoutState(initialScrambled, initialScrambled, elapsedSeconds);
    }
  };

  // Helper formats seconds nicely to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 flex-1 relative overflow-y-auto font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 z-30 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-inner flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-100 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-wider leading-none text-white block">
                SMARTLE
              </h1>
              <span className="text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase">
                Rearrange &amp; Solve
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sound Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {/* Rules Button */}
            <button
              id="help-btn"
              onClick={() => setActiveModal("help")}
              className="p-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Stats Button */}
            <button
              id="stats-btn"
              onClick={() => setActiveModal("stats")}
              className="p-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              title="Statistics"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col justify-between gap-4">
        
        {/* Game Mode Pill Selectors */}
        <div className="grid grid-cols-3 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            id="tab-daily"
            onClick={() => handleModeChange("daily")}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
              mode === "daily"
                ? "bg-indigo-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            }`}
          >
            <Calendar className="w-3.5 h-3.5 mb-1" />
            <span>Daily Mode</span>
          </button>
          
          <button
            id="tab-sprint"
            onClick={() => handleModeChange("sprint")}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-medium text-xs transition-all cursor-pointer ${
              mode === "sprint"
                ? "bg-indigo-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            }`}
          >
            <Timer className="w-3.5 h-3.5 mb-1" />
            <span>Sprint Mode</span>
          </button>

          <button
            id="tab-archive"
            onClick={() => handleModeChange("archive")}
            className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg font-medium text-xs transition-all cursor-pointer  ${
              mode === "archive"
                ? "bg-indigo-600 text-white shadow-md font-semibold"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5 mb-1" />
            <span>Archive</span>
          </button>
        </div>

        {/* Level Status & Info Header */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between shadow-md">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              {mode === "daily" ? `Daily Puzzle` : mode === "sprint" ? `Sprint Marathon` : `Archive Challenge`}
            </span>
            <span className="text-sm font-semibold text-white truncate max-w-[180px]">
              {currentPuzzle.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {mode === "sprint" ? (
              <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-900/30 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold">
                <Timer className={`w-3.5 h-3.5 text-rose-400 ${isSprintActive ? "animate-pulse" : ""}`} />
                <span className={sprintTimeLeft <= 15 ? "text-rose-400 font-bold animate-pulse text-sm" : "text-slate-200"}>
                  {sprintTimeLeft}s
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl font-mono text-xs font-semibold text-slate-300 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-sans">TIME</span>
                <span>{formatTime(elapsedSeconds)}</span>
              </div>
            )}

            {mode === "sprint" && (
              <div className="flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/30 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
                <span>SOLVED:</span>
                <span className="text-sm font-mono">{sprintScore}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sprint Pre-game Banner */}
        {mode === "sprint" && !isSprintActive && sprintTimeLeft > 0 && (
          <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 border border-indigo-500/30 rounded-2xl p-4 text-center shadow-lg my-1 animate-pulse">
            <p className="text-xs text-indigo-100 mb-2.5 font-medium">
              Race the countdown! Rearrange letters to solve as many boards as possible. Swapping letters adds +30s bonus!
            </p>
            <button
              id="start-sprint-btn"
              onClick={() => setIsSprintActive(true)}
              className="cursor-pointer bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs px-5 py-2 rounded-xl flex items-center gap-1.5 mx-auto shadow-md shadow-emerald-500/20 transition-all font-display uppercase tracking-wider"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Initialize Sprint
            </button>
          </div>
        )}

        {/* Sprint Time Out Screen */}
        {mode === "sprint" && sprintTimeLeft === 0 && (
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-6 text-center shadow-xl my-4">
            <p className="text-xs text-rose-400 font-bold tracking-widest uppercase mb-1">Time's Up!</p>
            <h4 className="text-2xl font-bold font-display text-white mb-2">Sprint Over</h4>
            <div className="bg-slate-950 p-4 rounded-xl max-w-xs mx-auto mb-4 border border-slate-800">
              <span className="text-slate-400 text-xs block mb-1">Puzzles Solved</span>
              <span className="text-3xl font-mono font-bold text-indigo-400 block">{sprintScore}</span>
            </div>
            <button
              id="restart-sprint-btn"
              onClick={() => {
                setSprintScore(0);
                setSprintTimeLeft(90);
                setIsSprintActive(true);
                loadNextSprintPuzzle();
              }}
              className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs px-6 py-2.5 rounded-xl mx-auto flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Start Again
            </button>
          </div>
        )}

        {/* The 5x5 Game Board Container */}
        {!(mode === "sprint" && sprintTimeLeft === 0) && (
          <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-xl flex-1 flex flex-col justify-center min-h-[350px]">
            {/* Absolute overlay when showing targets/solution */}
            {showSolutionMode && (
              <div className="absolute inset-0 bg-slate-950/95 rounded-3xl p-5 flex flex-col justify-center z-20">
                <h5 className="text-sm font-bold text-amber-400 tracking-wider font-display uppercase mb-4 text-center">
                  Puzzle Key Words
                </h5>
                <div className="space-y-3 max-w-xs mx-auto w-full">
                  {currentPuzzle.solution.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 font-mono">Row {idx + 1}</span>
                      <span className="text-sm font-mono font-bold text-indigo-300 tracking-widest uppercase bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/30">
                        {w}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  id="hide-solution-btn"
                  onClick={() => setShowSolutionMode(false)}
                  className="mt-6 cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl w-full max-w-xs mx-auto border border-slate-700"
                >
                  Return to Puzzle
                </button>
              </div>
            )}

            {/* Rows list */}
            <div className="flex flex-col gap-2 relative z-10">
              {[0, 1, 2, 3, 4].map((rowIdx) => {
                const start = rowIdx * 5;
                const rowTiles = tiles.slice(start, start + 5);
                const isRowSolved = validRows[rowIdx];
                const rowStr = rowTiles.map(t => t.char).join("");

                return (
                  <div key={rowIdx} className="flex flex-col">
                    <div
                      className={`grid grid-cols-5 gap-1.5 p-1 rounded-xl transition-all relative ${
                        isRowSolved
                          ? "bg-emerald-950/30 border border-emerald-500/20 shadow-emerald-900/10 shadow-lg animate-row-success"
                          : "bg-slate-950/20 border border-transparent"
                      }`}
                    >
                      {/* Visual Checkmark Badge for Solved Rows */}
                      {isRowSolved && (
                        <div className="absolute -right-2 -top-1 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow-md flex items-center justify-center border-2 border-slate-900 z-10 transition-transform scale-100">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}

                      {rowTiles.map((tile, relativeColIdx) => {
                        const absoluteIdx = start + relativeColIdx;
                        const isTileSelected = selectedIdx === absoluteIdx;
                        const isDragged = draggedIdx === absoluteIdx;
                        const isOver = dragOverIdx === absoluteIdx;

                        return (
                          <div
                            key={tile.id}
                            draggable={!(mode === "sprint" && !isSprintActive)}
                            onDragStart={(e) => handleDragStart(e, absoluteIdx)}
                            onDragOver={(e) => handleDragOver(e, absoluteIdx)}
                            onDrop={(e) => handleDrop(e, absoluteIdx)}
                            onDragEnd={handleDragEnd}
                            onDragLeave={() => handleDragLeave(absoluteIdx)}
                            onClick={() => handleTileClick(absoluteIdx)}
                            className={`aspect-square rounded-xl flex items-center justify-center font-bold text-lg select-none transition-all cursor-grab active:cursor-grabbing transform ${
                              isRowSolved
                                ? "bg-gradient-to-b from-emerald-500/40 to-emerald-600/40 border border-emerald-400 text-emerald-100"
                                : isTileSelected
                                ? "bg-slate-800 text-white scale-105 border-2 border-amber-400 shadow-xl shadow-amber-500/10 ring-4 ring-amber-500/10"
                                : isOver
                                ? "bg-indigo-900/90 border-2 border-indigo-400 text-indigo-100 scale-95"
                                : "bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-100 active:scale-95 shadow-md"
                            } ${isDragged ? "opacity-30 scale-90" : "opacity-100"}`}
                          >
                            <span className="font-display tracking-tight text-xl">{tile.char}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* WordNet definition pill — shown in non-Sprint modes when definition is available */}
                    {isRowSolved && mode !== "sprint" && rowDefinitions[rowIdx] && (
                      <p className="text-[10px] text-emerald-400/75 italic px-2 pt-0.5 leading-snug truncate">
                        <span className="font-mono font-semibold not-italic text-emerald-500/90">{rowStr}</span>
                        {" — "}
                        {rowDefinitions[rowIdx]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instruction tooltip when playing */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 px-2 leading-tight">
              <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                Drag &amp; drop cards to swap, or <strong>tap any two letters</strong> to swap instantly.
              </span>
            </div>
          </div>
        )}

        {/* Board Actions controls */}
        {!(mode === "sprint" && sprintTimeLeft === 0) && (
          <div className="flex items-center gap-3">
            {/* Reset / Restart Layout */}
            <button
              id="reset-board-btn"
              onClick={resetBoard}
              title="Reset letters back to original scramble"
              className="flex-1 max-w-xs cursor-pointer flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold py-2.5 px-3 rounded-xl active:scale-95 shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Scramble</span>
            </button>

            {/* Solution Helper Clue */}
            {mode !== "sprint" && (
              <button
                id="show-solution-btn"
                onClick={() => setShowSolutionMode(true)}
                title="Stuck? View target 5-letter words"
                className="flex-1 max-w-xs cursor-pointer flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-semibold py-2.5 px-3 rounded-xl active:scale-95 shadow-md"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Show Clues</span>
              </button>
            )}

            {/* Archive Level Picker Trigger */}
            {mode === "archive" && (
              <button
                id="choose-archive-btn"
                onClick={() => setActiveModal("archive_list")}
                title="Browse past puzzles"
                className="flex-1 max-w-xs cursor-pointer flex items-center justify-center gap-1.5 bg-indigo-950/40 border border-indigo-900/30 hover:bg-indigo-900/40 text-indigo-300 hover:text-indigo-200 transition-all text-xs font-semibold py-2.5 px-3 rounded-xl active:scale-95 shadow-md"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Choose Level</span>
              </button>
            )}
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="mt-auto py-2.5 text-center text-[10px] text-slate-600 font-mono tracking-wider border-t border-slate-900/40 px-4 bg-slate-950">
        SMARTLE PUZZLE GAME &bull; REARRANGE THE BOARD
      </footer>

      {/* MODALS SECTION */}

      {/* 1. Tutorial / Help Modal */}
      {activeModal === "help" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-lg font-display font-bold text-white mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" /> How to Play Smartle
            </h3>
            
            <div className="space-y-4 text-xs text-slate-300 pr-1 overflow-y-auto max-h-[350px]">
              <p>
                Smartle is a sleek word puzzle where you rearrange scrambled letters on a 5x5 board to form valid 5-letter horizontal words.
              </p>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">Mechanics</span>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li><strong>Swapping letters:</strong> Click on any letter tile and then click on another tile to instantly swap them. Or simply drag and drop tiles on desktop!</li>
                  <li><strong>Horizontal focus:</strong> Only horizontal horizontal words count from left to right. Only full rows of 5 letters are checked.</li>
                  <li><strong>Instant checking:</strong> When a row forms a valid word, it illuminates green!</li>
                  <li><strong>Victory check:</strong> Real-time success triggers when all 5 horizontal rows form valid words at the same time.</li>
                </ul>
              </div>

              <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/30">
                <span className="text-[10px] uppercase font-bold text-indigo-300 font-mono tracking-wider block">Multiple Game Modes</span>
                <ul className="list-disc pl-4 space-y-1.5 mt-1 text-slate-300">
                  <li><strong>Daily Mode:</strong> One dedicated daily puzzle common, perfect for keeping brain streaks going!</li>
                  <li><strong>Sprint Mode:</strong> Fast timed countdown match where every correct board grants +30s bonus layout!</li>
                  <li><strong>Archive Mode:</strong> Access and complete past puzzle challenges at your leisure.</li>
                </ul>
              </div>
            </div>

            <button
              id="close-help-btn"
              onClick={() => {
                // Initialize audio context safely upon close interaction
                audio.playSwap();
                setActiveModal(null);
              }}
              className="mt-5 cursor-pointer w-full bg-indigo-600 hover:bg-indigo-500 font-bold text-xs py-2.5 rounded-xl text-white transition-all shadow-md shadow-indigo-600/10"
            >
              Start Rearranging!
            </button>
          </div>
        </div>
      )}

      {/* 2. Statistics & Trophy Modal */}
      {activeModal === "stats" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-display font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> Career Statistics
            </h3>

            <div className="space-y-4">
              {/* Daily mode statistics */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block mb-2.5">
                  Daily Puzzle Mode
                </span>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="block text-xl font-mono font-bold text-white">
                      {stats.dailyCompleted}
                    </span>
                    <span className="text-[10px] text-slate-400">Puzzles Solved</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="block text-xl font-mono font-bold text-amber-400">
                      {stats.dailyStreak}
                    </span>
                    <span className="text-[10px] text-slate-400">Current Streak</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="block text-xl font-mono font-bold text-indigo-400">
                      {stats.maxDailyStreak}
                    </span>
                    <span className="text-[10px] text-slate-400">Max Streak</span>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="block text-xl font-mono font-bold text-emerald-400">
                      {stats.dailyGamesPlayed ? Math.round((stats.dailyCompleted / stats.dailyGamesPlayed) * 100) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400">Solve Rate</span>
                  </div>
                </div>
              </div>

              {/* Sprint best score */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
                    Sprint Mode
                  </span>
                  <span className="text-xs text-slate-400">Best solved score in single countdown run</span>
                </div>
                <div className="bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 text-center shrink-0 min-w-[70px]">
                  <span className="block text-xl font-mono font-bold text-indigo-400">
                    {stats.sprintBestScore}
                  </span>
                  <span className="text-[10px] text-slate-500">Solved</span>
                </div>
              </div>

              {/* Archive complete numbers */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider block">
                    Archive Mode
                  </span>
                  <span className="text-xs text-slate-400">Puzzles cleared from previous days</span>
                </div>
                <div className="bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800 text-center shrink-0 min-w-[70px]">
                  <span className="block text-xl font-mono font-bold text-emerald-400">
                    {stats.completedArchiveIds.length}
                  </span>
                  <span className="text-[10px] text-slate-500">Completed</span>
                </div>
              </div>
            </div>

            <button
              id="close-stats-btn"
              onClick={() => setActiveModal(null)}
              className="mt-6 cursor-pointer w-full bg-slate-800 hover:bg-slate-700 font-bold text-xs py-2.5 rounded-xl text-slate-200 transition-all border border-slate-700"
            >
              Close Panel
            </button>
          </div>
        </div>
      )}

      {/* 3. Archive Levels Modal Picker */}
      {activeModal === "archive_list" && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full shadow-2xl relative">
            <h3 className="text-lg font-display font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" /> Archive Levels
            </h3>

            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
              {CURATED_PUZZLES.map((puzzle, index) => {
                const isSolved = stats.completedArchiveIds.includes(puzzle.id);

                return (
                  <button
                    key={puzzle.id}
                    onClick={() => {
                      loadArchivePuzzle(index);
                      setActiveModal(null);
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      archiveIndex === index
                        ? "bg-indigo-600/10 border-indigo-550 text-indigo-200"
                        : "bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider">
                        DAY {puzzle.id}
                      </span>
                      <span className="text-xs font-semibold text-white block">
                        {puzzle.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSolved && (
                        <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-900/50 px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 uppercase">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> Solved
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              id="close-archive-pick-btn"
              onClick={() => setActiveModal(null)}
              className="mt-4 cursor-pointer w-full bg-slate-800 hover:bg-slate-700 font-bold text-xs py-2.5 rounded-xl text-slate-200 transition-all border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 4. Complete / Victory Modal */}
      {activeModal === "success" && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-indigo-500/20 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            
            {/* Visual background glow flare */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

            <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-950/50 shadow-lg shadow-emerald-500/15 animate-bounce">
              <Check className="w-6 h-6 stroke-[3.5]" />
            </div>

            <span className="text-[10px] font-bold text-indigo-400 font-mono tracking-widest uppercase block mb-1">
              Brain Solved!
            </span>
            <h3 className="text-xl font-display font-bold text-white mb-1.5 leading-tight">
              Puzzle Completed Successfully
            </h3>
            
            <p className="text-xs text-slate-400 mb-5 max-w-xs mx-auto">
              You rearranged all letters to compose 5 valid horizontal 5-letter words! Beautifully solved.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 grid grid-cols-2 gap-3 max-w-xs mx-auto mb-6">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">TIME ELAPSED</span>
                <span className="text-base font-mono font-bold text-white block">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="text-center border-l border-slate-800">
                <span className="text-[10px] text-slate-400 block mb-0.5 font-sans">TOTAL STEPS</span>
                <span className="text-base font-mono font-bold text-emerald-400 block uppercase">
                  PERFECT
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {mode === "archive" ? (
                <button
                  id="success-next-archive-btn"
                  onClick={() => {
                    const nextPIdx = (archiveIndex + 1) % CURATED_PUZZLES.length;
                    loadArchivePuzzle(nextPIdx);
                    setActiveModal(null);
                  }}
                  className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl w-full flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/15"
                >
                  <span>Next Archive Level</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  id="success-keep-streak-btn"
                  onClick={() => {
                    setActiveModal(null);
                  }}
                  className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl w-full transition-all shadow-md shadow-indigo-600/15"
                >
                  Great Job! See board
                </button>
              )}

              <button
                id="success-share-stats-btn"
                onClick={() => {
                  setActiveModal("stats");
                }}
                className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl w-full transition-all border border-slate-755"
              >
                View Career Statistics
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
