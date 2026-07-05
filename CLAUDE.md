- this project is "mobile first" UI web design 
- my production is by docker hosted on my raspberry pi 5 (192.168.1.5), with nginx proxy manager `skillforge.haruhadj.org => 192.168.1.5:1234`, my domain `haruhadj.org`
- using npm to launch dev - (npm run dev)
- always make sure the web's and the game's ui are optimized for both dekstop and mobile devices responsivess

## SkillForge — Project Architecture

Educational gaming platform: **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4**, with Firebase for auth/data and a set of standalone Node game servers. Package manager: **npm** (single manager for the whole repo — app, server, and game source, matching the Docker prod images). Next build output goes to `dist/` (`distDir: 'dist'` in `next.config.js`).

### Frontend ↔ Firebase
- **Client SDK** (`app/lib/firebase.ts`): `auth`, `db`, `storage`, configured from `NEXT_PUBLIC_*` env vars. Used directly from the browser.
- **Admin SDK** (`app/lib/firebase-admin.ts`): lazy-initialized; used only inside API routes for privileged ops (password-reset link generation, account deletion).
- **Auth** (`app/contexts/AuthContext.tsx`): email/password + Google popup. GitHub/Twitter/Discord sign in via a custom OAuth→Firebase custom-token broker (`app/api/auth/*`), not Firebase popups. On every auth-state change it calls `ensureUserProfileDocument()` to self-heal missing Firestore profiles.
- **Firestore model** (`app/services/gameDataService.ts`): `users/{uid}/scores/{gameId}` (best score, write-if-higher) and `users/{uid}/gameStats/{gameId}` (weighted per-mode stats). Leaderboards are computed **client-side** via `collectionGroup` scans across all users + a composite scoring formula (skill 70% + diversity bonus + sqrt-experience). This reads every score/stat doc per call — a known scaling concern.
- **Firestore rules** (`firestore.rules`): admin is gated on `users/{uid}.role == 'admin'` via the `isAdmin()` helper (reads the *caller's* doc, not the target). Owner writes are scoped to subcollections (`scores`/`gameStats`); the root profile doc forbids self-assigning `role`. Deploy with `firebase deploy --only firestore:rules --project skillforge-7a058`.

### Games
- ~21 games registered in `app/games/games.ts`; each runs as a **static iframe** under `public/games/<id>/`. These are pre-built artifacts (hashed Vite/Next bundles) — their source is NOT in this repo, so client-side game bugs can't be fixed here, only via env/config/proxy.
- The host ↔ iframe bridge is `app/play/[gameId]/PlayGameClient.tsx` using origin-checked `postMessage` (`PLAYER_INFO`, `GAME_EVENT`/`BEST_SCORE`/`GAME_STATS`, `REQUEST_PROGRESS`; special-cased: `jose-rizal`, `chroma-memory`, and `geoguessr-clone` which needs `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`).
- **Two score-write paths exist**: the client path (PlayGameClient → gameDataService) and a server route `app/api/games/score`. Confirm which is canonical before changing scoring.

### Game servers (`server/`, launched by `server/start-all.js`)
| Server | Type | Local port | Docker port |
|---|---|---|---|
| Chess | Socket.IO `/chess-ws/` | 3004 | 3004 |
| TicTacToe | Socket.IO `/tictactoe-ws/` | 3001 | 3005 |
| Chroma Memory | Socket.IO `/chroma-memory-ws/` | 3002 | 3002 |
| Spelling Bee | Express REST | 8787 | 8787 |
| Vocab | Express REST | 8788 | 8788 |

- **WordNet is a library, not a server**: `server/wordnet/service.js` wraps a 168 MB Open English WordNet SQLite via Node's built-in `node:sqlite` (Node 24+, read-only). Spelling Bee & Vocab dynamically `import()` it; Spelling Bee falls back to `data/wordBank.json`.
- TicTacToe local=3001 / prod=3005 is **intentional**, not a bug: the built client connects to `localhost:3001` on localhost and to same-origin `/tictactoe-ws/` otherwise (nginx proxies to `tictactoe:3005`).
- ⚠️ **Deployment gap**: `docker-compose.prod.yml` runs Next directly (port 1234→3000) with **no service for nginx and no Next rewrite for the `*-ws/` socket paths**. WebSocket routing in that compose depends on an external reverse proxy (`nginx/skillforge.conf`) that isn't wired in. `next.config.js` only rewrites `/api/*` → spelling-bee/vocab.

### Build & test
- `npm run dev` = `next dev` + all game servers (concurrently). `npm run build` = `next build`.
- **Game source under `games-src/<id>/` builds in isolation**: `scripts/build-game.sh` (run via `npm run game:build <id>`) does `npm install` + `npm run build` inside the game folder, which keeps its own local `package-lock.json` + `node_modules` so a game's pinned React/Vite versions never collide with the main app's lockfile. Run game builds only through `build-game.sh` / the `game:build` script — don't hand-manage deps inside `games-src/`. See `docs/ADDING_GAMES.md`.
- `npm test` = `vitest run`, configured by `vitest.config.ts` (jsdom, `@`→root alias, setup in `tests/setup.ts`). Tests live in `tests/`.
- The old Vite stack (`vite.config.js`, root `index.html`, `src/`) was legacy/broken and has been removed; Tailwind v4 is driven via `@tailwindcss/postcss`.

## Rules

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary — prefer editing existing files
- NEVER create documentation files unless explicitly requested
- NEVER save working files or tests to root — use `/src`, `/tests`, `/docs`, `/config`, `/scripts`
- ALWAYS read a file before editing it
- NEVER commit secrets, credentials, or .env files
- NEVER add a `Co-Authored-By` trailer to user commits unless this project's `.claude/settings.json` has `attribution.commit` set (#2078). The Claude Code Bash tool may suggest one in its default commit-message template — ignore it. `Co-Authored-By` is semantic authorship attribution under git/GitHub convention; the tool is the facilitator, not a co-author.
- Keep files under 500 lines
- Validate input at system boundaries

## Build & Test

- ALWAYS run tests after code changes
- ALWAYS verify build succeeds before committing

```bash
npm run build && npm test
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
