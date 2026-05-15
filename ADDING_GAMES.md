# Adding Games to SkillForge

> **Framework: Next.js 16 (App Router). Do NOT reference `src/`, `vite.config.js`, or `GamePlayer.jsx` — those are the old Vite/React source and are not used.**

---

## Quick Reference

| Step | All games | Key file |
|------|-----------|----------|
| 1 | Build game (if Vite) or copy files (plain HTML) | — |
| 2 | Copy to `public/games/<game-id>/` | `index.html` must be the entry point |
| 3 | Register in `app/games/games.ts` | One entry, no other file changes needed |
| 4 | Add postMessage data collection to game source | See `scripts/GAME_DATA_COLLECTION_PROMPT.md` |
| 5 | (If backend) Wire up server | See Step 5 below |

| Game type | Frontend destination | Backend destination |
|---|---|---|
| Plain HTML/JS/CSS | `public/games/<id>/` | — |
| React (Vite) — no backend | `dist/` contents → `public/games/<id>/` | — |
| React (Vite) — with backend | `dist/` contents → `public/games/<id>/` | `server/games/<id>/` |

---

## Step 1 — Build the external React game (skip for plain HTML games)

In the external game's `vite.config.js`, set `base: './'` so assets use relative paths:

```js
export default defineConfig({
  plugins: [react()],
  base: './',   // REQUIRED for subfolder hosting
})
```

Then build:

```powershell
cd C:\path\to\external\game
pnpm run build
```

This creates a `dist/` folder with the production build.

---

## Step 2 — Copy the built frontend

Copy the **contents** of `dist/` (not the folder itself) into `public/games/<game-id>/`:

```powershell
New-Item -ItemType Directory -Force -Path public\games\<game-id>
Copy-Item -Path "C:\path\to\external\game\dist\*" `
          -Destination "public\games\<game-id>" `
          -Recurse -Force
```

Expected layout:

```
public/games/<game-id>/
  index.html        ← required entry point
  assets/           ← JS/CSS bundles (Vite games)
  cover.png         ← optional thumbnail shown in library
```

---

## Step 3 — Register the game

Add an entry to **`app/games/games.ts`** (not `src/games/games.js`):

```ts
{
  id: '<game-id>',           // lowercase-kebab-case, matches folder name
  name: 'Display Name',
  iframePath: '/games/<game-id>/index.html',
  description: 'One-line description shown in the library.',
},
```

The `id` is also used as the Firestore document ID: `users/{uid}/scores/{gameId}` and `users/{uid}/gameStats/{gameId}`.

---

## Step 4 — Add postMessage data collection to the game source

The iframe game must send score/stats data to the parent app (`PlayGameClient.tsx`) via `postMessage`. See `scripts/GAME_DATA_COLLECTION_PROMPT.md` for full details. Summary:

- **`BEST_SCORE`** — required for all games, fires on game-end
- **`GAME_STATS`** — fires on game-end, must include `totalGames` counter for Matches to show on profile
- **`REQUEST_PROGRESS`** / **`RESTORE_PROGRESS`** — optional cross-device progress sync

**The `totalGames` counter pattern (vanilla JS):**
```js
var total = parseInt(localStorage.getItem('<game-id>-total-games') || '0', 10) + 1;
localStorage.setItem('<game-id>-total-games', String(total));
window.parent.postMessage({ type: 'GAME_EVENT', event: 'GAME_STATS', data: { totalGames: total } }, '*');
```

For games **without** a backend, this is the last step.

---

## Step 5 — Games with a backend server

### 5a. Copy server files

```
server/games/<game-id>/
  server.js         ← REST API, or socket-server.js for WebSocket
```

- Read port from env: `process.env.MY_GAME_PORT || 3002`
- Remove any static file serving (Next.js handles that)
- Add the port var to `server/.env.example`

### 5b. Register in the launcher

Edit `server/start-all.js`:

```js
const servers = [
  // ... existing ...
  { name: 'My Game', script: path.join(__dirname, 'games', '<game-id>', 'server.js') },
]
```

### 5c. REST API proxy (Next.js rewrites)

If the game calls `/api/...` endpoints, add a rewrite in `next.config.js`:

```js
async rewrites() {
  return [
    { source: '/api/my-game/:path*', destination: 'http://localhost:<port>/api/my-game/:path*' },
  ]
}
```

### 5d. WebSocket games

WebSocket games (socket.io) connect directly to the server port — no proxy needed. The socket server's CORS must allow `window.location.origin`. Pattern:

```js
const socket = io(`http://${window.location.hostname}:3001`, { path: '/my-game-ws/' })
```

### 5e. Install server dependencies & env vars

```powershell
cd server && pnpm install
cp .env.example .env  # fill in your keys
```

---

## Running everything

```powershell
pnpm run dev          # next dev + all backend servers
pnpm run dev:client   # next dev only
pnpm run dev:servers  # backend servers only
```

Dev server: `http://localhost:3000`

---

## Updating a game

1. Rebuild: `pnpm run build` (in game folder)
2. Re-copy `dist/*` → `public/games/<game-id>/`
3. Hard-refresh the browser

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Blank page in iframe | Asset paths are absolute (`/assets/...`) | Set `base: './'` in game's `vite.config.js` and rebuild |
| API calls fail (404) | Next.js rewrite not configured | Add rewrite in `next.config.js` |
| WebSocket won't connect | CORS blocking | Update socket server CORS to allow main app's origin |
| Game shows old version | Stale files in `public/games/` | Delete folder and re-copy `dist/*` |
| Score not saving | `BEST_SCORE` message wrong shape | Verify `type:'GAME_EVENT'`, `event:'BEST_SCORE'`, `data.bestScore` is a number |
| Matches always shows `-` | `totalGames` not in `GAME_STATS` payload | Add `totalGames` counter to game's `GAME_STATS` message |
| Progress not restored | `REQUEST_PROGRESS` not sent on load | Add on mount: `postToParent('REQUEST_PROGRESS', undefined)` |
| postMessage silently ignored | Origin mismatch | Game files must be in `public/games/`, served from same origin as Next.js |

---

## Project structure (relevant paths only)

```
thesis_proj/
├── app/
│   ├── games/games.ts              ← ⭐ game registry (edit this to add games)
│   ├── play/[gameId]/
│   │   └── PlayGameClient.tsx      ← ⭐ iframe host; all postMessage handling
│   ├── profile/page.tsx            ← displays per-game best score + match count
│   └── services/gameDataService.ts ← Firestore score/stats API
├── public/games/                   ← ⭐ all embedded game static files
├── server/
│   ├── start-all.js                ← registers/launches all backend servers
│   └── games/                      ← one folder per game with server code
├── next.config.js                  ← rewrites for API proxying
└── scripts/
    └── GAME_DATA_COLLECTION_PROMPT.md
```
