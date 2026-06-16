import { GameStats, GlobalLeaderboardEntry } from '@/app/types'

/**
 * Pure scoring + ranking math for SkillForge.
 *
 * This module deliberately has NO Firebase (or other I/O) dependency so it can be
 * shared by the client service (`gameDataService`, client SDK) and server routes
 * (`/api/games/score`, `/api/leaderboard`, Admin SDK) without pulling the Firebase
 * client into a server context. It is also trivially unit-testable.
 */

export const SUPPORTED_MODES = ['singleplayer', 'multiplayer'] as const
export type GameMode = typeof SUPPORTED_MODES[number]

export function roundToTwo(value: number): number {
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

export function calculateTier(compositeScore: number): GlobalLeaderboardEntry['tier'] {
  if (compositeScore >= 80) return 'master'
  if (compositeScore >= 60) return 'platinum'
  if (compositeScore >= 40) return 'gold'
  if (compositeScore >= 20) return 'silver'
  return 'bronze'
}

/**
 * Composite ranking score (0–100), single-sourced so the global leaderboard and a
 * single user's profile stats stay in sync.
 * - 70% weighted on average normalized skill (0–100, per-game max-normalized)
 * - up to +20 diversity bonus (more distinct games played)
 * - up to +10 experience factor (sqrt of total matches, to blunt grinding)
 */
export function computeCompositeScore(params: {
  avgNormalizedScore: number
  gamesPlayed: number
  totalMatchCount: number
}): number {
  const { avgNormalizedScore, gamesPlayed, totalMatchCount } = params
  const diversityBonus = Math.min(gamesPlayed * 4, 20)
  const experienceFactor = Math.min(Math.sqrt(totalMatchCount) * 2, 10)
  return Math.min((avgNormalizedScore * 0.7) + diversityBonus + experienceFactor, 100)
}

/**
 * Plain (Firestore-free) row shapes that leaderboard aggregation operates on.
 * The server route maps Firestore snapshots into these so the ranking logic below
 * stays pure and unit-testable without any database.
 */
export interface ScoreRow {
  uid: string
  gameId: string
  bestScore: number
  updatedAt?: number | null
}

export interface StatsRow {
  uid: string
  gameId: string
  totalMatchCount: number
}

export interface GameScoreRow {
  uid: string
  bestScore: number
  updatedAt: number | null
}

/**
 * Global leaderboard: normalize each game's scores to 0–100 against that game's max,
 * average per user, then apply the composite formula and tier. Sorted high→low.
 */
export function aggregateGlobalLeaderboard(
  scoreRows: ScoreRow[],
  statsRows: StatsRow[],
): GlobalLeaderboardEntry[] {
  const maxScoresByGame: Record<string, number> = {}
  const userScoresByGame: Record<string, Record<string, number>> = {}

  for (const { uid, gameId, bestScore } of scoreRows) {
    const score = Number(bestScore) || 0
    if (!userScoresByGame[uid]) userScoresByGame[uid] = {}
    userScoresByGame[uid][gameId] = score
    if (!maxScoresByGame[gameId] || score > maxScoresByGame[gameId]) {
      maxScoresByGame[gameId] = score
    }
  }

  const userTotalMatches: Record<string, number> = {}
  for (const { uid, totalMatchCount } of statsRows) {
    userTotalMatches[uid] = (userTotalMatches[uid] || 0) + (Number(totalMatchCount) || 0)
  }

  const entries: GlobalLeaderboardEntry[] = Object.entries(userTotalMatches).map(
    ([uid, totalMatchCount]) => {
      const scores = userScoresByGame[uid] || {}
      const gamesWithScores = Object.keys(scores)

      let normalizedSum = 0
      for (const gameId of gamesWithScores) {
        const maxScore = maxScoresByGame[gameId] || 1
        normalizedSum += (scores[gameId] / maxScore) * 100
      }

      const gamesPlayed = gamesWithScores.length
      const avgNormalizedScore = gamesPlayed > 0 ? normalizedSum / gamesPlayed : 0
      const compositeScore = computeCompositeScore({ avgNormalizedScore, gamesPlayed, totalMatchCount })

      return {
        uid,
        totalMatchCount,
        compositeScore: Math.round(compositeScore * 10) / 10,
        gamesPlayed,
        avgNormalizedScore: Math.round(avgNormalizedScore * 10) / 10,
        tier: calculateTier(compositeScore),
      }
    },
  )

  return entries.sort((a, b) => b.compositeScore - a.compositeScore)
}

/** Per-game leaderboard: best score per user for one game, sorted high→low. */
export function aggregateGameLeaderboard(scoreRows: ScoreRow[], gameId: string): GameScoreRow[] {
  return scoreRows
    .filter((r) => r.gameId === gameId)
    .map((r) => ({ uid: r.uid, bestScore: Number(r.bestScore) || 0, updatedAt: r.updatedAt ?? null }))
    .sort((a, b) => b.bestScore - a.bestScore)
}

/** Game popularity: total matches played per game across all users. */
export function aggregateGamePopularity(statsRows: StatsRow[]): Record<string, number> {
  const byGameId: Record<string, number> = {}
  for (const { gameId, totalMatchCount } of statsRows) {
    byGameId[gameId] = (byGameId[gameId] || 0) + (Number(totalMatchCount) || 0)
  }
  return byGameId
}
