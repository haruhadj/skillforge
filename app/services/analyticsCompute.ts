/**
 * Pure analytics aggregation — no Firebase imports.
 *
 * Holds the learning-gap math plus its types and the subject maps. Both the cached server
 * route (app/api/admin/learning-gap, Admin SDK rows) and the client service re-export from
 * here, so the heavy collectionGroup scan happens once server-side and the result is cached.
 * (audit R17 — admin analytics caching)
 */

export const GAME_SUBJECTS: Record<string, string> = {
  '2048': 'Mathematics',
  'sudoku': 'Mathematics',
  'math-game': 'Mathematics',
  'math-blaster': 'Mathematics',
  'math-nerdle': 'Mathematics',
  'elemental-quest': 'Science',
  'geomaster': 'Geography',
  'geoguessr-clone': 'Geography',
  'spelling-bee': 'English',
  'how-strong-is-your-vocabulary': 'English',
  'vocabulary-wordle': 'English',
  'synonym-showdown': 'English',
  'fill-in-the-blank-relay': 'English',
  'quordle': 'English',
  'hangman-master': 'English',
  'grammar-police': 'English',
  'jose-rizal': 'Literature & History',
  'chroma-memory': 'Cognitive Skills',
  'color-memory': 'Cognitive Skills',
  'memory-matrix': 'Cognitive Skills',
  'chess': 'Logic & Strategy',
  'tictactoe': 'Logic & Strategy',
}

export const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics': 'indigo',
  'Science': 'emerald',
  'Geography': 'cyan',
  'English': 'violet',
  'Literature & History': 'amber',
  'Cognitive Skills': 'pink',
  'Logic & Strategy': 'blue',
  'Other': 'slate',
}

export interface GameLearningAnalytics {
  gameId: string
  gameName: string
  subject: string
  playCount: number
  totalMatches: number
  avgBestScore: number
  maxBestScore: number
  normalizedAvgScore: number
  gapScore: number
  engagementRate: number
  gapLevel: 'critical' | 'moderate' | 'low'
  engagementLevel: 'high' | 'medium' | 'low'
}

export interface SubjectAnalytics {
  subject: string
  games: string[]
  avgNormalizedScore: number
  totalPlays: number
  criticalGameCount: number
}

export interface StudentRiskProfile {
  uid: string
  username: string
  email: string | null
  gamesPlayed: number
  avgNormalizedScore: number
  riskLevel: 'high' | 'medium' | 'low'
}

export interface DeviceStats {
  total: number
  deviceTypes: Record<string, number>
  oses: Record<string, number>
  browsers: Record<string, number>
}

export interface LearningGapReport {
  gameAnalytics: GameLearningAnalytics[]
  subjectAnalytics: SubjectAnalytics[]
  atRiskStudents: StudentRiskProfile[]
  totalStudents: number
  platformAvgScore: number
  deviceStats: DeviceStats
  generatedAt: Date
}

// Minimal row shapes the aggregation consumes — fetched via Admin SDK in the route.
export interface AnalyticsUserRow {
  uid: string
  username?: string | null
  email?: string | null
  role?: string
  deviceType?: string
  deviceOs?: string
  deviceBrowser?: string
}
export interface AnalyticsScoreRow { uid: string; gameId: string; bestScore: number }
export interface AnalyticsStatsRow { uid: string; gameId: string; totalMatchCount: number }

export interface AnalyticsInput {
  users: AnalyticsUserRow[]
  scores: AnalyticsScoreRow[]
  stats: AnalyticsStatsRow[]
  gameNameMap: Record<string, string>
}

/**
 * Compute the learning-gap report from already-fetched rows. Pure — no I/O — so it is
 * directly unit-testable and reusable from any data source.
 */
export function computeLearningGapReport(input: AnalyticsInput): LearningGapReport {
  const { users, scores, stats, gameNameMap } = input

  const userProfiles: Record<string, { username: string; email: string | null; role?: string }> = {}
  const deviceStats: DeviceStats = { total: 0, deviceTypes: {}, oses: {}, browsers: {} }
  for (const u of users) {
    userProfiles[u.uid] = {
      username: u.username || u.email?.split('@')[0] || 'Student',
      email: u.email || null,
      role: u.role,
    }
    if (u.deviceType) {
      deviceStats.total++
      deviceStats.deviceTypes[u.deviceType] = (deviceStats.deviceTypes[u.deviceType] || 0) + 1
      if (u.deviceOs) deviceStats.oses[u.deviceOs] = (deviceStats.oses[u.deviceOs] || 0) + 1
      if (u.deviceBrowser) deviceStats.browsers[u.deviceBrowser] = (deviceStats.browsers[u.deviceBrowser] || 0) + 1
    }
  }

  const studentCount = Object.values(userProfiles).filter((u) => u.role !== 'admin').length
  const totalStudents = Math.max(studentCount, 1)

  const scoresByGame: Record<string, { uid: string; bestScore: number }[]> = {}
  for (const s of scores) {
    if (!scoresByGame[s.gameId]) scoresByGame[s.gameId] = []
    scoresByGame[s.gameId].push({ uid: s.uid, bestScore: Number(s.bestScore) || 0 })
  }

  const statsByGame: Record<string, { uid: string; totalMatchCount: number }[]> = {}
  for (const s of stats) {
    if (!statsByGame[s.gameId]) statsByGame[s.gameId] = []
    statsByGame[s.gameId].push({ uid: s.uid, totalMatchCount: Number(s.totalMatchCount) || 0 })
  }

  const maxScoreByGame: Record<string, number> = {}
  for (const [gameId, gameScores] of Object.entries(scoresByGame)) {
    maxScoreByGame[gameId] = Math.max(...gameScores.map((s) => s.bestScore), 1)
  }

  const gameAnalytics: GameLearningAnalytics[] = []
  const allGameIds = new Set(Object.keys(scoresByGame))

  for (const gameId of allGameIds) {
    const gameScores = scoresByGame[gameId] || []
    if (gameScores.length === 0) continue

    const statsEntries = statsByGame[gameId] || []
    const playCount = gameScores.length
    const totalMatches = statsEntries.reduce((sum, s) => sum + s.totalMatchCount, 0)
    const maxBestScore = maxScoreByGame[gameId] || 1
    const avgBestScore = gameScores.reduce((sum, s) => sum + s.bestScore, 0) / playCount
    const normalizedAvgScore = Math.min((avgBestScore / maxBestScore) * 100, 100)
    const gapScore = 100 - normalizedAvgScore
    const engagementRate = Math.min((playCount / totalStudents) * 100, 100)

    const gapLevel: 'critical' | 'moderate' | 'low' =
      gapScore >= 65 ? 'critical' : gapScore >= 35 ? 'moderate' : 'low'
    const engagementLevel: 'high' | 'medium' | 'low' =
      engagementRate >= 40 ? 'high' : engagementRate >= 15 ? 'medium' : 'low'

    gameAnalytics.push({
      gameId,
      gameName: gameNameMap[gameId] || gameId,
      subject: GAME_SUBJECTS[gameId] || 'Other',
      playCount,
      totalMatches,
      avgBestScore: Math.round(avgBestScore * 10) / 10,
      maxBestScore,
      normalizedAvgScore: Math.round(normalizedAvgScore * 10) / 10,
      gapScore: Math.round(gapScore * 10) / 10,
      engagementRate: Math.round(engagementRate * 10) / 10,
      gapLevel,
      engagementLevel,
    })
  }

  gameAnalytics.sort((a, b) => b.gapScore - a.gapScore)

  const subjectMap: Record<string, GameLearningAnalytics[]> = {}
  for (const g of gameAnalytics) {
    if (!subjectMap[g.subject]) subjectMap[g.subject] = []
    subjectMap[g.subject].push(g)
  }
  const subjectAnalytics: SubjectAnalytics[] = Object.entries(subjectMap)
    .map(([subject, games]) => ({
      subject,
      games: games.map((g) => g.gameName),
      avgNormalizedScore:
        Math.round((games.reduce((s, g) => s + g.normalizedAvgScore, 0) / games.length) * 10) / 10,
      totalPlays: games.reduce((s, g) => s + g.playCount, 0),
      criticalGameCount: games.filter((g) => g.gapLevel === 'critical').length,
    }))
    .sort((a, b) => a.avgNormalizedScore - b.avgNormalizedScore)

  const studentScoreMap: Record<string, number[]> = {}
  for (const [gameId, gameScores] of Object.entries(scoresByGame)) {
    const maxScore = maxScoreByGame[gameId] || 1
    for (const { uid, bestScore } of gameScores) {
      if (userProfiles[uid]?.role === 'admin') continue
      if (!studentScoreMap[uid]) studentScoreMap[uid] = []
      studentScoreMap[uid].push((bestScore / maxScore) * 100)
    }
  }

  const atRiskStudents: StudentRiskProfile[] = Object.entries(studentScoreMap)
    .map(([uid, scoreList]) => {
      const avg = scoreList.reduce((s, v) => s + v, 0) / scoreList.length
      return {
        uid,
        username: userProfiles[uid]?.username || 'Student',
        email: userProfiles[uid]?.email || null,
        gamesPlayed: scoreList.length,
        avgNormalizedScore: Math.round(avg * 10) / 10,
        riskLevel: (avg < 30 ? 'high' : avg < 55 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      }
    })
    .filter((s) => s.riskLevel !== 'low')
    .sort((a, b) => a.avgNormalizedScore - b.avgNormalizedScore)
    .slice(0, 10)

  const platformAvgScore =
    gameAnalytics.length > 0
      ? Math.round(
          (gameAnalytics.reduce((s, g) => s + g.normalizedAvgScore, 0) / gameAnalytics.length) * 10
        ) / 10
      : 0

  return {
    gameAnalytics,
    subjectAnalytics,
    atRiskStudents,
    totalStudents,
    platformAvgScore,
    deviceStats,
    generatedAt: new Date(),
  }
}
