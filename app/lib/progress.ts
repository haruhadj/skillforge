/**
 * Pure helpers for the server progress API (`/api/games/progress`).
 *
 * Deliberately Firebase-free (like `scoring.ts`) so the route stays thin and the
 * sanitisation/migration logic is trivially unit-testable.
 *
 * S2-b: the per-game resume/progress blob is stored under `gameStats.progress` so a
 * client can never reach the top-level weighted-stats fields the leaderboard trusts
 * (`buildWeightedModeStats` owns those). These keys are the ones we keep OUT of the
 * blob namespace and skip when reconstructing a legacy (pre-namespacing) blob.
 */

// Top-level keys written by `buildWeightedModeStats` (+ `updatedAt`). Anything else at
// the top level of a legacy gameStats doc was the resume blob.
export const RESERVED_STATS_KEYS = [
  'singleplayer',
  'multiplayer',
  'totalMatchCount',
  'combinedAverageScore',
  'lastMode',
  'lastScore',
  'accuracyPercentage',
  'updatedAt',
] as const

const RESERVED = new Set<string>([...RESERVED_STATS_KEYS, 'progress'])

export interface SanitizeResult {
  ok: boolean
  blob?: Record<string, unknown>
  error?: string
}

/**
 * Validate a client-supplied progress blob: must be a plain object (not null/array)
 * and serialise to at most `maxBytes` UTF-8 bytes. Returns the blob on success.
 */
export function sanitizeProgressBlob(input: unknown, maxBytes: number): SanitizeResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'progress must be an object' }
  }

  let serialized: string
  try {
    serialized = JSON.stringify(input)
  } catch {
    return { ok: false, error: 'progress is not serializable' }
  }
  if (serialized === undefined) {
    return { ok: false, error: 'progress is not serializable' }
  }

  const bytes = Buffer.byteLength(serialized, 'utf8')
  if (bytes > maxBytes) {
    return { ok: false, error: `progress exceeds ${maxBytes} bytes` }
  }

  return { ok: true, blob: input as Record<string, unknown> }
}

/**
 * Reconstruct a resume blob from a legacy gameStats doc that predates namespacing
 * (blob stored at the top level): every top-level key except the reserved
 * weighted-stats keys (and `progress` itself). Lets existing in-flight saves survive
 * the migration on the first read.
 */
export function extractLegacyProgress(
  docData: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!docData || typeof docData !== 'object') return {}
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(docData)) {
    if (!RESERVED.has(key)) out[key] = value
  }
  return out
}
