import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { getAdminDb } from '@/app/lib/firebase-admin'
import { requireStaff } from '@/app/lib/requireAdmin'
import { isFresh, uidFromPath } from '@/app/lib/cacheFreshness'
import { getTestAccountUids } from '@/app/lib/testAccounts'
import { defaultGames } from '@/app/games/games'
import {
  computeLearningGapReport,
  type AnalyticsUserRow,
  type AnalyticsScoreRow,
  type AnalyticsStatsRow,
} from '@/app/services/analyticsCompute'

// Admin analytics is expensive (all users + all scores + all gameStats). Cache the
// computed report and only rescan past this TTL. (audit R17 — admin analytics caching)
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_DOC = 'learningGap'

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
    if (cacheSnap.exists && cached?.report && isFresh(cached, CACHE_TTL_MS)) {
      return NextResponse.json(cached.report)
    }

    const [usersSnap, scoresSnap, statsSnap, testUids] = await Promise.all([
      adminDb.collection('users').get(),
      adminDb.collectionGroup('scores').get(),
      adminDb.collectionGroup('gameStats').get(),
      getTestAccountUids(adminDb),
    ])

    const users: AnalyticsUserRow[] = usersSnap.docs
      .filter((d: QueryDocumentSnapshot<DocumentData>) => !testUids.has(d.id))
      .map((d: QueryDocumentSnapshot<DocumentData>) => {
        const data = d.data()
        return {
          uid: d.id,
          username: data.username ?? null,
          email: data.email ?? null,
          role: data.role,
          deviceType: data.deviceType,
          deviceOs: data.deviceOs,
          deviceBrowser: data.deviceBrowser,
        }
      })

    const scores: AnalyticsScoreRow[] = scoresSnap.docs
      .map((d: QueryDocumentSnapshot<DocumentData>) => ({
        uid: uidFromPath(d.ref.path),
        gameId: d.id,
        bestScore: Number(d.data().bestScore) || 0,
      }))
      .filter((r) => !testUids.has(r.uid))

    const stats: AnalyticsStatsRow[] = statsSnap.docs
      .map((d: QueryDocumentSnapshot<DocumentData>) => ({
        uid: uidFromPath(d.ref.path),
        gameId: d.id,
        totalMatchCount: Number(d.data().totalMatchCount) || 0,
      }))
      .filter((r) => !testUids.has(r.uid))

    const gameNameMap: Record<string, string> = {}
    for (const g of defaultGames) gameNameMap[g.id] = g.name

    const report = computeLearningGapReport({ users, scores, stats, gameNameMap })
    // generatedAt → ISO string so the doc and the JSON response stay serializable.
    const serializable = { ...report, generatedAt: report.generatedAt.toISOString() }

    await cacheRef.set({ report: serializable, recomputedAt: FieldValue.serverTimestamp() })
    return NextResponse.json(serializable)
  } catch (error) {
    console.error('Learning-gap analytics error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
