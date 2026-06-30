import type { DocumentData } from 'firebase-admin/firestore'

/**
 * Helpers for the "materialized Firestore cache doc with a TTL" pattern used by the
 * leaderboard and admin-analytics routes: a cache doc carries a `recomputedAt` timestamp;
 * a read serves it while fresh, otherwise recomputes + rewrites. (audit R17)
 */

export function toMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof (value as Record<string, unknown>).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis()
  }
  return null
}

/** True when a cached doc exists and its recomputedAt is within ttlMs of now. */
export function isFresh(data: DocumentData | undefined, ttlMs: number): boolean {
  if (!data) return false
  const cachedAt = toMillis(data.recomputedAt) ?? 0
  return Date.now() - cachedAt <= ttlMs
}

/** uid segment of a users/{uid}/<sub>/<id> collectionGroup doc path. */
export function uidFromPath(path: string): string {
  return path.split('/')[1]
}
