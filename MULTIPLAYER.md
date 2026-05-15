# Multiplayer Games

> **Framework: Next.js 16. postMessage handling is in `app/play/[gameId]/PlayGameClient.tsx`. Do NOT edit `src/` files.**

SkillForge supports real-time multiplayer via Socket.IO WebSocket servers. Active multiplayer games: **Chess**, **Tic Tac Toe**, **Chroma Memory**.

## How Multiplayer Works in This Project

### Architecture

```
Player A (Browser)                   Player B (Browser)
      │                                       │
      │  iframe → public/games/tictactoe/     │  iframe → public/games/tictactoe/
      │                                       │
      └──────────────────────────────────────►│
               Socket.IO  (/tictactoe-ws/)
                         │
              server/games/tictactoe/socket-server.js
                    (Express + Socket.IO, port 3001)
```

During **development** (`pnpm run dev`), Next.js rewrites/proxies the WebSocket paths, so both players connect through `http://localhost:3000`.  
In **production / LAN play**, the socket server must be reachable directly (or via the Nginx reverse proxy) at the same origin.

## Tic Tac Toe — Room-Based Multiplayer

The game uses a simple room/lobby system:

| Step | Player A (Host) | Player B (Guest) |
|------|-----------------|------------------|
| 1 | Opens Tic Tac Toe and clicks **Create Room** | — |
| 2 | Server generates a 4-character room code (e.g. `AB3X`) and sends it back | — |
| 3 | Player A shares the room code with Player B (e.g. via chat, voice) | — |
| 4 | — | Opens Tic Tac Toe, clicks **Join Room**, and enters the code |
| 5 | Both players are connected; Player A is assigned **X**, Player B is assigned **O** | Same |
| 6 | Players take turns clicking squares; each move is validated server-side and broadcast to both clients | Same |
| 7 | Server detects win/draw and notifies both clients | Same |
| 8 | Either player can request a **Rematch**; the server resets the board | Same |

If either player disconnects at any point, the other player receives an `opponent_disconnected` event and the room is destroyed.

## Socket Events Reference

| Event (client → server) | Payload | Description |
|--------------------------|---------|-------------|
| `create_room` | — | Create a new room; server replies with `room_created` |
| `join_room` | `roomCode` | Join an existing room; server emits `room_joined` / error |
| `make_move` | `{ roomCode, squareIndex, player }` | Submit a board move |
| `request_rematch` | `{ roomCode }` | Reset the board for a new round |

| Event (server → client) | Payload | Description |
|--------------------------|---------|-------------|
| `room_created` | `{ roomCode, isHost }` | Confirmation after room creation |
| `room_joined` | `{ roomCode, isHost, playerSymbol }` | Confirmation after joining |
| `guest_joined` | `{ guestId }` | Sent to host when guest connects |
| `player_symbol` | `{ symbol }` | Tells the host their assigned symbol (X) |
| `game_update` | `{ squares, xIsNext, winner, winningLine, isDraw }` | Full board state after every move |
| `rematch_accepted` | — | Board has been reset |
| `opponent_disconnected` | — | Other player left |

## Running the Multiplayer Server

The socket server starts automatically when you run:

```bash
pnpm run dev          # starts next dev + all backend servers together
```

To start only the socket server in isolation:

```bash
cd server
node games/tictactoe/socket-server.js
# or
pnpm run tictactoe
```

The server listens on **port 3001** by default. You can override this with the `TICTACTOE_PORT` environment variable.

## LAN / Production Play

To play across two different machines on the same network:

1. Find the host machine's LAN IP (e.g. `192.168.1.10`).
2. Start the dev server on the host: `pnpm run dev`
3. On the second machine, open `http://192.168.1.10:3000` in a browser.
4. Both browsers connect through the same Next.js dev server which proxies WebSocket paths to the socket servers.

## Adding More Multiplayer Games

See [ADDING_GAMES.md](ADDING_GAMES.md) for the full deployment and registration guide, and [scripts/GAME_DATA_COLLECTION_PROMPT.md](scripts/GAME_DATA_COLLECTION_PROMPT.md) for the postMessage data collection integration. For a game that needs a WebSocket backend:

1. Add the server file to `server/games/<game-id>/`.
2. Register it in `server/start-all.js`.
3. Configure the socket path in `nginx/skillforge.conf` for production proxying.
4. In the game frontend, connect to the socket server via the proxied path.

### Score reporting for multiplayer games

Multiplayer games that track per-mode statistics must include a `mode` field in their `GAME_STATS` message:

```js
postToParent('GAME_STATS', {
  mode: 'multiplayer',  // or 'singleplayer'
  score: finalScore,
});
```

`PlayGameClient.tsx` (`app/play/[gameId]/PlayGameClient.tsx`) has a hardcoded branch for `chroma-memory` that routes these to `saveModeScoreStats()` for weighted per-mode aggregation. For any **new** game that needs the same treatment, add a matching `gameId`-specific branch in `PlayGameClient.tsx`'s `handleMessage` function — see **Special Cases** in `scripts/GAME_DATA_COLLECTION_PROMPT.md`.
