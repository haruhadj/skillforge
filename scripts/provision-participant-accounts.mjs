#!/usr/bin/env node
// Provisions N bare login accounts for real usability-testing participants.
//
// Unlike seed-test-accounts.mjs (synthetic QA/load-test data), these accounts carry
// NO fake scores, gameStats, or device metadata, and are NOT flagged isTestAccount —
// they are indistinguishable from an organic signup from the moment they're created.
// Real device info gets captured naturally the first time each participant logs in
// (ensureUserProfileDocument sets deviceType/deviceOs/deviceBrowser on sign-in), and
// every game they actually play writes real scores/gameStats through the normal
// app flow. They count toward totalUsers/leaderboard/activity/analytics immediately.
//
// Usage:
//   node --env-file=.env scripts/provision-participant-accounts.mjs [count]
//
// Credentials are written to a local JSON file (path printed at the end) — hand these
// out to your test participants. Not committed anywhere.

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const COUNT = Number(process.argv[2]) || 22
const EMAIL_DOMAIN = 'skillforge.test' // reserved TLD (RFC 2606) — swap for a real domain if participants need to receive email
const OUTPUT_DIR = process.env.SEED_OUTPUT_DIR || path.join(os.tmpdir(), 'skillforge-seed')

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

function randomPassword() {
  return crypto.randomBytes(12).toString('base64url') + '!9'
}

function randomToken(len) {
  return crypto.randomBytes(len).toString('hex').slice(0, len)
}

async function main() {
  const app = initAdmin()
  const db = getFirestore(app)
  const auth = getAuth(app)

  console.log(`Provisioning ${COUNT} participant accounts...`)
  const created = []

  for (let i = 0; i < COUNT; i++) {
    const token = randomToken(8)
    const email = `participant-${token}@${EMAIL_DOMAIN}`
    const password = randomPassword()
    const username = `participant_${token}`

    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: username,
    })
    const uid = userRecord.uid

    await db.collection('users').doc(uid).set({
      email,
      username,
      usernameNormalized: username.toLowerCase(),
      profileCompleted: true,
      authProvider: 'password',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await db.collection('usernames').doc(username.toLowerCase()).set({
      uid,
      username,
      usernameNormalized: username.toLowerCase(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    created.push({ uid, email, password, username })
    process.stdout.write(`  [${i + 1}/${COUNT}] ${email}\n`)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outPath = path.join(OUTPUT_DIR, `participant-accounts-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify(created, null, 2))

  console.log(`\nDone. ${created.length} participant accounts created.`)
  console.log(`Credentials written to: ${outPath}`)
  console.log(`No fake data was written — each account counts as a real user immediately and`)
  console.log(`will show real device/game data as soon as its participant logs in and plays.`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Provisioning failed:', err)
  process.exit(1)
})
