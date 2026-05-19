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
  }, { merge: true })
}

export async function getAllScores(uid: string): Promise<Record<string, ScoreData>> {
  const ref = collection(db, 'users', uid, 'scores')
  const snapshot = await getDocs(ref)
  const scores: Record<string, ScoreData> = {}
  snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    scores[docSnap.id] = docSnap.data() as ScoreData
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

export async function getGlobalLeaderboard(): Promise<GlobalLeaderboardEntry[]> {
  const snap = await getDocs(collectionGroup(db, 'gameStats'))
  const byUid: Record<string, number> = {}
  snap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    const pathParts = docSnap.ref.path.split('/')
    const uid = pathParts[1]
    const data = docSnap.data()
    const count = Number(data.totalMatchCount) || 0
    if (!byUid[uid]) byUid[uid] = 0
    byUid[uid] += count
  })
  return Object.entries(byUid)
    .map(([uid, totalMatchCount]) => ({ uid, totalMatchCount }))
    .sort((a, b) => b.totalMatchCount - a.totalMatchCount)
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
