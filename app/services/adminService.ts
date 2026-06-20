import { db } from '@/app/lib/firebase'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { Game, Announcement, PlatformStats, UserProfile } from '@/app/types'

// Role helpers
export async function isAdmin(uid: string): Promise<boolean> {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() && snap.data().role === 'admin'
}

export async function isTeacher(uid: string): Promise<boolean> {
  if (!uid) return false
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() && snap.data().role === 'teacher'
}

export async function setUserRole(uid: string, role: 'admin' | 'teacher' | 'user'): Promise<void> {
  if (!uid) throw new Error('Missing user id')
  if (!['admin', 'teacher', 'user'].includes(role)) throw new Error('Invalid role')

  await setDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() }, { merge: true })
}

// User management
export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ uid: d.id, ...d.data() } as UserProfile))
}

export async function deleteUserData(uid: string): Promise<{ deletedScores: number; deletedStats: number }> {
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

// Dynamic game registry
export async function getGameRegistry(): Promise<Game[]> {
  const snap = await getDocs(collection(db, 'gameRegistry'))
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Game))
}

export async function saveGame(gameData: Partial<Game> & { id: string }): Promise<void> {
  if (!gameData?.id) throw new Error('Game must have an id')

  const { id, ...rest } = gameData
  await setDoc(doc(db, 'gameRegistry', id), {
    ...rest,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteGame(gameId: string): Promise<void> {
  if (!gameId) throw new Error('Missing game id')
  await deleteDoc(doc(db, 'gameRegistry', gameId))
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const [usersSnap, allStatsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collectionGroup(db, 'gameStats')),
  ])

  const totalUsers = usersSnap.size
  let totalMatches = 0
  allStatsSnap.forEach((d) => {
    totalMatches += Number(d.data().totalMatchCount) || 0
  })

  return {
    totalUsers,
    totalMatches,
  }
}

// Announcements
export interface AnnouncementInput {
  id?: string
  title: string
  message: string
  type?: 'info' | 'warning' | 'success'
  active?: boolean
  sticky?: boolean
  linkUrl?: string
  createdAt?: ReturnType<typeof serverTimestamp>
}

export async function saveAnnouncement(data: AnnouncementInput): Promise<string> {
  const id = data.id || doc(collection(db, 'announcements')).id
  await setDoc(doc(db, 'announcements', id), {
    title: data.title || '',
    message: data.message || '',
    type: data.type || 'info',
    active: data.active !== false,
    sticky: data.sticky === true,
    linkUrl: data.linkUrl?.trim() || '',
    createdAt: data.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return id
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const q = query(collection(db, 'announcements'), where('active', '==', true))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Announcement))
  return docs.sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0
    const bt = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0
    return bt - at
  })
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() } as Announcement))
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!id) throw new Error('Missing announcement id')
  await deleteDoc(doc(db, 'announcements', id))
}

// OAuth provider availability
export interface OAuthConfig {
  google: boolean
  github: boolean
  twitter: boolean
  facebook: boolean
  tiktok: boolean
}

const OAUTH_CONFIG_DEFAULTS: OAuthConfig = {
  google: true,
  github: true,
  twitter: true,
  facebook: true,
  tiktok: true,
}

export async function getOAuthConfig(): Promise<OAuthConfig> {
  const snap = await getDoc(doc(db, 'config', 'oauthProviders'))
  if (!snap.exists()) return { ...OAUTH_CONFIG_DEFAULTS }
  return { ...OAUTH_CONFIG_DEFAULTS, ...snap.data() } as OAuthConfig
}

export async function saveOAuthConfig(config: OAuthConfig): Promise<void> {
  await setDoc(doc(db, 'config', 'oauthProviders'), config)
}
