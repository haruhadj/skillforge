import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { isFresh } from '@/app/lib/cacheFreshness'
import { rateLimit, clientIpFrom, sweepExpired } from '@/app/lib/rateLimit'

/**
 * Public "players online now" count. A presence doc (presence/{uid}) is heartbeat-
 * written by PresenceTracker while a signed-in tab is visible; a user counts as
 * online when their lastActiveAt falls within ACTIVE_WINDOW_MS. The count is cached
 * ~10s in an Admin-SDK-only cache doc so the aggregate query can't be spammed, and
 * so the presence collection itself never needs to be client-readable. Feeds both
 * the public TopNav pill and the admin "Active Now" card.
 */
const ONLINE_LIMIT = 60
const ONLINE_RL_WINDOW_MS = 60 * 1000
const ACTIVE_WINDOW_MS = 5 * 60 * 1000
const CACHE_TTL_MS = 10 * 1000

export async function GET(request: NextRequest) {
  try {
    sweepExpired()
    const limit = rateLimit(`online:ip:${clientIpFrom(request)}`, ONLINE_LIMIT, ONLINE_RL_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const adminDb = getAdminDb()
    const cacheRef = adminDb.collection('adminCache').doc('onlineCount')

    const cacheSnap = await cacheRef.get()
    const cached = cacheSnap.data()
    if (cacheSnap.exists && typeof cached?.count === 'number' && isFresh(cached, CACHE_TTL_MS)) {
      return NextResponse.json({ count: cached.count })
    }

    const cutoff = Timestamp.fromMillis(Date.now() - ACTIVE_WINDOW_MS)
    const agg = await adminDb.collection('presence').where('lastActiveAt', '>=', cutoff).count().get()
    const count = agg.data().count

    await cacheRef.set({ count, recomputedAt: FieldValue.serverTimestamp() })
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Online-count error:', error)
    // Best-effort signal — never surface a hard error to the pill/card.
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}
