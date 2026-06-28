# SkillForge — Audit Report (Round 9)

*Audited: 2026-06-28 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–8. This is the dedicated **S2 round** that rounds 7 and 8
> deferred: making scores **server-authoritative**. Rounds 1–8 closed auth,
> rate-limiting, socket authorization, OAuth-token handling, username integrity, the
> leaderboard read-path TTL, the avatar byte cap, and host-bridge score clamping — but
> the last *true* integrity gap remained: the client SDK could write
> `users/{uid}/scores/{gameId}` directly, so any authed user could forge any
> `bestScore` straight into the client-computed leaderboard, bypassing every app-level
> guard.
>
> This round migrates all leaderboard-relevant score writes in the host bridge to the
> already-hardened `/api/games/score` route, then **locks the `scores` subcollection in
> the Firestore rules** so the client SDK can no longer write it. Two smaller fixes ride
> along: a referrer-leak mitigation on every avatar `<img>`, and the long-deferred
> leaderboard recompute cron.
>
> Scope: app code + one Firestore-rules change (**needs a rules deploy**) +
> compose (**needs a prod rebuild + redeploy**). **No game-client artifacts.**

---

## HIGH — Fixed this round (S2 — server-authoritative scoring)

### R9-1. Host bridge wrote scores via the client SDK — migrated to the server route — ✅ FIXED
**File:** `app/play/[gameId]/PlayGameClient.tsx`

**Verified:** six of the seven score-write call sites in the postMessage bridge went
through the client SDK (`saveBestScore` / `saveModeScoreStats` / `saveGameStats`) straight
to Firestore — `jose-rizal` (`gameScore`), the generic `BEST_SCORE` branch (all standard
games), the `chroma-memory` `GAME_STATS` branch, and the generic `GAME_STATS` blob. Round 8
clamped these client-side (R8-3) but they still wrote with client authority, so the values
were only as trustworthy as the rules allowed (i.e. anything the owner wanted).

**Fixed:** added a module-scope `postScore(getToken, gameId, score, mode)` helper that POSTs
to `/api/games/score` with the player's verified ID token (fire-and-forget; a failed score
write never blocks gameplay). Migrated every leaderboard-relevant branch onto it:
- **`jose-rizal`** → `postScore('jose-rizal', score)`. The old custom `totalGames` counter was
  dropped — it never fed the leaderboard composite; the route's `buildWeightedModeStats`
  tracks per-mode play counts instead.
- **`BEST_SCORE`** (all non-chroma games) → `postScore(gameId, bestScore, 'singleplayer')`.
- **`chroma-memory` `GAME_STATS`** → `postScore('chroma-memory', clamped, normalizedMode)`
  (preserving its multi-field score extraction and singleplayer/multiplayer normalization).
- **generic `GAME_STATS`** → the leaderboard score (if any) is extracted via `extractScore()`
  and sent through `postScore`; the remaining **progress/resume** fields (score-like keys
  stripped via `progressBlob()`) are still written client-side via `saveGameStats` so
  `REQUEST_PROGRESS` can restore them. This residual client write is **S2-b** (see below).

`saveBestScore` / `saveModeScoreStats` are no longer imported. The route already enforces:
verified-token uid, `defaultGames` allowlist, finite `0..1e6` clamp, mode enum, and a per-uid
60/min throttle — so the migrated paths inherit all of it.

### R9-2. `scores` subcollection was client-writable — locked in the rules — ✅ FIXED (needs rules deploy)
**File:** `firestore.rules`

**Verified:** the single wildcard `match /users/{uid}/{sub}/{document=**}` granted
`read, write` to the owner across **all** subcollections, so `scores/{gameId}` was directly
writable by a client-SDK `setDoc` regardless of the host bridge. This is the core S2 gap: the
leaderboard (`collectionGroup('scores')`) trusts whatever is in those docs.

**Fixed:** split the wildcard into explicit matches:
- `users/{uid}/scores/{gameId}` — **read-only** for the owner; **no client write rule** (denied
  by default). The only write path is now `/api/games/score` (Admin SDK, which bypasses rules
  after verifying the token). Closes the score-tampering gap.
- `users/{uid}/gameStats/{statsId}` — still `read, write` for the owner (holds the
  progress/resume blob; the route also writes weighted stats here). This is **S2-b**.
- `users/{uid}/{sub}/{document=**}` — retained as an allowlist fallback for any other
  subcollection. The root-profile `role` protection (rounds 2/7) is unchanged.

**Deploy:** `firebase deploy --only firestore:rules --project skillforge-7a058`

---

## MEDIUM — Fixed this round

### R9-3. photoURL referrer leak on avatar render — ✅ FIXED
**Files:** `app/leaderboard/page.tsx`, `app/profile/page.tsx`, `app/profile/[uid]/page.tsx`,
`app/components/TopNav.tsx`, `app/components/AdminUsersTab.tsx`

**Verified:** `users/{uid}.photoURL` is client-writable + public-read and rendered as an
`<img src>` / `<AvatarImage>` on the leaderboard, profiles, the nav bar, and the admin user
list. A user can set an arbitrary external URL (no scheme/domain restriction yet), so when
any other user loads e.g. the leaderboard, their browser fetches the attacker's URL — leaking
the SkillForge `Referer` and the viewer's IP (tracking-pixel / viewer correlation). The S2
score-forgery gap composed with this: a forged top-leaderboard entry forced the pixel on every
leaderboard viewer.

**Fixed:** added `referrerPolicy="no-referrer"` to every avatar `<img>`/`<AvatarImage>` that
renders `photoURL`/`photoThumbURL`. This strips the `Referer` header (no viewer-origin/path
leak). It does **not** block the request itself — the full fix (a Firestore rule restricting
`photoURL` to known schemes/domains) stays deferred until the avatar-storage rework untangles
inline data-URL avatars from OAuth CDN URLs (carried forward).

---

## INFRA — Fixed this round (needs a prod rebuild + redeploy)

### R9-4. Leaderboard recompute cron (was N5 / R8-1 carry-forward) — ✅ FIXED
**File:** `docker-compose.prod.yml`

**Verified:** nothing in the stack invoked `POST /api/internal/leaderboards/recompute`, so the
first *user* request to a stale board paid the full `collectionGroup` scan (R8-1 only made
reads self-heal lazily). The route's auth is sound (round 8): `timingSafeEqual` against
`INTERNAL_API_SECRET`, fail-closed if the env var is absent.

**Fixed:** added a 16 MB `cron` alpine sidecar that calls the recompute route hourly over the
private Docker network (`http://frontend:3000`, never externally exposed), authenticated with
`INTERNAL_API_SECRET`. A heartbeat `while`-loop is used instead of busybox `crond` to avoid its
env-propagation quirks; it runs once on boot then every 3600s. Also added `INTERNAL_API_SECRET`
to the **frontend** runtime `environment:` block (the route returns 500 without it).
`depends_on: frontend (service_healthy)` + a `pgrep` healthcheck keep it consistent with R7-6.

**Provision:** set `INTERNAL_API_SECRET` in the Pi `.env` (`openssl rand -hex 32`) before
`docker compose up` — already documented in `.env.example`.

---

## Fresh sweep — checked, no new finding
- `/api/games/score` — verified-token uid, registry-checked gameId, finite `0..1e6` bound,
  `SUPPORTED_MODES` enum, per-uid throttle; best score only overwrites when strictly higher.
  Now the canonical write path. Clean.
- `firestore.rules` — `usernames` create binds to caller uid; `leaderboards` write `false`;
  `oauthLinks` read/write `false`; admin gated on the caller's own `role`. Clean (rounds 2/7).
- `next.config.js` headers — XFO `SAMEORIGIN` / nosniff / Referrer-Policy / HSTS present.
  **CSP remains deliberately deferred** (multi-origin app + iframed games; needs a nonce
  rollout) — unchanged from round 4. (A CSP `img-src` allow-list is the eventual *full* fix for
  the R9-3 tracking-pixel surface.)

---

## Still open (carried forward — next workstream)

- **S2-b** — `gameStats` is still client-writable (it carries the `REQUEST_PROGRESS`
  resume blob). The leaderboard-relevant score is now server-routed, but a crafted client
  write can still alter the progress/resume fields and the weighted-stats fields under its own
  uid. Locking it needs a server progress API (read+write resume state over HTTP) so the
  client SDK loses write access entirely. Tagged `S2-b` in code + rules.
- **photoURL arbitrary content (MED):** R9-3 mitigates the *referrer* leak; the request still
  fires. Restricting `photoURL` to known schemes/domains awaits the avatar-storage rework.
- **P1/P2** — admin analytics/dashboard caching: `getPlatformStats` (2 full scans),
  `getLearningGapReport` (3 **sequential** full scans), `getAllUsers` (1 scan + re-fired per
  mutation) all run uncached on every admin tab open. **P3** — WebP covers (all 30 are PNG; the
  cover path is synthesized by convention at 3 call sites, no `coverImage` field).
- **CSP** rollout; **Chess** — server-side move legality (needs an embedded engine).

---

## Recommended fix order

```
Done this round (2026-06-28):
  [x] R9-1 — host-bridge score writes migrated to /api/games/score (S2-a)
  [x] R9-2 — scores subcollection locked read-only in firestore.rules (S2 — DEPLOY rules)
  [x] R9-3 — referrerPolicy="no-referrer" on every avatar img (photoURL referrer leak)
  [x] R9-4 — hourly leaderboard recompute cron + INTERNAL_API_SECRET on frontend

Next workstream:
  [ ] S2-b — server progress API, then lock gameStats writes in the rules
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers
  [ ] photoURL scheme/domain restriction alongside an avatar-storage rework; CSP rollout
  [ ] Chess server-side move legality (embedded engine)
```

**Verification (this round):** `npm run build` compiles clean; `npm test` passes (16/16). Manual
checks to run post-deploy: (1) play a game → confirm the Network tab shows `POST /api/games/score`
(not a Firestore client write) and the score lands under `users/{uid}/scores/{gameId}`; (2) after
the rules deploy, a direct client-SDK `setDoc` to `users/{uid}/scores/test` is `PERMISSION_DENIED`;
(3) `REQUEST_PROGRESS` still round-trips (resume blob via the client `gameStats` write/read);
(4) `docker ps` shows the `cron` service healthy and a recompute fires on boot.

**Bottom line:** scores are now server-authoritative — the client SDK can no longer write
`scores`, and every in-app score flows through the verified-token, rate-limited, range-clamped
route. The avatar referrer leak is mitigated, and the leaderboard no longer makes a user pay the
full-scan cost. S2-b (locking the `gameStats` resume blob behind a progress API) is the next
headline.

> **Deploy checklist:** (1) `firebase deploy --only firestore:rules --project skillforge-7a058`
> for R9-2; (2) ensure `INTERNAL_API_SECRET` is set in the Pi `.env`; (3) rebuild + redeploy the
> compose stack on the Pi, then confirm `docker ps` shows every service (incl. `cron`) `healthy`,
> scoring still works across the games, and a forged client score write is denied.
