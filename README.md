# SkillForge — AI Agent Quick-Reference

> **For AI coding agents:** Read this file first. It gives you the full mental model of the project in one place. Jump to the section you need.

---

## What This Project Is

SkillForge is a **Next.js 16 + TypeScript** web app (migrated from Vite/React). It is a game-library platform where users log in, browse games, play them in iframes, and track scores/match counts. All user data is stored in **Firebase Firestore**.

---

## Tech Stack (current — do not assume Vite)

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, `app/` directory) |
| Language | **TypeScript** (frontend), JavaScript (game bundles) |
| Styling | Tailwind CSS 4 |
| Auth & DB | Firebase 12 (Auth + Firestore) |
| Package manager | pnpm (workspace: root + `server/`) |
| Backend servers | Node.js / Express / Socket.IO (in `server/`) |
| Dev command | `pnpm run dev` → runs `next dev` + `node server/start-all.js` concurrently |

---

## Key Files — Where Things Live

```
app/
  layout.tsx                    ← root layout, providers
  page.tsx                      ← landing / login page
  library/page.tsx              ← game library grid
  play/[gameId]/
    page.tsx                    ← route shell
    PlayGameClient.tsx          ← ⭐ iframe host; handles ALL postMessage events
  profile/page.tsx              ← user profile + per-game stats display
  leaderboard/page.tsx          ← global leaderboard
  admin/page.tsx                ← admin dashboard
  games/
    games.ts                    ← ⭐ game registry (single source of truth)
  services/
    gameDataService.ts          ← ⭐ all Firestore read/write for scores & stats
    userProfileService.ts       ← username, avatar
  contexts/
    AuthContext.tsx             ← useAuth() hook
    ThemeContext.tsx            ← dark/light theme
  lib/
    firebase.ts                 ← Firebase app init
  types/
    index.ts                    ← shared TypeScript types

public/games/                   ← ⭐ all embedded game static files
  2048/                         ← vanilla JS (readable source)
  chess/                        ← minified React bundle
  chroma-memory/                ← minified React bundle
  color-memory/                 ← minified React bundle
  geomaster/                    ← minified React bundle
  how-strong-is-your-vocabulary/← minified React bundle
  jose-rizal/                   ← minified React bundle
  math-game/                    ← minified React bundle
  spelling-bee/                 ← minified React bundle
  sudoku/                       ← vanilla JS (readable source)
  tictactoe/                    ← minified React bundle

server/
  start-all.js                  ← launches all backend game servers
  games/
    chess/                      ← Chess Socket.IO server (port 3004)
    chroma-memory/              ← Chroma Memory Socket.IO server
    spelling-bee/               ← Spelling Bee REST API server (port 8787)

scripts/
  GAME_DATA_COLLECTION_PROMPT.md ← detailed postMessage integration guide
```

> **`src/` is the OLD Vite/React source — it is NOT used. Do not edit files in `src/`.**

---

## Games Included

| Game ID | Name | Bundle type | Sends BEST_SCORE | Sends GAME_STATS | Match count field |
|---|---|---|---|---|---|
| `2048` | 2048 | Vanilla JS (readable) | ✅ | ✅ | `totalGames` |
| `chess` | Chess | Minified React | ❌ | ✅ (injected) | `totalGames` |
| `geomaster` | GeoMaster | Minified React | ✅ | ✅ | `totalGames` |
| `sudoku` | Sudoku | Vanilla JS (readable) | ❌ | ✅ (injected) | `totalGames` |
| `tictactoe` | Tic Tac Toe | Minified React | ❌ | ✅ (injected) | `totalGames` |
| `spelling-bee` | Spelling Bee | Minified React | ✅ | ✅ | `history.length` |
| `how-strong-is-your-vocabulary` | Vocabulary | Minified React | ✅ | ✅ | `history.length` |
| `math-game` | Math Game | Minified React | ✅ | ✅ | `totalGames` |
| `chroma-memory` | Chroma Memory | Minified React | ❌ | ✅ `{mode, accuracyPercentage}` | `totalMatchCount` (via `saveModeScoreStats`) |
| `color-memory` | Color Memory | Minified React | ✅ | ✅ | `totalGames` |
| `jose-rizal` | Jose Rizal | Minified React | ✅ (via `gameScore` msg) | ✅ (written in PlayGameClient) | `totalGames` |

---

## Firestore Data Model

```
users/{uid}/
  scores/{gameId}         ← { bestScore: number, updatedAt }
  gameStats/{gameId}      ← { totalGames?, history?, highScores?, totalMatchCount?, ... }
  profile                 ← { username, photoURL, ... }
```

- **`saveBestScore(uid, gameId, score)`** — only writes if score is a new high
- **`saveGameStats(uid, gameId, data)`** — merges any object into `gameStats/{gameId}`
- **`saveModeScoreStats(uid, gameId, mode, score)`** — weighted singleplayer/multiplayer aggregation (used by Chroma Memory)
- **`getAllScores(uid)`** — returns `Record<gameId, {bestScore}>`
- **`getAllGameStats(uid)`** — returns `Record<gameId, unknown>`

---

## postMessage Protocol (Game ↔ Parent)

All iframe games communicate with `PlayGameClient.tsx` via `postMessage`.

### Game → Parent

```js
// Guard every outgoing call:
if (window.parent && window.parent !== window) {
  window.parent.postMessage({ type: 'GAME_EVENT', event: EVENT, data: DATA }, '*')
}
```

| `event` | `data` | Effect in PlayGameClient |
|---|---|---|
| `BEST_SCORE` | `{ bestScore: number }` | `saveBestScore()` |
| `GAME_STATS` | any object | `saveGameStats()` (or `saveModeScoreStats()` for chroma-memory) |
| `REQUEST_PROGRESS` | — | reads Firestore → sends `RESTORE_PROGRESS` back |
| `REQUEST_PLAYER_INFO` | — | re-sends `PLAYER_INFO` |

**Special case — Jose Rizal** uses `{ type: 'gameScore', gameId: 'jose-rizal', score }` instead of `GAME_EVENT`. Handled separately in `PlayGameClient.tsx`.

### Parent → Game

| `type` | `data` |
|---|---|
| `RESTORE_PROGRESS` | saved stats object from Firestore |
| `PLAYER_INFO` | `{ name, uid, email }` |

---

## Profile Page — Match Count Logic

`app/profile/page.tsx` resolves match count with this priority chain:

```ts
const matchCount =
  stats?.totalMatchCount ||   // chroma-memory
  stats?.matchCount      ||   // generic
  stats?.totalGames      ||   // 2048, geomaster, chess, sudoku, tictactoe, math-game, color-memory, jose-rizal
  historyLength          ||   // spelling-bee, vocabulary (history array length)
  0
```

---

## Adding a New Game

See **[ADDING_GAMES.md](ADDING_GAMES.md)** for the full step-by-step guide.

Quick summary:
1. Copy static files → `public/games/<game-id>/`
2. Register in `app/games/games.ts`
3. Add `postMessage` data collection to game source (see `scripts/GAME_DATA_COLLECTION_PROMPT.md`)
4. If backend needed: add server to `server/games/<game-id>/`, register in `server/start-all.js`

---

## Dev & Build Commands

```bash
pnpm run dev          # next dev + all backend servers (concurrently)
pnpm run dev:client   # next dev only
pnpm run dev:servers  # backend servers only
pnpm run build        # next build
pnpm run start        # next start (production)
pnpm run lint         # eslint
pnpm run test         # vitest run
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_*` firebase vars | `.env.local` (root) | Firebase config for browser |
| `NEXT_PUBLIC_CHESS_SOCKET_URL` | `.env.local` | Override chess socket host |
| `SPELLING_BEE_API_ORIGIN` | `.env` (root) | Spelling Bee API origin for Next.js rewrites |
| `WORDSAPI_KEY` | `server/.env` | RapidAPI key for Spelling Bee |
| `CHESS_PORT` | `server/.env` | Chess socket port (default 3004) |
| `TICTACTOE_PORT` | `server/.env` | Tic Tac Toe socket port (default 3001) |

---

## Docker / Production Deployment

See **[DOCKER_DEPLOY.md](DOCKER_DEPLOY.md)** for Raspberry Pi + Nginx Proxy Manager setup.

- Frontend exposed on port `8080`
- Next.js rewrites `/api/*` → Spelling Bee API
- `nginx/skillforge.conf` routes websocket paths inside the Docker stack
- `docker compose -f docker-compose.prod.yml up -d --build`

---

## Multiplayer

See **[MULTIPLAYER.md](MULTIPLAYER.md)** for Socket.IO room flow, events reference, and LAN setup.

Active multiplayer games: **Chess** (port 3004, `/chess-ws/`), **Tic Tac Toe** (port 3001, `/tictactoe-ws/`), **Chroma Memory** (`/chroma-memory-ws/`).
