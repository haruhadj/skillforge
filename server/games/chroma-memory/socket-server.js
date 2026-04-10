import http from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'

const PORT = Number(process.env.CHROMA_MEMORY_PORT) || 3002
const MEMORIZE_MS = 5000
const GUESS_MS = 30000
const ROUND_RESULT_MS = 3500
const MAX_PLAYERS = 5
const TOTAL_ROUNDS = 5

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  path: '/chroma-memory-ws/',
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)

      const allowed = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/skillforge\.haruhadj\.duckdns\.org$/,
        /^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
      ]
      return callback(allowed.some((re) => re.test(origin)) ? null : new Error('Not allowed by CORS'), true)
    },
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map()

function hsbToRgb(hsb) {
  const h = hsb.h / 360
  const s = hsb.s / 100
  const v = hsb.b / 100

  let r = 0
  let g = 0
  let b = 0

  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break
    case 1: r = q; g = v; b = p; break
    case 2: r = p; g = v; b = t; break
    case 3: r = p; g = q; b = v; break
    case 4: r = t; g = p; b = v; break
    case 5: r = v; g = p; b = q; break
    default: break
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

function rgbToXyz(rgb) {
  let r = rgb.r / 255
  let g = rgb.g / 255
  let b = rgb.b / 255

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92

  r *= 100
  g *= 100
  b *= 100

  return {
    x: r * 0.4124 + g * 0.3576 + b * 0.1805,
    y: r * 0.2126 + g * 0.7152 + b * 0.0722,
    z: r * 0.0193 + g * 0.1192 + b * 0.9505,
  }
}

function xyzToLab(xyz) {
  const xn = 95.047
  const yn = 100.0
  const zn = 108.883

  let x = xyz.x / xn
  let y = xyz.y / yn
  let z = xyz.z / zn

  const f = (t) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116)

  x = f(x)
  y = f(y)
  z = f(z)

  return {
    l: 116 * y - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  }
}

function hsbToLab(hsb) {
  return xyzToLab(rgbToXyz(hsbToRgb(hsb)))
}

function deltaE2000(lab1, lab2) {
  const L1 = lab1.l
  const a1 = lab1.a
  const b1 = lab1.b
  const L2 = lab2.l
  const a2 = lab2.a
  const b2 = lab2.b

  const kL = 1
  const kC = 1
  const kH = 1

  const degToRad = (deg) => (deg * Math.PI) / 180
  const radToDeg = (rad) => (rad * 180) / Math.PI

  const C1 = Math.sqrt(a1 * a1 + b1 * b1)
  const C2 = Math.sqrt(a2 * a2 + b2 * b2)

  const avgC = (C1 + C2) / 2
  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))))

  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2

  const C1p = Math.sqrt(a1p * a1p + b1 * b1)
  const C2p = Math.sqrt(a2p * a2p + b2 * b2)

  const h1p = C1p === 0 ? 0 : (radToDeg(Math.atan2(b1, a1p)) + 360) % 360
  const h2p = C2p === 0 ? 0 : (radToDeg(Math.atan2(b2, a2p)) + 360) % 360

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp = 0
  if (C1p * C2p !== 0) {
    if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p
    else if (h2p - h1p > 180) dhp = h2p - h1p - 360
    else dhp = h2p - h1p + 360
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(degToRad(dhp / 2))

  const avgLp = (L1 + L2) / 2
  const avgCp = (C1p + C2p) / 2

  let avghp = 0
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) avghp = (h1p + h2p) / 2
    else if (h1p + h2p < 360) avghp = (h1p + h2p + 360) / 2
    else avghp = (h1p + h2p - 360) / 2
  }

  const T = 1 - 0.17 * Math.cos(degToRad(avghp - 30)) +
    0.24 * Math.cos(degToRad(2 * avghp)) +
    0.32 * Math.cos(degToRad(3 * avghp + 6)) -
    0.2 * Math.cos(degToRad(4 * avghp - 63))

  const dTheta = 30 * Math.exp(-Math.pow((avghp - 275) / 25, 2))
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)))
  const SL = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2))
  const SC = 1 + 0.045 * avgCp
  const SH = 1 + 0.015 * avgCp * T
  const RT = -Math.sin(degToRad(2 * dTheta)) * RC

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
    Math.pow(dCp / (kC * SC), 2) +
    Math.pow(dHp / (kH * SH), 2) +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  )
}

function calculateScore(target, guess) {
  const labTarget = hsbToLab(target)
  const labGuess = hsbToLab(guess)

  const deltaE = deltaE2000(labTarget, labGuess)
  const baseScore = 10 / (1 + Math.pow(deltaE / 25.25, 1.55))

  const hueDiff = Math.min(Math.abs(target.h - guess.h), 360 - Math.abs(target.h - guess.h))
  const hueAcc = Math.max(0, 1 - Math.pow(hueDiff / 25, 1.5))
  const avgSat = (target.s + guess.s) / 2
  const satWeightRecovery = Math.min(1, avgSat / 30)
  const recovery = (10 - baseScore) * hueAcc * satWeightRecovery * 0.25

  const penFactor = Math.max(0, (hueDiff - 30) / 150)
  const satWeightPenalty = Math.min(1, avgSat / 40)
  const penalty = baseScore * penFactor * satWeightPenalty * 0.15

  const finalScore = Math.min(10, Math.max(0, baseScore + recovery - penalty))

  return {
    deltaE: Number(deltaE.toFixed(2)),
    finalScore: Number(finalScore.toFixed(2)),
  }
}

function getRandomHSB() {
  return {
    h: Math.floor(Math.random() * 360),
    s: 30 + Math.floor(Math.random() * 70),
    b: 30 + Math.floor(Math.random() * 70),
  }
}

function sanitizeName(input) {
  const clean = typeof input === 'string' ? input.trim() : ''
  if (!clean) return 'Player'
  return clean.slice(0, 32)
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  do {
    code = ''
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
  } while (rooms.has(code))
  return code
}

function clearRoomTimers(room) {
  if (room.memorizeTimer) clearTimeout(room.memorizeTimer)
  if (room.guessTimer) clearTimeout(room.guessTimer)
  if (room.resultTimer) clearTimeout(room.resultTimer)
  room.memorizeTimer = null
  room.guessTimer = null
  room.resultTimer = null
}

function createRoomSnapshot(room) {
  return {
    code: room.code,
    status: room.status,
    phase: room.phase,
    round: room.round,
    totalRounds: TOTAL_ROUNDS,
    hostId: room.hostId,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      totalScore: Number(player.totalScore.toFixed(2)),
      roundScores: player.roundScores,
      isHost: player.id === room.hostId,
    })),
    memorizeEndsAt: room.memorizeEndsAt,
    guessEndsAt: room.guessEndsAt,
    submissionsCount: room.submissions.size,
    submittedPlayerIds: Array.from(room.submissions.keys()),
    targetColor: room.phase === 'MEMORIZE' || room.phase === 'RESULT' ? room.currentTarget : null,
    lastRoundResult: room.lastRoundResult,
    summary: room.phase === 'SUMMARY' ? room.summary : null,
  }
}

function emitSnapshot(room) {
  io.to(room.code).emit('room_snapshot', createRoomSnapshot(room))
}

function toSummary(room) {
  const ranking = [...room.players]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      totalScore: Number(player.totalScore.toFixed(2)),
      averageScore: Number((player.totalScore / TOTAL_ROUNDS).toFixed(2)),
    }))

  room.summary = {
    ranking,
    rounds: room.roundHistory,
  }
  room.phase = 'SUMMARY'
  room.status = 'FINISHED'
  room.memorizeEndsAt = null
  room.guessEndsAt = null
  room.submissions.clear()
  room.currentTarget = null
  emitSnapshot(room)
}

function startRound(room) {
  clearRoomTimers(room)
  room.phase = 'MEMORIZE'
  room.currentTarget = getRandomHSB()
  room.lastRoundResult = null
  room.submissions.clear()
  room.memorizeEndsAt = Date.now() + MEMORIZE_MS
  room.guessEndsAt = null
  emitSnapshot(room)

  room.memorizeTimer = setTimeout(() => {
    room.phase = 'GUESS'
    room.memorizeEndsAt = null
    room.guessEndsAt = Date.now() + GUESS_MS
    emitSnapshot(room)

    room.guessTimer = setTimeout(() => {
      finalizeRound(room)
    }, GUESS_MS)
  }, MEMORIZE_MS)
}

function finalizeRound(room) {
  if (room.phase !== 'GUESS') return

  clearRoomTimers(room)
  room.phase = 'RESULT'
  room.guessEndsAt = null

  const results = room.players.map((player) => {
    const guess = room.submissions.get(player.id) || null
    if (!guess) {
      player.roundScores.push(0)
      return {
        playerId: player.id,
        name: player.name,
        guess: null,
        score: 0,
        deltaE: null,
        noSubmission: true,
      }
    }

    const score = calculateScore(room.currentTarget, guess)
    player.totalScore += score.finalScore
    player.roundScores.push(score.finalScore)

    return {
      playerId: player.id,
      name: player.name,
      guess,
      score: score.finalScore,
      deltaE: score.deltaE,
      noSubmission: false,
    }
  })

  room.lastRoundResult = {
    round: room.round,
    target: room.currentTarget,
    results,
  }
  room.roundHistory.push(room.lastRoundResult)
  emitSnapshot(room)

  room.resultTimer = setTimeout(() => {
    if (room.round >= TOTAL_ROUNDS) {
      toSummary(room)
      return
    }

    room.round += 1
    startRound(room)
  }, ROUND_RESULT_MS)
}

function leaveRoom(socket, roomCode) {
  if (!roomCode) return

  const room = rooms.get(roomCode)
  if (!room) return

  clearRoomTimers(room)
  room.players = room.players.filter((player) => player.id !== socket.id)
  room.submissions.delete(socket.id)
  socket.leave(roomCode)

  if (room.players.length === 0) {
    rooms.delete(roomCode)
    return
  }

  if (room.hostId === socket.id) {
    room.hostId = room.players[0].id
  }

  if (room.status === 'PLAYING' && room.phase === 'GUESS') {
    const allSubmitted = room.players.every((player) => room.submissions.has(player.id))
    if (allSubmitted) {
      finalizeRound(room)
      return
    }
  }

  if (room.status === 'PLAYING' && room.players.length < 2) {
    toSummary(room)
    return
  }

  emitSnapshot(room)
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerName } = {}) => {
    const code = generateRoomCode()
    const room = {
      code,
      status: 'LOBBY',
      phase: 'LOBBY',
      round: 1,
      hostId: socket.id,
      players: [{ id: socket.id, name: sanitizeName(playerName), totalScore: 0, roundScores: [] }],
      currentTarget: null,
      submissions: new Map(),
      memorizeEndsAt: null,
      guessEndsAt: null,
      lastRoundResult: null,
      roundHistory: [],
      summary: null,
      memorizeTimer: null,
      guessTimer: null,
      resultTimer: null,
    }

    rooms.set(code, room)
    socket.join(code)
    socket.data.roomCode = code
    emitSnapshot(room)
  })

  socket.on('join_room', ({ roomCode, playerName } = {}) => {
    const code = String(roomCode || '').toUpperCase()
    const room = rooms.get(code)
    if (!room) {
      socket.emit('room_error', { message: 'Room not found.' })
      return
    }

    if (room.status !== 'LOBBY') {
      socket.emit('room_error', { message: 'Game already started. Wait for lobby.' })
      return
    }

    if (room.players.length >= MAX_PLAYERS) {
      socket.emit('room_error', { message: 'Room is full.' })
      return
    }

    room.players.push({
      id: socket.id,
      name: sanitizeName(playerName),
      totalScore: 0,
      roundScores: [],
    })
    socket.join(code)
    socket.data.roomCode = code
    emitSnapshot(room)
  })

  socket.on('start_game', () => {
    const roomCode = socket.data.roomCode
    const room = rooms.get(roomCode)
    if (!room) return

    if (socket.id !== room.hostId) {
      socket.emit('room_error', { message: 'Only the host can start the game.' })
      return
    }

    if (room.players.length < 2) {
      socket.emit('room_error', { message: 'Need at least 2 players.' })
      return
    }

    room.status = 'PLAYING'
    room.phase = 'MEMORIZE'
    room.round = 1
    room.roundHistory = []
    room.summary = null
    room.players = room.players.map((player) => ({ ...player, totalScore: 0, roundScores: [] }))
    startRound(room)
  })

  socket.on('submit_guess', (guess) => {
    const roomCode = socket.data.roomCode
    const room = rooms.get(roomCode)
    if (!room || room.phase !== 'GUESS') return
    if (room.submissions.has(socket.id)) return

    const safeGuess = {
      h: Math.max(0, Math.min(360, Number(guess?.h ?? 0))),
      s: Math.max(0, Math.min(100, Number(guess?.s ?? 0))),
      b: Math.max(0, Math.min(100, Number(guess?.b ?? 0))),
    }

    room.submissions.set(socket.id, safeGuess)
    emitSnapshot(room)

    const allSubmitted = room.players.every((player) => room.submissions.has(player.id))
    if (allSubmitted) {
      finalizeRound(room)
    }
  })

  socket.on('rematch_to_lobby', () => {
    const roomCode = socket.data.roomCode
    const room = rooms.get(roomCode)
    if (!room) return

    if (socket.id !== room.hostId) {
      socket.emit('room_error', { message: 'Only the host can reset to lobby.' })
      return
    }

    clearRoomTimers(room)
    room.status = 'LOBBY'
    room.phase = 'LOBBY'
    room.round = 1
    room.currentTarget = null
    room.submissions.clear()
    room.memorizeEndsAt = null
    room.guessEndsAt = null
    room.lastRoundResult = null
    room.roundHistory = []
    room.summary = null
    room.players = room.players.map((player) => ({ ...player, totalScore: 0, roundScores: [] }))

    emitSnapshot(room)
  })

  socket.on('leave_room', () => {
    leaveRoom(socket, socket.data.roomCode)
    socket.data.roomCode = null
  })

  socket.on('disconnect', () => {
    leaveRoom(socket, socket.data.roomCode)
  })
})

server.listen(PORT, () => {
  console.log(`[ChromaMemory] Socket server running on http://localhost:${PORT}`)
})
