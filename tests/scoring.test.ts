import { describe, it, expect } from 'vitest'
import {
  buildWeightedModeStats,
  computeCompositeScore,
  calculateTier,
  aggregateGlobalLeaderboard,
  aggregateGameLeaderboard,
  aggregateGamePopularity,
  mergeOwnLeaderboardRow,
  mergeOwnActivity,
  type ScoreRow,
  type StatsRow,
} from '@/app/services/scoring'
import type { LeaderboardEntry, ScoreData, RecentActivityItem } from '@/app/types'

describe('buildWeightedModeStats', () => {
  it('initializes singleplayer stats from a clean slate', () => {
    const stats = buildWeightedModeStats(null, 'singleplayer', 50)

    expect(stats.singleplayer).toEqual({ matchCount: 1, totalScore: 50, averageScore: 50 })
    expect(stats.multiplayer).toEqual({ matchCount: 0, totalScore: 0, averageScore: 0 })
    expect(stats.totalMatchCount).toBe(1)
    expect(stats.combinedAverageScore).toBe(50)
    expect(stats.lastMode).toBe('singleplayer')
    expect(stats.lastScore).toBe(50)
  })

  it('accumulates and averages repeated singleplayer scores', () => {
    let stats = buildWeightedModeStats(null, 'singleplayer', 40)
    stats = buildWeightedModeStats(stats, 'singleplayer', 60)
    stats = buildWeightedModeStats(stats, 'singleplayer', 80)

    expect(stats.singleplayer.matchCount).toBe(3)
    expect(stats.singleplayer.totalScore).toBe(180)
    expect(stats.singleplayer.averageScore).toBe(60)
    expect(stats.totalMatchCount).toBe(3)
    expect(stats.combinedAverageScore).toBe(60)
  })

  it('tracks singleplayer and multiplayer independently and combines them', () => {
    let stats = buildWeightedModeStats(null, 'singleplayer', 100)
    stats = buildWeightedModeStats(stats, 'multiplayer', 50)

    expect(stats.singleplayer.matchCount).toBe(1)
    expect(stats.multiplayer.matchCount).toBe(1)
    expect(stats.totalMatchCount).toBe(2)
    expect(stats.combinedAverageScore).toBe(75) // (100 + 50) / 2
    expect(stats.lastMode).toBe('multiplayer')
    expect(stats.lastScore).toBe(50)
  })

  it('rounds a repeating average to two decimal places', () => {
    let r = buildWeightedModeStats(null, 'singleplayer', 10)
    r = buildWeightedModeStats(r, 'singleplayer', 10)
    r = buildWeightedModeStats(r, 'singleplayer', 11) // 31/3 = 10.333...
    expect(r.singleplayer.averageScore).toBe(10.33)
  })

  it('derives accuracyPercentage from singleplayer average for singleplayer scores', () => {
    expect(buildWeightedModeStats(null, 'singleplayer', 73).accuracyPercentage).toBe(73)
  })

  it('preserves existing accuracyPercentage when recording a multiplayer score', () => {
    const sp = buildWeightedModeStats(null, 'singleplayer', 88)
    const mp = buildWeightedModeStats(sp, 'multiplayer', 12)
    expect(mp.accuracyPercentage).toBe(88)
  })

  it('throws on an unsupported game mode', () => {
    // @ts-expect-error intentionally passing an invalid mode
    expect(() => buildWeightedModeStats(null, 'co-op', 10)).toThrow(/Unsupported game mode/)
  })

  it('throws when the score is not a valid number', () => {
    expect(() => buildWeightedModeStats(null, 'singleplayer', Number('abc'))).toThrow(/valid number/)
  })
})

describe('computeCompositeScore', () => {
  it('weights skill at 70% with no bonuses for a single game / single match', () => {
    // skill 100 * 0.7 = 70, diversity = min(1*4,20)=4, experience = min(sqrt(1)*2,10)=2 => 76
    expect(computeCompositeScore({ avgNormalizedScore: 100, gamesPlayed: 1, totalMatchCount: 1 })).toBe(76)
  })

  it('caps the diversity bonus at 20 (5+ games) and experience at 10', () => {
    // skill 0 => 0; diversity capped 20; experience capped 10 => 30
    expect(
      computeCompositeScore({ avgNormalizedScore: 0, gamesPlayed: 50, totalMatchCount: 10_000 }),
    ).toBe(30)
  })

  it('never exceeds 100', () => {
    expect(
      computeCompositeScore({ avgNormalizedScore: 100, gamesPlayed: 50, totalMatchCount: 10_000 }),
    ).toBe(100)
  })
})

describe('calculateTier', () => {
  it('maps composite scores to tiers at the documented thresholds', () => {
    expect(calculateTier(0)).toBe('bronze')
    expect(calculateTier(19.9)).toBe('bronze')
    expect(calculateTier(20)).toBe('silver')
    expect(calculateTier(40)).toBe('gold')
    expect(calculateTier(60)).toBe('platinum')
    expect(calculateTier(80)).toBe('master')
    expect(calculateTier(100)).toBe('master')
  })
})

describe('aggregateGlobalLeaderboard', () => {
  const scores: ScoreRow[] = [
    { uid: 'alice', gameId: '2048', bestScore: 100 }, // max for 2048
    { uid: 'alice', gameId: 'chess', bestScore: 50 }, // max for chess
    { uid: 'bob', gameId: '2048', bestScore: 50 }, // 50% of max
  ]
  const stats: StatsRow[] = [
    { uid: 'alice', gameId: '2048', totalMatchCount: 3 },
    { uid: 'alice', gameId: 'chess', totalMatchCount: 1 },
    { uid: 'bob', gameId: '2048', totalMatchCount: 1 },
  ]

  it('normalizes per-game, sums matches per user, and ranks high→low', () => {
    const result = aggregateGlobalLeaderboard(scores, stats)

    expect(result.map((r) => r.uid)).toEqual(['alice', 'bob'])

    const alice = result[0]
    expect(alice.gamesPlayed).toBe(2)
    expect(alice.totalMatchCount).toBe(4) // 3 + 1 across both games
    expect(alice.avgNormalizedScore).toBe(100) // both games at their max
    // 100*0.7 + min(2*4,20)=8 + min(sqrt(4)*2,10)=4 => 82 (master)
    expect(alice.compositeScore).toBe(82)
    expect(alice.tier).toBe('master')

    const bob = result[1]
    expect(bob.avgNormalizedScore).toBe(50) // 50/100 of the 2048 max
  })

  it('returns an empty array when there are no stats', () => {
    expect(aggregateGlobalLeaderboard([], [])).toEqual([])
  })
})

describe('aggregateGameLeaderboard', () => {
  it('keeps only the requested game and sorts by best score', () => {
    const rows: ScoreRow[] = [
      { uid: 'a', gameId: 'chess', bestScore: 10, updatedAt: 111 },
      { uid: 'b', gameId: 'chess', bestScore: 30 },
      { uid: 'c', gameId: '2048', bestScore: 99 }, // different game, excluded
      { uid: 'd', gameId: 'chess', bestScore: 20 },
    ]
    const result = aggregateGameLeaderboard(rows, 'chess')

    expect(result.map((r) => r.uid)).toEqual(['b', 'd', 'a'])
    expect(result.map((r) => r.bestScore)).toEqual([30, 20, 10])
    expect(result[2].updatedAt).toBe(111)
    expect(result[0].updatedAt).toBeNull() // missing updatedAt normalized to null
  })
})

describe('aggregateGamePopularity', () => {
  it('sums total matches per game across users', () => {
    const stats: StatsRow[] = [
      { uid: 'a', gameId: 'chess', totalMatchCount: 5 },
      { uid: 'b', gameId: 'chess', totalMatchCount: 3 },
      { uid: 'a', gameId: '2048', totalMatchCount: 2 },
    ]
    expect(aggregateGamePopularity(stats)).toEqual({ chess: 8, '2048': 2 })
  })
})

describe('mergeOwnLeaderboardRow', () => {
  const own = (bestScore: number): ScoreData => ({ bestScore, updatedAt: new Date('2026-07-03') })

  it('inserts the caller into a not-yet-full board, sorted by score', () => {
    const rows: LeaderboardEntry[] = [
      { uid: 'a', bestScore: 100, updatedAt: new Date() },
      { uid: 'b', bestScore: 50, updatedAt: new Date() },
    ]
    const result = mergeOwnLeaderboardRow(rows, 'me', own(75), 10)
    expect(result.map((r) => r.uid)).toEqual(['a', 'me', 'b'])
  })

  it('replaces the caller\'s existing row instead of duplicating it', () => {
    const rows: LeaderboardEntry[] = [
      { uid: 'me', bestScore: 10, updatedAt: new Date() },
      { uid: 'a', bestScore: 20, updatedAt: new Date() },
    ]
    const result = mergeOwnLeaderboardRow(rows, 'me', own(30), 10)
    expect(result.map((r) => r.uid)).toEqual(['me', 'a'])
    expect(result[0].bestScore).toBe(30)
  })

  it('does not insert a new, low score that would not place within a full board', () => {
    const rows: LeaderboardEntry[] = Array.from({ length: 3 }, (_, i) => ({
      uid: `p${i}`,
      bestScore: 100 - i * 10,
      updatedAt: new Date(),
    }))
    const result = mergeOwnLeaderboardRow(rows, 'me', own(5), 3)
    expect(result.map((r) => r.uid)).toEqual(['p0', 'p1', 'p2'])
  })

  it('inserts and truncates when the caller legitimately beats the lowest row on a full board', () => {
    const rows: LeaderboardEntry[] = [
      { uid: 'a', bestScore: 100, updatedAt: new Date() },
      { uid: 'b', bestScore: 90, updatedAt: new Date() },
      { uid: 'c', bestScore: 80, updatedAt: new Date() },
    ]
    const result = mergeOwnLeaderboardRow(rows, 'me', own(85), 3)
    expect(result.map((r) => r.uid)).toEqual(['a', 'b', 'me'])
  })
})

describe('mergeOwnActivity', () => {
  const item = (userId: string, gameId: string, updatedAt: string) => ({
    userId,
    gameId,
    lastMode: 'singleplayer' as const,
    lastScore: 1,
    updatedAt: new Date(updatedAt),
  })

  it('replaces a stale cached row for the same (uid, gameId) with the live one', () => {
    const cached = [item('me', 'chess', '2026-01-01'), item('other', 'chess', '2026-07-01')]
    const own: RecentActivityItem[] = [
      { gameId: 'chess', lastMode: 'singleplayer', lastScore: 99, updatedAt: new Date('2026-07-03') },
    ]
    const result = mergeOwnActivity(cached, 'me', own, 50)
    const mine = result.find((r) => r.userId === 'me')
    expect(mine?.lastScore).toBe(99)
    expect(result).toHaveLength(2)
  })

  it('sorts by recency and applies the cap', () => {
    const cached = [item('a', 'g1', '2026-01-01'), item('b', 'g2', '2026-06-01')]
    const own: RecentActivityItem[] = [
      { gameId: 'g3', lastMode: 'singleplayer', lastScore: 1, updatedAt: new Date('2026-07-03') },
    ]
    const result = mergeOwnActivity(cached, 'me', own, 2)
    expect(result.map((r) => r.userId)).toEqual(['me', 'b'])
  })
})
