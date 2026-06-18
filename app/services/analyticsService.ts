import { db } from '@/app/lib/firebase'
import {
  collection,
  collectionGroup,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { defaultGames } from '@/app/games/games'

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

export interface LearningGapReport {
  gameAnalytics: GameLearningAnalytics[]
  subjectAnalytics: SubjectAnalytics[]
  atRiskStudents: StudentRiskProfile[]
  totalStudents: number
  platformAvgScore: number
  generatedAt: Date
}

export async function getLearningGapReport(): Promise<LearningGapReport> {
  const gameNameMap: Record<string, string> = {}
  for (const g of defaultGames) {
    gameNameMap[g.id] = g.name
  }

  const usersSnap = await getDocs(collection(db, 'users'))
  const userProfiles: Record<string, { username: string; email: string | null; role?: string }> = {}
  usersSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const data = d.data()
    userProfiles[d.id] = {
      username: data.username || data.email?.split('@')[0] || 'Student',
      email: data.email || null,
      role: data.role,
    }
  })
  const studentCount = Object.values(userProfiles).filter(
    (u) => u.role !== 'admin' && u.role !== 'teacher'
  ).length
  const totalStudents = Math.max(studentCount, 1)

  const scoresSnap = await getDocs(collectionGroup(db, 'scores'))
  const scoresByGame: Record<string, { uid: string; bestScore: number }[]> = {}
  scoresSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const gameId = d.id
    const uid = d.ref.parent.parent?.id
    if (!uid) return
    const bestScore = Number(d.data().bestScore) || 0
    if (!scoresByGame[gameId]) scoresByGame[gameId] = []
    scoresByGame[gameId].push({ uid, bestScore })
  })

  const statsSnap = await getDocs(collectionGroup(db, 'gameStats'))
  const statsByGame: Record<string, { uid: string; totalMatchCount: number }[]> = {}
  statsSnap.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
    const gameId = d.id
    const uid = d.ref.parent.parent?.id
    if (!uid) return
    const totalMatchCount = Number(d.data().totalMatchCount) || 0
    if (!statsByGame[gameId]) statsByGame[gameId] = []
    statsByGame[gameId].push({ uid, totalMatchCount })
  })

  const maxScoreByGame: Record<string, number> = {}
  for (const [gameId, scores] of Object.entries(scoresByGame)) {
    maxScoreByGame[gameId] = Math.max(...scores.map((s) => s.bestScore), 1)
  }

  const gameAnalytics: GameLearningAnalytics[] = []
  const allGameIds = new Set(Object.keys(scoresByGame))

  for (const gameId of allGameIds) {
    const scores = scoresByGame[gameId] || []
    if (scores.length === 0) continue

    const statsEntries = statsByGame[gameId] || []
    const playCount = scores.length
    const totalMatches = statsEntries.reduce((sum, s) => sum + s.totalMatchCount, 0)
    const maxBestScore = maxScoreByGame[gameId] || 1
    const avgBestScore = scores.reduce((sum, s) => sum + s.bestScore, 0) / playCount
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
  for (const [gameId, scores] of Object.entries(scoresByGame)) {
    const maxScore = maxScoreByGame[gameId] || 1
    for (const { uid, bestScore } of scores) {
      if (userProfiles[uid]?.role === 'admin' || userProfiles[uid]?.role === 'teacher') continue
      if (!studentScoreMap[uid]) studentScoreMap[uid] = []
      studentScoreMap[uid].push((bestScore / maxScore) * 100)
    }
  }

  const atRiskStudents: StudentRiskProfile[] = Object.entries(studentScoreMap)
    .map(([uid, scores]) => {
      const avg = scores.reduce((s, v) => s + v, 0) / scores.length
      return {
        uid,
        username: userProfiles[uid]?.username || 'Student',
        email: userProfiles[uid]?.email || null,
        gamesPlayed: scores.length,
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
    generatedAt: new Date(),
  }
}
