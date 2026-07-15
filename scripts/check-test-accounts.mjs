#!/usr/bin/env node
// One-off diagnostic: confirms seeded test accounts exist in Firestore and shows
// the raw vs. real (test-excluded) user counts side by side.
//
// Usage: node --env-file=.env scripts/check-test-accounts.mjs

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length > 0) return getApps()[0]
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    return initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) })
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore(initAdmin())
const testSnap = await db.collection('users').where('isTestAccount', '==', true).get()
const allSnap = await db.collection('users').count().get()

console.log('Test accounts in Firestore:', testSnap.size)
console.log('Total user docs (incl. test):', allSnap.data().count)
console.log('Real users (what the dashboard shows):', allSnap.data().count - testSnap.size)
