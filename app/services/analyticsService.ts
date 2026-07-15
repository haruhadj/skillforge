import { auth } from '@/app/lib/firebase'
import type { LearningGapReport } from '@/app/services/analyticsCompute'

// Re-export the pure aggregation types + subject maps so existing imports
// (`@/app/services/analyticsService`) keep working unchanged.
export {
  GAME_SUBJECTS,
  SUBJECT_COLORS,
  computeLearningGapReport,
} from '@/app/services/analyticsCompute'
export type {
  GameLearningAnalytics,
  SubjectAnalytics,
  StudentRiskProfile,
  DeviceStats,
  LearningGapReport,
} from '@/app/services/analyticsCompute'

/**
 * Fetch the learning-gap report from the cached, admin-gated server route.
 *
 * Previously this ran two client-side collectionGroup scans (all scores + all gameStats)
 * plus a full users read on every Analytics-tab render. The scan now happens once
 * server-side behind a 5-minute Firestore cache; the client just reads the JSON.
 * (audit R17 — admin analytics caching)
 */
export async function getLearningGapReport(): Promise<LearningGapReport> {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/admin/learning-gap', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'Staff access required' : 'Failed to load analytics')
  }

  const data = await res.json()
  // generatedAt is serialized to an ISO string over JSON — revive to a Date.
  return { ...data, generatedAt: new Date(data.generatedAt) } as LearningGapReport
}
