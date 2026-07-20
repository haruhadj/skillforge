import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { isFresh, toMillis, uidFromPath } from '@/app/lib/cacheFreshness'
import { rateLimit, clientIpFrom, sweepExpired } from '@/app/lib/rateLimit'
import { getTestAccountUids } from '@/app/lib/testAccounts'

/**
 * Public global activity feed.
 *
 * Replaces the client-side `collectionGroup('gameStats') orderBy(updatedAt) limit 50` scan
 * (which read every gameStats doc to sort) with a single cached read. Public + IP
 * rate-limited like /api/leaderboard so a flood can't repeatedly trigger the scan.
 * (audit R17 — activity feed caching)
 */
const ACTIVITY_LIMIT = 30
const ACTIVITY_WINDOW_MS = 60 * 1000
const CACHE_TTL_MS = 60 * 1000
const FEED_SIZE = 50

export async function GET(request: NextRequest) {
  try {
    sweepExpired()
    const limit = rateLimit(`activity:ip:${clientIpFrom(request)}`, ACTIVITY_LIMIT, ACTIVITY_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const adminDb = getAdminDb()
    const cacheRef = adminDb.collection('activityCache').doc('recent')

    const cacheSnap = await cacheRef.get()
    const cached = cacheSnap.data()
    if (cacheSnap.exists && Array.isArray(cached?.items) && isFresh(cached, CACHE_TTL_MS)) {
      return NextResponse.json({ items: cached!.items })
    }

    const testUids = await getTestAccountUids(adminDb)

    // Over-fetch beyond FEED_SIZE since test-account rows get filtered out below;
    // otherwise a heavily-seeded test batch could shrink the real feed under FEED_SIZE.
    const snap = await adminDb
      .collectionGroup('gameStats')
      .orderBy('updatedAt', 'desc')
      .limit(FEED_SIZE + testUids.size)
      .get()

    const items = snap.docs
      .map((d: QueryDocumentSnapshot<DocumentData>) => {
        const data = d.data()
        const ms = toMillis(data.updatedAt)
        const userId = uidFromPath(d.ref.path)
        if (ms == null || !userId || testUids.has(userId)) return null
        return {
          userId,
          gameId: d.id,
          lastMode: (data.lastMode as 'singleplayer' | 'multiplayer') ?? null,
          lastScore: typeof data.lastScore === 'number' ? data.lastScore : null,
          updatedAt: new Date(ms).toISOString(),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, FEED_SIZE)

    await cacheRef.set({ items, recomputedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 })
  }
}
