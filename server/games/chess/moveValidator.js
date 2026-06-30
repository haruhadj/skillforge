import { Chess } from 'chess.js'

// Pure, socket-free chess move validator — the single source of truth for board
// legality on the server (audit round 15). The Chess socket server previously
// trusted the client-supplied FEN verbatim, so a malicious client could forge any
// position. This replays the move with a real engine: it loads the current
// (pre-move) FEN, applies the client's move object, and returns a server-computed
// FEN — never the client's. Illegal moves are rejected.
//
// chess.js v1 THROWS on both an invalid FEN and an illegal move (verified against
// 1.4.0), so every engine call is wrapped. The client emits moves as
// `{ from, to, promotion }`, exactly what chess.js `.move()` accepts, and is itself
// built on chess.js — so the engines agree and honest moves are never rejected.

/**
 * Validate and apply a single move against a position.
 *
 * @param {string} fen   The current (pre-move) board FEN.
 * @param {*}      move  The client's move, e.g. { from, to, promotion }.
 * @returns {{ ok: false, reason: 'bad-fen' | 'illegal' }
 *          | { ok: true, fen: string, san: string, gameOver: boolean,
 *              end: { reason: 'checkmate' | 'draw', winner: 'w'|'b'|null, message: string } | null }}
 */
export function applyMove(fen, move) {
  let chess
  try {
    chess = new Chess(fen)
  } catch {
    return { ok: false, reason: 'bad-fen' }
  }

  // chess.js treats `chess.move(null)` as a *null move* (a legal "pass", san '--'),
  // which is not a legal move in actual play — reject it so a client can't skip its
  // turn. Only accept a concrete move: { from, to } object or a SAN string.
  const isMoveObject =
    typeof move === 'object' && move !== null &&
    typeof move.from === 'string' && typeof move.to === 'string'
  if (!isMoveObject && typeof move !== 'string') {
    return { ok: false, reason: 'illegal' }
  }

  let result
  try {
    result = chess.move(move)
  } catch {
    return { ok: false, reason: 'illegal' }
  }
  // Defensive: older chess.js returned null instead of throwing; '--' is a null move.
  if (!result || result.san === '--') return { ok: false, reason: 'illegal' }

  const gameOver = chess.isGameOver()
  let end = null
  if (gameOver) {
    if (chess.isCheckmate()) {
      // chess.turn() is the side to move *next*; the winner is whoever just moved.
      const winner = chess.turn() === 'w' ? 'b' : 'w'
      end = {
        reason: 'checkmate',
        winner,
        message: `Checkmate. ${winner === 'w' ? 'White' : 'Black'} wins.`,
      }
    } else {
      let message = 'Draw.'
      if (chess.isStalemate()) message = 'Draw by stalemate.'
      else if (chess.isInsufficientMaterial()) message = 'Draw by insufficient material.'
      else if (chess.isThreefoldRepetition()) message = 'Draw by threefold repetition.'
      end = { reason: 'draw', winner: null, message }
    }
  }

  return { ok: true, fen: chess.fen(), san: result.san, gameOver, end }
}
