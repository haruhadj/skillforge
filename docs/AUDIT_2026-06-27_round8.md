# SkillForge — Audit Report (Round 8)

*Audited: 2026-06-28 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–7. Earlier rounds closed the auth, rate-limit,
> socket-authorization, OAuth-token, and username-integrity surfaces. The one
> remaining *true* integrity gap — **S2, server-authoritative scoring** — is large and
> risky (it needs a Firestore rules deploy plus re-testing scoring across ~21 prebuilt
> game artifacts that can't be modified or validated in this repo, and it is entangled
> with the inherently client-authored `REQUEST_PROGRESS` resume blob). It therefore
> stays a **dedicated future round**.
>
> This pass is a deliberately low-risk sweep of the not-yet-hardened read/write
> surfaces, shipping three independently-verifiable fixes — a leaderboard read path that
> froze forever, an avatar byte cap that exceeded Firestore's doc limit, and unvalidated
> client score writes at the host bridge (partial mitigation of S2's blast radius).
>
> Scope: app code only. **No Firestore rules change (no rules deploy), no game-client
> artifacts.** Needs an app redeploy.

---

## MEDIUM — Fixed this round

### R8-1. Leaderboard read path froze forever — `global` + `game` modes (was N5/#4) — ✅ FIXED
**File:** `app/api/leaderboard/route.ts`

**Verified:** `mode=popularity` self-healed on a 5-min `recomputedAt` TTL, but
`mode=global` and `mode=game` returned the cached `/leaderboards/*` doc whenever it merely
`exists` — **no TTL**. Since nothing in the repo invokes the recompute route, the first
request materialized the doc via the expensive `collectionGroup` scan and those values then
**froze permanently** — new scores never surfaced on the global/per-game boards.

**Fixed:** extracted the staleness check into an `isFresh(data, ttlMs)` helper (reusing the
existing `toMillis()`), hoisted the TTL to a `CACHE_TTL_MS = 5 * 60 * 1000` constant, and
applied it uniformly to all three modes. A stale or missing doc now degrades to
recompute-and-cache instead of serving stale-forever data. The `popularity` branch was
refactored onto the same helper (no behavior change there).

**Note:** an external cron hitting `POST /api/internal/leaderboards/recompute` is still
recommended so a *user* request never pays the full-scan cost; wiring it into
`docker-compose.prod.yml` is deferred infra (carried forward).

### R8-2. Avatar byte cap (2 MB) exceeded Firestore's ~1 MB doc limit (was round-7 note) — ✅ FIXED
**File:** `app/services/userProfileService.ts`

**Verified:** `uploadProfilePhoto` stores the avatar as a base64 **data URL inside the
Firestore user doc** (not in Storage). `MAX_PHOTO_BYTES = 2 * 1024 * 1024` let a file pass
validation that, once base64-inflated (~1.37×) and combined with the thumbnail + the rest of
the profile in one doc, **exceeded Firestore's ~1 MB document limit** — the `setDoc` then
failed and the upload silently broke near the limit.

**Fixed:** lowered `MAX_PHOTO_BYTES` to `600 * 1024` (600 KB raw ≈ ~820 KB base64 per image,
keeping main + thumb safely under the doc cap) and corrected the user-facing message to
"Image must be 600 KB or smaller". `ALLOWED_IMAGE_TYPES` unchanged.

### R8-3. Host bridge wrote unvalidated client scores (S2 blast-radius mitigation) — ✅ FIXED
**File:** `app/play/[gameId]/PlayGameClient.tsx`

**Verified:** the server route `/api/games/score` clamps scores to finite `0..1_000_000`,
but the client-SDK write paths in the host postMessage bridge did **not**:
- `jose-rizal` `gameScore` → `saveBestScore(uid, 'jose-rizal', msg.score)` — raw, unvalidated
  (`NaN` / negative / `1e9` all written straight to Firestore).
- `BEST_SCORE` → `saveBestScore(uid, gameId, msg.data.bestScore)` — unvalidated.
- generic `GAME_STATS` → `saveGameStats(uid, gameId, msg.data)` — arbitrary client blob.

Only the `chroma-memory` branch checked `Number.isNaN`. Until S2 makes scoring
server-authoritative, a crafted `postMessage` (or a buggy game) could poison the
client-computed leaderboard with `NaN`/huge values.

**Fixed:** added a module-scope `clampScore()` (mirrors the route's `MAX_SCORE = 1_000_000`;
returns `null` for non-finite input → caller skips the write) and gated the `jose-rizal`,
`BEST_SCORE`, and `chroma-memory` writes on it. The generic `GAME_STATS` blob now passes
through `sanitizeStatsBlob()`, which clamps numeric score-like fields
(`bestScore`/`score`/`lastScore`) and leaves all other progress/resume fields untouched. A
clear comment marks these as a **stopgap** that the eventual S2 migration supersedes.

---

## Fresh sweep — checked, no new finding
- `app/api/games/score/route.ts` — token-derived uid, registry-checked gameId, finite
  `0..1e6` bound, whitelisted mode, per-uid throttle. Clean (rounds 2/3/6).
- `firestore.rules` — subcollection owner-write scoped below the root profile doc;
  `usernames` create binds to caller uid; `leaderboards` write `false`; admin gated on the
  caller's own `role`. Clean (rounds 2/7).
- `next.config.js` headers — XFO `SAMEORIGIN` / nosniff / Referrer-Policy / HSTS present.
  **CSP remains deliberately deferred** (multi-origin app + iframed games; needs a tested
  rollout) — unchanged from round 4.

---

## Still open (carried forward — next workstream)

- **S2** — scores still not server-authoritative (client SDK can write `scores`/`gameStats`).
  The headline next round: server-route parity for the `jose-rizal` / chroma-memory /
  generic-`GAME_STATS` cases, the `PlayGameClient` → `/api/games/score` migration, **then**
  locking the Firestore rules + a deploy + re-testing scoring across ~21 games. R8-3 only
  *mitigates* the blast radius client-side.
- **photoURL arbitrary content (MED, documented):** `users/{uid}.photoURL` is still
  client-writable + public-read and rendered as `<img src>` (tracking-pixel / viewer-IP
  leak). A rules-level scheme allow-list + length cap is awkward while OAuth `https://`
  avatars and inline data URLs coexist — revisit with the avatar-storage rework.
- **Leaderboard recompute cron** — R8-1 makes reads self-heal on staleness, but an external
  cron is still wanted so no user pays the full-scan cost.
- **P1/P2** — admin analytics/dashboard caching; **P3** — WebP covers.
- **CSP** rollout; **Chess** — server-side move legality (needs an embedded engine).

---

## Recommended fix order

```
Done this round (2026-06-28):
  [x] R8-1 — leaderboard read-path TTL (global + game self-heal on staleness)
  [x] R8-2 — avatar byte cap lowered under Firestore's doc limit (+ message)
  [x] R8-3 — host-bridge score clamp (jose-rizal / BEST_SCORE / chroma / GAME_STATS blob)

Next workstream:
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules (dedicated round)
  [ ] leaderboard recompute cron in docker-compose.prod.yml
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers
  [ ] photoURL hardening alongside an avatar-storage rework; CSP rollout
```

**Verification (this round):** `npm test` passes (16/16); TypeScript compiles clean. The
`next build` prerender error on `/auth/action` is the pre-existing environmental issue
(no Firebase API key in the build env — only `.env.example` present), unrelated to the three
files touched here. R8-1's `isFresh` mirrors the already-working `popularity` TTL and is
verified manually (a stale `/leaderboards/_global` doc now triggers recompute rather than
serving stale entries); a unit test was skipped to avoid importing the route's `firebase-admin`
chain into the jsdom test env.

**Bottom line:** the global/per-game leaderboards can no longer freeze on first read, avatars
can no longer silently exceed Firestore's doc limit, and the host bridge can no longer write
`NaN`/out-of-range scores from a forged message. S2 (server-authoritative scoring) remains
the headline for its own dedicated round.
