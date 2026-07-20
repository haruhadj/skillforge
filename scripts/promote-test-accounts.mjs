#!/usr/bin/env node
// Converts accounts seeded by scripts/seed-test-accounts.mjs into real participant
// accounts for an actual usability-testing session:
//   1. Wipes the synthetic scores/gameStats seeded for QA/load-testing, so a real
//      participant's genuine gameplay is the only activity ever recorded for them.
//   2. Clears isTestAccount (and the synthetic device fields, which were sampled from
//      the real distribution, not the participant's actual device) so the account is
//      indistinguishable from an organically-registered one and is included in
//      totalUsers / leaderboard / activity / analytics once the participant plays.
// Login email/password/uid are left untouched — the same credentials handed out
// still work after promotion.
//
// Usage:
//   node --env-file=.env scripts/promote-test-accounts.mjs

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) })
  }
  if (process.env.FIREBASE_ADMIN_CLIENT_EMAIL && process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }
  throw new Error('Firebase Admin credentials not configured (see app/lib/firebase-admin.ts)')
}

async function deleteSubcollection(db, uid, name) {
  const snap = await db.collection('users').doc(uid).collection(name).get()
  await Promise.all(snap.docs.map((d) => d.ref.delete()))
  return snap.size
}

async function main() {
  const app = initAdmin()
  const db = getFirestore(app)

  const testSnap = await db.collection('users').where('isTestAccount', '==', true).get()
  if (testSnap.empty) {
    console.log('No test accounts found (isTestAccount: true). Nothing to promote.')
    return
  }

  console.log(`Found ${testSnap.size} test accounts. Wiping synthetic data and promoting to real accounts...`)

  for (const docSnap of testSnap.docs) {
    const uid = docSnap.id
    const data = docSnap.data()

    const deletedScores = await deleteSubcollection(db, uid, 'scores')
    const deletedStats = await deleteSubcollection(db, uid, 'gameStats')

    await docSnap.ref.set({
      isTestAccount: FieldValue.delete(),
      deviceType: FieldValue.delete(),
      deviceOs: FieldValue.delete(),
      deviceBrowser: FieldValue.delete(),
      deviceLastSeen: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    console.log(`  Promoted ${data.email} (wiped ${deletedScores} scores, ${deletedStats} gameStats — real device info will be captured on next login)`)
  }

  console.log(`\nDone. ${testSnap.size} accounts promoted to real participant accounts.`)
  console.log(`They now count toward totalUsers/leaderboard/activity/analytics as soon as each participant logs in and plays.`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Promote failed:', err)
  process.exit(1)
})
