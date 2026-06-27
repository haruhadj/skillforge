# Adding Games to SkillForge

> **Framework: Next.js 16 (App Router). Do NOT reference `src/`, `vite.config.js`, or `GamePlayer.jsx` — those are the old Vite/React source and are not used.**

---

## The model (read this first)

Every game has **two** locations — one rule keeps them in sync:

| Location | In git? | What it is |
|---|---|---|
| `games-src/<id>/` | **Yes** — committed (except `node_modules/`, `dist/`, `build/`) | Editable game **source**. Versioned and backed up; only deps + build output are ignored. Docker-ignored, so it never enters the image. |
| `public/games/<id>/` | **Yes** — committed | The published, built **artifact** served as a static iframe. This is what deploys. |

**Rule: never hand-edit `public/games/<id>/`.** It is always reproduced from `games-src/<id>/` by `scripts/build-game.sh`. Edit source in `games-src/`, run the build, commit both.

**Why this layout**
- Source sits beside the app and is versioned — one repo to clone, edit, and back up; it survives a fresh clone, and Claude can read/fix game source in any session — instead of scattered external folders.
- Only `games-src/**/node_modules/` and `games-src/*/{dist,build}/` are git-ignored — that's the actual bloat — so committed source stays tiny. Heavy binary assets → Git LFS (already configured).
- `games-src/` is **docker-ignored** → the frontend image (its builder does `COPY . .`) ships only the published artifacts under `public/`, not source or deps.

> ℹ️ Each game under `games-src/` is its own **isolated** mini-project. `build-game.sh` runs `npm install` + `npm run build` inside the game folder (its own local `package-lock.json` + `node_modules`), so a game's pinned React/Vite versions never collide with the main app's lockfile. See [Per-game isolated installs](#per-game-isolated-installs) below.

---

## Commands

| Command | Does |
|---|---|
| `npm run game:new <id> ["Display Name"]` | Scaffold a new **no-build** static game at `games-src/<id>/`, pre-wired with the score/stats postMessage contract. |
| `npm run game:build <id>` | Build `games-src/<id>/` and publish into `public/games/<id>/`. |
| `npm run game:build:all` | Rebuild & publish **every** game under `games-src/`. |

A game is **buildable** when `games-src/<id>/package.json` exists (Vite/Node): the script runs its build and publishes `dist/` (or `build/`). Otherwise it is a **static** game and the folder is published as-is. A curated `cover.png` already present in `public/games/<id>/` is preserved across rebuilds.

`<id>` is lowercase-kebab-case and is used as the folder name, the iframe path, **and** the Firestore document id.

---

### Per-game isolated installs

The whole repo uses **npm**. Each game under `games-src/<id>/` keeps its **own** local
`package-lock.json` + `node_modules`, separate from the main app. `build-game.sh` runs
`npm install` + `npm run build` inside the game folder, so a game's pinned React/Vite
versions never collide with the main app's dependency tree. The `npm run game:*` commands
above are root scripts that shell out to `build-game.sh`.

If you build or debug a game by hand, run npm from inside the game folder:

```bash
cd games-src/<id>
npm install
npm run build
```

---

## Path A — author a new game in-repo (no build step)

```bash
npm run game:new memory-flip "Memory Flip"   # creates games-src/memory-flip/index.html
#   ... edit games-src/memory-flip/index.html ...
npm run game:build memory-flip               # publishes -> public/games/memory-flip/
```

The scaffold already wires the iframe contract (sends `BEST_SCORE` + `GAME_STATS`, listens for `PLAYER_INFO`). Replace the demo gameplay with your own. Then **register** it (see below).

---

## Path B — bring a build-based game (Vite / Google AI Studio export)

1. Drop the exported project into `games-src/<id>/` (it has its own `package.json`).
2. Ensure its Vite config uses **relative** asset paths — required for subfolder hosting:
   ```js
   export default defineConfig({
     plugins: [react()],
     base: './',   // REQUIRED — without it the iframe loads a blank page
   })
   ```
3. Publish (installs with **npm** if needed, builds, copies `dist/*` → `public/games/<id>/`):
   ```bash
   npm run game:build <id>   # root script → build-game.sh → npm install + npm run build
   ```

Then **register** it (see below).

---

## Register the game (all games)

Add **one** entry to `app/games/games.ts`:

```ts
{
  id: '<id>',                 // lowercase-kebab-case, matches the folder name
  name: 'Display Name',
  iframePath: '/games/<id>/index.html',
  description: 'One-line description shown in the library.',
  category: 'Language',       // Math | Logic | Language | Memory | Science | History | Geography | Music
}
```

The `id` is also the Firestore document id: `users/{uid}/scores/{id}` and `users/{uid}/gameStats/{id}`.

---

## Score / stats data collection (postMessage)

The iframe game must send score/stats to the parent app (`PlayGameClient.tsx`) via `postMessage`. The `npm run game:new` scaffold already includes this; for an external build, wire it into the game source. See `scripts/GAME_DATA_COLLECTION_PROMPT.md` for full code templates.

### Complete message reference

**Game → Parent** (game sets `type: 'GAME_EVENT'`)

| `event` | `data` shape | Notes |
|---|---|---|
| `BEST_SCORE` | `{ bestScore: number }` | **Required.** Fires on game-end. Host keeps the all-time max. |
| `GAME_STATS` | `{ totalGames: number, ...any }` | **Required.** `totalGames` drives the **Matches** counter on the profile. |
| `REQUEST_PROGRESS` | (no data) | Optional. Host fetches Firestore stats and replies with `RESTORE_PROGRESS`. |
| `REQUEST_PLAYER_INFO` | (no data) | Optional. Host re-sends `PLAYER_INFO` immediately. |

**Parent → Game**

| `type` | `data` shape | Notes |
|---|---|---|
| `PLAYER_INFO` | `{ name, uid, email }` | Sent automatically on load; retried up to 12× at 250 ms. |
| `RESTORE_PROGRESS` | saved stats object | Sent in reply to `REQUEST_PROGRESS`. |

**The `totalGames` counter pattern (vanilla JS):**
```js
var total = parseInt(localStorage.getItem('<id>-total-games') || '0', 10) + 1;
localStorage.setItem('<id>-total-games', String(total));
window.parent.postMessage({ type: 'GAME_EVENT', event: 'GAME_STATS', data: { totalGames: total } }, '*');
```

For games **without** a backend, this is the last step.

---

## Do I need to edit PlayGameClient.tsx?

**No, for standard games.** The `BEST_SCORE` + `GAME_STATS` contract is handled generically — no code changes to `PlayGameClient.tsx` are needed.

**Yes, only for these special cases:**

| Trigger | What to add in PlayGameClient.tsx |
|---|---|
| Per-mode weighted scoring (singleplayer/multiplayer split) | New `if (gameId === '…')` branch inside the `GAME_STATS` handler, calling `saveModeScoreStats()` |
| Non-standard inbound message format (e.g. legacy `{ type: 'gameScore' }`) | New message-type handler alongside the existing `GAME_EVENT` switch |
| External API key injected into the iframe | New outbound message alongside `PLAYER_INFO`; matching `REQUEST_*` handler |
| WebSocket/multiplayer game with query-param identity (like Chess) | Special `iframeSrc` construction; `PLAYER_INFO` is not used |

Standard games never hit any of these cases and can be added entirely by following this doc.

---

## Games with a backend server

### Copy server files
```
server/games/<id>/
  server.js         ← REST API, or socket-server.js for WebSocket
```
- Read port from env: `process.env.MY_GAME_PORT || 3002`
- Remove any static file serving (Next.js handles that)
- Add the port var to `server/.env.example`

### Register in the launcher — `server/start-all.js`
```js
const servers = [
  // ... existing ...
  { name: 'My Game', script: path.join(__dirname, 'games', '<id>', 'server.js') },
]
```

### REST API proxy — `next.config.js` rewrites
If the game calls `/api/...`, add a rewrite (list specific paths **before** the catch-all):
```js
{ source: '/api/my-game/:path*', destination: 'http://localhost:<port>/api/my-game/:path*' }
```

### WebSocket games
Socket.io games connect directly to the server port — no proxy needed. The socket server's CORS must allow `window.location.origin`:
```js
const socket = io(`http://${window.location.hostname}:3001`, { path: '/my-game-ws/' })
```

### Install server deps & env
```bash
cd server && npm install
cp .env.example .env   # fill in keys
```

---

## Running locally

```bash
npm run dev          # next dev + all backend servers
npm run dev:client   # next dev only
npm run dev:servers  # backend servers only
```
Dev server: `http://localhost:3000`

---

## Updating a game

```bash
#   ... edit games-src/<id>/... ...
npm run game:build <id>     # republish to public/games/<id>/
# hard-refresh the browser, then commit public/games/<id>/
```

---

## Deploying

Built artifacts under `public/games/` are committed and baked into the frontend image by `scripts/build-push.sh` (builds linux/arm64, pushes to GHCR; the Pi only pulls + runs). So the full path to production is:

```bash
npm run game:build <id>            # 1. publish artifact
#   ... register in app/games/games.ts ...
git add public/games/<id> app/games/games.ts && git commit   # 2. commit artifact + registry
./scripts/build-push.sh         # 3. build & push image
# on the Pi: docker compose -f docker-compose.prod.yml pull && ... up -d
```
There is **no** game-specific deploy step — `games-src/` is excluded from the image, and the artifact rides along inside `public/`.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Blank page in iframe | Asset paths are absolute (`/assets/...`) | Set `base: './'` in the game's Vite config and rebuild |
| `npm run game:build` says "no source folder" | Building before scaffolding/dropping source | Create `games-src/<id>/` first (`npm run game:new` or drop an export) |
| Build runs but "no dist/ or build/ output" | Game's build emits to a different dir | Make its build output `dist/` (Vite default) or `build/` |
| `cover.png` disappears after rebuild | Build doesn't emit a cover | Keep the cover in the game's own `public/cover.png` (Vite copies it), or it's auto-preserved if it already exists in `public/games/<id>/` |
| API calls fail (404) | Next.js rewrite not configured | Add a rewrite in `next.config.js` |
| WebSocket won't connect | CORS blocking | Update socket server CORS to allow the app's origin |
| Game shows old version | Browser cache | Hard-refresh; `npm run game:build` already wipes & republishes the folder |
| Score not saving | `BEST_SCORE` message wrong shape | Verify `type:'GAME_EVENT'`, `event:'BEST_SCORE'`, `data.bestScore` is a number |
| Matches always shows `-` | `totalGames` not in `GAME_STATS` payload | Add the `totalGames` counter to the game's `GAME_STATS` message |
| postMessage silently ignored | Origin mismatch | Game files must be in `public/games/`, served same-origin as Next.js |

---

## Project structure (relevant paths only)

```
skillforge/
├── games-src/                       ← ⭐ editable game SOURCE (committed; only deps/build ignored)
│   └── <id>/                            one folder per game (static or Vite/Node)
├── public/games/                    ← ⭐ published artifacts (committed, served as iframes)
│   └── <id>/index.html
├── scripts/
│   ├── new-game.sh                  ← scaffold games-src/<id>/ (npm run game:new)
│   ├── build-game.sh                ← build & publish (npm run game:build / :all)
│   └── GAME_DATA_COLLECTION_PROMPT.md
├── app/
│   ├── games/games.ts              ← ⭐ game registry (edit this to add games)
│   ├── play/[gameId]/PlayGameClient.tsx  ← iframe host; all postMessage handling
│   ├── profile/page.tsx            ← per-game best score + match count
│   └── services/gameDataService.ts ← Firestore score/stats API
├── server/
│   ├── start-all.js                ← registers/launches all backend servers
│   └── games/<id>/                 ← one folder per game with server code
└── next.config.js                  ← rewrites for API proxying
```
```
.gitignore     → games-src/**/node_modules, games-src/*/{dist,build}   (deps & build output only)
.dockerignore  → games-src                                             (all source out of the image context)
```
