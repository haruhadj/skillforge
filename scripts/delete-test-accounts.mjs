#!/usr/bin/env node
// Deletes every account seeded by scripts/seed-test-accounts.mjs (isTestAccount: true):
// Firebase Auth user, users/{uid} doc, its scores/gameStats subcollections, and its
// usernames/{normalized} reservation. Idempotent — safe to re-run.
//
// Usage:
//   node --env-file=.env scripts/delete-test-accounts.mjs

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

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
  const auth = getAuth(app)

  const testSnap = await db.collection('users').where('isTestAccount', '==', true).get()
  if (testSnap.empty) {
    console.log('No test accounts found (isTestAccount: true). Nothing to delete.')
    return
  }

  console.log(`Found ${testSnap.size} test accounts. Deleting...`)

  for (const docSnap of testSnap.docs) {
    const uid = docSnap.id
    const data = docSnap.data()

    const deletedScores = await deleteSubcollection(db, uid, 'scores')
    const deletedStats = await deleteSubcollection(db, uid, 'gameStats')

    if (data.usernameNormalized) {
      await db.collection('usernames').doc(data.usernameNormalized).delete().catch(() => {})
    }

    await docSnap.ref.delete()

    await auth.deleteUser(uid).catch((err) => {
      console.warn(`  Auth user ${uid} (${data.email}) already gone or failed to delete: ${err.message}`)
    })

    console.log(`  Deleted ${data.email} (${deletedScores} scores, ${deletedStats} gameStats)`)
  }

  console.log(`\nDone. ${testSnap.size} test accounts removed.`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Delete failed:', err)
  process.exit(1)
})
