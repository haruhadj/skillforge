# SkillForge — Audit Summary (Rounds 1–17)

Consolidated index of the security + performance audit series (2026-06-26 → 2026-06-30).
Each round's per-file report was folded into this summary; the full text of any round remains
in git history. **Rounds 1–16 = security; round 17 = performance.** All findings are fixed.

Deploy markers: **[rules]** = `firebase deploy --only firestore:rules --project skillforge-7a058`;
**[frontend]** / **[server: …]** = rebuild that Docker image on the Pi.

---

## Round 1 — 2026-06-26 (admin route + secrets)
- Secured `/api/admin/delete-user` with ID-token + admin-role check. **[frontend]**
- Removed OAuth secrets from Docker build args (runtime env only).

## Round 2 — 2026-06-27 (rules + DoS + headers)
- **C1** firestore.rules role-escalation fix **[rules]**; **H1** socket-server DoS caps + idle
  reaper + per-IP throttle **[server: chess/ttt/chroma]**; **H2** container resource limits;
  **H3** Hamaru CORS alignment; **S3** score sanity bound on the HTTP route.

## Round 3 — 2026-06-27 (proxy-aware throttle + CORS)
- **R1** socket throttle keys on real client IP (X-Forwarded-For); **R2** spelling-bee CORS
  restricted to app origins; **R3** spelling-bee log endpoint sanitized.

## Round 4 — 2026-06-27 (OAuth verify + baseline headers)
- **R4-1** Google callback enforces `verified_email` before account unification;
  **R4-2** baseline security headers on the Next app (both configs).

## Round 5 — 2026-06-27 (token delivery + reset throttle)
- **R5-1** OAuth custom token moved out of the URL into a single-use httpOnly cookie;
  **R5-2** forgot-password rate-limited per IP + per email.

## Round 6 — 2026-06-27 (server-authoritative moves + hardening)
- **R6-1** TicTacToe `make_move`: server-derived symbol/turn/bounds + rematch guard;
  **R6-2** Chess move seated-player + turn-ownership check; **R6-3** rate-limit
  score/leaderboard/plays; **R6-4** timing-safe `INTERNAL_API_SECRET` compare;
  **R6-5** generic error bodies on delete routes; **R6-6** shared `LINKABLE_PROVIDERS`
  (twitter/facebook unlinkable); **R6-7/8** chroma NaN guard + room-leak fix.

## Round 7 — 2026-06-27 (usernames + Docker/nginx hardening)
- **R7-1** leaderboard GET validates gameId before admin write; **R7-2** atomic `claimUsername`
  (no drift, old name reaped on rename); **R7-3** reserved-username blocklist; **R7-4** usernames
  create-rule binds doc to caller uid **[rules]**; **R7-5** dropped dead tts-key mount;
  **R7-6** Docker healthchecks + `service_healthy` gating (8 services); **R7-7** non-root
  (`USER node`) in both Dockerfiles; **R7-8** nginx `server_tokens off` + body cap + `/healthz`.

## Round 8 — 2026-06-27 (cache TTL + score clamps)
- **R8-1** leaderboard read-path TTL (global + game self-heal on staleness); **R8-2** avatar byte
  cap under Firestore doc limit; **R8-3** host-bridge score clamp (jose-rizal / BEST_SCORE /
  chroma / GAME_STATS blob).

## Round 9 — 2026-06-27 (server-authoritative scores)
- **R9-1** host-bridge score writes migrated to `/api/games/score` (S2-a); **R9-2** scores
  subcollection locked read-only **[rules]**; **R9-3** `referrerPolicy="no-referrer"` on avatars;
  **R9-4** hourly leaderboard recompute cron + `INTERNAL_API_SECRET` on frontend; **R9-5/6**
  deploy fixes (frontend binds 0.0.0.0; nginx healthcheck uses 127.0.0.1).

## Round 10 — 2026-06-27 (throttle bypass + flood guards)
- **R10-1** socket clientIp uses trusted last XFF hop (throttle-bypass fix); **R10-2** vocab
  heavy-endpoint limiter (20/min) + lower count clamps; **R10-3** TTS cache maxKeys cap;
  **R10-4** per-socket event-flood guard + roomId length cap (3 socket servers); **R10-5**
  reconciled REST CORS lists across vocab/hamaru/spelling-bee.

## Round 11 — 2026-06-28 (gameStats lock + progress API)
- **R11-1** server progress API (`/api/games/progress`) + namespaced `gameStats.progress`; host
  bridge migrated; dead client writers removed; **R11-2** gameStats locked owner-read-only
  **[rules]**; **R11-3** recursive owner-subcollection fallback narrowed to read-only (completes R9-2).

## Round 12 — 2026-06-29 (photoURL sanitize + partial CSP)
- **R12-1** `sanitizePhotoURL` applied at write time (oauthLinks + userProfileService);
  **R12-2** partial CSP (object-src, base-uri, frame-src, frame-ancestors, img-src).

## Round 13 — 2026-06-29 (full CSP)
- **R13-1** script-src/style-src/font-src/connect-src added (with required `'unsafe-inline'`);
  **R13-2** frame-src widened for the Firebase auth iframe; **R13-3** strict CSP scoped to app
  routes via negative-lookahead; games excluded; live-verified.

## Round 14 — 2026-06-29 (PII lock + publicProfiles)
- **R14-1** `publicProfiles` collection; `users/{uid}` locked to owner+admin read **[rules]**;
  **R14-2** `hasOnly` key allowlist on publicProfiles writes + pure `pickPublicProfileFields`;
  **R14-3** cross-user reads → `getPublicProfile`; email display/fallback removed; sync on 3 write
  paths; **R14-4** backfill script for existing users.

## Round 15 — 2026-06-30 (server-authoritative chess)
- **R15-1** Chess server recomputes the board with chess.js (`applyMove`); client FEN no longer
  trusted; **R15-2** reject null/pass move (turn-skip); **R15-3** server-authoritative game end
  on checkmate/stalemate/draw; **R15-4** fixed non-standard `START_FEN`. **[server: chess]**

## Round 16 — 2026-06-30 (nonce-based CSP)
- **R16-1** `script-src` nonce minted per request in `middleware.ts` (Edge/Web Crypto);
  `'unsafe-inline'` + `'unsafe-eval'` removed from script-src; **R16-2** game-iframe exclusion
  preserved via matcher; **R16-3** app routes forced dynamic so the nonce reaches every script.
  `style-src 'unsafe-inline'` kept as the one documented lower-risk limitation. **[frontend]**

## Round 17 — 2026-06-30 (performance / scaling)
- **P-A** vocab `ORDER BY RANDOM()` full-scans → cached candidate pools sampled in JS
  (`sampleDistinct`); ~200ms→0ms after warm-up. **[server: vocab, spelling-bee]**
- **P1/P2** admin Dashboard/Analytics + activity feed `collectionGroup` scans → cached server
  routes mirroring `/api/leaderboard` (`/api/admin/platform-stats`, `/api/admin/learning-gap`
  admin-gated via `requireAdmin`; `/api/activity` public + rate-limited); `adminCache`/
  `activityCache` Admin-SDK-only **[rules]**. **[frontend]**
- **P3** WebP covers via `optimize-covers.mjs` + `<GameCover>` (PNG fallback); 15.9MB → 997KB
  (−94%). **[frontend]**

---

**Status:** security backlog (rounds 1–16) + performance backlog (round 17) **complete**.
Remaining future work is Phase-4 infrastructure only — Redis adapter, CDN, structured logging,
uptime monitoring, CI/CD — tracked in `SCALING_PLAN.md`, not a code-audit item.
