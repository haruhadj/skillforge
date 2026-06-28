import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { defaultGames } from '@/app/games/games'
import { rateLimit, sweepExpired } from '@/app/lib/rateLimit'
import { sanitizeProgressBlob, extractLegacyProgress } from '@/app/lib/progress'

// Per-user throttle so a single valid token can't flood progress writes/reads.
const PROGRESS_LIMIT = 60
const PROGRESS_WINDOW_MS = 60 * 1000

// Resume state is small; cap the serialized blob well under Firestore's ~1 MB doc
// limit (it shares the gameStats doc with the weighted stats). Generous for any game.
const MAX_PROGRESS_BYTES = 64 * 1024

/**
 * Server-authoritative game progress (resume) API. S2-b.
 *
 * The per-game resume blob used to be written to `users/{uid}/gameStats/{gameId}`
 * directly via the client SDK, which kept that doc client-writable — and the
 * leaderboard trusts the weighted-stats fields in the same doc. This route moves the
 * blob behind a verified ID token (uid derived from the token, never the body) and
 * stores it under a nested `progress` field via the Admin SDK, so the client can never
 * touch the top-level leaderboard fields. With gameStats locked in the Firestore rules,
 * this + `/api/games/score` are the only write paths.
 */

function authUid(authHeader: string | null): Promise<string> | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.split('Bearer ')[1]
  return getAdminAuth()
    .verifyIdToken(token)
    .then((decoded) => decoded.uid)
}

function validGameId(gameId: unknown): gameId is string {
  return typeof gameId === 'string' && defaultGames.some((g) => g.id === gameId)
}

export async function POST(request: NextRequest) {
  try {
    const uidPromise = authUid(request.headers.get('authorization'))
    if (!uidPromise) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let uid: string
    try {
      uid = await uidPromise
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    sweepExpired()
    const limit = rateLimit(`progress:uid:${uid}`, PROGRESS_LIMIT, PROGRESS_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const body = await request.json()
    const { gameId, progress } = body

    if (!validGameId(gameId)) {
      return NextResponse.json({ error: 'Unknown or missing gameId' }, { status: 400 })
    }

    const sanitized = sanitizeProgressBlob(progress, MAX_PROGRESS_BYTES)
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: 400 })
    }

    const statsRef = getAdminDb().collection('users').doc(uid).collection('gameStats').doc(gameId)
    // Namespaced under `progress` (never the top-level weighted-stats fields the
    // leaderboard reads); top-level `updatedAt` keeps progress-only games in the
    // recent-activity feed. merge:true stays independent from the score route's writes.
    await statsRef.set(
      { progress: sanitized.blob, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Progress save error:', error)
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const uidPromise = authUid(request.headers.get('authorization'))
    if (!uidPromise) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let uid: string
    try {
      uid = await uidPromise
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    sweepExpired()
    const limit = rateLimit(`progress:uid:${uid}`, PROGRESS_LIMIT, PROGRESS_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const gameId = request.nextUrl.searchParams.get('gameId')
    if (!validGameId(gameId)) {
      return NextResponse.json({ error: 'Unknown or missing gameId' }, { status: 400 })
    }

    const statsRef = getAdminDb().collection('users').doc(uid).collection('gameStats').doc(gameId)
    const snap = await statsRef.get()
    const data = snap.exists ? (snap.data() as Record<string, unknown>) : null

    // Prefer the namespaced blob; fall back to a legacy top-level blob so an existing
    // user's in-flight resume survives the migration until their next save.
    const progress =
      data && data.progress && typeof data.progress === 'object'
        ? (data.progress as Record<string, unknown>)
        : extractLegacyProgress(data)

    return NextResponse.json({ progress })
  } catch (error) {
    console.error('Progress read error:', error)
    return NextResponse.json({ error: 'Failed to read progress' }, { status: 500 })
  }
}
