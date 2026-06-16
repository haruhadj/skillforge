import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import {
  aggregateGlobalLeaderboard,
  aggregateGameLeaderboard,
  aggregateGamePopularity,
  type ScoreRow,
  type StatsRow,
} from '@/app/services/scoring'

/**
 * Server-side, cached leaderboards + game popularity.
 *
 * The previous implementation ran full `collectionGroup` scans over every user's
 * scores + gameStats in the browser on every page/library load. This route runs
 * those scans once per cache window (Admin SDK) and serves all visitors from the
 * cached result, collapsing N visitors x full-scan into ~1 scan per TTL. The data is
 * public (Firestore rules allow reads), so no auth is required.
 *
 * Firestore I/O is kept to the thin mapping below; all ranking/aggregation logic
 * lives in pure functions in `scoring.ts` (unit-tested, database-free).
 */

const CACHE_TTL_SECONDS = 60

function toMillis(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis()
  }
  return null
}

/** uid is the 2nd path segment: users/{uid}/(scores|gameStats)/{id}. */
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

const getGlobalLeaderboard = unstable_cache(
  async () => {
    const [scoreRows, statsRows] = await Promise.all([readScoreRows(), readStatsRows()])
    return aggregateGlobalLeaderboard(scoreRows, statsRows)
  },
  ['leaderboard-global'],
  { revalidate: CACHE_TTL_SECONDS, tags: ['leaderboard'] },
)

const getGameLeaderboard = unstable_cache(
  async (gameId: string) => aggregateGameLeaderboard(await readScoreRows(), gameId),
  ['leaderboard-game'],
  { revalidate: CACHE_TTL_SECONDS, tags: ['leaderboard'] },
)

const getGamePopularity = unstable_cache(
  async () => aggregateGamePopularity(await readStatsRows()),
  ['leaderboard-popularity'],
  { revalidate: CACHE_TTL_SECONDS, tags: ['leaderboard'] },
)

export async function GET(request: NextRequest) {
  try {
    const mode = request.nextUrl.searchParams.get('mode') || 'global'

    if (mode === 'game') {
      const gameId = request.nextUrl.searchParams.get('gameId')
      if (!gameId) {
        return NextResponse.json({ error: 'gameId is required for mode=game' }, { status: 400 })
      }
      return NextResponse.json({ entries: await getGameLeaderboard(gameId) })
    }

    if (mode === 'popularity') {
      return NextResponse.json({ popularity: await getGamePopularity() })
    }

    return NextResponse.json({ entries: await getGlobalLeaderboard() })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
