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
import { UserPreferences, UserProfile } from '@/app/types'
import { FieldValue } from 'firebase/firestore'
import type { DeviceInfo } from '@/app/lib/deviceInfo'
import { sanitizePhotoURL } from '@/app/lib/sanitizePhotoURL'
import { syncPublicProfile } from '@/app/services/publicProfileService'

export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/

// Names that must not be claimable, to prevent impersonation of staff/system
// accounts. Compared against the normalized (lowercased, trimmed) username.
export const RESERVED_USERNAMES = new Set<string>([
  'admin',
  'administrator',
  'support',
  'moderator',
  'mod',
  'staff',
  'official',
  'root',
  'system',
  'skillforge',
  'help',
  'security',
])

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(normalizeUsername(username))
}

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

export function resolveAuthProvider(user: FirebaseUser | null): 'google' | 'github' | 'twitter' | 'password' | 'unknown' {
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

  if (providerIds.includes('password')) {
    return 'password'
  }

  return 'unknown'
}

export type LinkableProvider = 'google' | 'github' | 'twitter' | 'discord'

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
  twitter: ProviderMethodState
  discord: ProviderMethodState
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
    // X (Twitter) OAuth 2.0 may not provide an email, so the email field can be null.
    twitter: {
      linked: Boolean(linked.twitter),
      connected: Boolean(linked.twitter) || uid.startsWith('twitter_'),
      email: linked.twitter?.email ?? null,
    },
    discord: {
      linked: Boolean(linked.discord),
      connected: Boolean(linked.discord) || uid.startsWith('discord_'),
      email: linked.discord?.email ?? (uid.startsWith('discord_') ? user?.email ?? null : null),
    },
  }
}

// Derives the full set of sign-in methods from a stored profile alone (no live
// FirebaseUser). Combines the account's native/primary provider with any explicitly
// linked providers — used by the admin panel to show every method a user can use.
export type SignInMethod = 'password' | LinkableProvider

export function getProfileSignInMethods(profile: UserProfile | null): SignInMethod[] {
  if (!profile) return []
  const methods = new Set<SignInMethod>()

  if (profile.uid?.startsWith('google_')) methods.add('google')
  if (profile.uid?.startsWith('github_')) methods.add('github')
  if (profile.uid?.startsWith('twitter_')) methods.add('twitter')
  if (profile.uid?.startsWith('discord_')) methods.add('discord')
  if (profile.authProvider === 'google') methods.add('google')
  if (profile.authProvider === 'github') methods.add('github')
  if (profile.authProvider === 'twitter') methods.add('twitter')
  if (profile.authProvider === 'discord') methods.add('discord')
  if (profile.authProvider === 'password') methods.add('password')
  if (profile.linkedProviders?.google) methods.add('google')
  if (profile.linkedProviders?.github) methods.add('github')
  if (profile.linkedProviders?.twitter) methods.add('twitter')
  if (profile.linkedProviders?.discord) methods.add('discord')

  // Stable order: password first, then OAuth providers.
  const order = ['password', 'google', 'github', 'twitter', 'discord']
  return [...methods].sort((a, b) => order.indexOf(a) - order.indexOf(b))
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
  authProvider: 'google' | 'github' | 'twitter' | 'password' | 'unknown'
  updatedAt: ReturnType<typeof serverTimestamp>
  photoURL?: string
  photoThumbURL?: string
  createdAt?: ReturnType<typeof serverTimestamp>
  username?: string
  usernameNormalized?: string
  profileCompleted?: boolean
  deviceType?: string
  deviceOs?: string
  deviceBrowser?: string
  deviceLastSeen?: ReturnType<typeof serverTimestamp>
}

export async function ensureUserProfileDocument(user: FirebaseUser | null, deviceInfo?: DeviceInfo): Promise<FirestoreUserProfile | null> {
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

  if (deviceInfo) {
    payload.deviceType = deviceInfo.deviceType
    payload.deviceOs = deviceInfo.os
    payload.deviceBrowser = deviceInfo.browser
    payload.deviceLastSeen = serverTimestamp()
  }

  // Only seed photo from the provider when the profile doesn't have one yet,
  // so user-uploaded photos are never overwritten on re-login.
  if (user.photoURL && !existingProfile?.photoURL) {
    const safePhoto = sanitizePhotoURL(user.photoURL)
    if (safePhoto) {
      payload.photoURL = safePhoto
      payload.photoThumbURL = safePhoto
    }
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

  // Mirror display fields into the world-readable publicProfiles/{uid} doc so
  // cross-user views never need to read (now PII-locked) users/{uid}. Self-heals
  // on every login; fire-and-forget so a mirror failure can't block sign-in.
  syncPublicProfile(user.uid, { ...(existingProfile || {}), ...payload }).catch(() => {})

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
  authProvider: 'google' | 'github' | 'twitter' | 'password' | 'unknown'
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

  if (RESERVED_USERNAMES.has(normalized)) {
    throw new Error('That username is reserved and cannot be used')
  }

  const userRef = doc(db, 'users', uid)
  const usernameRef = doc(db, 'usernames', normalized)
  const now = serverTimestamp()

  const userPayload = {
    ...metadata,
    username: trimmedUsername,
    usernameNormalized: normalized,
    profileCompleted: true,
    updatedAt: now,
  }

  // The profile write and the username claim must be one atomic unit: if the
  // username is taken we must NOT have already mutated the profile (drift), and
  // on a rename we must observe the *previous* username before overwriting it so
  // the old `usernames/<old>` doc gets reaped. Firestore transactions auto-retry
  // on the AuthContext profile-write race, so doing the profile write here is safe.
  const result = await runTransaction(db, async (transaction) => {
    // All reads must precede any writes in a Firestore transaction.
    const usernameSnap = await transaction.get(usernameRef)
    if (usernameSnap.exists() && usernameSnap.data().uid !== uid) {
      throw new Error('Username is already taken')
    }

    const userSnap = await transaction.get(userRef)
    const previousNormalized = userSnap.exists() ? userSnap.data().usernameNormalized : null

    let previousUsernameRef: ReturnType<typeof doc> | null = null
    if (previousNormalized && previousNormalized !== normalized) {
      const ref = doc(db, 'usernames', previousNormalized)
      const previousUsernameSnap = await transaction.get(ref)
      if (previousUsernameSnap.exists() && previousUsernameSnap.data().uid === uid) {
        previousUsernameRef = ref
      }
    }

    // Writes — atomic with the availability check above.
    transaction.set(userRef, userPayload, { merge: true })

    if (previousUsernameRef) {
      transaction.delete(previousUsernameRef)
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

  // Mirror the (possibly renamed) username into publicProfiles after the atomic
  // claim succeeds. Fire-and-forget — the username is already authoritative here.
  syncPublicProfile(uid, { username: trimmedUsername, usernameNormalized: normalized }).catch(() => {})

  return result
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// Avatars are stored as base64 data URLs INSIDE the Firestore user doc (see
// uploadProfilePhoto), not in Storage. base64 inflates ~1.37x and the main + thumb
// data URLs share one doc alongside the rest of the profile, so the raw cap must stay
// well under Firestore's ~1 MB document limit — a 2 MB file would silently fail the
// write near the limit (audit round 7/8). 600 KB raw ≈ ~820 KB base64 per image.
const MAX_PHOTO_BYTES = 600 * 1024 // 600 KB

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
    throw new Error('Image must be 600 KB or smaller')
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

  // Mirror the new avatar into publicProfiles so leaderboards/activity update.
  syncPublicProfile(uid, { photoURL, photoThumbURL: resolvedThumbURL }).catch(() => {})

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

/**
 * Persist appearance preferences (theme + accent + background style) onto the profile doc so the
 * chosen look follows the user across devices. Merges into `preferences` so a
 * partial update (e.g. accent only) never clobbers the other key. The owner
 * update rule permits any field except `role`, so no rules change is needed.
 */
export async function saveUserPreferences(uid: string, prefs: UserPreferences): Promise<void> {
  if (!uid) return
  const clean: UserPreferences = {}
  if (prefs.theme === 'dark' || prefs.theme === 'light') clean.theme = prefs.theme
  if (prefs.accent) clean.accent = prefs.accent
  if (prefs.backgroundStyle) clean.backgroundStyle = prefs.backgroundStyle
  if (Object.keys(clean).length === 0) return
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() }
  for (const [k, v] of Object.entries(clean)) payload[`preferences.${k}`] = v
  await updateDoc(doc(db, 'users', uid), payload)
}
