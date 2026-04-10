import { db } from '../firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

const SUPPORTED_MODES = ['singleplayer', 'multiplayer']

function roundToTwo(value) {
  return Number(value.toFixed(2))
}

function normalizeModeStats(stats = {}) {
  const matchCount = Number(stats.matchCount) || 0
  const totalScore = Number(stats.totalScore) || 0
  const averageScore = matchCount > 0 ? totalScore / matchCount : 0

  return {
    matchCount,
    totalScore,
    averageScore,
  }
}

/**
 * Build updated weighted mode stats from an existing game-stats document.
 * Final overall average is weighted by number of matches in each mode.
 */
export function buildWeightedModeStats(existingStats, mode, score) {
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
    // Backward compatible field used by existing profile UI for chroma-memory.
    accuracyPercentage: mode === 'singleplayer'
      ? roundToTwo(singleplayer.averageScore)
      : (current.accuracyPercentage ?? roundToTwo(singleplayer.averageScore)),
  }
}

/**
 * Save the user's best score for a game.
 * Overwrites the previous value — Firestore path: users/{uid}/scores/{gameId}
 */
export async function saveBestScore(uid, gameId, bestScore) {
  const ref = doc(db, 'users', uid, 'scores', gameId)
  await setDoc(ref, {
    bestScore,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Fetch all scores for a user. Returns a map: { gameId: { bestScore, updatedAt } }
 */
export async function getAllScores(uid) {
  const ref = collection(db, 'users', uid, 'scores')
  const snapshot = await getDocs(ref)
  const scores = {}
  snapshot.forEach((docSnap) => {
    scores[docSnap.id] = docSnap.data()
  })
  return scores
}

/**
 * Save game stats (e.g. progress, moves, time) for a user.
 * Firestore path: users/{uid}/gameStats/{gameId}
 */
export async function saveGameStats(uid, gameId, stats) {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  await setDoc(ref, {
    ...stats,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Fetch game stats for a specific game. Returns the stats object or null.
 */
export async function getGameStats(uid, gameId) {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

/**
 * Fetch all game stats for a user. Returns a map: { gameId: { ...stats } }
 */
export async function getAllGameStats(uid) {
  const ref = collection(db, 'users', uid, 'gameStats')
  const snapshot = await getDocs(ref)
  const stats = {}
  snapshot.forEach((docSnap) => {
    stats[docSnap.id] = docSnap.data()
  })
  return stats
}

/**
 * Save a match score to mode buckets and keep weighted averages in sync.
 */
export async function saveModeScoreStats(uid, gameId, mode, score) {
  const ref = doc(db, 'users', uid, 'gameStats', gameId)
  const snap = await getDoc(ref)
  const existingStats = snap.exists() ? snap.data() : null
  const mergedStats = buildWeightedModeStats(existingStats, mode, score)

  await setDoc(ref, {
    ...mergedStats,
    updatedAt: serverTimestamp(),
  }, { merge: true })

  return mergedStats
}
