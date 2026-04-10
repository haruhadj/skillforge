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
        /^https?:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
      ]
      return callback(allowed.some((re) => re.test(origin)) ? null : new Error('Not allowed by CORS'), true)
    },
    methods: ['GET', 'POST'],
  },
})

const rooms = new Map()

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
    const roomId = typeof payload === 'string' ? payload : payload?.roomId
    if (!roomId || typeof roomId !== 'string') return

    socket.join(roomId)

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        players: {},
        fen: START_FEN,
        gameEnded: false,
        resultMessage: null,
        drawOfferedBy: null,
      })
    }

    const room = rooms.get(roomId)
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

    room.fen = isValidFen(fen) ? fen : START_FEN
    if (room.drawOfferedBy) {
      room.drawOfferedBy = null
      io.to(roomId).emit('drawOfferCleared')
    }

    socket.to(roomId).emit('move', { move, fen: room.fen })
  })

  socket.on('offerDraw', (roomId) => {
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
