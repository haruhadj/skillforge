import { NextRequest, NextResponse } from 'next/server'
import { saveBestScore, saveModeScoreStats } from '@/app/services/gameDataService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid, gameId, score, mode = 'singleplayer' } = body

    // Validate required fields
    if (!uid || !gameId || score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, gameId, score' },
        { status: 400 }
      )
    }

    // Validate score is a number
    const numScore = Number(score)
    if (isNaN(numScore)) {
      return NextResponse.json(
        { error: 'Score must be a valid number' },
        { status: 400 }
      )
    }

    // Save best score (only if higher than existing)
    await saveBestScore(uid, gameId, numScore)

    // Save game stats for leaderboard
    await saveModeScoreStats(uid, gameId, mode, numScore)

    return NextResponse.json({ 
      success: true, 
      score: numScore,
      gameId,
      uid 
    })
  } catch (error) {
    console.error('Score submission error:', error)
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    )
  }
}
