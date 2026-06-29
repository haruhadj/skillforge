import { db } from '@/app/lib/firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { pickPublicProfileFields } from '@/app/lib/publicProfileFields'

export { pickPublicProfileFields } from '@/app/lib/publicProfileFields'

// The world-readable face of a user. Holds ONLY display fields — never email,
// role, linkedProviders, or device fingerprints. Mirrored from users/{uid} on
// every owner write (see syncPublicProfile) and read by every cross-user view
// (leaderboard, activity, game pages, public profile). The PII-bearing
// users/{uid} doc is locked to owner+admin reads in firestore.rules.
export interface PublicProfile {
  uid: string
  username?: string
  usernameNormalized?: string
  photoURL?: string
  photoThumbURL?: string
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, 'publicProfiles', uid))
  return snap.exists() ? { uid, ...(snap.data() as Omit<PublicProfile, 'uid'>) } : null
}

// Mirror the owner's display fields into publicProfiles/{uid}. Fire-and-forget
// friendly: a failure here must never block the primary users/{uid} write.
export async function syncPublicProfile(
  uid: string,
  source: Partial<Record<string, unknown>>,
): Promise<void> {
  const fields = pickPublicProfileFields(source)
  if (Object.keys(fields).length === 0) return
  await setDoc(
    doc(db, 'publicProfiles', uid),
    { ...fields, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
