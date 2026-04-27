import { db } from '../firebase'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

// ── Role helpers ────────────────────────────────────────────────

/**
 * Check whether a user has the admin role.
 */
export async function isAdmin(uid) {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() && snap.data().role === 'admin'
}

/**
 * Set a user's role ('admin' | 'user').
 */
export async function setUserRole(uid, role) {
  if (!uid) throw new Error('Missing user id')
  if (!['admin', 'user'].includes(role)) throw new Error('Invalid role')

  await setDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() }, { merge: true })
}

// ── User management ─────────────────────────────────────────────

/**
 * Fetch every user profile document.
 * Returns an array of { uid, ...profileFields }.
 */
export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

/**
 * Delete all score and gameStats sub-documents for a user (data reset).
 */
export async function deleteUserData(uid) {
  if (!uid) throw new Error('Missing user id')

  const scoresSnap = await getDocs(collection(db, 'users', uid, 'scores'))
  const statsSnap = await getDocs(collection(db, 'users', uid, 'gameStats'))

  const deletes = [
    ...scoresSnap.docs.map((d) => deleteDoc(d.ref)),
    ...statsSnap.docs.map((d) => deleteDoc(d.ref)),
  ]

  await Promise.all(deletes)
  return { deletedScores: scoresSnap.size, deletedStats: statsSnap.size }
}

// ── Dynamic game registry ───────────────────────────────────────

/**
 * Fetch all games stored in the Firestore `gameRegistry` collection.
 * Each doc ID is the game's kebab-case id.
 */
export async function getGameRegistry() {
  const snap = await getDocs(collection(db, 'gameRegistry'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Create or update a game document in `gameRegistry`.
 */
export async function saveGame(gameData) {
  if (!gameData?.id) throw new Error('Game must have an id')

  const { id, ...rest } = gameData
  await setDoc(doc(db, 'gameRegistry', id), {
    ...rest,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Delete a game from `gameRegistry`.
 */
export async function deleteGame(gameId) {
  if (!gameId) throw new Error('Missing game id')
  await deleteDoc(doc(db, 'gameRegistry', gameId))
}

/**
 * Aggregate platform-wide stats.
 * Uses the static games list for the game count, since gameRegistry may be empty.
 * collectionGroup queries can fail if Firestore rules/indexes aren't set up,
 * so we handle that gracefully.
 */
export async function getPlatformStats() {
  // Count users — should always work with the admin rules we set up
  const usersSnap = await getDocs(collection(db, 'users'))
  const totalUsers = usersSnap.size

  // Count total matches from each user's gameStats subcollection
  // We iterate per-user to avoid needing a collectionGroup index
  let totalMatches = 0
  for (const userDoc of usersSnap.docs) {
    try {
      const statsSnap = await getDocs(collection(db, 'users', userDoc.id, 'gameStats'))
      statsSnap.forEach((d) => {
        totalMatches += Number(d.data().totalMatchCount) || 0
      })
    } catch {
      // Skip users whose subcollections we can't read
    }
  }

  return {
    totalUsers,
    totalMatches,
  }
}

// ── Announcements ───────────────────────────────────────────────

/**
 * Create or update an announcement.
 */
export async function saveAnnouncement(data) {
  const id = data.id || doc(collection(db, 'announcements')).id
  await setDoc(doc(db, 'announcements', id), {
    title: data.title || '',
    message: data.message || '',
    type: data.type || 'info', // info | warning | success
    active: data.active !== false,
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

/**
 * Fetch all active announcements.
 */
export async function getActiveAnnouncements() {
  const q = query(
    collection(db, 'announcements'),
    where('active', '==', true),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch ALL announcements (for admin view).
 */
export async function getAllAnnouncements() {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncement(id) {
  if (!id) throw new Error('Missing announcement id')
  await deleteDoc(doc(db, 'announcements', id))
}
