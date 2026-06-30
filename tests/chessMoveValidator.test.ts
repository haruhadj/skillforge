import { describe, it, expect } from 'vitest'
import { applyMove } from '@/server/games/chess/moveValidator.js'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('applyMove', () => {
  it('accepts a legal opening move and advances the position', () => {
    const out = applyMove(START, { from: 'e2', to: 'e4' })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.san).toBe('e4')
    expect(out.gameOver).toBe(false)
    expect(out.end).toBeNull()
    // black to move now
    expect(out.fen.split(' ')[1]).toBe('b')
    // the returned FEN is engine-computed, not the input
    expect(out.fen).not.toBe(START)
  })

  it('rejects an illegal move (pawn two squares from the wrong rank)', () => {
    const out = applyMove(START, { from: 'e2', to: 'e5' })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.reason).toBe('illegal')
  })

  it('rejects moving out of turn (a black move while white is to move)', () => {
    // White to move per START, but the client tries to move a black pawn.
    const out = applyMove(START, { from: 'e7', to: 'e5' })
    expect(out.ok).toBe(false)
  })

  it('rejects a move that leaves the mover in check', () => {
    // White king e1, black rook e8 pinning the e2 pawn down the e-file.
    // Moving the pawn off the file would expose the king → illegal.
    const pinned = '4r3/8/8/8/8/8/4P3/4K3 w - - 0 1'
    const out = applyMove(pinned, { from: 'e2', to: 'd3' })
    expect(out.ok).toBe(false)
  })

  it("detects checkmate on the final move of fool's mate and names the winner", () => {
    // 1. f3 e5 2. g4 Qh4# — apply the mating move from the pre-mate position.
    const preMate = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'
    const out = applyMove(preMate, { from: 'd8', to: 'h4' })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.san).toBe('Qh4#')
    expect(out.gameOver).toBe(true)
    expect(out.end).toEqual({
      reason: 'checkmate',
      winner: 'b',
      message: 'Checkmate. Black wins.',
    })
  })

  it('detects a draw by stalemate', () => {
    // Classic stalemate: black king a8, white king c7 (no black moves) — white
    // queen plays b6, stalemating black who is not in check but has no move.
    const preStalemate = 'k7/2K5/8/8/8/8/8/1Q6 w - - 0 1'
    const out = applyMove(preStalemate, { from: 'b1', to: 'b6' })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.gameOver).toBe(true)
    expect(out.end?.reason).toBe('draw')
    expect(out.end?.winner).toBeNull()
  })

  it('detects a draw by insufficient material (king vs king after a capture)', () => {
    // White king captures the lone black knight → K vs K, insufficient material.
    const out = applyMove('8/8/8/4k3/8/8/4K3/5n2 w - - 0 1', { from: 'e2', to: 'f1' })
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.gameOver).toBe(true)
    expect(out.end?.reason).toBe('draw')
  })

  it('rejects a malformed move object without throwing', () => {
    expect(applyMove(START, { nonsense: true }).ok).toBe(false)
    expect(applyMove(START, null).ok).toBe(false)
    expect(applyMove(START, 'not-a-move').ok).toBe(false)
  })

  it('rejects a malformed FEN without throwing', () => {
    const out = applyMove('this is not a fen', { from: 'e2', to: 'e4' })
    expect(out.ok).toBe(false)
    if (out.ok) return
    expect(out.reason).toBe('bad-fen')
  })
})
