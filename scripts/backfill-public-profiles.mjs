#!/usr/bin/env node
// One-time backfill for audit Round 14 (data-privacy / publicProfiles).
//
// Mirrors the display-only fields of every existing users/{uid} doc into the new
// world-readable publicProfiles/{uid} collection, so cross-user views (leaderboard,
// activity, profile pages) keep working once users/{uid} is locked to owner+admin
// reads. Idempotent (merge) — safe to re-run.
//
// Run BEFORE deploying the firestore.rules lock:
//   node --env-file=.env scripts/backfill-public-profiles.mjs
//
// Credentials: same env as app/lib/firebase-admin.ts — either
// FIREBASE_SERVICE_ACCOUNT_KEY (JSON) or FIREBASE_ADMIN_CLIENT_EMAIL +
// FIREBASE_ADMIN_PRIVATE_KEY + NEXT_PUBLIC_FIREBASE_PROJECT_ID.

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const PUBLIC_FIELDS = ['username', 'usernameNormalized', 'photoURL', 'photoThumbURL']

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

function pickPublicFields(data) {
  const out = {}
  for (const key of PUBLIC_FIELDS) {
    const v = data[key]
    if (typeof v === 'string' && v.length > 0) out[key] = v
  }
  return out
}

async function main() {
  const db = getFirestore(initAdmin())
  const usersSnap = await db.collection('users').get()
  console.log(`Found ${usersSnap.size} user docs.`)

  let written = 0
  let skipped = 0
  let batch = db.batch()
  let batchCount = 0

  for (const docSnap of usersSnap.docs) {
    const fields = pickPublicFields(docSnap.data())
    if (Object.keys(fields).length === 0) {
      skipped++
      continue
    }
    batch.set(
      db.collection('publicProfiles').doc(docSnap.id),
      { ...fields, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )
    written++
    batchCount++
    // Firestore batches cap at 500 writes.
    if (batchCount === 450) {
      await batch.commit()
      batch = db.batch()
      batchCount = 0
    }
  }
  if (batchCount > 0) await batch.commit()

  console.log(`Backfill complete: ${written} publicProfiles written, ${skipped} skipped (no display fields).`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
