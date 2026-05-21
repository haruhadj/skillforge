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
} from 'firebase/firestore'
import { GameStats, ScoreData, LeaderboardEntry, GlobalLeaderboardEntry } from '@/app/types'

const SUPPORTED_MODES = ['singleplayer', 'multiplayer'] as const
type GameMode = typeof SUPPORTED_MODES[number]

function roundToTwo(value: number): number {
  return Number(value.toFixed(2))
}

interface ModeStats {
  matchCount: number
  totalScore: number
  averageScore: number
}

function normalizeModeStats(stats: Partial<ModeStats> = {}): ModeStats {
  const matchCount = Number(stats.matchCount) || 0
  const totalScore = Number(stats.totalScore) || 0
  const averageScore = matchCount > 0 ? totalScore / matchCount : 0

  return {
    matchCount,
    totalScore,
    averageScore,
  }
}

export function buildWeightedModeStats(
  existingStats: Partial<GameStats> | null,
  mode: GameMode,
  score: number
): GameStats {
  if (!SUPPORTED_MODES.includes(mode)) {
    throw new Error('Unsupported game mode for stats aggregation')
  }

  const nextScore = Number(score)
  if (Number.isNaN(nextScore)) {
    throw new Error('Score must be a valid number')
  }

  const current = existingStats || {}
  const singleplayer = normalizeModeStats(current.singleplayer)
  const multiplayer = normalizeModeStats(current.multiplayer)

  const target = mode === 'singleplayer' ? singleplayer : multiplayer
  target.matchCount += 1
  target.totalScore += nextScore
  target.averageScore = target.totalScore / target.matchCount

  const totalMatchCount = singleplayer.matchCount + multiplayer.matchCount
  const combinedTotalScore = singleplayer.totalScore + multiplayer.totalScore
  const combinedAverageScore = totalMatchCount > 0
    ? combinedTotalScore / totalMatchCount
    : null

  return {
    singleplayer: {
      matchCount: singleplayer.matchCount,
      totalScore: roundToTwo(singleplayer.totalScore),
      averageScore: roundToTwo(singleplayer.averageScore),
    },
    multiplayer: {
      matchCount: multiplayer.matchCount,
      totalScore: roundToTwo(multiplayer.totalScore),
      averageScore: roundToTwo(multiplayer.averageScore),
    },
    totalMatchCount,
    combinedAverageScore: combinedAverageScore == null ? null : roundToTwo(combinedAverageScore),
    lastMode: mode,
    lastScore: roundToTwo(nextScore),
    accuracyPercentage: mode === 'singleplayer'
      ? roundToTwo(singleplayer.averageScore)
      : (current.accuracyPercentage ?? roundToTwo(singleplayer.averageScore)),
  }
}

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
    updatedAt: convertTimestampToDate(data.updatedAt),
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

export async function saveGameStats(uid: string, gameId: string, stats: Record<string, unknown>): Promise<void> {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  await setDoc(ref, {
    ...stats,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getGameStats(uid: string, gameId: string): Promise<Record<string, unknown> | null> {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function getAllGameStats(uid: string): Promise<Record<string, Record<string, unknown>>> {
  const ref = collection(db, 'users', uid, 'gameStats')
  const snapshot = await getDocs(ref)
  const stats: Record<string, Record<string, unknown>> = {}
  snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    stats[docSnap.id] = docSnap.data()
  })
  return stats
}

export async function saveModeScoreStats(
  uid: string,
  gameId: string,
  mode: GameMode,
  score: number
): Promise<GameStats> {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  const snap = await getDoc(ref)
  const existingStats = snap.exists() ? (snap.data() as Partial<GameStats>) : null
  const mergedStats = buildWeightedModeStats(existingStats, mode, score)

  await setDoc(ref, {
    ...mergedStats,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  return mergedStats
}

export async function getGameLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(collectionGroup(db, 'scores'))
  const rows: LeaderboardEntry[] = []
  snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    if (docSnap.id !== gameId) return
    const pathParts = docSnap.ref.path.split('/')
    const uid = pathParts[1]
    const data = docSnap.data()
    if (data.bestScore != null) {
      rows.push({ uid, bestScore: data.bestScore, updatedAt: data.updatedAt })
    }
  })
  rows.sort((a, b) => b.bestScore - a.bestScore)
  return rows
}

function calculateTier(compositeScore: number): GlobalLeaderboardEntry['tier'] {
  if (compositeScore >= 80) return 'master'
  if (compositeScore >= 60) return 'platinum'
  if (compositeScore >= 40) return 'gold'
  if (compositeScore >= 20) return 'silver'
  return 'bronze'
}

export async function getGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  // Fetch all user scores and stats in parallel
  const [scoresSnap, statsSnap] = await Promise.all([
    getDocs(collectionGroup(db, 'scores')),
    getDocs(collectionGroup(db, 'gameStats'))
  ])

  // Build per-game max scores for normalization (0-100 scale)
  const maxScoresByGame: Record<string, number> = {}
  const userScoresByGame: Record<string, Record<string, number>> = {}

  scoresSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const gameId = docSnap.id
    const pathParts = docSnap.ref.path.split('/')
    const uid = pathParts[1]
    const bestScore = Number(docSnap.data().bestScore) || 0

    if (!userScoresByGame[uid]) userScoresByGame[uid] = {}
    userScoresByGame[uid][gameId] = bestScore

    if (!maxScoresByGame[gameId] || bestScore > maxScoresByGame[gameId]) {
      maxScoresByGame[gameId] = bestScore
    }
  })

  // Build user stats (total matches per game)
  const userStats: Record<string, { totalMatchCount: number; gamesPlayed: number; gameIds: string[] }> = {}
  statsSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const pathParts = docSnap.ref.path.split('/')
    const uid = pathParts[1]
    const gameId = pathParts[3]
    const data = docSnap.data()
    const count = Number(data.totalMatchCount) || 0

    if (!userStats[uid]) {
      userStats[uid] = { totalMatchCount: 0, gamesPlayed: 0, gameIds: [] }
    }
    userStats[uid].totalMatchCount += count
    userStats[uid].gamesPlayed += 1
    userStats[uid].gameIds.push(gameId)
  })

  // Calculate composite scores
  const entries: GlobalLeaderboardEntry[] = Object.entries(userStats).map(([uid, stats]) => {
    const scores = userScoresByGame[uid] || {}
    const gamesWithScores = Object.keys(scores)

    // Calculate normalized scores (0-100 per game)
    let normalizedSum = 0
    gamesWithScores.forEach((gameId) => {
      const maxScore = maxScoresByGame[gameId] || 1
      const normalized = (scores[gameId] / maxScore) * 100
      normalizedSum += normalized
    })

    const gamesPlayed = gamesWithScores.length
    const avgNormalizedScore = gamesPlayed > 0 ? normalizedSum / gamesPlayed : 0

    // Composite score formula:
    // - 70% weighted on average normalized skill (0-100)
    // - 20% bonus for game diversity (more games = higher score)
    // - 10% weighted on total matches played (experience factor)
    // Max diversity bonus: 20 points at 5+ games
    const diversityBonus = Math.min(gamesPlayed * 4, 20)

    // Experience factor: logarithmic scale to prevent grinding from dominating
    // sqrt prevents massive advantage from just playing more
    const experienceFactor = Math.min(Math.sqrt(stats.totalMatchCount) * 2, 10)

    const compositeScore = Math.min(
      (avgNormalizedScore * 0.7) + diversityBonus + experienceFactor,
      100
    )

    return {
      uid,
      totalMatchCount: stats.totalMatchCount,
      compositeScore: Math.round(compositeScore * 10) / 10,
      gamesPlayed,
      avgNormalizedScore: Math.round(avgNormalizedScore * 10) / 10,
      tier: calculateTier(compositeScore)
    }
  })

  // Sort by composite score descending
  return entries.sort((a, b) => b.compositeScore - a.compositeScore)
}

export async function getGamePopularity(): Promise<Record<string, number>> {
  const snap = await getDocs(collectionGroup(db, 'gameStats'))
  const byGameId: Record<string, number> = {}
  snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const pathParts = docSnap.ref.path.split('/')
    const gameId = pathParts[3]
    const data = docSnap.data()
    const count = Number(data.totalMatchCount) || 0
    if (!byGameId[gameId]) byGameId[gameId] = 0
    byGameId[gameId] += count
  })
  return byGameId
}

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

  // Composite formula
  const diversityBonus = Math.min(gamesPlayed * 4, 20)
  const experienceFactor = Math.min(Math.sqrt(totalMatchCount) * 2, 10)
  const compositeScore = Math.min(
    (avgNormalizedScore * 0.7) + diversityBonus + experienceFactor,
    100
  )

  return {
    uid,
    totalMatchCount,
    compositeScore: Math.round(compositeScore * 10) / 10,
    gamesPlayed,
    avgNormalizedScore: Math.round(avgNormalizedScore * 10) / 10,
    tier: calculateTier(compositeScore)
  }
}
