import { describe, it, expect } from 'vitest'
import {
  sanitizeProgressBlob,
  extractLegacyProgress,
  RESERVED_STATS_KEYS,
} from '@/app/lib/progress'

const MAX = 64 * 1024

describe('sanitizeProgressBlob', () => {
  it('accepts a plain object within the size cap', () => {
    const res = sanitizeProgressBlob({ level: 3, board: [1, 2, 3] }, MAX)
    expect(res.ok).toBe(true)
    expect(res.blob).toEqual({ level: 3, board: [1, 2, 3] })
  })

  it('rejects non-objects', () => {
    expect(sanitizeProgressBlob(null, MAX).ok).toBe(false)
    expect(sanitizeProgressBlob('nope', MAX).ok).toBe(false)
    expect(sanitizeProgressBlob(42, MAX).ok).toBe(false)
    expect(sanitizeProgressBlob(undefined, MAX).ok).toBe(false)
  })

  it('rejects arrays (must be a keyed blob)', () => {
    expect(sanitizeProgressBlob([1, 2, 3], MAX).ok).toBe(false)
  })

  it('rejects a blob that exceeds the byte cap', () => {
    const big = { data: 'x'.repeat(MAX + 1) }
    const res = sanitizeProgressBlob(big, MAX)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/bytes/)
  })

  it('measures UTF-8 bytes, not character count', () => {
    // A 4-byte emoji repeated to just over the cap in bytes but fewer chars.
    const chars = Math.floor(MAX / 4) + 1
    const res = sanitizeProgressBlob({ s: '😀'.repeat(chars) }, MAX)
    expect(res.ok).toBe(false)
  })
})

describe('extractLegacyProgress', () => {
  it('returns only top-level non-reserved keys', () => {
    const doc = {
      // reserved (weighted-stats) keys that must be stripped
      singleplayer: { matchCount: 5 },
      multiplayer: { matchCount: 2 },
      totalMatchCount: 7,
      combinedAverageScore: 88,
      lastMode: 'singleplayer',
      lastScore: 90,
      accuracyPercentage: 88,
      updatedAt: { _seconds: 1 },
      // legacy resume fields that must survive
      level: 4,
      savedBoard: [0, 0, 1],
    }
    expect(extractLegacyProgress(doc)).toEqual({ level: 4, savedBoard: [0, 0, 1] })
  })

  it('strips a nested progress key too (already-migrated docs)', () => {
    expect(extractLegacyProgress({ progress: { level: 1 }, level: 9 })).toEqual({ level: 9 })
  })

  it('returns {} for null/empty docs', () => {
    expect(extractLegacyProgress(null)).toEqual({})
    expect(extractLegacyProgress(undefined)).toEqual({})
    expect(extractLegacyProgress({})).toEqual({})
  })

  it('strips every reserved key', () => {
    const doc: Record<string, unknown> = { keep: 1 }
    for (const k of RESERVED_STATS_KEYS) doc[k] = 'x'
    expect(extractLegacyProgress(doc)).toEqual({ keep: 1 })
  })
})
