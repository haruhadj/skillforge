import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminAuth, getAdminDb } from '@/app/lib/firebase-admin'
import { defaultGames } from '@/app/games/games'
import { SUPPORTED_MODES, type GameMode, buildWeightedModeStats } from '@/app/services/scoring'
import { GameStats } from '@/app/types'

/**
 * Server-authoritative score submission.
 *
 * Security model: the caller must present a Firebase ID token (Authorization:
 * Bearer <token>). The owning `uid` is derived from the verified token — never from
 * the request body — so a client cannot write to another user's records. Writes use
 * the Admin SDK (which bypasses Firestore rules), gated by that token verification.
 *
 * The canonical path for in-app games is the host postMessage bridge
 * (`PlayGameClient` -> client SDK). This REST endpoint is the supported entry point
 * for games that report scores over HTTP rather than postMessage; such a game must
 * send the player's ID token in the Authorization header.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via Firebase ID token.
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]

    let uid: string
    try {
      const decoded = await getAdminAuth().verifyIdToken(token)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Validate the payload (uid is intentionally ignored if present).
    const body = await request.json()
    const { gameId, score, mode = 'singleplayer' } = body

    if (!gameId || typeof gameId !== 'string' || !defaultGames.some((g) => g.id === gameId)) {
      return NextResponse.json({ error: 'Unknown or missing gameId' }, { status: 400 })
    }

    const numScore = Number(score)
    if (!Number.isFinite(numScore)) {
      return NextResponse.json({ error: 'Score must be a finite number' }, { status: 400 })
    }
    // Sanity bounds (audit S3): reject negative and implausibly large scores so a
    // token holder cannot poison the leaderboard with e.g. 1e9. This guards only
    // this HTTP route — the canonical in-app path writes via the client SDK, which
    // still needs the server-authoritative migration (audit S2) to be fully closed.
    const MAX_SCORE = 1_000_000
    if (numScore < 0 || numScore > MAX_SCORE) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${MAX_SCORE}` },
        { status: 400 },
      )
    }

    if (!SUPPORTED_MODES.includes(mode as GameMode)) {
      return NextResponse.json(
        { error: `mode must be one of: ${SUPPORTED_MODES.join(', ')}` },
        { status: 400 },
      )
    }

    const adminDb = getAdminDb()

    // 3. Best score — only overwrite when strictly higher.
    const scoreRef = adminDb.collection('users').doc(uid).collection('scores').doc(gameId)
    const scoreSnap = await scoreRef.get()
    const currentBest = scoreSnap.exists ? Number(scoreSnap.data()?.bestScore) : null
    if (currentBest == null || Number.isNaN(currentBest) || numScore > currentBest) {
      await scoreRef.set(
        {
          bestScore: numScore,
          updatedAt: FieldValue.serverTimestamp(),
          bestScoreAchievedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }

    // 4. Weighted per-mode stats for the leaderboard.
    const statsRef = adminDb.collection('users').doc(uid).collection('gameStats').doc(gameId)
    const statsSnap = await statsRef.get()
    const existingStats = statsSnap.exists ? (statsSnap.data() as Partial<GameStats>) : null
    const mergedStats = buildWeightedModeStats(existingStats, mode as GameMode, numScore)

    await statsRef.set(
      { ...mergedStats, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    )

    return NextResponse.json({ success: true, gameId, score: numScore, uid })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 })
  }
}
