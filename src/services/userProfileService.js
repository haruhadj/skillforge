import { db } from '../firebase'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

export const USERNAME_REGEX = /^[A-Za-z0-9_]{3,20}$/

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase()
}

export function isValidUsername(username) {
  return USERNAME_REGEX.test(String(username || '').trim())
}

export function sanitizeUsername(value) {
  const raw = String(value || '').trim()
  if (!raw) {
    return ''
  }

  const asciiOnly = raw
    .normalize('NFKD')
    .replace(/[^\p{ASCII}]/gu, '')

  const sanitized = asciiOnly
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 20)

  return sanitized
}

export function createSuggestedUsername(value, fallback = 'player') {
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

export function resolveAuthProvider(user) {
  const providerIds = user?.providerData?.map((provider) => provider.providerId) || []

  if (providerIds.includes('google.com')) {
    return 'google'
  }

  if (providerIds.includes('password')) {
    return 'password'
  }

  return 'unknown'
}

export async function getUserProfile(uid) {
  const profileRef = doc(db, 'users', uid)
  const profileSnap = await getDoc(profileRef)
  return profileSnap.exists() ? profileSnap.data() : null
}

export async function ensureUserProfileDocument(user) {
  if (!user?.uid) {
    return null
  }

  const profileRef = doc(db, 'users', user.uid)
  const payload = {
    email: user.email || null,
    authProvider: resolveAuthProvider(user),
    updatedAt: serverTimestamp(),
  }

  const existingProfile = await getUserProfile(user.uid)

  if (!existingProfile?.createdAt) {
    payload.createdAt = serverTimestamp()
  }

  await setDoc(profileRef, payload, { merge: true })

  return {
    ...(existingProfile || {}),
    ...payload,
  }
}

export async function isUsernameAvailable(username) {
  if (!isValidUsername(username)) {
    return false
  }

  const normalized = normalizeUsername(username)
  const usernameRef = doc(db, 'usernames', normalized)
  const usernameSnap = await getDoc(usernameRef)

  return !usernameSnap.exists()
}

export async function claimUsername(uid, username, metadata = {}) {
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

  return runTransaction(db, async (transaction) => {
    const [userSnap, usernameSnap] = await Promise.all([
      transaction.get(userRef),
      transaction.get(usernameRef),
    ])

    if (usernameSnap.exists() && usernameSnap.data().uid !== uid) {
      throw new Error('Username is already taken')
    }

    const previousNormalized = userSnap.exists() ? userSnap.data().usernameNormalized : null

    if (previousNormalized && previousNormalized !== normalized) {
      const previousUsernameRef = doc(db, 'usernames', previousNormalized)
      const previousUsernameSnap = await transaction.get(previousUsernameRef)
      if (previousUsernameSnap.exists() && previousUsernameSnap.data().uid === uid) {
        transaction.delete(previousUsernameRef)
      }
    }

    const now = serverTimestamp()
    const userPayload = {
      ...metadata,
      username: trimmedUsername,
      usernameNormalized: normalized,
      profileCompleted: true,
      updatedAt: now,
    }

    if (!userSnap.exists() || !userSnap.data().createdAt) {
      userPayload.createdAt = now
    }

    transaction.set(userRef, userPayload, { merge: true })

    const usernamePayload = {
      uid,
      username: trimmedUsername,
      usernameNormalized: normalized,
      updatedAt: now,
    }

    if (!usernameSnap.exists() || !usernameSnap.data().createdAt) {
      usernamePayload.createdAt = now
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

function validateProfilePhotoFile(file) {
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

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read the image file'))
    reader.readAsDataURL(file)
  })
}

export async function uploadProfilePhoto(uid, upload) {
  if (!uid) throw new Error('Missing user id')

  const mainFile = upload?.mainFile || upload
  const thumbFile = upload?.thumbFile || null

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
