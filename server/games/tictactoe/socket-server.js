import http from 'http'
import { Server } from 'socket.io'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

const PORT = Number(process.env.TICTACTOE_PORT) || 3001
const server = http.createServer(app)

const io = new Server(server, {
  path: '/tictactoe-ws/',
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no Origin header (non-browser, same-origin)
      if (!origin) return callback(null, true)

      // Allow any localhost / LAN IP (dev & preview)
      const allowed = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/127\.0\.0\.1:\d+$/,
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:\d+$/,
        /^https?:\/\/skillforge\.haruhadj\.duckdns\.org$/,
        /^https?:\/\/skillforge\.haruhadj\.org$/,
        /^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
        // Docker internal hostnames
        /^https?:\/\/frontend:\d+$/,
        /^https?:\/\/tictactoe:\d+$/,
        /^https?:\/\/chess:\d+$/,
        /^https?:\/\/chroma-memory:\d+$/,
        /^https?:\/\/spelling-bee:\d+$/,
        /^https?:\/\/skillforge-frontend:\d+$/,
      ]
      return callback(allowed.some((re) => re.test(origin)) ? null : new Error('Not allowed by CORS'), true)
    },
    methods: ['GET', 'POST'],
  },
})

// ── DoS hardening (audit H1) ────────────────────────────────────────────
// Caps + idle reaper so a client cannot exhaust the container's memory by
// spamming room creation, plus a per-IP connection throttle mirroring the
// express-rate-limit used by the REST servers.

const MAX_ROOMS = 500            // global cap on concurrent rooms
const MAX_ROOMS_PER_SOCKET = 5   // open rooms a single socket may host
const ROOM_IDLE_MS = 30 * 60 * 1000  // evict rooms idle longer than this
const REAPER_INTERVAL_MS = 5 * 60 * 1000
const MAX_CONN_PER_IP = 30       // new connections per IP per window
const CONN_WINDOW_MS = 60 * 1000

const ipConnections = new Map()  // ip -> timestamps[] (sliding window)

io.use((socket, next) => {
  const ip = socket.handshake.address || 'unknown'
  const now = Date.now()
  const recent = (ipConnections.get(ip) || []).filter((t) => now - t < CONN_WINDOW_MS)
  if (recent.length >= MAX_CONN_PER_IP) return next(new Error('Too many connections'))
  recent.push(now)
  ipConnections.set(ip, recent)
  next()
})

// ── In-memory room state ────────────────────────────────────────────────

const rooms = new Map()

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase()
}

const roomReaper = setInterval(() => {
  const now = Date.now()
  for (const [code, room] of rooms) {
    if (now - (room.lastActivity || 0) > ROOM_IDLE_MS) {
      io.to(code).emit('room_closed', { reason: 'idle' })
      rooms.delete(code)
    }
  }
  for (const [ip, ts] of ipConnections) {
    const recent = ts.filter((t) => now - t < CONN_WINDOW_MS)
    if (recent.length === 0) ipConnections.delete(ip)
    else ipConnections.set(ip, recent)
  }
}, REAPER_INTERVAL_MS)
roomReaper.unref?.()

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ]
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line: [a, b, c] }
    }
  }
  return null
}

io.on('connection', (socket) => {
  console.log('[TicTacToe] Player connected:', socket.id)

  socket.on('create_room', (callback) => {
    if (rooms.size >= MAX_ROOMS) {
      if (callback) callback({ error: 'Server is busy, try again later' })
      return
    }
    let hosted = 0
    for (const r of rooms.values()) if (r.host === socket.id) hosted++
    if (hosted >= MAX_ROOMS_PER_SOCKET) {
      if (callback) callback({ error: 'Too many open rooms' })
      return
    }
    const roomCode = generateRoomCode()
    rooms.set(roomCode, {
      host: socket.id,
      guest: null,
      squares: Array(9).fill(null),
      xIsNext: true,
      winner: null,
      lastActivity: Date.now(),
    })
    socket.join(roomCode)
    socket.emit('room_created', { roomCode, isHost: true })
    console.log(`[TicTacToe] Room created: ${roomCode} by ${socket.id}`)
    if (callback) callback({ roomCode })
  })

  socket.on('join_room', (roomCode, callback) => {
    const room = rooms.get(roomCode?.toUpperCase())
    if (!room) { if (callback) callback({ error: 'Room not found' }); return }
    if (room.guest) { if (callback) callback({ error: 'Room is full' }); return }

    room.guest = socket.id
    room.lastActivity = Date.now()
    rooms.set(roomCode.toUpperCase(), room)
    socket.join(roomCode.toUpperCase())
    io.to(room.host).emit('guest_joined', { guestId: socket.id })
    socket.emit('room_joined', { roomCode: roomCode.toUpperCase(), isHost: false, playerSymbol: 'O' })
    io.to(room.host).emit('player_symbol', { symbol: 'X' })
    console.log(`[TicTacToe] Player ${socket.id} joined room ${roomCode}`)
    if (callback) callback({ success: true, roomCode: roomCode.toUpperCase() })
  })

  socket.on('make_move', (data) => {
    const { roomCode, squareIndex, player } = data
    const room = rooms.get(roomCode)
    if (!room) return
    if (room.squares[squareIndex] !== null) return
    if (room.winner) return

    const isXturn = room.xIsNext
    if ((player === 'X' && !isXturn) || (player === 'O' && isXturn)) return

    room.squares[squareIndex] = player
    room.xIsNext = !room.xIsNext
    room.lastActivity = Date.now()

    const winnerInfo = calculateWinner(room.squares)
    if (winnerInfo) room.winner = winnerInfo.winner
    const isDraw = !winnerInfo && room.squares.every((s) => s !== null)

    io.to(roomCode).emit('game_update', {
      squares: room.squares,
      xIsNext: room.xIsNext,
      winner: winnerInfo?.winner ?? null,
      winningLine: winnerInfo?.line ?? null,
      isDraw,
    })
  })

  socket.on('request_rematch', (data) => {
    const room = rooms.get(data?.roomCode)
    if (!room) return
    room.squares = Array(9).fill(null)
    room.xIsNext = true
    room.winner = null
    room.lastActivity = Date.now()
    io.to(data.roomCode).emit('game_update', {
      squares: room.squares,
      xIsNext: true,
      winner: null,
      winningLine: null,
      isDraw: false,
    })
    io.to(data.roomCode).emit('rematch_accepted')
  })

  socket.on('disconnect', () => {
    for (const [code, room] of rooms) {
      if (room.host === socket.id || room.guest === socket.id) {
        io.to(code).emit('opponent_disconnected')
        rooms.delete(code)
      }
    }
    console.log('[TicTacToe] Player disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`[TicTacToe] Socket server running on http://localhost:${PORT}`)
})
