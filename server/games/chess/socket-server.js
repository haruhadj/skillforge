import http from 'http'
import { Server } from 'socket.io'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())

const PORT = Number(process.env.CHESS_PORT) || 3004
const server = http.createServer(app)
const START_FEN = 'rn1qkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const io = new Server(server, {
  path: '/chess-ws/',
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

const rooms = new Map()

// ── DoS hardening (audit H1) ────────────────────────────────────────────
// Rooms are keyed by client-supplied ids, so without caps a single client can
// create unlimited room entries. Cap the global count + rooms a socket may
// open, evict idle rooms, and throttle connections per IP.
const MAX_ROOMS = 500
const MAX_ROOMS_PER_SOCKET = 5
const ROOM_IDLE_MS = 30 * 60 * 1000
const REAPER_INTERVAL_MS = 5 * 60 * 1000
const MAX_CONN_PER_IP = 30
const CONN_WINDOW_MS = 60 * 1000
// Per-socket flood guard: generous burst cap, well above any legitimate play
// cadence (incl. blitz), so it only trips on actual event spam.
const EVENT_BURST = 50
const EVENT_BURST_MS = 5 * 1000
const MAX_ROOM_ID_LEN = 64

const ipConnections = new Map()

// Behind nginx, socket.handshake.address is the proxy's IP for every client, so
// throttling on it would rate-limit all players as a single IP. Prefer the real
// client IP from X-Forwarded-For (nginx sets it on the *-ws/ locations).
function clientIp(socket) {
  const xff = socket.handshake.headers['x-forwarded-for']
  // nginx ($proxy_add_x_forwarded_for) APPENDS the real peer as the last entry;
  // earlier entries are client-supplied and spoofable. With a single trusted proxy
  // in front (compose only exposes these via nginx), the last hop is the real client IP.
  if (xff) {
    const parts = String(xff).split(',')
    return parts[parts.length - 1].trim()
  }
  return socket.handshake.address || 'unknown'
}

io.use((socket, next) => {
  const ip = clientIp(socket)
  const now = Date.now()
  const recent = (ipConnections.get(ip) || []).filter((t) => now - t < CONN_WINDOW_MS)
  if (recent.length >= MAX_CONN_PER_IP) return next(new Error('Too many connections'))
  recent.push(now)
  ipConnections.set(ip, recent)
  next()
})

const roomReaper = setInterval(() => {
  const now = Date.now()
  for (const [roomId, room] of rooms) {
    if (now - (room.lastActivity || 0) > ROOM_IDLE_MS) {
      io.to(roomId).emit('roomClosed', { reason: 'idle' })
      rooms.delete(roomId)
    }
  }
  for (const [ip, ts] of ipConnections) {
    const recent = ts.filter((t) => now - t < CONN_WINDOW_MS)
    if (recent.length === 0) ipConnections.delete(ip)
    else ipConnections.set(ip, recent)
  }
}, REAPER_INTERVAL_MS)
roomReaper.unref?.()

// Returns true once a socket exceeds EVENT_BURST events in the trailing window.
// Keeps only in-window timestamps so the array can't grow without bound.
function tooFast(socket) {
  const now = Date.now()
  const times = (socket._evtTimes || []).filter((t) => now - t < EVENT_BURST_MS)
  times.push(now)
  socket._evtTimes = times
  return times.length > EVENT_BURST
}

function isValidFen(fen) {
  return typeof fen === 'string' && fen.trim().split(/\s+/).length === 6
}

function normalizeIdentity(rawIdentity = {}) {
  const uid = typeof rawIdentity.uid === 'string' && rawIdentity.uid.trim() ? rawIdentity.uid.trim() : null
  const email = typeof rawIdentity.email === 'string' && rawIdentity.email.trim() ? rawIdentity.email.trim() : null
  const fallbackName = email ? email.split('@')[0] : 'Player'
  const name = typeof rawIdentity.name === 'string' && rawIdentity.name.trim() ? rawIdentity.name.trim().slice(0, 40) : fallbackName

  return {
    uid,
    email,
    name,
  }
}

function getOpponentName(room, socketId) {
  for (const [id, player] of Object.entries(room.players)) {
    if (id !== socketId) return player.identity?.name || 'Opponent'
  }
  return 'Opponent'
}

io.on('connection', (socket) => {
  console.log('[Chess] Player connected:', socket.id)

  socket.on('joinRoom', (payload) => {
    if (tooFast(socket)) return
    const roomId = typeof payload === 'string' ? payload : payload?.roomId
    if (!roomId || typeof roomId !== 'string') return
    // Cap the client-supplied id before it becomes a Map key.
    if (roomId.length > MAX_ROOM_ID_LEN) return

    if (!rooms.has(roomId)) {
      if (rooms.size >= MAX_ROOMS) {
        socket.emit('roomError', { error: 'Server is busy, try again later' })
        return
      }
      // Count rooms this socket already participates in (its joined rooms minus
      // its own auto-room) to bound how many a single client can spin up.
      const joined = [...socket.rooms].filter((r) => r !== socket.id && rooms.has(r)).length
      if (joined >= MAX_ROOMS_PER_SOCKET) {
        socket.emit('roomError', { error: 'Too many open rooms' })
        return
      }
      rooms.set(roomId, {
        players: {},
        fen: START_FEN,
        gameEnded: false,
        resultMessage: null,
        drawOfferedBy: null,
        lastActivity: Date.now(),
      })
    }

    socket.join(roomId)

    const room = rooms.get(roomId)
    room.lastActivity = Date.now()
    if (!isValidFen(room.fen)) {
      room.fen = START_FEN
    }
    const identity = normalizeIdentity(payload?.player)

    let color = null
    const playerIds = Object.keys(room.players)

    if (playerIds.length === 0) {
      color = 'w'
      room.players[socket.id] = { color, identity }
    } else if (playerIds.length === 1) {
      const existingColor = room.players[playerIds[0]].color
      color = existingColor === 'w' ? 'b' : 'w'
      room.players[socket.id] = { color, identity }
    }

    socket.emit('roomJoined', {
      roomId,
      color,
      fen: room.fen,
      playerCount: Object.keys(room.players).length,
      gameEnded: room.gameEnded,
      resultMessage: room.resultMessage,
      opponentName: getOpponentName(room, socket.id),
    })

    if (room.drawOfferedBy && room.players[room.drawOfferedBy]) {
      io.to(roomId).emit('drawOffered', {
        fromColor: room.players[room.drawOfferedBy].color,
      })
    }

    socket.to(roomId).emit('playerJoined', {
      playerCount: Object.keys(room.players).length,
      playerName: identity.name,
    })
  })

  socket.on('move', ({ roomId, move, fen }) => {
    const room = rooms.get(roomId)
    if (!room || room.gameEnded) return

    // Authorize the sender: only a seated player may move (spectators / 3rd+
    // joiners get color:null and are never added to room.players). This mirrors
    // the existing guard on offerDraw/respondDraw/resign — `move` was the lone
    // unguarded mutator.
    const player = room.players[socket.id]
    if (!player) return

    // Turn-ownership check without a server-side chess engine: the active color
    // of the currently-stored (pre-move) FEN must match the mover's color, so a
    // player can't move for the opponent or move twice in a row. NOTE: full
    // board/move legality is still client-trusted (the chess client is a prebuilt
    // artifact); this only enforces who-moves-when, per audit M3.
    const activeColor = String(room.fen).split(' ')[1]
    if (activeColor === 'w' || activeColor === 'b') {
      if (player.color !== activeColor) return
    }

    room.fen = isValidFen(fen) ? fen : START_FEN
    room.lastActivity = Date.now()
    if (room.drawOfferedBy) {
      room.drawOfferedBy = null
      io.to(roomId).emit('drawOfferCleared')
    }

    socket.to(roomId).emit('move', { move, fen: room.fen })
  })

  socket.on('offerDraw', (roomId) => {
    if (tooFast(socket)) return
    const room = rooms.get(roomId)
    if (!room || room.gameEnded) return
    if (!room.players[socket.id]) return
    if (Object.keys(room.players).length < 2) return
    if (room.drawOfferedBy) return

    room.drawOfferedBy = socket.id
    io.to(roomId).emit('drawOffered', {
      fromColor: room.players[socket.id].color,
    })
  })

  socket.on('cancelDrawOffer', (roomId) => {
    if (tooFast(socket)) return
    const room = rooms.get(roomId)
    if (!room || room.gameEnded) return
    if (room.drawOfferedBy !== socket.id) return

    room.drawOfferedBy = null
    io.to(roomId).emit('drawOfferCleared')
  })

  socket.on('respondDraw', ({ roomId, accept }) => {
    const room = rooms.get(roomId)
    if (!room || room.gameEnded || !room.drawOfferedBy) return
    if (!room.players[socket.id]) return
    if (room.drawOfferedBy === socket.id) return

    if (accept) {
      room.gameEnded = true
      room.resultMessage = 'Draw agreed by both players.'
      room.drawOfferedBy = null
      io.to(roomId).emit('gameEnded', {
        reason: 'draw',
        winner: null,
        message: room.resultMessage,
      })
      return
    }

    room.drawOfferedBy = null
    io.to(roomId).emit('drawDeclined', {
      byColor: room.players[socket.id].color,
    })
  })

  socket.on('resign', (roomId) => {
    const room = rooms.get(roomId)
    if (!room || room.gameEnded) return

    const quitterColor = room.players[socket.id]?.color
    if (!quitterColor) return

    const winner = quitterColor === 'w' ? 'b' : 'w'
    room.gameEnded = true
    room.resultMessage = `${quitterColor === 'w' ? 'White' : 'Black'} resigned. ${winner === 'w' ? 'White' : 'Black'} wins.`
    room.drawOfferedBy = null

    io.to(roomId).emit('gameEnded', {
      reason: 'resign',
      winner,
      message: room.resultMessage,
    })
  })

  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      const room = rooms.get(roomId)
      if (!room) continue

      if (room.drawOfferedBy === socket.id) {
        room.drawOfferedBy = null
        io.to(roomId).emit('drawOfferCleared')
      }

      const playerName = room.players[socket.id]?.identity?.name || 'Opponent'
      delete room.players[socket.id]

      if (Object.keys(room.players).length === 0) {
        rooms.delete(roomId)
      } else {
        socket.to(roomId).emit('playerLeft', {
          playerCount: Object.keys(room.players).length,
          playerName,
        })
      }
    }
  })

  socket.on('disconnect', () => {
    console.log('[Chess] Player disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`[Chess] Socket server running on http://localhost:${PORT}`)
})
