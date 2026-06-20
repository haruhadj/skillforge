/**
 * SkillForge host bridge.
 *
 * The game runs inside an origin-checked iframe. The host (`PlayGameClient`)
 * sends PLAYER_INFO and listens for GAME_EVENT messages. We use the standard
 * contract plus one game-specific event:
 *   - BEST_SCORE   -> platform best score + leaderboard (points-based)
 *   - GAME_STATS   -> profile "matches" counter
 *   - TRIVIA_PLAY  -> per-quiz analytics record (host POSTs to the plays API)
 *
 * Community analytics are read back over same-origin HTTP from
 * `/api/games/philippine-trivia/plays`. When the game is opened outside
 * SkillForge (e.g. standalone `vite dev`) every call degrades gracefully.
 */

export const GAME_ID = "philippine-trivia";

export interface PlayerInfo {
  name: string;
  uid: string | null;
  email: string | null;
}

export interface QuizAnalytics {
  quizId: string;
  plays: number;
  totalQuestions: number;
  avgScore: number;
  awards: number;
  topPercent: number | null;
  dist: Record<string, number>;
  recent: { name: string; score: number; total: number; at: number }[];
}

let currentPlayer: PlayerInfo = { name: "Player", uid: null, email: null };
const playerListeners = new Set<(p: PlayerInfo) => void>();
let initialized = false;

function isEmbedded(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

function post(message: unknown): void {
  if (isEmbedded()) window.parent.postMessage(message, "*");
}

export function initBridge(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("message", (e: MessageEvent) => {
    const msg = e.data;
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "PLAYER_INFO" && msg.data) {
      currentPlayer = {
        name: msg.data.name || "Player",
        uid: msg.data.uid ?? null,
        email: msg.data.email ?? null,
      };
      playerListeners.forEach((cb) => cb(currentPlayer));
    }
  });

  // Nudge the host to (re)send identity now that we're listening.
  post({ type: "REQUEST_PLAYER_INFO" });
}

export function getPlayer(): PlayerInfo {
  return currentPlayer;
}

export function onPlayerChange(cb: (p: PlayerInfo) => void): () => void {
  playerListeners.add(cb);
  return () => {
    playerListeners.delete(cb);
  };
}

/**
 * Report a finished quiz to the host.
 * @param points game's internal points score (drives the platform leaderboard)
 * @param score  correct answers (drives the analytics distribution)
 * @param total  quiz length
 */
export function reportResult(args: {
  quizId: string;
  score: number;
  total: number;
  points: number;
}): void {
  const { quizId, score, total, points } = args;

  post({ type: "GAME_EVENT", event: "BEST_SCORE", data: { bestScore: points } });

  const totalGames =
    Number(localStorage.getItem(`${GAME_ID}-total-games`) || "0") + 1;
  localStorage.setItem(`${GAME_ID}-total-games`, String(totalGames));
  post({
    type: "GAME_EVENT",
    event: "GAME_STATS",
    data: { totalGames, lastScore: points, mode: "singleplayer" },
  });

  post({ type: "GAME_EVENT", event: "TRIVIA_PLAY", data: { quizId, score, total } });
}

/** Fetch community analytics for every quiz. Returns {} when unavailable. */
export async function fetchAllAnalytics(): Promise<Record<string, QuizAnalytics>> {
  try {
    const res = await fetch(`/api/games/${GAME_ID}/plays`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return {};
    const json = (await res.json()) as { quizzes?: QuizAnalytics[] };
    const map: Record<string, QuizAnalytics> = {};
    for (const q of json.quizzes || []) map[q.quizId] = q;
    return map;
  } catch {
    return {};
  }
}
