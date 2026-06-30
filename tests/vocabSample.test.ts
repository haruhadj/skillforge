import { describe, it, expect } from 'vitest'
import { sampleDistinct } from '@/server/wordnet/sample.js'

// Guards the vocab ORDER BY RANDOM() -> cached-pool + JS sampling rewrite (audit R17).
describe('sampleDistinct', () => {
  const pool = Array.from({ length: 1000 }, (_, i) => ({ id: i }))

  it('returns exactly n distinct elements drawn from the pool', () => {
    const out = sampleDistinct(pool, 10)
    expect(out).toHaveLength(10)
    expect(new Set(out.map((r) => r.id)).size).toBe(10)
    expect(out.every((r) => r.id >= 0 && r.id < 1000)).toBe(true)
  })

  it('does not mutate the source pool', () => {
    const before = pool.slice()
    sampleDistinct(pool, 25)
    expect(pool).toEqual(before)
    expect(pool).toHaveLength(1000)
  })

  it('returns the whole pool (shuffled) when n >= pool length', () => {
    const small = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const out = sampleDistinct(small, 5)
    expect(out).toHaveLength(3)
    expect(new Set(out.map((r) => r.id))).toEqual(new Set([1, 2, 3]))
  })

  it('returns an empty array when n is 0', () => {
    expect(sampleDistinct(pool, 0)).toEqual([])
  })

  it('produces varied draws across calls (randomized, not fixed)', () => {
    const draws = new Set<string>()
    for (let i = 0; i < 20; i++) {
      draws.add(
        sampleDistinct(pool, 5)
          .map((r) => r.id)
          .join(','),
      )
    }
    // With a 1000-element pool, 20 independent 5-draws should not all collide.
    expect(draws.size).toBeGreaterThan(1)
  })
})
