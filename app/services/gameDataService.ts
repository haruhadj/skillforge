import { db } from '@/app/lib/firebase'
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { ScoreData, GlobalLeaderboardEntry, RecentActivityItem, GlobalActivityItem } from '@/app/types'
import {
  calculateTier,
  computeCompositeScore,
} from '@/app/services/scoring'

// Pure scoring/ranking math lives in `scoring.ts` (no Firebase dependency) so it can
// be shared with server routes. Re-exported here for existing importers.
export { buildWeightedModeStats } from '@/app/services/scoring'

export async function saveBestScore(uid: string, gameId: string, bestScore: number): Promise<void> {
  const ref = doc(db, 'users', uid, 'scores', gameId)
  const snap = await getDoc(ref)
  const currentBestScore = snap.exists() ? Number(snap.data().bestScore) : null

  if (currentBestScore != null && !Number.isNaN(currentBestScore) && bestScore <= currentBestScore) {
    return
  }

  await setDoc(ref, {
    bestScore,
    updatedAt: serverTimestamp(),
    bestScoreAchievedAt: serverTimestamp(),
  }, { merge: true })
}

function convertTimestampToDate(value: unknown): Date | undefined {
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate()
  }
  return undefined
}

function normalizeScoreData(data: DocumentData): ScoreData {
  return {
    bestScore: Number(data.bestScore) || 0,
    updatedAt: convertTimestampToDate(data.updatedAt) ?? new Date(),
    bestScoreAchievedAt: convertTimestampToDate(data.bestScoreAchievedAt),
  }
}

export async function getAllScores(uid: string): Promise<Record<string, ScoreData>> {
  const ref = collection(db, 'users', uid, 'scores')
  const snapshot = await getDocs(ref)
  const scores: Record<string, ScoreData> = {}
  snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    scores[docSnap.id] = normalizeScoreData(docSnap.data())
  })
  return scores
}

// Live, uncached, single-doc read of the caller's own best score for one game. Used to
// patch a just-submitted score into a leaderboard view that was served from the
// server-side cache (`/api/leaderboard`, up to CACHE_TTL_MS stale) before that cache
// naturally refreshes — the owner can always read their own scores doc directly.
export async function getOwnScore(uid: string, gameId: string): Promise<ScoreData | null> {
  const ref = doc(db, 'users', uid, 'scores', gameId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return normalizeScoreData(snap.data())
}

// S2-b: gameStats is now server-authoritative. The weighted leaderboard stats are
// written by /api/games/score (Admin SDK), and the per-game resume blob by
// /api/games/progress (Admin SDK). The Firestore rules deny client writes to gameStats,
// so the former client-SDK writers (saveGameStats / getGameStats / saveModeScoreStats)
// were removed. Reads below stay client-side.

export async function getAllGameStats(uid: string): Promise<Record<string, Record<string, unknown>>> {
  const ref = collection(db, 'users', uid, 'gameStats')
  const snapshot = await getDocs(ref)
  const stats: Record<string, Record<string, unknown>> = {}
  snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    stats[docSnap.id] = docSnap.data()
  })
  return stats
}

// NOTE: Global/per-game leaderboards and game popularity are computed server-side
// and cached by `app/api/leaderboard/route.ts` (Admin SDK) to avoid every visitor
// running full collectionGroup scans in the browser. The client-SDK versions that
// used to live here were removed when those pages switched to that route.

// Calculate global stats for a single user (for profile page)
export async function getUserGlobalStats(
  uid: string,
  userScores: Record<string, { bestScore: number }>,
  userGameStats: Record<string, { totalMatchCount?: number }>
): Promise<GlobalLeaderboardEntry | null> {
  const gameIds = Object.keys(userScores)
  if (gameIds.length === 0) return null

  // Fetch all scores to get per-game max for normalization
  const allScoresSnap = await getDocs(collectionGroup(db, 'scores'))
  const maxScoresByGame: Record<string, number> = {}

  allScoresSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const gameId = docSnap.id
    const bestScore = Number(docSnap.data().bestScore) || 0
    if (!maxScoresByGame[gameId] || bestScore > maxScoresByGame[gameId]) {
      maxScoresByGame[gameId] = bestScore
    }
  })

  // Calculate normalized scores
  let normalizedSum = 0
  gameIds.forEach((gameId) => {
    const maxScore = maxScoresByGame[gameId] || 1
    const userScore = userScores[gameId]?.bestScore || 0
    const normalized = (userScore / maxScore) * 100
    normalizedSum += normalized
  })

  const gamesPlayed = gameIds.length
  const avgNormalizedScore = normalizedSum / gamesPlayed

  // Calculate total matches
  let totalMatchCount = 0
  Object.values(userGameStats).forEach((stats) => {
    totalMatchCount += stats?.totalMatchCount || 0
  })

  const compositeScore = computeCompositeScore({
    avgNormalizedScore,
    gamesPlayed,
    totalMatchCount,
  })

  return {
    uid,
    totalMatchCount,
    compositeScore: Math.round(compositeScore * 10) / 10,
    gamesPlayed,
    avgNormalizedScore: Math.round(avgNormalizedScore * 10) / 10,
    tier: calculateTier(compositeScore)
  }
}

export async function getRecentActivity(
  uid: string,
  limitCount = 20
): Promise<RecentActivityItem[]> {
  const ref = collection(db, 'users', uid, 'gameStats')
  const q = query(ref, orderBy('updatedAt', 'desc'), limit(limitCount))
  const snapshot = await getDocs(q)
  const items: RecentActivityItem[] = []
  snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const data = docSnap.data()
    const updatedAt = convertTimestampToDate(data.updatedAt)
    if (!updatedAt) return
    items.push({
      gameId: docSnap.id,
      lastMode: (data.lastMode as 'singleplayer' | 'multiplayer') ?? null,
      lastScore: typeof data.lastScore === 'number' ? data.lastScore : null,
      updatedAt,
    })
  })
  return items
}

// Live, uncached, single-doc read of the caller's own most recent activity for one
// game — the per-game counterpart to `getRecentActivity`. Used to patch a just-finished
// play into a Recent Activity panel served from `/api/activity`'s cache.
export async function getOwnRecentActivityForGame(
  uid: string,
  gameId: string
): Promise<RecentActivityItem | null> {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const data = snap.data()
  const updatedAt = convertTimestampToDate(data.updatedAt)
  if (!updatedAt) return null
  return {
    gameId,
    lastMode: (data.lastMode as 'singleplayer' | 'multiplayer') ?? null,
    lastScore: typeof data.lastScore === 'number' ? data.lastScore : null,
    updatedAt,
  }
}

/**
 * Global recent activity from the cached, public server route.
 *
 * Was a client-side `collectionGroup('gameStats') orderBy(updatedAt) limit 50` scan that
 * read every gameStats doc to sort; now a single cached read. (audit R17 — activity caching)
 * `limitCount` is accepted for API compatibility; the route serves a fixed-size feed.
 */
export async function getGlobalRecentActivity(
  limitCount = 50
): Promise<Array<RecentActivityItem & { userId: string }>> {
  const res = await fetch('/api/activity')
  if (!res.ok) throw new Error('Failed to load activity')
  const data = await res.json()
  const items: Array<RecentActivityItem & { userId: string; updatedAt: string }> = data.items ?? []
  return items.slice(0, limitCount).map((item) => ({
    userId: item.userId,
    gameId: item.gameId,
    lastMode: item.lastMode,
    lastScore: item.lastScore,
    updatedAt: new Date(item.updatedAt),
  }))
}

// Pure merge helpers live in `scoring.ts` (no Firebase dependency) so they stay
// unit-testable the same way the ranking math is. Re-exported here so pages can import
// everything they need for the optimistic-update pattern from this one service module.
export { mergeOwnLeaderboardRow, mergeOwnActivity } from '@/app/services/scoring'
