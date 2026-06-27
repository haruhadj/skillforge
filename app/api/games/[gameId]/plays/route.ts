import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { defaultGames } from '@/app/games/games'
import { rateLimit, clientIpFrom, sweepExpired } from '@/app/lib/rateLimit'

// POST throttled per authenticated user; GET (public) throttled per IP — the GET
// reads an entire quizzes subcollection, so an unauthenticated flood is costly.
const PLAYS_POST_LIMIT = 60
const PLAYS_GET_LIMIT = 60
const PLAYS_WINDOW_MS = 60 * 1000

/**
 * Per-quiz community analytics for quiz-style games (e.g. philippine-trivia).
 *
 * Storage: one aggregate document per quiz at
 *   gameAnalytics/{gameId}/quizzes/{quizId}
 * holding running counters, a score-count distribution, and a capped feed of
 * the most recent plays. This keeps reads O(#quizzes) instead of scanning every
 * play across every user (the platform's known leaderboard scaling concern).
 *
 *   POST  -> record a finished play. Auth: Firebase ID token (Bearer). The owning
 *            uid and display name are derived server-side, never from the body.
 *   GET   -> public aggregate stats for one quiz (?quizId=) or all quizzes.
 */

const RECENT_LIMIT = 15
const MAX_QUESTIONS = 300
const QUIZ_ID_RE = /^[a-z0-9][a-z0-9-]{0,79}$/i

interface QuizAggregate {
  quizId: string
  plays: number
  scoreSum: number
  awards: number
  totalQuestions: number
  dist: Record<string, number>
  recent: { name: string; score: number; total: number; at: number }[]
}

function isKnownGame(gameId: string): boolean {
  return defaultGames.some((g) => g.id === gameId)
}

async function resolveDisplayName(uid: string, tokenName?: string, tokenEmail?: string): Promise<string> {
  try {
    const snap = await getAdminDb().collection('users').doc(uid).get()
    const username = snap.exists ? (snap.data()?.username as string | undefined) : undefined
    const name = username || tokenName || (tokenEmail ? tokenEmail.split('@')[0] : '') || 'Player'
    return String(name).trim().slice(0, 40) || 'Player'
  } catch {
    return (tokenName || 'Player').slice(0, 40)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params
    if (!isKnownGame(gameId)) {
      return NextResponse.json({ error: 'Unknown gameId' }, { status: 400 })
    }

    // 1. Authenticate via Firebase ID token; uid comes from the verified token.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let uid: string
    let tokenName: string | undefined
    let tokenEmail: string | undefined
    try {
      const decoded = await getAdminAuth().verifyIdToken(authHeader.split('Bearer ')[1])
      uid = decoded.uid
      tokenName = decoded.name
      tokenEmail = decoded.email
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Rate-limit per authenticated user.
    sweepExpired()
    const limit = rateLimit(`plays:uid:${uid}`, PLAYS_POST_LIMIT, PLAYS_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    // 2. Validate payload.
    const body = await request.json()
    const quizId = String(body?.quizId || '')
    const total = Number(body?.total)
    let score = Number(body?.score)

    if (!QUIZ_ID_RE.test(quizId)) {
      return NextResponse.json({ error: 'Invalid quizId' }, { status: 400 })
    }
    if (!Number.isFinite(total) || total < 1 || total > MAX_QUESTIONS) {
      return NextResponse.json({ error: 'Invalid total' }, { status: 400 })
    }
    if (!Number.isFinite(score)) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }
    score = Math.max(0, Math.min(Math.round(score), Math.round(total)))
    const totalQ = Math.round(total)

    const name = await resolveDisplayName(uid, tokenName, tokenEmail)
    const adminDb = getAdminDb()
    const ref = adminDb.collection('gameAnalytics').doc(gameId).collection('quizzes').doc(quizId)

    // 3. Atomically fold this play into the quiz aggregate.
    await adminDb.runTransaction(async (txn) => {
      const snap = await txn.get(ref)
      const prev = (snap.exists ? snap.data() : {}) as Partial<QuizAggregate>

      const dist = { ...(prev.dist || {}) }
      dist[String(score)] = (dist[String(score)] || 0) + 1

      const recentPrev = Array.isArray(prev.recent) ? prev.recent : []
      const recent = [{ name, score, total: totalQ, at: Date.now() }, ...recentPrev].slice(0, RECENT_LIMIT)

      txn.set(
        ref,
        {
          quizId,
          plays: (prev.plays || 0) + 1,
          scoreSum: (prev.scoreSum || 0) + score,
          awards: (prev.awards || 0) + (score >= totalQ ? 1 : 0),
          totalQuestions: totalQ,
          dist,
          recent,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Play submission error:', error)
    return NextResponse.json({ error: 'Failed to record play' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await params
    if (!isKnownGame(gameId)) {
      return NextResponse.json({ error: 'Unknown gameId' }, { status: 400 })
    }

    sweepExpired()
    const limit = rateLimit(`plays-get:ip:${clientIpFrom(request)}`, PLAYS_GET_LIMIT, PLAYS_WINDOW_MS)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
      )
    }

    const quizIdFilter = request.nextUrl.searchParams.get('quizId')

    const snap = await getAdminDb()
      .collection('gameAnalytics')
      .doc(gameId)
      .collection('quizzes')
      .get()

    const quizzes = snap.docs.map((d) => {
      const x = d.data() as Partial<QuizAggregate>
      const plays = x.plays || 0
      return {
        quizId: x.quizId || d.id,
        plays,
        totalQuestions: x.totalQuestions || 0,
        avgScore: plays > 0 ? Math.round(((x.scoreSum || 0) / plays) * 100) / 100 : 0,
        awards: x.awards || 0,
        dist: x.dist || {},
        recent: Array.isArray(x.recent) ? x.recent : [],
      }
    })

    // Rank quizzes by popularity (plays) -> "Top X%" badge. Lower percent = hotter.
    const ranked = [...quizzes].sort((a, b) => b.plays - a.plays)
    const total = ranked.length
    const rankById = new Map<string, number>()
    ranked.forEach((q, i) => rankById.set(q.quizId, i + 1))

    const withTop = quizzes.map((q) => ({
      ...q,
      topPercent: total > 0 ? Math.max(1, Math.round((rankById.get(q.quizId)! / total) * 100)) : null,
    }))

    if (quizIdFilter) {
      const one = withTop.find((q) => q.quizId === quizIdFilter)
      return NextResponse.json(
        one || {
          quizId: quizIdFilter,
          plays: 0,
          totalQuestions: 0,
          avgScore: 0,
          awards: 0,
          dist: {},
          recent: [],
          topPercent: null,
        },
      )
    }

    return NextResponse.json({ quizzes: withTop })
  } catch (error) {
    console.error('Analytics read error:', error)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
