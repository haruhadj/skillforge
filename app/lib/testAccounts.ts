import type { Firestore } from 'firebase-admin/firestore'

/**
 * QA/load-test seed accounts are flagged `isTestAccount: true` on their users/{uid}
 * doc (see scripts/seed-test-accounts.mjs). Every real-facing aggregate (leaderboard,
 * activity feed, platform stats, admin analytics) must exclude them so seeded data
 * never inflates numbers that get reported outside engineering QA.
 */
export async function getTestAccountUids(db: Firestore): Promise<Set<string>> {
  const snap = await db.collection('users').where('isTestAccount', '==', true).get()
  return new Set(snap.docs.map((d) => d.id))
}
