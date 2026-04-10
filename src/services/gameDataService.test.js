import { describe, expect, it, vi } from 'vitest'
import { buildWeightedModeStats, saveBestScore, saveModeScoreStats } from './gameDataService'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

vi.mock('../firebase', () => ({
  db: { __type: 'mock-db' },
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'score-doc-ref'),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'mock-server-time'),
  collection: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
}))

describe('gameDataService', () => {
  it('persists best score to Firestore with merge', async () => {
    await saveBestScore('uid-1', '2048', 3000)

    expect(doc).toHaveBeenCalledWith({ __type: 'mock-db' }, 'users', 'uid-1', 'scores', '2048')
    expect(serverTimestamp).toHaveBeenCalledTimes(1)
    expect(setDoc).toHaveBeenCalledWith(
      'score-doc-ref',
      {
        bestScore: 3000,
        updatedAt: 'mock-server-time',
      },
      { merge: true },
    )
  })

  it('builds weighted overall average from mode totals', () => {
    const existing = {
      singleplayer: { matchCount: 3, totalScore: 210, averageScore: 70 },
      multiplayer: { matchCount: 1, totalScore: 90, averageScore: 90 },
    }

    const next = buildWeightedModeStats(existing, 'multiplayer', 70)

    expect(next.singleplayer).toEqual({
      matchCount: 3,
      totalScore: 210,
      averageScore: 70,
    })
    expect(next.multiplayer).toEqual({
      matchCount: 2,
      totalScore: 160,
      averageScore: 80,
    })
    expect(next.totalMatchCount).toBe(5)
    expect(next.combinedAverageScore).toBe(74)
  })

  it('persists merged mode stats for a match', async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        singleplayer: { matchCount: 2, totalScore: 140, averageScore: 70 },
        multiplayer: { matchCount: 1, totalScore: 60, averageScore: 60 },
      }),
    })

    const merged = await saveModeScoreStats('uid-2', 'chroma-memory', 'singleplayer', 80)

    expect(doc).toHaveBeenCalledWith({ __type: 'mock-db' }, 'users', 'uid-2', 'gameStats', 'chroma-memory')
    expect(setDoc).toHaveBeenCalledWith(
      'score-doc-ref',
      expect.objectContaining({
        singleplayer: {
          matchCount: 3,
          totalScore: 220,
          averageScore: 73.33,
        },
        multiplayer: {
          matchCount: 1,
          totalScore: 60,
          averageScore: 60,
        },
        totalMatchCount: 4,
        combinedAverageScore: 70,
      }),
      { merge: true },
    )
    expect(merged.combinedAverageScore).toBe(70)
  })
})
