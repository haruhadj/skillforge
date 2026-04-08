import { db } from '../firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

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
