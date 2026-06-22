import { useState, useEffect, useRef, useCallback } from "react";
import { FALLBACK_WORDS, TOPIC_WORDS } from "./data/words";
import {
  THEMES,
  AGE_CONFIG,
  POS_IDS,
  TOPIC_IDS,
} from "./data/constants";
import { getStyles } from "./utils/styles";
import { HomeScreen } from "./components/HomeScreen";
import { ConfigScreen } from "./components/ConfigScreen";
import { DailyScreen } from "./components/DailyScreen";
import { ShopScreen } from "./components/ShopScreen";
import { GameScreen } from "./components/GameScreen";
import { ResultsScreen } from "./components/ResultsScreen";
import { StatsScreen } from "./components/StatsScreen";

const STORAGE_KEY = "skillbee-save";
const DEFAULT_STATS = {
  gamesPlayed: 0,
  wordsSpelled: 0,
  wordsCorrect: 0,
  bestStreak: 0,
  bestAccuracy: 0,
  totalCoinsEarned: 0,
};

function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function SpellingBee() {
  const saved = useRef(loadSave()).current;

  const [screen, setScreen] = useState("home");
  const [config, setConfig] = useState({
    ageGroup: "teens",
    timerSeconds: 20,
    difficulty: "medium",
    wordsPerRound: 8,
    categories: [],
    categoryMode: "multi",
  });
  const [coins, setCoins] = useState(saved?.coins ?? 0);
  const [totalCoins, setTotalCoins] = useState(saved?.totalCoins ?? 0);
  const [owned, setOwned] = useState(saved?.owned ?? []);
  const [activeTheme, setActiveTheme] = useState(saved?.activeTheme ?? "default");
  const [activeAccessories, setActiveAccessories] = useState(saved?.activeAccessories ?? []);
  const [boosts, setBoosts] = useState(saved?.boosts ?? {
    hint_boost: 0,
    time_freeze: 0,
    double_coins: 0,
    coin_magnet_active: false,
  });
  const [stats, setStats] = useState(saved?.stats ?? { ...DEFAULT_STATS });

  const [wordList, setWordList] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [results, setResults] = useState([]);
  const [mood, setMood] = useState("idle");
  const [feedback, setFeedback] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [hintText, setHintText] = useState("");
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [doubleCoinsActive, setDoubleCoinsActive] = useState(false);
  const [timeFreezeLeft, setTimeFreezeLeft] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [shake, setShake] = useState(false);
  const [waitingToSpeak, setWaitingToSpeak] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(saved?.dailyCompleted ?? false);
  const [dailyScore, setDailyScore] = useState(saved?.dailyScore ?? null);
  const [shopTab, setShopTab] = useState("cosmetic");
  const [notification, setNotification] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const lastLoggedWordRef = useRef(null);
  const voicesRef = useRef([]);
  const currentAudioRef = useRef(null);
  const prefetchedRef = useRef({ easy: [], medium: [], hard: [] });
  const usedWordsRef = useRef(new Set());
  const prefetchInFlightRef = useRef({ easy: false, medium: false, hard: false });
  const fetchAbortRef = useRef(null);

  const theme = THEMES[activeTheme] || THEMES.default;
  const styles = getStyles(theme);
  const currentWord = wordList[currentIdx];

  // Persist state to localStorage whenever key values change
  useEffect(() => {
    writeSave({
      coins, totalCoins, owned, activeTheme, activeAccessories,
      boosts, stats, dailyCompleted, dailyScore,
    });
  }, [coins, totalCoins, owned, activeTheme, activeAccessories, boosts, stats, dailyCompleted, dailyScore]);

  // Resolve parent origin once for postMessage ("*" is blocked by PlayGameClient's origin check)
  const parentOrigin = useRef(
    typeof window !== "undefined" && window.parent !== window
      ? document.referrer
        ? new URL(document.referrer).origin
        : window.location.origin
      : window.location.origin
  );

  const postToParent = useCallback((event, data) => {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage({ type: "GAME_EVENT", event, data }, parentOrigin.current);
  }, []);

  // Request saved progress from SkillForge on mount
  useEffect(() => {
    postToParent("REQUEST_PROGRESS", undefined);
  }, [postToParent]);

  // Restore lifetime stats when SkillForge responds
  useEffect(() => {
    function handleRestore(e) {
      if (e.data?.type !== "RESTORE_PROGRESS") return;
      const d = e.data?.data;
      if (!d) return;
      setStats((prev) => ({
        gamesPlayed:      Number(d.gamesPlayed)      || prev.gamesPlayed,
        wordsSpelled:     Number(d.wordsSpelled)     || prev.wordsSpelled,
        wordsCorrect:     Number(d.wordsCorrect)     || prev.wordsCorrect,
        bestStreak:       Number(d.bestStreak)       || prev.bestStreak,
        bestAccuracy:     Number(d.bestAccuracy)     || prev.bestAccuracy,
        totalCoinsEarned: Number(d.totalCoinsEarned) || prev.totalCoinsEarned,
      }));
    }
    window.addEventListener("message", handleRestore);
    return () => window.removeEventListener("message", handleRestore);
  }, []);

  // Pre-load voices so they're ready when speak() is called
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 2500);
  };

  const speakBrowser = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = voicesRef.current;
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Samantha") ||
          v.name.includes("Zira") ||
          v.name.includes("Female") ||
          (v.name.includes("Google") && v.name.includes("US"))),
    );
    const anyEnglish = voices.find((v) => v.lang.startsWith("en"));
    if (preferred) u.voice = preferred;
    else if (anyEnglish) u.voice = anyEnglish;
    u.rate = 0.75;
    u.pitch = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  }, []);

  const speak = useCallback(
    (text, mode = 'word') => {
      if (!text) return Promise.resolve();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      return fetch(`/api/tts?text=${encodeURIComponent(text)}&mode=${mode}`)
        .then((res) => {
          if (!res.ok) throw new Error("TTS API error");
          return res.blob();
        })
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          currentAudioRef.current = audio;
          audio.onended = () => URL.revokeObjectURL(url);
          audio.onerror = () => URL.revokeObjectURL(url);
          return audio.play();
        })
        .catch(() => {
          speakBrowser(text);
        });
    },
    [speakBrowser],
  );

  const buildFallbackPool = useCallback((difficulty, count, posFilters, topicFilters) => {
    const hasFilters = posFilters.length > 0 || topicFilters.length > 0;
    let localPool = [...(FALLBACK_WORDS[difficulty] || [])];
    for (const t of Object.keys(TOPIC_WORDS)) {
      localPool.push(...(TOPIC_WORDS[t]?.[difficulty] || []));
    }
    if (hasFilters) {
      localPool = localPool.filter((w) => {
        if (posFilters.length > 0 && posFilters.includes(w.partOfSpeech)) return true;
        if (topicFilters.length > 0 && topicFilters.includes(w.topic || "general")) return true;
        return false;
      });
    }
    const seen = new Set();
    localPool = localPool.filter((w) => (seen.has(w.word) ? false : (seen.add(w.word), true)));
    let available = localPool.filter((w) => !usedWordsRef.current.has(w.word));
    if (available.length < count) {
      usedWordsRef.current.clear();
      available = localPool;
    }

    // When no filters are set, pick words round-robin across categories for variety
    if (!hasFilters && available.length >= count) {
      const byCategory = {};
      for (const w of available) {
        const key = w.topic && w.topic !== "general" ? w.topic : (w.partOfSpeech || "other");
        (byCategory[key] ??= []).push(w);
      }
      // Shuffle each category bucket
      for (const arr of Object.values(byCategory)) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      }
      const keys = Object.keys(byCategory);
      // Shuffle bucket order so the starting category is random
      for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      const picked = [];
      let ki = 0;
      while (picked.length < count) {
        const bucket = byCategory[keys[ki % keys.length]];
        if (bucket.length > 0) picked.push(bucket.shift());
        ki++;
        // Safety: if all buckets are exhausted, break
        if (ki - picked.length > keys.length) break;
      }
      if (picked.length >= count) {
        return picked.slice(0, count).map((w) => ({
          ...w,
          example: w.example || `Can you spell "${w.word}"?`,
        }));
      }
    }

    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count).map((w) => ({
      ...w,
      example: w.example || `Can you spell "${w.word}"?`,
    }));
  }, []);

  const formatApiWord = (w) => ({
    ...w,
    topic: w.topic || "general",
    example: w.example || `Can you spell "${w.word}"?`,
  });

  const fetchWords = async (difficulty, count, categories = []) => {
    const posFilters = categories.filter((c) => POS_IDS.includes(c));
    const topicFilters = categories.filter((c) => TOPIC_IDS.includes(c));
    const hasFilters = posFilters.length > 0 || topicFilters.length > 0;

    // 1. Try prefetched words first (already fetched from API)
    if (!hasFilters) {
      const prefetched = prefetchedRef.current[difficulty];
      if (prefetched.length >= count) {
        const words = prefetched.splice(0, count).map(formatApiWord);
        console.debug(`[SpellingBee] Served ${words.length} words from prefetch cache (${difficulty})`);
        prefetchWords(difficulty);
        return words;
      }
    }

    // 2. Try fetching fresh words from the API
    // Cancel any in-flight fetch to avoid stale responses
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    try {
      const params = new URLSearchParams({ difficulty, limit: String(count) });
      if (posFilters.length > 0) params.set("partOfSpeech", posFilters.join(","));

      const res = await fetch(`/api/words?${params}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();

      if (data.words && data.words.length > 0) {
        const apiWords = data.words.map(formatApiWord);
        console.debug(
          `[SpellingBee] Fetched ${apiWords.length}/${count} words from API (${difficulty}, source: ${data.source})`,
        );
        if (apiWords.length >= count) return apiWords;
        // Pad with fallback if API didn't return enough
        const usedWords = new Set(apiWords.map((w) => w.word));
        const padding = buildFallbackPool(difficulty, count - apiWords.length, posFilters, topicFilters)
          .filter((w) => !usedWords.has(w.word));
        console.debug(`[SpellingBee] Padded with ${padding.length} fallback words (${difficulty})`);
        return [...apiWords, ...padding];
      }

      console.debug(`[SpellingBee] API returned 0 words for ${difficulty}, using fallback`);
    } catch (err) {
      if (err.name === "AbortError") {
        console.debug("[SpellingBee] Fetch aborted (superseded by newer request)");
      } else {
        console.warn(`[SpellingBee] API fetch failed (${difficulty}):`, err.message);
      }
    } finally {
      if (fetchAbortRef.current === controller) fetchAbortRef.current = null;
    }

    // 3. Last resort: use local fallback words
    const fallback = buildFallbackPool(difficulty, count, posFilters, topicFilters);
    console.debug(`[SpellingBee] Using ${fallback.length} local fallback words (${difficulty})`);
    return fallback;
  };

  const prefetchWords = async (difficulty) => {
    // Skip if a prefetch for this difficulty is already in-flight
    if (prefetchInFlightRef.current[difficulty]) return;
    prefetchInFlightRef.current[difficulty] = true;

    try {
      const res = await fetch(`/api/words?difficulty=${difficulty}&limit=15`);
      if (!res.ok) {
        console.warn(`[SpellingBee] Prefetch failed for ${difficulty}: HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      if (data.words?.length > 0) {
        const existing = new Set(prefetchedRef.current[difficulty].map((w) => w.word));
        const fresh = data.words.filter((w) => !existing.has(w.word));
        prefetchedRef.current[difficulty].push(...fresh);
        console.debug(
          `[SpellingBee] Prefetched ${fresh.length} new words for ${difficulty} (pool: ${prefetchedRef.current[difficulty].length})`,
        );
      } else {
        console.debug(`[SpellingBee] Prefetch returned 0 words for ${difficulty}`);
      }
    } catch (err) {
      console.warn(`[SpellingBee] Prefetch error (${difficulty}):`, err.message);
    } finally {
      prefetchInFlightRef.current[difficulty] = false;
    }
  };

  useEffect(() => {
    if (screen !== "home" && screen !== "results") return;
    const difficulty = config.difficulty || "medium";
    if (prefetchedRef.current[difficulty].length < 10) {
      prefetchWords(difficulty);
    }
  }, [screen, config.difficulty]);

  // Update stats & report best score to parent app (SkillForge) when game ends
  const statsUpdatedRef = useRef(false);
  useEffect(() => {
    if (screen !== "results" || results.length === 0) return;
    if (statsUpdatedRef.current) return;
    statsUpdatedRef.current = true;

    const pct = Math.round((score / results.length) * 100);

    // Update lifetime stats and send to SkillForge
    setStats((prev) => {
      const updated = {
        gamesPlayed:      prev.gamesPlayed + 1,
        wordsSpelled:     prev.wordsSpelled + results.length,
        wordsCorrect:     prev.wordsCorrect + score,
        bestStreak:       Math.max(prev.bestStreak, maxStreak),
        bestAccuracy:     Math.max(prev.bestAccuracy, pct),
        totalCoinsEarned: prev.totalCoinsEarned + coinsEarned,
      };
      return updated;
    });

    // Send current-game score as best score (SkillForge only saves if higher)
    postToParent("BEST_SCORE", { bestScore: pct });

    // Send full stats for this game session + lifetime totals
    const newGamesPlayed = stats.gamesPlayed + 1;
    postToParent("GAME_STATS", {
      // current round
      score,
      totalWords:   results.length,
      accuracy:     pct,
      streak:       maxStreak,
      coinsEarned,
      difficulty:   config.difficulty,
      // lifetime (will be merged by SkillForge's saveGameStats)
      gamesPlayed:      newGamesPlayed,
      totalGames:       newGamesPlayed,   // alias read by SkillForge profile (Matches count)
      wordsSpelled:     (stats.wordsSpelled  + results.length),
      wordsCorrect:     (stats.wordsCorrect  + score),
      bestStreak:       Math.max(stats.bestStreak,    maxStreak),
      bestAccuracy:     Math.max(stats.bestAccuracy,  pct),
      totalCoinsEarned: (stats.totalCoinsEarned + coinsEarned),
    });
  }, [screen, score, results, maxStreak, coinsEarned, postToParent, config.difficulty, stats]);

  const startGame = (isDaily = false) => {
    if (isDaily) {
      launchRound(true);
      return;
    }
    setShowSettings(true);
    setScreen("game");
  };

  const launchRound = async (isDaily = false) => {
    setShowSettings(false);
    setIsLoading(true);
    setScreen("loading");
    const cfg = isDaily
      ? { difficulty: "medium", wordsPerRound: 5, timerSeconds: 20 }
      : config;
    const words = await fetchWords(cfg.difficulty, cfg.wordsPerRound, cfg.categories || []);
    words.forEach((w) => usedWordsRef.current.add(w.word));
    setWordList(words);
    setCurrentIdx(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setResults([]);
    setInputVal("");
    setMood("thinking");
    setHintLevel(0);
    setHintText("");
    setHintsUsed(0);
    setCoinsEarned(0);
    setFrozen(false);
    statsUpdatedRef.current = false;
    const boost = boosts.hint_boost > 0;
    const coinMagnet = boosts.double_coins > 0;
    setDoubleCoinsActive(coinMagnet);
    setTimeFreezeLeft(boosts.time_freeze);
    if (boost) setBoosts((b) => ({ ...b, hint_boost: b.hint_boost - 1 }));
    if (coinMagnet) setBoosts((b) => ({ ...b, double_coins: b.double_coins - 1 }));
    setTimeLeft(cfg.timerSeconds);
    setIsLoading(false);
    setWaitingToSpeak(true);
    setScreen("game");
    setTimeout(async () => {
      await speak(words[0]?.word || "");
      setWaitingToSpeak(false);
      inputRef.current?.focus();
    }, 400);
  };

  useEffect(() => {
    if (screen !== "game" || !currentWord || frozen || showSettings || waitingToSpeak) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [screen, currentIdx, frozen, showSettings, waitingToSpeak]);

  useEffect(() => {
    if (screen !== "game" || !currentWord?.word) return;
    const w = currentWord.word;
    if (lastLoggedWordRef.current === w) return;
    lastLoggedWordRef.current = w;

    fetch("/api/log-current-word", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: w,
        idx: currentIdx,
        partOfSpeech: currentWord.partOfSpeech || null,
        topic: currentWord.topic || null,
      }),
    }).catch(() => {});
  }, [screen, currentWord?.word, currentIdx]);

  const handleTimeout = useCallback(() => {
    clearInterval(timerRef.current);
    setMood("sad");
    setShake(true);
    setTimeout(() => setShake(false), 600);
    setFeedback({
      type: "wrong",
      msg: `Time's up! The word was "${currentWord?.word}"`,
    });
    setStreak(0);
    setResults((r) => [
      ...r,
      {
        word: currentWord?.word,
        correct: false,
        userInput: "(timeout)",
        partOfSpeech: currentWord?.partOfSpeech,
        topic: currentWord?.topic,
      },
    ]);
    setTimeout(() => advanceWord(), 2000);
  }, [currentWord]);

  const advanceWord = useCallback(() => {
    setFeedback(null);
    setHintLevel(0);
    setHintText("");
    setInputVal("");
    setCurrentIdx((i) => {
      const next = i + 1;
      if (next >= wordList.length) {
        setScreen("results");
        setMood("celebrating");
        return i;
      }
      setMood("thinking");
      setTimeLeft(config.timerSeconds);
      setWaitingToSpeak(true);
      setTimeout(async () => {
        await speak(wordList[next]?.word || "");
        setWaitingToSpeak(false);
        inputRef.current?.focus();
      }, 300);
      return next;
    });
  }, [wordList, config.timerSeconds, speak]);

  const handleSubmit = useCallback(() => {
    if (!currentWord) return;
    clearInterval(timerRef.current);
    const correct = inputVal.trim().toLowerCase() === currentWord.word.toLowerCase();
    const fast = timeLeft >= config.timerSeconds - 5;
    const newStreak = correct ? streak + 1 : 0;
    const baseCoins = AGE_CONFIG[config.ageGroup]?.coinsPerCorrect || 15;
    let earned = 0;
    if (correct) {
      earned = baseCoins;
      if (fast) earned += 10;
      if (newStreak >= 3) earned += 5;
      if (doubleCoinsActive) earned *= 2;
      setCoins((c) => c + earned);
      setTotalCoins((c) => c + earned);
      setCoinsEarned((c) => c + earned);
      setScore((s) => s + 1);
      setMood(newStreak >= 5 ? "excited" : "happy");
      setShowCoinBurst(true);
      setTimeout(() => setShowCoinBurst(false), 1000);
      const msgs = fast
        ? [
            `🏆 ${earned} Golden Nectar coins! Lightning fast!`,
            `⚡ Speed bonus! +${earned} coins!`,
          ]
        : [
            `✅ Correct! +${earned} coins`,
            newStreak >= 3 ? `🔥 ${newStreak} streak!` : null,
          ];
      setFeedback({ type: "correct", msg: msgs.filter(Boolean)[0] });
    } else {
      setMood("sad");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setFeedback({
        type: "wrong",
        msg: `❌ The correct spelling is "${currentWord.word}"`,
      });
    }
    setStreak(newStreak);
    setMaxStreak((m) => Math.max(m, newStreak));
    setResults((r) => [
      ...r,
      {
        word: currentWord.word,
        correct,
        userInput: inputVal.trim(),
        partOfSpeech: currentWord.partOfSpeech,
        topic: currentWord.topic,
      },
    ]);
    setTimeout(() => advanceWord(), 2000);
  }, [currentWord, inputVal, timeLeft, config, streak, doubleCoinsActive, advanceWord]);

  const buyHint = () => {
    const costs = [0, 5, 10, 15, 20];
    const nextLevel = hintLevel + 1;
    if (nextLevel > 4) return;
    const cost = boosts.hint_boost > 0 ? 0 : costs[nextLevel];
    if (coins < cost) {
      showNotification("Not enough coins!", "danger");
      return;
    }
    setCoins((c) => c - cost);
    setHintsUsed((h) => h + 1);
    setHintLevel(nextLevel);
    let text = "";
    if (nextLevel === 1) text = `Part of speech: ${currentWord?.partOfSpeech}`;
    else if (nextLevel === 2) {
      text = currentWord?.definition;
      speak(currentWord?.definition, 'definition');
    } else if (nextLevel === 3) {
      text = `"${currentWord?.example}"`;
      speak(currentWord?.example, 'example');
    } else if (nextLevel === 4) {
      const w = currentWord?.word || "";
      text = `Starts with "${w[0]?.toUpperCase()}" and ends with "${w[w.length - 1]?.toUpperCase()}"`;
    }
    setHintText(text);
  };

  const useTimeFreeze = () => {
    if (timeFreezeLeft <= 0) return;
    setFrozen(true);
    setTimeFreezeLeft((t) => t - 1);
    clearInterval(timerRef.current);
    showNotification("❄️ Time frozen for 5 seconds!", "info");
    setTimeout(() => {
      setFrozen(false);
    }, 5000);
  };

  const buyItem = (item) => {
    if (owned.includes(item.id)) {
      showNotification("Already owned!", "info");
      return;
    }
    if (coins < item.price) {
      showNotification("Not enough coins! 🪙", "danger");
      return;
    }
    setCoins((c) => c - item.price);
    setOwned((o) => [...o, item.id]);
    if (item.category === "theme") setActiveTheme(item.id);
    if (item.category === "cosmetic") setActiveAccessories((a) => [...a, item.id]);
    if (item.id === "hint_boost") setBoosts((b) => ({ ...b, hint_boost: b.hint_boost + 5 }));
    if (item.id === "time_freeze") setBoosts((b) => ({ ...b, time_freeze: b.time_freeze + 3 }));
    if (item.id === "double_coins") setBoosts((b) => ({ ...b, double_coins: b.double_coins + 1 }));
    showNotification(`Got ${item.name}! ${item.emoji}`, "success");
  };

  const equipItem = (item) => {
    if (!owned.includes(item.id)) return;
    if (item.category === "theme")
      setActiveTheme((a) => (a === item.id ? "default" : item.id));
    if (item.category === "cosmetic")
      setActiveAccessories((a) =>
        a.includes(item.id) ? a.filter((x) => x !== item.id) : [...a, item.id],
      );
  };

  const getDailyWords = () => {
    const today = new Date().toDateString();
    const seed =
      today.split("").reduce((a, c) => a + c.charCodeAt(0), 0) %
      FALLBACK_WORDS.medium.length;
    return [...FALLBACK_WORDS.medium, ...FALLBACK_WORDS.hard].slice(seed, seed + 5);
  };

  // --- Loading screen ---
  if (screen === "loading")
    return (
      <div style={{ ...styles.app, justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80, animation: "spin 1s linear infinite" }}>🐝</div>
          <p style={{ color: "#92400e", fontWeight: 700, fontSize: 20 }}>
            Gathering words from the hive…
          </p>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );

  // --- Home screen ---
  if (screen === "home")
    return (
      <HomeScreen
        styles={styles}
        theme={theme}
        activeAccessories={activeAccessories}
        coins={coins}
        doubleCoinsActive={doubleCoinsActive}
        showCoinBurst={showCoinBurst}
        notification={notification}
        dailyScore={dailyScore}
        boosts={boosts}
        timeFreezeLeft={timeFreezeLeft}
        stats={stats}
        onStartGame={startGame}
        onDaily={() => setScreen("daily")}
        onShop={() => setScreen("shop")}
        onStats={() => setScreen("stats")}
      />
    );

  // --- Config screen ---
  if (screen === "config")
    return (
      <ConfigScreen
        styles={styles}
        theme={theme}
        config={config}
        setConfig={setConfig}
        onBack={() => setScreen("home")}
      />
    );

  // --- Daily challenge screen ---
  if (screen === "daily")
    return (
      <DailyScreen
        styles={styles}
        dailyWords={getDailyWords()}
        dailyCompleted={dailyCompleted}
        dailyScore={dailyScore}
        onBack={() => setScreen("home")}
        onStart={() => {
          const daily = getDailyWords();
          setWordList(daily);
          setCurrentIdx(0);
          setScore(0);
          setStreak(0);
          setMaxStreak(0);
          setResults([]);
          setInputVal("");
          setMood("thinking");
          setHintLevel(0);
          setHintText("");
          setTimeLeft(20);
          setWaitingToSpeak(true);
          setScreen("game");
          setTimeout(async () => {
            await speak(daily[0]?.word || "");
            setWaitingToSpeak(false);
            inputRef.current?.focus();
          }, 400);
        }}
      />
    );

  // --- Stats screen ---
  if (screen === "stats")
    return (
      <StatsScreen
        styles={styles}
        theme={theme}
        stats={stats}
        coins={coins}
        totalCoins={totalCoins}
        onBack={() => setScreen("home")}
      />
    );

  // --- Shop screen ---
  if (screen === "shop")
    return (
      <ShopScreen
        styles={styles}
        theme={theme}
        coins={coins}
        owned={owned}
        activeTheme={activeTheme}
        activeAccessories={activeAccessories}
        notification={notification}
        shopTab={shopTab}
        setShopTab={setShopTab}
        onBack={() => setScreen("home")}
        onBuy={buyItem}
        onEquip={equipItem}
      />
    );

  // --- Game screen ---
  if (screen === "game")
    return (
      <GameScreen
        styles={styles}
        theme={theme}
        config={config}
        setConfig={setConfig}
        coins={coins}
        activeAccessories={activeAccessories}
        mood={mood}
        streak={streak}
        maxStreak={maxStreak}
        score={score}
        doubleCoinsActive={doubleCoinsActive}
        showCoinBurst={showCoinBurst}
        notification={notification}
        currentWord={currentWord}
        currentIdx={currentIdx}
        wordList={wordList}
        inputVal={inputVal}
        setInputVal={setInputVal}
        inputRef={inputRef}
        timeLeft={timeLeft}
        frozen={frozen}
        feedback={feedback}
        shake={shake}
        hintLevel={hintLevel}
        hintText={hintText}
        boosts={boosts}
        timeFreezeLeft={timeFreezeLeft}
        showSettings={showSettings}
        results={results}
        timerRef={timerRef}
        onSubmit={handleSubmit}
        onSpeak={speak}
        onBuyHint={buyHint}
        onTimeFreeze={useTimeFreeze}
        onQuit={() => {
          clearInterval(timerRef.current);
          if (results.length > 0) {
            setScreen("results");
          } else {
            setScreen("home");
          }
        }}
        onShowSettings={() => setShowSettings(true)}
        onHideSettings={() => setShowSettings(false)}
        onLaunchRound={launchRound}
      />
    );

  // --- Results screen ---
  if (screen === "results")
    return (
      <ResultsScreen
        styles={styles}
        theme={theme}
        activeAccessories={activeAccessories}
        score={score}
        results={results}
        maxStreak={maxStreak}
        coinsEarned={coinsEarned}
        wordList={wordList}
        dailyCompleted={dailyCompleted}
        dailyScore={dailyScore}
        getDailyWords={getDailyWords}
        setDailyCompleted={setDailyCompleted}
        setDailyScore={setDailyScore}
        onReplay={() => launchRound(false)}
        onSettings={() => startGame(false)}
        onHome={() => setScreen("home")}
      />
    );

  return (
    <div style={styles.app}>
      <div style={styles.card}>
        <p>Loading…</p>
      </div>
    </div>
  );
}
