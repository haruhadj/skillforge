import { describe, it, expect } from 'vitest'
import {
  computeLearningGapReport,
  type AnalyticsInput,
} from '@/app/services/analyticsCompute'

// Guards the pure learning-gap aggregation moved server-side behind the cached
// /api/admin/learning-gap route (audit R17).
const gameNameMap = { '2048': '2048', sudoku: 'Sudoku', chess: 'Chess' }

function baseInput(overrides: Partial<AnalyticsInput> = {}): AnalyticsInput {
  return {
    gameNameMap,
    users: [
      { uid: 'u1', username: 'Alice', email: 'alice@example.com', role: 'user', deviceType: 'mobile', deviceOs: 'iOS' },
      { uid: 'u2', username: 'Bob', email: 'bob@example.com', role: 'user', deviceType: 'desktop' },
      { uid: 'admin1', username: 'Admin', email: 'admin@example.com', role: 'admin' },
    ],
    scores: [
      { uid: 'u1', gameId: '2048', bestScore: 50 },
      { uid: 'u2', gameId: '2048', bestScore: 100 },
      { uid: 'u1', gameId: 'sudoku', bestScore: 10 },
      { uid: 'admin1', gameId: '2048', bestScore: 100 },
    ],
    stats: [
      { uid: 'u1', gameId: '2048', totalMatchCount: 4 },
      { uid: 'u2', gameId: '2048', totalMatchCount: 6 },
    ],
    ...overrides,
  }
}

describe('computeLearningGapReport', () => {
  it('counts only non-admin students', () => {
    const report = computeLearningGapReport(baseInput())
    expect(report.totalStudents).toBe(2)
  })

  it('aggregates per-game analytics with normalized scores and match totals', () => {
    const report = computeLearningGapReport(baseInput())
    const g2048 = report.gameAnalytics.find((g) => g.gameId === '2048')!
    expect(g2048.playCount).toBe(3) // 3 score rows incl. admin
    expect(g2048.totalMatches).toBe(10) // 4 + 6
    expect(g2048.maxBestScore).toBe(100)
    expect(g2048.subject).toBe('Mathematics')
  })

  it('excludes admins from at-risk students', () => {
    const report = computeLearningGapReport(baseInput())
    expect(report.atRiskStudents.every((s) => s.uid !== 'admin1')).toBe(true)
  })

  it('builds device stats only from users with a deviceType', () => {
    const report = computeLearningGapReport(baseInput())
    expect(report.deviceStats.total).toBe(2)
    expect(report.deviceStats.deviceTypes).toEqual({ mobile: 1, desktop: 1 })
    expect(report.deviceStats.oses).toEqual({ iOS: 1 })
  })

  it('falls back to email local-part for a missing username', () => {
    const report = computeLearningGapReport(
      baseInput({
        users: [
          { uid: 'u1', username: null, email: 'charlie@example.com', role: 'user' },
          { uid: 'u2', username: 'Top', email: 'top@example.com', role: 'user' },
        ],
        // u2's high score makes maxBestScore 100, so u1's 5 normalizes to ~5% (high risk).
        scores: [
          { uid: 'u1', gameId: '2048', bestScore: 5 },
          { uid: 'u2', gameId: '2048', bestScore: 100 },
        ],
        stats: [],
      }),
    )
    const risk = report.atRiskStudents.find((s) => s.uid === 'u1')
    expect(risk?.username).toBe('charlie')
  })

  it('returns empty analytics and a Date when there are no scores', () => {
    const report = computeLearningGapReport(baseInput({ scores: [], stats: [] }))
    expect(report.gameAnalytics).toEqual([])
    expect(report.platformAvgScore).toBe(0)
    expect(report.generatedAt).toBeInstanceOf(Date)
  })
})
