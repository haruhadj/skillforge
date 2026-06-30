/**
 * Pure random-sampling helper for the WordNet candidate caches (no DB dependency, so it
 * is unit-testable without opening the SQLite file). (audit R17)
 */

/**
 * Return up to `n` distinct random elements from `pool` without mutating it.
 * For n >= pool.length, returns a shuffled copy of the whole pool. For the common
 * case (small n, large pool) it uses rejection sampling, which is O(n) on average.
 * @param {Array} pool - Source rows (treated as read-only)
 * @param {number} n - Number of elements to draw
 * @returns {Array} Up to n distinct elements in random order
 */
export function sampleDistinct(pool, n) {
  const len = pool.length
  if (n >= len) {
    const copy = pool.slice()
    for (let i = len - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  const chosen = new Set()
  const result = []
  while (result.length < n) {
    const idx = Math.floor(Math.random() * len)
    if (!chosen.has(idx)) {
      chosen.add(idx)
      result.push(pool[idx])
    }
  }
  return result
}
