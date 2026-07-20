import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { requireStaff } from '@/app/lib/requireAdmin'
import { isFresh } from '@/app/lib/cacheFreshness'
import { getTestAccountUids } from '@/app/lib/testAccounts'

// Cache the platform totals; only rescan gameStats past this TTL. (audit R17)
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_DOC = 'platformStats'

export async function GET(request: NextRequest) {
  const gate = await requireStaff(request)
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status })
  }

  try {
    const adminDb = getAdminDb()
    const cacheRef = adminDb.collection('adminCache').doc(CACHE_DOC)

    const cacheSnap = await cacheRef.get()
    const cached = cacheSnap.data()
    if (cacheSnap.exists && cached?.stats && isFresh(cached, CACHE_TTL_MS)) {
      return NextResponse.json(cached.stats)
    }

    // count() avoids reading every user doc just to size the collection.
    const [usersCount, testUids, statsSnap] = await Promise.all([
      adminDb.collection('users').count().get(),
      getTestAccountUids(adminDb),
      adminDb.collectionGroup('gameStats').get(),
    ])

    let totalMatches = 0
    statsSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      const uid = d.ref.path.split('/')[1]
      if (testUids.has(uid)) return
      totalMatches += Number(d.data().totalMatchCount) || 0
    })

    const stats = { totalUsers: usersCount.data().count - testUids.size, totalMatches }

    await cacheRef.set({ stats, recomputedAt: FieldValue.serverTimestamp() })
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Platform-stats error:', error)
    return NextResponse.json({ error: 'Failed to load platform stats' }, { status: 500 })
  }
}
