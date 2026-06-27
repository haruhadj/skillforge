# SkillForge — Audit Report (Round 7)

*Audited: 2026-06-27 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–6. Earlier rounds closed the auth, rate-limit,
> socket-authorization, and OAuth-token surfaces. This pass opened a
> **previously-unexamined cluster: user-document and write-path integrity** — the
> username-claim transaction, an over-permissive `usernames` create rule, and one
> unauthenticated Admin-SDK write keyed by client input — then cleared the
> carried-forward **infra** backlog (healthchecks, non-root containers, dead config,
> edge hardening).
>
> Headline: `claimUsername` wrote the user profile **outside** its transaction, so a
> losing race left the profile asserting a username it didn't own, and a rename never
> reaped the old reservation. Combined with a `usernames` create rule that didn't bind
> the doc to the caller's uid, any authed user could squat or forge names entirely
> outside `claimUsername`. Both are now closed.
>
> Scope: app code + one Firestore-rules change (needs a rules deploy) + compose/Dockerfile/nginx
> (needs a prod rebuild + redeploy). **No game-client artifacts and no score-flow changes.**

---

## MEDIUM — Fixed this round

### R7-1. Leaderboard GET wrote an Admin-SDK doc keyed by unvalidated `gameId` — ✅ FIXED
**File:** `app/api/leaderboard/route.ts`

**Verified:** in `mode=game`, `gameId` was only presence-checked, then on a cache miss the
route did `adminDb.collection('leaderboards').doc(gameId).set({ entries, recomputedAt })`. The
route is **public/unauthenticated** (throttled 30/min/IP only), so an attacker could pass
arbitrary `gameId` values to mint unbounded junk `leaderboards/*` documents (storage/cost
growth), and slash-containing values steered the write to nested doc paths.

**Fixed:** validate `gameId` against `defaultGames` (the same registry `app/api/games/score/route.ts:57`
checks) and return `404 Unknown gameId` **before** the read/write. Valid games are unaffected.

### R7-2. `claimUsername` was non-atomic (profile drift + orphaned rename) — ✅ FIXED
**File:** `app/services/userProfileService.ts`

**Verified:** the profile `setDoc(userRef, { username, usernameNormalized, … })` ran **outside**
the `runTransaction`. Two defects:
- **Drift on conflict:** if the in-transaction availability check then threw "already taken", the
  profile had *already* been mutated to claim a username owned by someone else.
- **Orphaned rename:** because the profile was written first, the in-transaction read of the user
  doc saw the *new* `usernameNormalized`, so the `previousNormalized !== normalized` cleanup branch
  was never true — the old `usernames/<old>` doc was never deleted, leaking reservations that could
  never be reclaimed.

**Fixed:** the profile write now happens **inside** the transaction. All reads run first (target
username doc → user doc for the true previous normalized → the previous username doc), then all
writes (profile set, conditional old-username delete, new-username set) commit atomically. A taken
username now leaves the profile untouched, and renames reap the old reservation. (Firestore client
transactions auto-retry on the AuthContext profile-write race the old out-of-transaction comment
worried about, so moving the write in is safe.)

### R7-3. No reserved-username blocklist (impersonation) — ✅ FIXED
**File:** `app/services/userProfileService.ts`

**Verified:** `isValidUsername` enforced only `^[A-Za-z0-9_]{3,20}$`; nothing blocked `admin`,
`administrator`, `support`, `moderator`, `official`, `root`, `system`, `skillforge`, … so any user
could claim a staff/system-looking name for impersonation.

**Fixed:** added a normalized `RESERVED_USERNAMES` set (+ exported `isReservedUsername()` helper)
and reject reserved names in `claimUsername` before the transaction with a clear error.

### R7-4. `usernames` create rule didn't bind the doc to the caller — ✅ FIXED (needs rules deploy)
**File:** `firestore.rules`

**Verified:** `allow create: if request.auth != null;` — unlike `update`/`delete`, it did **not**
require `request.resource.data.uid == request.auth.uid`. So any authed user could directly
`setDoc(usernames/<name>, { uid })` to squat every desirable name (denial) or forge an entry whose
`uid` points at a victim — bypassing `claimUsername` (R7-2/R7-3) entirely.

**Fixed:** `allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;`
The normal flow (R7-2) still works; the direct-write bypass is closed.
**Deploy:** `firebase deploy --only firestore:rules --project skillforge-7a058`.

---

## Infra — Fixed this round (needs a prod rebuild + redeploy to take effect)

### R7-5. Dead TTS config on the spelling-bee service (was M5) — ✅ FIXED
**File:** `docker-compose.prod.yml`
The service runs **msedge-tts** (`server/games/spelling-bee/server.js`), but still carried
`GOOGLE_APPLICATION_CREDENTIALS=/app/tts-key.json` + a `./server/tts-key.json:/app/tts-key.json:ro`
mount whose source file doesn't exist (Docker would bind-mount a phantom directory). Both removed.

### R7-6. No Docker healthchecks / `service_healthy` gating (was M1) — ✅ FIXED
**File:** `docker-compose.prod.yml`
Added a `healthcheck:` to all 8 services and converted every `depends_on` to long-form
`condition: service_healthy` (nginx, frontend, spelling-bee). The app services use a dependency-free
TCP probe (`node -e require('net').connect(PORT,'127.0.0.1')…`) so it works uniformly for the
Socket.IO and REST servers; nginx probes its own new `/healthz` location (no upstream coupling).
Per-service `start_period` accounts for slow boots (hamaru 40s for the 16 MB JMdict load).

### R7-7. Containers ran as root (new — N1) — ✅ FIXED
**Files:** `Dockerfile.frontend`, `server/Dockerfile`
Neither image set a `USER`. Both now drop to the built-in uid-1000 `node` user before `CMD`. The
frontend standalone server and the game servers only read from `/app` (and a `:ro` WordNet mount),
so no writable path is needed. Also narrowed the server image `EXPOSE` to the ports actually used.
**Validate on redeploy** that the WordNet SQLite mount is world-readable to the `node` user.

### R7-8. nginx edge hardening (new — N2) — ✅ FIXED
**File:** `nginx/skillforge.conf`
Added `server_tokens off;` (no version leak in responses/error pages) and `client_max_body_size 2m;`
(default 1m could 413 legitimate TTS/word POSTs), plus a `location = /healthz` liveness endpoint for
the R7-6 healthcheck. Edge `limit_req` was intentionally deferred — the app already rate-limits
per-route (rounds 5/6).

---

## Checked and found clean (assurance — no finding)

- **Admin API gating:** the only `app/api/admin/*` route (delete-user) verifies a Bearer ID token
  and checks `role == 'admin'` server-side — not relying on the client UI.
- **Admin-SDK caller auth:** every Admin-SDK route authenticates its caller (delete-user,
  delete-account, score, plays POST, link/start, link/remove) or is intentionally public-read with a
  shared-secret/throttle (recompute, leaderboard GET) — R7-1 closed the one write gap.
- **Avatar upload:** there is **no** Firebase Storage / `storage.rules`; `uploadProfilePhoto` writes a
  base64 data URL into the Firestore user doc via the client SDK — **no filesystem path-traversal surface.**

---

## Still open (carried forward — next workstream)

- **photoURL arbitrary content (MED, documented):** `users/{uid}.photoURL` is client-writable +
  public-read and rendered as `<img src>` on leaderboards/profiles, so a user can set an arbitrary
  external URL (tracking-pixel / viewer-IP leak). A rules constraint is awkward — OAuth providers
  legitimately set `https://` avatar URLs and inline avatars are ~1 MB data URLs — so a tight rule
  would break real avatars. Revisit alongside a future avatar-storage rework (scheme allow-list +
  length cap). *(Also note: `MAX_PHOTO_BYTES` 2 MB vs Firestore's ~1 MB doc cap — a near-limit upload
  base64-inflates past 1 MB and the write fails; lower the limit when avatars are reworked.)*
- **S2** — scores still not server-authoritative (client SDK can write `scores`/`gameStats`). The
  one remaining true integrity gap; the headline next round. Needs server-route parity for the
  chroma-memory / jose-rizal / generic-`GAME_STATS` cases, the `PlayGameClient` → `/api/games/score`
  migration, **then** locking the Firestore rules + a deploy + re-testing scoring across ~21 games.
- **N5 / #4 / #5** — leaderboard recompute cron + read-path TTL + denormalized entries.
- **P1/P2** — admin analytics/dashboard caching; **P3** — WebP covers.
- **#7** — admin pagination. **L5** — placeholder Firebase web keys in `.env.example` (public-by-design).
- **CSP** — still deliberately deferred since round 4 (multi-origin app; needs a tested rollout).
- **Chess legality** — server-side move validation (needs an embedded engine); only who-moves-when enforced.

---

## Recommended fix order

```
Done this round (2026-06-27):
  [x] R7-1 — leaderboard GET validates gameId against defaultGames before the admin write
  [x] R7-2 — claimUsername made atomic (no profile drift; old username reaped on rename)
  [x] R7-3 — reserved-username blocklist
  [x] R7-4 — usernames create rule binds the doc to the caller's uid (DEPLOY rules)
  [x] R7-5 — dropped dead tts-key.json mount + GOOGLE_APPLICATION_CREDENTIALS
  [x] R7-6 — Docker healthchecks + service_healthy gating (all 8 services)
  [x] R7-7 — non-root (USER node) in both Dockerfiles
  [x] R7-8 — nginx server_tokens off + client_max_body_size + /healthz

Next workstream:
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules (dedicated round)
  [ ] N5 + #4/#5 — leaderboard recompute cron + read-path TTL
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers
  [ ] photoURL hardening alongside an avatar-storage rework; CSP rollout
```

**Bottom line:** the username system can no longer drift, leak reservations, be squatted, or be
forged from a direct write; the one unauthenticated Admin-SDK write is now registry-validated; and
the container/edge layer is hardened (healthchecks gate startup, services run non-root, dead TTS
config is gone, nginx stops leaking its version and caps body size). The remaining backlog is the
architectural/performance work — server-authoritative scoring (S2) is the next headline.

> **Deploy checklist:** (1) `firebase deploy --only firestore:rules --project skillforge-7a058`
> for R7-4; (2) rebuild + redeploy the compose stack on the Pi for R7-5..R7-8, then confirm
> `docker ps` shows every service `healthy` and the games + TTS work as the non-root `node` user.
