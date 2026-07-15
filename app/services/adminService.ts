import { auth, db } from '@/app/lib/firebase'
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
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { Game, Announcement, PlatformStats, UserProfile } from '@/app/types'

// Role helpers
export type UserRole = 'admin' | 'teacher' | 'user'

export async function isAdmin(uid: string): Promise<boolean> {
  return (await getUserRole(uid)) === 'admin'
}

export async function getUserRole(uid: string): Promise<UserRole> {
  if (!uid) return 'user'
  const snap = await getDoc(doc(db, 'users', uid))
  const role = snap.exists() ? snap.data().role : undefined
  return role === 'admin' || role === 'teacher' ? role : 'user'
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
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

/**
 * Platform totals from the cached, admin-gated server route.
 *
 * Was a client-side full users read + collectionGroup('gameStats') scan on every Dashboard
 * render; now a single cached read behind a 5-minute TTL. (audit R17 — admin analytics caching)
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/admin/platform-stats', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'Staff access required' : 'Failed to load platform stats')
  }
  return (await res.json()) as PlatformStats
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
  discord: boolean
}

const OAUTH_CONFIG_DEFAULTS: OAuthConfig = {
  google: true,
  github: true,
  twitter: true,
  discord: true,
}

export async function getOAuthConfig(): Promise<OAuthConfig> {
  const snap = await getDoc(doc(db, 'config', 'oauthProviders'))
  if (!snap.exists()) return { ...OAUTH_CONFIG_DEFAULTS }
  return { ...OAUTH_CONFIG_DEFAULTS, ...snap.data() } as OAuthConfig
}

export async function saveOAuthConfig(config: OAuthConfig): Promise<void> {
  await setDoc(doc(db, 'config', 'oauthProviders'), config)
}

// Library page feature flags
export type LibrarySortMode = 'name' | 'recent' | 'popular'

export interface LibrarySettings {
  showContinuePlaying: boolean
  // null/undefined = users pick their own sort; otherwise this order is forced for everyone.
  globalSortMode: LibrarySortMode | null
}

const LIBRARY_SETTINGS_DEFAULTS: LibrarySettings = {
  showContinuePlaying: true,
  globalSortMode: null,
}

export async function getLibrarySettings(): Promise<LibrarySettings> {
  const snap = await getDoc(doc(db, 'config', 'librarySettings'))
  if (!snap.exists()) return { ...LIBRARY_SETTINGS_DEFAULTS }
  return { ...LIBRARY_SETTINGS_DEFAULTS, ...snap.data() } as LibrarySettings
}

export async function saveLibrarySettings(settings: LibrarySettings): Promise<void> {
  await setDoc(doc(db, 'config', 'librarySettings'), settings)
}

// Survey popup pacing (see app/components/SurveyPrompt.tsx)
export interface SurveySettings {
  enabled: boolean
  minVisitsBeforePrompt: number
  cooldownMinutes: number
  // 0-1 chance an eligible visit actually shows the prompt
  showProbability: number
}

const SURVEY_SETTINGS_DEFAULTS: SurveySettings = {
  enabled: true,
  minVisitsBeforePrompt: 1,
  cooldownMinutes: 60,
  showProbability: 1,
}

export async function getSurveySettings(): Promise<SurveySettings> {
  const snap = await getDoc(doc(db, 'config', 'surveySettings'))
  if (!snap.exists()) return { ...SURVEY_SETTINGS_DEFAULTS }
  return { ...SURVEY_SETTINGS_DEFAULTS, ...snap.data() } as SurveySettings
}

export async function saveSurveySettings(settings: SurveySettings): Promise<void> {
  await setDoc(doc(db, 'config', 'surveySettings'), settings)
}
