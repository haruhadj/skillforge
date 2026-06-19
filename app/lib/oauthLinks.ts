import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { UserRecord } from 'firebase-admin/auth'
import type { OAuthProvider } from '@/app/lib/oauth'

// Authoritative provider -> account mapping. Lives in the `oauthLinks` collection
// (server-only; see firestore.rules) so a linked OAuth identity always resolves to
// the same SkillForge account even when its email differs from the account email.

const OAUTH_LINKS = 'oauthLinks'
const USERS = 'users'

export interface OAuthProfile {
  provider: OAuthProvider
  providerId: string
  // Null for providers that don't return an email (e.g. TikTok); such accounts
  // are keyed solely by `provider`+`providerId` and skip email unification.
  email: string | null
  displayName?: string
  photoURL?: string
}

export interface OAuthLink {
  uid: string
  provider: OAuthProvider
  providerId: string
  email: string | null
}

export function oauthLinkId(provider: OAuthProvider, providerId: string): string {
  return `${provider}_${providerId}`
}

export async function getOAuthLink(
  provider: OAuthProvider,
  providerId: string,
): Promise<OAuthLink | null> {
  const snap = await getAdminDb().collection(OAUTH_LINKS).doc(oauthLinkId(provider, providerId)).get()
  return snap.exists ? (snap.data() as OAuthLink) : null
}

async function writeLink(uid: string, p: OAuthProfile): Promise<void> {
  const db = getAdminDb()
  const linkRef = db.collection(OAUTH_LINKS).doc(oauthLinkId(p.provider, p.providerId))
  await linkRef.set({
    uid,
    provider: p.provider,
    providerId: p.providerId,
    email: p.email || null,
    linkedAt: FieldValue.serverTimestamp(),
  })
  // Denormalize onto the user profile so the client can show linked accounts
  // without read access to the server-only mapping collection.
  await db.collection(USERS).doc(uid).set(
    { linkedProviders: { [p.provider]: { email: p.email || null, linkedAt: FieldValue.serverTimestamp() } } },
    { merge: true },
  )
}

// Seed displayName/photoURL from the provider when the account is missing them,
// so OAuth re-logins backfill profile details without overwriting existing ones.
async function backfillProfile(user: UserRecord, p: OAuthProfile): Promise<void> {
  if (!user.displayName || !user.photoURL) {
    await getAdminAuth().updateUser(user.uid, {
      displayName: user.displayName || p.displayName,
      photoURL: user.photoURL || p.photoURL,
    })
  }
}

// Resolve which Firebase uid an incoming OAuth sign-in should land on.
// Explicit links win, then email unification, then a new account is created.
export async function resolveSignInUid(p: OAuthProfile): Promise<string> {
  const adminAuth = getAdminAuth()

  // 1. Explicit link wins.
  const link = await getOAuthLink(p.provider, p.providerId)
  if (link) {
    try {
      const linked = await adminAuth.getUser(link.uid)
      await backfillProfile(linked, p)
      return linked.uid
    } catch {
      // The linked account was deleted; fall through to email/native resolution.
    }
  }

  // 2. Email unification — only for providers that return an email (TikTok does
  //    not), so identities sharing an email collapse onto one account.
  if (p.email) {
    try {
      const existing = await adminAuth.getUserByEmail(p.email)
      await backfillProfile(existing, p)
      return existing.uid
    } catch {
      // No account with that email; fall through to get-or-create.
    }
  }

  // 3. Get-or-create the deterministic native account for this identity.
  const nativeUid = oauthLinkId(p.provider, p.providerId)
  try {
    const existing = await adminAuth.getUser(nativeUid)
    await backfillProfile(existing, p)
    return existing.uid
  } catch {
    const created = await adminAuth.createUser({
      uid: nativeUid,
      ...(p.email ? { email: p.email, emailVerified: true } : {}),
      displayName: p.displayName,
      photoURL: p.photoURL,
    })
    return created.uid
  }
}

export type LinkResult = { ok: true } | { ok: false; error: string }

// Attach an OAuth identity to an already signed-in account.
export async function linkOAuthToAccount(targetUid: string, p: OAuthProfile): Promise<LinkResult> {
  const adminAuth = getAdminAuth()

  try {
    await adminAuth.getUser(targetUid)
  } catch {
    return { ok: false, error: 'invalid_session' }
  }

  const existingLink = await getOAuthLink(p.provider, p.providerId)
  if (existingLink && existingLink.uid !== targetUid) {
    return { ok: false, error: 'already_linked' }
  }

  // If a standalone account already owns this identity, linking would orphan its
  // data. Block it (unless that account IS the target, i.e. a native re-link).
  const nativeUid = oauthLinkId(p.provider, p.providerId)
  if (nativeUid !== targetUid) {
    try {
      await adminAuth.getUser(nativeUid)
      return { ok: false, error: 'provider_has_account' }
    } catch {
      // No standalone account — safe to link.
    }
  }

  await writeLink(targetUid, p)
  return { ok: true }
}

// Remove a linked provider from an account. `remainingMethods` is the count of
// sign-in methods that would survive removal; the caller computes it.
export async function removeOAuthLink(uid: string, provider: OAuthProvider): Promise<void> {
  const db = getAdminDb()
  const links = await db
    .collection(OAUTH_LINKS)
    .where('uid', '==', uid)
    .where('provider', '==', provider)
    .get()

  const batch = db.batch()
  links.docs.forEach((d) => batch.delete(d.ref))
  batch.set(
    db.collection(USERS).doc(uid),
    { linkedProviders: { [provider]: FieldValue.delete() } },
    { merge: true },
  )
  await batch.commit()
}

// All oauthLinks owned by a uid (used on account deletion cleanup).
export async function getOAuthLinksForUid(uid: string): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
  const snap = await getAdminDb().collection(OAUTH_LINKS).where('uid', '==', uid).get()
  return snap.docs
}
