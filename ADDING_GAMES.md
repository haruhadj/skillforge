# Adding Games to SkillForge

This guide explains how to add external games (including React/Vite games with backends) to SkillForge.

---

## Quick Reference

| Step | All games | Notes |
|------|-----------|-------|
| 1 | Build game (Vite) or copy files (plain HTML) | Set `base: './'` for Vite |
| 2 | Copy to `public/games/<game-id>/` | `index.html` must be the entry point |
| 3 | Register in `src/games/games.js` | One entry, no other file changes needed |
| 4 | Add postMessage data collection to game source | See `scripts/GAME_DATA_COLLECTION_PROMPT.md` |
| 5 | (If backend) Wire up server | See Step 5 below |

| Game type | Frontend destination | Backend destination |
|---|---|---|
| Plain HTML/JS/CSS | `public/games/<id>/` | — |
| React (Vite) — no backend | `dist/` contents → `public/games/<id>/` | — |
| React (Vite) — with backend | `dist/` contents → `public/games/<id>/` | `server/games/<id>/` |

---

## Step 1 — Build the external React game

In the external game's `vite.config.js`, set `base: './'` so assets use relative paths:

```js
export default defineConfig({
  plugins: [react()],
  base: './',   // ← REQUIRED for subfolder hosting
})
```

Then build:

```powershell
cd C:\Users\admin\Desktop\project\games\react-apps\<game-name>
pnpm run build
```

This creates a `dist/` folder with the production build.

---

## Step 2 — Copy the built frontend

Copy the **contents** of `dist/` (not the dist folder itself) into `public/games/<game-id>/`:

```powershell
# Create the destination folder
New-Item -ItemType Directory -Force -Path public\games\<game-id>

# Copy the built files
Copy-Item -Path "C:\path\to\external\game\dist\*" `
          -Destination "public\games\<game-id>" `
          -Recurse -Force
```

The result should look like:

```
public/games/<game-id>/
  index.html        ← entry point (required)
  assets/           ← JS/CSS bundles
  cover.png         ← optional thumbnail for the library
```

---

## Step 3 — Register the game

Add an entry to `src/games/games.js`:

```js
{
  id: '<game-id>',
  name: 'Display Name',
  iframePath: '/games/<game-id>/index.html',
},
```

The `id` must be lowercase-kebab-case and match the folder name under `public/games/`. It is also used as the Firestore document ID: `users/{uid}/scores/{gameId}`.

---

## Step 4 — Add data collection to the game source

Every game embedded in SkillForge must send score and progress data back to the parent app via `postMessage`. Open `scripts/GAME_DATA_COLLECTION_PROMPT.md` and follow the instructions there. It covers:

- **Part A** — Reporting the best score (`BEST_SCORE` event, required for all games)
- **Part B** — Saving/restoring full progress across sessions (`GAME_STATS` / `REQUEST_PROGRESS` / `RESTORE_PROGRESS`)
- **Part C** — Receiving player identity (`PLAYER_INFO`)
- Special cases for multiplayer modes and games with backend servers
- Copy-paste code templates for both React and vanilla JS games
- A final integration checklist

For games **without** a backend, this is the last step. The game will appear in the library and data will be saved automatically.

---

## Step 5 — Games with a backend server

If the game has server-side code (API, WebSocket, etc.):

### 5a. Copy server files

Put the game's server code under `server/games/<game-id>/`:

```
server/
  games/
    <game-id>/
      server.js       ← or socket-server.js, etc.
```

Adapt the server file:
- Read the port from an environment variable (e.g. `process.env.MY_GAME_PORT || 3002`)
- Remove any static file serving (the main Vite server handles that)
- Add the port variable to `server/.env.example`

### 5b. Register the server in the launcher

Edit `server/start-all.js` and add an entry:

```js
const servers = [
  // ... existing servers ...
  {
    name: 'My Game API',
    script: path.join(__dirname, 'games', '<game-id>', 'server.js'),
  },
]
```

### 5c. Configure Vite proxy (if game uses REST API)

If the game frontend calls `/api/...` endpoints, add proxy rules in `vite.config.js`:

```js
server: {
  proxy: {
    '/api/my-game-endpoint': 'http://localhost:<port>',
  },
},
```

**Why?** The game runs inside an iframe served from the same origin as the main app. 
When the game calls `fetch('/api/...')`, the request goes to the Vite dev server. 
The proxy forwards it to the game's backend.

### 5d. WebSocket games (like Tic Tac Toe)

Games using WebSocket (e.g. socket.io) typically connect directly to a specific port.
The tictactoe game uses this pattern:

```js
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || `http://${window.location.hostname}:3001`
```

This means:
- **No Vite proxy needed** — the frontend connects directly to port 3001
- The socket server's CORS config must allow the main app's origin
- The socket server just needs to be running on the correct port

### 5e. Install server dependencies

```powershell
cd server
pnpm install
```

### 5f. Add environment variables

Copy `server/.env.example` to `server/.env` and fill in your keys:

```ini
WORDSAPI_KEY=your_key_here
TICTACTOE_PORT=3001
SPELLING_BEE_PORT=8787
```

---

## Running everything

```powershell
# Start Vite dev server + all game backends at once
pnpm run dev

# Or start them separately
pnpm run dev:client    # just the Vite frontend
pnpm run dev:servers   # just the game backends
```

---

## Updating a game

When you modify a game in the external `react-apps/` folder:

1. Rebuild: `pnpm run build`
2. Re-copy `dist/*` → `public/games/<game-id>/`
3. Refresh the browser

If the server code also changed, copy the updated server files to `server/games/<game-id>/`.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Blank page in iframe | Asset paths are absolute (`/assets/...`) | Set `base: './'` in the game's `vite.config.js` and rebuild |
| API calls fail (404) | Vite proxy not configured for the game's API routes | Add proxy rules in `vite.config.js` |
| WebSocket won't connect | CORS blocking the connection | Update socket server CORS to allow the main app's origin |
| Game shows old version | Stale files in `public/games/` | Delete the folder and re-copy `dist/*` |
| Missing cover image | No `cover.png` in game folder | Add one, or ignore (image hides automatically) |
| Score not saving | `BEST_SCORE` message not sent or wrong shape | Check `scripts/GAME_DATA_COLLECTION_PROMPT.md` Part A — `type`, `event`, and `data.bestScore` must be exact |
| Progress not restored | `REQUEST_PROGRESS` not sent on load, or `RESTORE_PROGRESS` listener missing | Check Part B of the data collection prompt |
| postMessage silently ignored | Origin mismatch — parent enforces same-origin | Game files must be served from `public/games/`, not a separate dev server |

---

## Project structure overview

```
thesis_proj/
├── public/
│   └── games/
│       ├── 2048/              ← plain HTML/JS game
│       ├── chess/             ← plain HTML/JS game
│       ├── sudoku/            ← plain HTML/JS game
│       ├── tictactoe/         ← React game (built dist)
│       └── spelling-bee/      ← React game (built dist)
├── scripts/
│   └── GAME_DATA_COLLECTION_PROMPT.md  ← AI guide for postMessage integration
├── server/
│   ├── package.json           ← server dependencies
│   ├── .env.example           ← env vars template
│   ├── start-all.js           ← launches all game servers
│   └── games/
│       ├── tictactoe/
│       │   └── socket-server.js
│       └── spelling-bee/
│           └── server.js
├── src/
│   ├── components/
│   │   └── GamePlayer.jsx     ← iframe host; handles all postMessage events
│   ├── games/
│   │   └── games.js           ← game registry (single source of truth)
│   └── services/
│       └── gameDataService.js ← Firestore read/write for scores & stats
└── vite.config.js             ← proxy rules for game APIs
```
