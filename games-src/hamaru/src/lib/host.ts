/**
 * SkillForge host bridge.
 *
 * Hamaru runs inside an origin-checked iframe on SkillForge. We report progress
 * to the host via postMessage; the host (PlayGameClient) persists it to
 * Firestore (users/{uid}/scores|gameStats/hamaru) and can replay it back.
 *
 * All calls are guarded so the game still works standalone (no parent frame).
 */

type ProgressData = Record<string, unknown>;

function postToParent(event: string, data: unknown) {
  if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'GAME_EVENT', event, data }, '*');
  }
}

/** Ask the host to replay any cloud-saved progress (host replies RESTORE_PROGRESS). */
export function requestProgress() {
  postToParent('REQUEST_PROGRESS', undefined);
}

/** Report the player's best (cumulative) score — host keeps the higher value. */
export function reportBestScore(bestScore: number) {
  postToParent('BEST_SCORE', { bestScore });
}

/** Report a stats object for the leaderboard and progress restore. */
export function reportStats(stats: ProgressData) {
  postToParent('GAME_STATS', stats);
}

/** Subscribe to the host's RESTORE_PROGRESS reply. Returns an unsubscribe fn. */
export function onRestoreProgress(cb: (data: ProgressData) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: MessageEvent) => {
    const msg = event.data;
    if (msg && typeof msg === 'object' && msg.type === 'RESTORE_PROGRESS' && msg.data) {
      cb(msg.data as ProgressData);
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
