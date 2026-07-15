import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { defaultGames } from '@/app/games/games'
import {
  aggregateGlobalLeaderboard,
  aggregateGameLeaderboard,
  aggregateGamePopularity,
  type ScoreRow,
  type StatsRow,
} from '@/app/services/scoring'
import { rateLimit, clientIpFrom, sweepExpired } from '@/app/lib/rateLimit'
import { getTestAccountUids } from '@/app/lib/testAccounts'

// Public, unauthenticated read — throttle per IP so a flood can't repeatedly
// trigger the expensive collectionGroup fallback when the cache doc is missing.
const LB_LIMIT = 30
const LB_WINDOW_MS = 60 * 1000

/**
 * Server-side leaderboard reads.
 *
 * Primary path: reads a single pre-computed Firestore document from /leaderboards/<key>
 * (1 read per request). These documents are written by POST /api/internal/leaderboards/recompute
 * and should be called once after each deploy and periodically thereafter.
 *
 * Fallback path (first run / missing doc): runs a full collectionGroup scan, writes the
 * materialized document, then returns the result. Subsequent requests hit the fast path.
 */

// Materialized leaderboard docs are considered fresh for this long; past it, a read
// degrades to a recompute-and-cache instead of serving stale-forever data. Nothing in
// the repo invokes the recompute route, so without a TTL the first request freezes the
// values permanently (audit N5/#4).
const CACHE_TTL_MS = 5 * 60 * 1000

function toMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as Record<string, unknown>).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

// True when a cached leaderboard doc exists and its recomputedAt is within the TTL.
function isFresh(data: DocumentData | undefined, ttlMs: number): boolean {
  if (!data) return false
  const cachedAt = toMillis(data.recomputedAt) ?? 0
  return Date.now() - cachedAt <= ttlMs
}

function uidFromPath(path: string): string {
  return path.split('/')[1]
}

async function readScoreRows(excludeUids: Set<string>): Promise<ScoreRow[]> {
  const snap = await getAdminDb().collectionGroup('scores').get()
  return snap.docs
    .map((d: QueryDocumentSnapshot<DocumentData>) => ({
      uid: uidFromPath(d.ref.path),
      gameId: d.id,
      bestScore: Number(d.data().bestScore) || 0,
      updatedAt: toMillis(d.data().updatedAt),
    }))
    .filter((r) => !excludeUids.has(r.uid))
}

async function readStatsRows(excludeUids: Set<string>): Promise<StatsRow[]> {
  const snap = await getAdminDb().collectionGroup('gameStats').get()
  return snap.docs
    .map((d: QueryDocumentSnapshot<DocumentData>) => ({
      uid: uidFromPath(d.ref.path),
      gameId: d.id,
      totalMatchCount: Number(d.data().totalMatchCount) || 0,
    }))
    .filter((r) => !excludeUids.has(r.uid))
}

export async function GET(request: NextRequest) {
  try {
    sweepExpired()
    const limit = rateLimit(`lb:ip:${clientIpFrom(request)}`, LB_LIMIT, LB_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const adminDb = getAdminDb()
    const mode = request.nextUrl.searchParams.get('mode') || 'global'
    const now = FieldValue.serverTimestamp()

    if (mode === 'game') {
      const gameId = request.nextUrl.searchParams.get('gameId')
      if (!gameId) {
        return NextResponse.json({ error: 'gameId is required for mode=game' }, { status: 400 })
      }
      // Validate against the known game registry before using gameId as a Firestore
      // doc id — otherwise an unauthenticated caller could mint arbitrary junk
      // `leaderboards/*` docs (or steer the write to nested paths via slashes).
      if (!defaultGames.some((g) => g.id === gameId)) {
        return NextResponse.json({ error: 'Unknown gameId' }, { status: 404 })
      }

      const snap = await adminDb.collection('leaderboards').doc(gameId).get()
      const cached = snap.data()
      if (snap.exists && Array.isArray(cached?.entries) && isFresh(cached, CACHE_TTL_MS)) {
        return NextResponse.json({ entries: cached!.entries })
      }

      const testUids = await getTestAccountUids(adminDb)
      const entries = aggregateGameLeaderboard(await readScoreRows(testUids), gameId).slice(0, 10)
      await adminDb.collection('leaderboards').doc(gameId).set({ entries, recomputedAt: now })
      return NextResponse.json({ entries })
    }

    if (mode === 'popularity') {
      const snap = await adminDb.collection('leaderboards').doc('_popularity').get()
      const data = snap.data()
      if (snap.exists && data?.popularity && isFresh(data, CACHE_TTL_MS)) {
        return NextResponse.json({ popularity: data!.popularity })
      }

      const testUids = await getTestAccountUids(adminDb)
      const popularity = aggregateGamePopularity(await readStatsRows(testUids))
      await adminDb.collection('leaderboards').doc('_popularity').set({ popularity, recomputedAt: now })
      return NextResponse.json({ popularity })
    }

    // mode === 'global' (default)
    const snap = await adminDb.collection('leaderboards').doc('_global').get()
    const cachedGlobal = snap.data()
    if (snap.exists && Array.isArray(cachedGlobal?.entries) && isFresh(cachedGlobal, CACHE_TTL_MS)) {
      return NextResponse.json({ entries: cachedGlobal!.entries })
    }

    const testUids = await getTestAccountUids(adminDb)
    const [scoreRows, statsRows] = await Promise.all([readScoreRows(testUids), readStatsRows(testUids)])
    const entries = aggregateGlobalLeaderboard(scoreRows, statsRows)
    await adminDb.collection('leaderboards').doc('_global').set({ entries, recomputedAt: now })
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
