import { db } from '@/app/lib/firebase'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { UserProfile } from '@/app/types'
import { FieldValue } from 'firebase/firestore'

export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/

// Firestore UserProfile with FieldValue for timestamps
interface FirestoreUserProfile extends Omit<Partial<UserProfile>, 'createdAt' | 'updatedAt'> {
  createdAt?: Date | FieldValue
  updatedAt?: Date | FieldValue
}

export function normalizeUsername(username: string): string {
  return String(username || '').trim().toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(String(username || '').trim())
}

export function sanitizeUsername(value: string): string {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  const asciiOnly = raw
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')

  const sanitized = asciiOnly
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 20)

  return sanitized
}

export function createSuggestedUsername(value: string, fallback = 'player'): string {
  const primary = sanitizeUsername(value)
  if (primary.length >= 3) {
    return primary
  }

  const backup = sanitizeUsername(fallback)
  if (backup.length >= 3) {
    return backup
  }

  return 'player'
}

export function resolveAuthProvider(user: FirebaseUser | null): 'google' | 'github' | 'twitter' | 'facebook' | 'password' | 'unknown' {
  if (!user) {
    return 'unknown'
  }

  // Server-side OAuth flows sign in via custom tokens, so providerData is empty.
  // Detect those by the uid prefix we assign when creating the account.
  if (user.uid.startsWith('google_')) {
    return 'google'
  }

  if (user.uid.startsWith('github_')) {
    return 'github'
  }

  const providerIds = user.providerData?.map((provider) => provider.providerId) || []

  if (providerIds.includes('google.com')) {
    return 'google'
  }

  // Twitter (X) signs in via the Firebase popup, which populates providerData.
  if (providerIds.includes('twitter.com')) {
    return 'twitter'
  }

  if (providerIds.includes('facebook.com')) {
    return 'facebook'
  }

  if (providerIds.includes('password')) {
    return 'password'
  }

  return 'unknown'
}

export type LinkableProvider = 'google' | 'github'

export interface ProviderMethodState {
  // Whether this provider can currently sign the user into this account.
  connected: boolean
  // Whether the user explicitly linked it (and can therefore disconnect it).
  linked: boolean
  email: string | null
}

export interface SignInMethodsState {
  password: boolean
  google: ProviderMethodState
  github: ProviderMethodState
}

// Derives the account's sign-in methods from the Firebase user (password / native
// provider) plus the explicitly linked providers stored on the profile.
export function getSignInMethods(
  user: FirebaseUser | null,
  profile: UserProfile | null,
): SignInMethodsState {
  const providerIds = user?.providerData?.map((p) => p.providerId) || []
  const linked = profile?.linkedProviders || {}
  const uid = user?.uid || ''

  return {
    password: providerIds.includes('password'),
    google: {
      linked: Boolean(linked.google),
      connected: Boolean(linked.google) || uid.startsWith('google_') || providerIds.includes('google.com'),
      email: linked.google?.email ?? (uid.startsWith('google_') ? user?.email ?? null : null),
    },
    github: {
      linked: Boolean(linked.github),
      connected: Boolean(linked.github) || uid.startsWith('github_'),
      email: linked.github?.email ?? (uid.startsWith('github_') ? user?.email ?? null : null),
    },
  }
}

async function generateUniqueUsername(user: FirebaseUser): Promise<string | null> {
  const baseName = createSuggestedUsername(
    user.displayName || user.email?.split('@')[0] || '',
    'player'
  )

  // Try the base name first
  if (await isUsernameAvailable(baseName)) {
    return baseName
  }

  // If taken, append random numbers (up to 10 attempts)
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const candidate = `${baseName.slice(0, 17)}_${suffix}`.slice(0, 20)
    if (await isUsernameAvailable(candidate)) {
      return candidate
    }
  }

  // Fallback to userId-based username
  const fallback = `user_${user.uid.slice(0, 10)}`
  if (await isUsernameAvailable(fallback)) {
    return fallback
  }

  return null
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const profileRef = doc(db, 'users', uid)
  const profileSnap = await getDoc(profileRef)
  return profileSnap.exists() ? { uid, ...profileSnap.data() as Omit<UserProfile, 'uid'> } : null
}

interface EnsureProfilePayload {
  email: string | null
  authProvider: 'google' | 'github' | 'twitter' | 'facebook' | 'password' | 'unknown'
  updatedAt: ReturnType<typeof serverTimestamp>
  photoURL?: string
  photoThumbURL?: string
  createdAt?: ReturnType<typeof serverTimestamp>
  username?: string
  usernameNormalized?: string
  profileCompleted?: boolean
}

export async function ensureUserProfileDocument(user: FirebaseUser | null): Promise<FirestoreUserProfile | null> {
  if (!user?.uid) {
    return null
  }

  const existingProfile = await getUserProfile(user.uid)
  const profileRef = doc(db, 'users', user.uid)
  const payload: EnsureProfilePayload = {
    email: user.email || null,
    authProvider: resolveAuthProvider(user),
    updatedAt: serverTimestamp(),
  }

  // Only seed photo from the provider when the profile doesn't have one yet,
  // so user-uploaded photos are never overwritten on re-login.
  if (user.photoURL && !existingProfile?.photoURL) {
    payload.photoURL = user.photoURL
    payload.photoThumbURL = user.photoURL
  }

  if (!existingProfile?.createdAt) {
    payload.createdAt = serverTimestamp()
  }

  // Auto-generate username for any user who doesn't have one yet (email prefix fallback)
  if (!existingProfile?.username) {
    const generatedUsername = await generateUniqueUsername(user)
    if (generatedUsername) {
      const normalized = normalizeUsername(generatedUsername)
      payload.username = generatedUsername
      payload.usernameNormalized = normalized
      payload.profileCompleted = true

      // Claim the username in the usernames collection
      const usernameRef = doc(db, 'usernames', normalized)
      await setDoc(usernameRef, {
        uid: user.uid,
        username: generatedUsername,
        usernameNormalized: normalized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  }

  await setDoc(profileRef, payload, { merge: true })

  return {
    ...(existingProfile || {}),
    ...payload,
  }
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  if (!isValidUsername(username)) {
    return false
  }

  const normalized = normalizeUsername(username)
  const usernameRef = doc(db, 'usernames', normalized)
  const usernameSnap = await getDoc(usernameRef)

  return !usernameSnap.exists()
}

interface ClaimUsernameMetadata {
  email: string | null
  authProvider: 'google' | 'github' | 'twitter' | 'facebook' | 'password' | 'unknown'
}

interface ClaimUsernameResult {
  username: string
  usernameNormalized: string
}

export async function claimUsername(
  uid: string,
  username: string,
  metadata: ClaimUsernameMetadata = { email: null, authProvider: 'unknown' }
): Promise<ClaimUsernameResult> {
  const trimmedUsername = String(username || '').trim()

  if (!uid) {
    throw new Error('Missing user id')
  }

  if (!isValidUsername(trimmedUsername)) {
    throw new Error('Username must be 3-20 characters and use letters, numbers, or underscores only')
  }

  const normalized = normalizeUsername(trimmedUsername)
  const userRef = doc(db, 'users', uid)
  const usernameRef = doc(db, 'usernames', normalized)
  const now = serverTimestamp()

  // First, update the user profile (outside transaction to avoid race with AuthContext)
  // Use setDoc with merge to handle case where profile already exists
  const userPayload = {
    ...metadata,
    username: trimmedUsername,
    usernameNormalized: normalized,
    profileCompleted: true,
    updatedAt: now,
  }

  try {
    await setDoc(userRef, userPayload, { merge: true })
  } catch (err) {
    console.error('[claimUsername] Failed to write user profile:', err)
    throw err
  }

  // Then, claim the username in a transaction (username is the critical part)
  return runTransaction(db, async (transaction) => {
    const usernameSnap = await transaction.get(usernameRef)

    if (usernameSnap.exists() && usernameSnap.data().uid !== uid) {
      throw new Error('Username is already taken')
    }

    // Clean up previous username if user is changing theirs
    const userSnap = await transaction.get(userRef)
    const previousNormalized = userSnap.exists() ? userSnap.data().usernameNormalized : null

    if (previousNormalized && previousNormalized !== normalized) {
      const previousUsernameRef = doc(db, 'usernames', previousNormalized)
      const previousUsernameSnap = await transaction.get(previousUsernameRef)
      if (previousUsernameSnap.exists() && previousUsernameSnap.data().uid === uid) {
        transaction.delete(previousUsernameRef)
      }
    }

    const usernamePayload = {
      uid,
      username: trimmedUsername,
      usernameNormalized: normalized,
      updatedAt: now,
    }

    if (!usernameSnap.exists() || !usernameSnap.data().createdAt) {
      ;(usernamePayload as Record<string, unknown>).createdAt = now
    }

    transaction.set(usernameRef, usernamePayload, { merge: true })

    return {
      username: trimmedUsername,
      usernameNormalized: normalized,
    }
  })
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2 MB

interface ProfilePhotoUpload {
  mainFile: File
  thumbFile?: File | null
}

interface UploadResult {
  photoURL: string
  photoThumbURL: string
}

function validateProfilePhotoFile(file: File): void {
  if (!file) {
    throw new Error('No file provided')
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Only JPEG, PNG, WebP, or GIF images are allowed')
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error('Image must be 2 MB or smaller')
  }
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

export async function uploadProfilePhoto(uid: string, upload: File | ProfilePhotoUpload): Promise<UploadResult> {
  if (!uid) throw new Error('Missing user id')

  const mainFile = (upload as ProfilePhotoUpload).mainFile || (upload as File)
  const thumbFile = (upload as ProfilePhotoUpload).thumbFile || null

  validateProfilePhotoFile(mainFile)

  if (thumbFile) {
    validateProfilePhotoFile(thumbFile)
  }

  const [photoURL, photoThumbURL] = await Promise.all([
    fileToDataURL(mainFile),
    thumbFile ? fileToDataURL(thumbFile) : Promise.resolve(null),
  ])

  const resolvedThumbURL = photoThumbURL ?? photoURL

  await setDoc(
    doc(db, 'users', uid),
    { photoURL, photoThumbURL: resolvedThumbURL, updatedAt: serverTimestamp() },
    { merge: true },
  )

  return { photoURL, photoThumbURL: resolvedThumbURL }
}

const MAX_RECENTLY_PLAYED = 10

export async function getRecentlyPlayed(uid: string): Promise<string[]> {
  if (!uid) return []
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return []
  const data = snap.data()
  return Array.isArray(data.recentlyPlayed) ? (data.recentlyPlayed as string[]) : []
}

export async function saveRecentlyPlayed(uid: string, gameIds: string[]): Promise<void> {
  if (!uid) return
  await updateDoc(doc(db, 'users', uid), {
    recentlyPlayed: gameIds.slice(0, MAX_RECENTLY_PLAYED),
    updatedAt: serverTimestamp(),
  })
}
