import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { defaultGames } from '@/app/games/games'

// Constant-time bearer-token compare so the shared secret can't be recovered by
// timing the response to a `===` short-circuit (audit S5).
function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const got = Buffer.from(header)
  if (got.length !== expected.length) return false
  return timingSafeEqual(got, expected)
}
import {
  aggregateGlobalLeaderboard,
  aggregateGameLeaderboard,
  aggregateGamePopularity,
  type ScoreRow,
  type StatsRow,
} from '@/app/services/scoring'

function toMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as Record<string, unknown>).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

function uidFromPath(path: string): string {
  return path.split('/')[1]
}

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'INTERNAL_API_SECRET not configured' }, { status: 500 })
  }
  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminDb = getAdminDb()
  const [scoresSnap, statsSnap] = await Promise.all([
    adminDb.collectionGroup('scores').get(),
    adminDb.collectionGroup('gameStats').get(),
  ])

  const scoreRows: ScoreRow[] = scoresSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    uid: uidFromPath(d.ref.path),
    gameId: d.id,
    bestScore: Number(d.data().bestScore) || 0,
    updatedAt: toMillis(d.data().updatedAt),
  }))

  const statsRows: StatsRow[] = statsSnap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    uid: uidFromPath(d.ref.path),
    gameId: d.id,
    totalMatchCount: Number(d.data().totalMatchCount) || 0,
  }))

  const globalEntries = aggregateGlobalLeaderboard(scoreRows, statsRows)
  const popularity = aggregateGamePopularity(statsRows)
  const gameIds = defaultGames.map((g) => g.id)

  // Firestore batch limit is 500 ops; 28 games + 2 meta docs = 30 — well within range.
  const batch = adminDb.batch()
  const now = FieldValue.serverTimestamp()

  batch.set(adminDb.collection('leaderboards').doc('_global'), { entries: globalEntries, recomputedAt: now })
  batch.set(adminDb.collection('leaderboards').doc('_popularity'), { popularity, recomputedAt: now })

  for (const gameId of gameIds) {
    const entries = aggregateGameLeaderboard(scoreRows, gameId).slice(0, 10)
    batch.set(adminDb.collection('leaderboards').doc(gameId), { entries, recomputedAt: now })
  }

  await batch.commit()

  return NextResponse.json({ ok: true, recomputedAt: new Date().toISOString(), gameCount: gameIds.length })
}
