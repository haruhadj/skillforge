import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import {
  aggregateGlobalLeaderboard,
  aggregateGameLeaderboard,
  aggregateGamePopularity,
  type ScoreRow,
  type StatsRow,
} from '@/app/services/scoring'

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

function toMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as Record<string, unknown>).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

function uidFromPath(path: string): string {
  return path.split('/')[1]
}

async function readScoreRows(): Promise<ScoreRow[]> {
  const snap = await getAdminDb().collectionGroup('scores').get()
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    uid: uidFromPath(d.ref.path),
    gameId: d.id,
    bestScore: Number(d.data().bestScore) || 0,
    updatedAt: toMillis(d.data().updatedAt),
  }))
}

async function readStatsRows(): Promise<StatsRow[]> {
  const snap = await getAdminDb().collectionGroup('gameStats').get()
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    uid: uidFromPath(d.ref.path),
    gameId: d.id,
    totalMatchCount: Number(d.data().totalMatchCount) || 0,
  }))
}

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb()
    const mode = request.nextUrl.searchParams.get('mode') || 'global'
    const now = FieldValue.serverTimestamp()

    if (mode === 'game') {
      const gameId = request.nextUrl.searchParams.get('gameId')
      if (!gameId) {
        return NextResponse.json({ error: 'gameId is required for mode=game' }, { status: 400 })
      }

      const snap = await adminDb.collection('leaderboards').doc(gameId).get()
      if (snap.exists && Array.isArray(snap.data()?.entries)) {
        return NextResponse.json({ entries: snap.data()!.entries })
      }

      const entries = aggregateGameLeaderboard(await readScoreRows(), gameId).slice(0, 10)
      await adminDb.collection('leaderboards').doc(gameId).set({ entries, recomputedAt: now })
      return NextResponse.json({ entries })
    }

    if (mode === 'popularity') {
      const snap = await adminDb.collection('leaderboards').doc('_popularity').get()
      const data = snap.data()
      const cachedAt = toMillis(data?.recomputedAt) ?? 0
      const stale = !snap.exists || !data?.popularity || Date.now() - cachedAt > 5 * 60 * 1000
      if (!stale) {
        return NextResponse.json({ popularity: data!.popularity })
      }

      const popularity = aggregateGamePopularity(await readStatsRows())
      await adminDb.collection('leaderboards').doc('_popularity').set({ popularity, recomputedAt: now })
      return NextResponse.json({ popularity })
    }

    // mode === 'global' (default)
    const snap = await adminDb.collection('leaderboards').doc('_global').get()
    if (snap.exists && Array.isArray(snap.data()?.entries)) {
      return NextResponse.json({ entries: snap.data()!.entries })
    }

    const [scoreRows, statsRows] = await Promise.all([readScoreRows(), readStatsRows()])
    const entries = aggregateGlobalLeaderboard(scoreRows, statsRows)
    await adminDb.collection('leaderboards').doc('_global').set({ entries, recomputedAt: now })
    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
