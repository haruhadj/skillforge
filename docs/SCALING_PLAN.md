# SkillForge Scaling Plan

Last updated: 2026-06-19

---

## Phase 1 — Fix What's Broken in Prod

> Multiplayer WebSocket games (Chess, TicTacToe, Chroma Memory) silently fail in production
> because `docker-compose.prod.yml` has no nginx service — the `nginx/skillforge.conf` WebSocket
> routing rules are never loaded. Fix this before growing the user base.

- [x] Add nginx service to `docker-compose.prod.yml`
- [x] Update `nginx/skillforge.conf` to proxy `/` to the Next.js frontend (instead of serving static files)
- [x] Expose nginx on port 80 as the single entry point; remove direct frontend port 1234 exposure - this is obsolete/modified have new solution
- [x] Smoke-test in prod: confirm Chess, TicTacToe, and Chroma Memory Socket.IO connections succeed via same-origin paths (`/chess-ws/`, `/tictactoe-ws/`, `/chroma-memory-ws/`)

---

## Phase 2 — Fix What Will Break Next (Leaderboard Materialization)

> Every leaderboard render triggers a `collectionGroup` scan across all users' score/stat docs.
> Cost and latency grow linearly with user count. At 10k users × 28 games = 280k+ reads per render.
>
> **Approach**: Instead of Firebase Cloud Functions (no functions/ dir existed; client write path
> bypasses any server hook regardless), leaderboards are materialized into `/leaderboards/*`
> Firestore docs via `POST /api/internal/leaderboards/recompute`. The leaderboard API reads
> 1 doc per request instead of scanning all users.

- [x] Add `POST /api/internal/leaderboards/recompute` endpoint (protected by `INTERNAL_API_SECRET`)
      that scans all score/stat docs, writes `/leaderboards/_global`, `/leaderboards/_popularity`,
      and `/leaderboards/{gameId}` (top-10 per game) in a single batch
- [x] Update `app/api/leaderboard/route.ts` to read from materialized docs (1 read per request);
      falls back to full scan + writes materialized doc on first call / missing doc
- [x] Add Firestore security rules for the `leaderboards` collection (public read, write=false)
- [x] Add `INTERNAL_API_SECRET` env var (documented in `.env.example`)
- [ ] **Seed**: call `POST /api/internal/leaderboards/recompute` once after prod deploy
- [ ] **Schedule** (Phase 4): wire the recompute endpoint to a cron job for periodic refresh

---

## Phase 3 — Grow the Product

> Platform is solid; now make users come back and tell their friends.

### 3a — Visible Progression Loop
- [ ] Surface user XP / level / badges on the profile and game pages
- [ ] Design a simple leveling formula based on existing `gameStats` data
- [ ] Add a "Recent Activity" feed on the dashboard

### 3b — Social / Viral Layer
- [ ] "Beat my score" shareable links (`/challenge/{gameId}?score=X&uid=Y`)
- [ ] Friend system (follow/follower or friend request) backed by Firestore
- [ ] Head-to-head challenge notifications (in-app, later push)

### 3c — Game Content Pipeline
- [ ] Document the iframe contract (`PLAYER_INFO`, `GAME_EVENT`, `BEST_SCORE`, `GAME_STATS`) so new games can be added without touching PlayGameClient
- [ ] Streamline game registration — currently manual in `app/games/games.ts`
- [ ] Evaluate adding 3-5 new educational games per quarter

---

## Phase 4 — Infrastructure Hardening

> Only needed once user count is meaningful enough to justify the ops overhead.

- [ ] Add Redis adapter to Socket.IO servers (enables horizontal scaling of Chess/TicTacToe/Chroma Memory)
- [ ] Set up a CDN (Cloudflare or similar) in front of nginx for static game assets
- [ ] Add structured logging (Pino/Winston) to all game servers
- [ ] Set up uptime monitoring (Betterstack / UptimeRobot) for each service endpoint
- [ ] Add rate limiting to the Spelling Bee and Vocab API endpoints
- [ ] CI/CD pipeline: auto-deploy on merge to main (GitHub Actions → SSH → `docker compose pull && up -d`)

---

## Current Status

| Phase | Status |
|-------|--------|
| Phase 1 — Prod WebSocket fix | In progress |
| Phase 2 — Leaderboard materialization | Done (seed recompute needed in prod) |
| Phase 3 — Product growth | Not started |
| Phase 4 — Infrastructure hardening | Not started |
