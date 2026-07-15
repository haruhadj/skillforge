#!/usr/bin/env node
// QA/load-test seed script — creates N Firebase Auth accounts + realistic-shaped
// Firestore data (scores, gameStats, device metadata) so the leaderboard, activity
// feed, and admin analytics code paths can be exercised under real-ish data volume.
//
// Every account is flagged `isTestAccount: true` on its users/{uid} doc. That flag is
// read by app/lib/testAccounts.ts and excluded from every real-facing aggregate
// (/api/leaderboard, /api/activity, /api/admin/platform-stats, /api/admin/learning-gap)
// — seeded accounts never inflate reported user counts, leaderboard rankings, or
// analytics. They exist purely to stress the code with data, not to be counted.
//
// Usage:
//   node --env-file=.env scripts/seed-test-accounts.mjs [count]
//
// Credentials for the created accounts are written to a local JSON file (path printed
// at the end) and are NOT committed anywhere. Clean up with:
//   node --env-file=.env scripts/delete-test-accounts.mjs

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const COUNT = Number(process.argv[2]) || 22
const EMAIL_DOMAIN = 'skillforge.test' // reserved TLD (RFC 2606) — never a real deliverable domain
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
  // 16 chars, alnum + a couple of symbols — clears Firebase's min-length requirement
  // comfortably and doesn't need to be memorable (delivered via credentials file only).
  return crypto.randomBytes(12).toString('base64url') + '!9'
}

function randomToken(len) {
  return crypto.randomBytes(len).toString('hex').slice(0, len)
}

function weightedPick(weighted) {
  // weighted: [{ value, weight }]
  const total = weighted.reduce((s, w) => s + w.weight, 0)
  let r = Math.random() * total
  for (const w of weighted) {
    r -= w.weight
    if (r <= 0) return w.value
  }
  return weighted[weighted.length - 1].value
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysAgoTimestamp(maxDays) {
  const ms = Date.now() - randomInt(0, maxDays) * 24 * 60 * 60 * 1000 - randomInt(0, 86_400_000)
  return Timestamp.fromMillis(ms)
}

// --- Learn the shape of real data so seeded accounts land in the same distribution ---

async function learnDeviceDistribution(db) {
  const snap = await db.collection('users').where('isTestAccount', '!=', true).get().catch(() => null)
  // Firestore `!=` excludes docs missing the field entirely, so fall back to an
  // unfiltered scan (small collection at this scale) when that happens to return too few.
  const usersSnap = (snap && snap.size > 0) ? snap : await db.collection('users').get()

  const tally = { mobile: 0, desktop: 0, tablet: 0 }
  const osTallyByDevice = { mobile: {}, desktop: {}, tablet: {} }
  const browserTally = {}
  let counted = 0

  for (const doc of usersSnap.docs) {
    const data = doc.data()
    if (data.isTestAccount) continue
    if (data.deviceType && tally[data.deviceType] !== undefined) {
      tally[data.deviceType]++
      counted++
      const osKey = data.deviceOs || 'Unknown'
      osTallyByDevice[data.deviceType][osKey] = (osTallyByDevice[data.deviceType][osKey] || 0) + 1
      browserTally[data.deviceBrowser || 'Unknown'] = (browserTally[data.deviceBrowser || 'Unknown'] || 0) + 1
    }
  }

  // Fallback distribution if there isn't enough real device data yet: mobile-heavy,
  // matching this project's "mobile first" design intent.
  if (counted === 0) {
    return {
      deviceType: [
        { value: 'mobile', weight: 62 },
        { value: 'desktop', weight: 26 },
        { value: 'tablet', weight: 12 },
      ],
      os: {
        mobile: [{ value: 'Android', weight: 65 }, { value: 'iOS', weight: 35 }],
        desktop: [{ value: 'Windows', weight: 70 }, { value: 'macOS', weight: 25 }, { value: 'Linux', weight: 5 }],
        tablet: [{ value: 'iPadOS', weight: 60 }, { value: 'Android', weight: 40 }],
      },
      browser: [
        { value: 'Chrome', weight: 60 },
        { value: 'Safari', weight: 25 },
        { value: 'Firefox', weight: 8 },
        { value: 'Edge', weight: 5 },
        { value: 'Samsung Internet', weight: 2 },
      ],
    }
  }

  const osFallback = {
    mobile: [{ value: 'Android', weight: 65 }, { value: 'iOS', weight: 35 }],
    desktop: [{ value: 'Windows', weight: 70 }, { value: 'macOS', weight: 25 }, { value: 'Linux', weight: 5 }],
    tablet: [{ value: 'iPadOS', weight: 60 }, { value: 'Android', weight: 40 }],
  }

  const deviceType = Object.entries(tally).map(([value, weight]) => ({ value, weight: weight || 1 }))
  const browser = Object.entries(browserTally).map(([value, weight]) => ({ value, weight }))
  const os = {}
  for (const bucket of ['mobile', 'desktop', 'tablet']) {
    const real = Object.entries(osTallyByDevice[bucket]).map(([value, weight]) => ({ value, weight }))
    os[bucket] = real.length ? real : osFallback[bucket]
  }
  return {
    deviceType,
    os,
    browser: browser.length ? browser : [{ value: 'Chrome', weight: 1 }],
  }
}

async function learnGamePopularity(db, testUids) {
  const snap = await db.collectionGroup('gameStats').get()
  const tally = {}
  for (const doc of snap.docs) {
    const uid = doc.ref.path.split('/')[1]
    if (testUids.has(uid)) continue
    const count = Number(doc.data().totalMatchCount) || 0
    tally[doc.id] = (tally[doc.id] || 0) + count
  }
  const entries = Object.entries(tally).filter(([, c]) => c > 0)
  if (entries.length === 0) {
    // Fallback: a handful of generally popular categories from the registry.
    return ['2048', 'sudoku', 'chess', 'tictactoe', 'math-game', 'chroma-memory', 'spelling-bee', 'geomaster']
      .map((value) => ({ value, weight: 1 }))
  }
  return entries.map(([value, weight]) => ({ value, weight }))
}

async function main() {
  const app = initAdmin()
  const db = getFirestore(app)
  const auth = getAuth(app)

  const existingTestSnap = await db.collection('users').where('isTestAccount', '==', true).get()
  const testUids = new Set(existingTestSnap.docs.map((d) => d.id))

  console.log(`Learning real data distribution (device types, game popularity)...`)
  const deviceDist = await learnDeviceDistribution(db)
  const gameWeights = await learnGamePopularity(db, testUids)

  console.log(`Seeding ${COUNT} test accounts...`)
  const created = []

  for (let i = 0; i < COUNT; i++) {
    const token = randomToken(8)
    const email = `qa-tester-${token}@${EMAIL_DOMAIN}`
    const password = randomPassword()
    const username = `qa_tester_${token}`

    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: username,
    })
    const uid = userRecord.uid

    const deviceType = weightedPick(deviceDist.deviceType)
    const osChoices = deviceDist.os[deviceType] || deviceDist.os.desktop
    const deviceOs = weightedPick(osChoices)
    const deviceBrowser = weightedPick(deviceDist.browser)
    const createdAt = daysAgoTimestamp(75)

    // Profile doc — isTestAccount is the load-bearing flag every aggregate filters on.
    await db.collection('users').doc(uid).set({
      email,
      username,
      usernameNormalized: username.toLowerCase(),
      profileCompleted: true,
      authProvider: 'password',
      deviceType,
      deviceOs,
      deviceBrowser,
      deviceLastSeen: FieldValue.serverTimestamp(),
      isTestAccount: true,
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Reserve the username doc for schema consistency (not required for exclusion).
    await db.collection('usernames').doc(username.toLowerCase()).set({
      uid,
      username,
      usernameNormalized: username.toLowerCase(),
      createdAt,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Seed 3-8 games' worth of scores/gameStats, biased toward the real popularity mix.
    const gameCount = randomInt(3, 8)
    const pickedGames = new Set()
    let attempts = 0
    while (pickedGames.size < gameCount && attempts < gameCount * 10) {
      pickedGames.add(weightedPick(gameWeights))
      attempts++
    }

    for (const gameId of pickedGames) {
      const bestScore = randomInt(20, 950)
      const matchCount = randomInt(1, 25)
      const totalScore = bestScore * randomInt(1, matchCount) // plausible aggregate, not required to be exact
      const averageScore = totalScore / matchCount
      const mode = Math.random() < 0.8 ? 'singleplayer' : 'multiplayer'
      const updatedAt = daysAgoTimestamp(30)

      await db.collection('users').doc(uid).collection('scores').doc(gameId).set({
        bestScore,
        updatedAt,
        bestScoreAchievedAt: updatedAt,
      })

      await db.collection('users').doc(uid).collection('gameStats').doc(gameId).set({
        singleplayer: mode === 'singleplayer'
          ? { matchCount, totalScore: Math.round(totalScore * 100) / 100, averageScore: Math.round(averageScore * 100) / 100 }
          : { matchCount: 0, totalScore: 0, averageScore: 0 },
        multiplayer: mode === 'multiplayer'
          ? { matchCount, totalScore: Math.round(totalScore * 100) / 100, averageScore: Math.round(averageScore * 100) / 100 }
          : { matchCount: 0, totalScore: 0, averageScore: 0 },
        totalMatchCount: matchCount,
        combinedAverageScore: Math.round(averageScore * 100) / 100,
        lastMode: mode,
        lastScore: bestScore,
        accuracyPercentage: Math.round(averageScore * 100) / 100,
        updatedAt,
      })
    }

    created.push({ uid, email, password, username, deviceType, deviceOs, gamesSeeded: [...pickedGames] })
    process.stdout.write(`  [${i + 1}/${COUNT}] ${email} (${deviceType}/${deviceOs}, ${pickedGames.size} games)\n`)
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  const outPath = path.join(OUTPUT_DIR, `test-accounts-${Date.now()}.json`)
  fs.writeFileSync(outPath, JSON.stringify(created, null, 2))

  console.log(`\nDone. ${created.length} test accounts created (flagged isTestAccount: true).`)
  console.log(`Credentials written to: ${outPath}`)
  console.log(`These are excluded from /api/leaderboard, /api/activity, platform-stats, and learning-gap analytics.`)
  console.log(`Delete them with: node --env-file=.env scripts/delete-test-accounts.mjs`)
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
