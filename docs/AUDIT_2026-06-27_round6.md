# SkillForge — Audit Report (Round 6)

*Audited: 2026-06-27 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–5. This pass cleared the verified-open **server-integrity** and
> **API-hardening** backlog under one theme: *the server must not trust the client for who
> may act, whose turn it is, how often, or what error text leaks back.* All fixes are
> low-risk and touch **no Firestore rules and no game-client artifacts** (the latter are
> prebuilt and unmodifiable here), so this round needs only an app + game-server redeploy —
> no rules deploy.
>
> Headline: the multiplayer **TicTacToe** and **Chess** move handlers performed no sender
> authorization — any socket that knew the room code could move (including for the opponent),
> and TicTacToe trusted a client-supplied symbol and an unbounded square index. Both now
> derive identity/turn server-side. Public APIs that previously had no throttle now reuse the
> round-5 limiter.

---

## MEDIUM — Fixed this round

### R6-1. TicTacToe `make_move` had no sender authorization (was M2) — ✅ FIXED
**File:** `server/games/tictactoe/socket-server.js`

**Verified:** the handler took the player symbol from the **client payload** (`data.player`),
never checked that `socket.id` was the room's `host`/`guest`, and used `squareIndex` directly.
Consequences: (a) any non-member who knew the 4-char room code could move; (b) a client could
move *for the opponent* by sending whichever symbol matched the current turn; (c) an
out-of-range/non-integer `squareIndex` passed the `room.squares[i] !== null` guard
(`undefined !== null`) and wrote an arbitrary property onto the board array, corrupting state.

**Fixed:**
- Symbol is now **derived server-side** from the seat: `socket.id === room.host ? 'X' :
  socket.id === room.guest ? 'O' : null`; a `null` (spectator/stranger) is rejected.
- Turn is checked against the **derived** symbol (`(symbol === 'X') !== room.xIsNext`).
- `squareIndex` is bounds-checked (`Number.isInteger` and `0..8`) before use.
- `request_rematch` now also requires the sender be `host`/`guest`, so a stranger can't wipe
  an in-progress board by guessing the code.

### R6-2. Chess `move` accepted moves from non-players + wrong turn (was M3) — ✅ FIXED
**File:** `server/games/chess/socket-server.js`

**Verified:** `move` was the **lone state-mutating handler with no `room.players[socket.id]`
guard** (`offerDraw`/`respondDraw`/`resign` all had it). A spectator/3rd-joiner (who still
`socket.join`s the room) could emit `move`; nothing checked whose turn it was.

**Fixed:**
- Reject when `!room.players[socket.id]` (only seated players may move).
- **Turn-ownership** check without a server-side chess engine: the active-color field of the
  currently-stored (pre-move) FEN must equal the mover's color, so a player can't move twice
  or move for the opponent.
- **Documented limitation:** full board/move *legality* remains client-trusted — the chess
  client is a prebuilt artifact and validating legality would require a server-side engine.
  This fix enforces who-moves-when, exactly the scope the prior audit set for M3.

### R6-3. Public API routes had no rate limit (was #6) — ✅ FIXED
**Files:** `app/api/games/score/route.ts`, `app/api/leaderboard/route.ts`,
`app/api/games/[gameId]/plays/route.ts`

**Verified:** only `forgot-password` consumed the round-5 limiter (`app/lib/rateLimit.ts`).
The score write (token-gated), the **public** leaderboard read, and the plays POST/GET were
all unthrottled — and the leaderboard GET falls back to a full `collectionGroup('scores')` +
`gameStats` scan when its cache doc is missing, so an unauthenticated flood is expensive.

**Fixed** (reusing `rateLimit` / `clientIpFrom` / `sweepExpired`, mirroring the forgot-password
pattern — `429` + `Retry-After`):
- `score` POST → **60/min per uid** (keyed on the verified token uid).
- `leaderboard` GET → **30/min per IP** (public; protects the collectionGroup fallback).
- `plays` POST → **60/min per uid**; `plays` GET → **60/min per IP**.

---

## LOW — Fixed this round

### R6-4. INTERNAL_API_SECRET compared in non-constant time (was S5) — ✅ FIXED
**File:** `app/api/internal/leaderboards/recompute/route.ts`
The bearer check used `header !== \`Bearer ${secret}\``, a short-circuiting compare. Replaced
with a `crypto.timingSafeEqual` helper (length-guarded equal-length buffers) so the secret
can't be recovered by response timing.

### R6-5. Delete routes returned raw error messages (was S6) — ✅ FIXED
**Files:** `app/api/admin/delete-user/route.ts`, `app/api/user/delete-account/route.ts`
Both 500 handlers returned `error.message` verbatim (and both wrap Firebase Admin internals
in a `Failed to delete auth user: …` throw). Now they log full detail server-side and return a
fixed generic string.

### R6-6. link/remove provider list out of sync with link/start (was S7) — ✅ FIXED
**Files:** `app/lib/oauth.ts`, `app/api/auth/link/start/route.ts`, `app/api/auth/link/remove/route.ts`
`start` allowed all 5 providers; `remove` hard-coded only `google/github/tiktok`, so
twitter/facebook could be **linked but never unlinked**, and the "only sign-in method"
survivor check ignored twitter/facebook-native uid prefixes. Introduced a single
`LINKABLE_PROVIDERS` constant in `oauth.ts`, imported by both routes; the survivor check now
loops over all five `provider_` prefixes.

### R6-7. chroma-memory `submit_guess` still stored NaN (was L2, partial) — ✅ FIXED
**File:** `server/games/chroma-memory/socket-server.js`
The clamp used `Number(guess?.h ?? 0)` — `?? 0` only catches null/undefined, so `{ h: "x" }`
yielded `NaN` through `Math.max/min`, poisoning score math. Added a `clampFinite()` helper that
returns the range floor for any non-finite input; applied to `h`/`s`/`b`.

### R6-8. chroma-memory room leak on multi-join (was L1) — ✅ FIXED
**File:** `server/games/chroma-memory/socket-server.js`
`join_room`/`create_room` never left a previously-joined room, and cleanup only ran
`leaveRoom(socket, socket.data.roomCode)` (the *latest* room) — so the prior room kept a ghost
player and never reaped. Both handlers now call the existing `leaveRoom()` for any prior room
before joining the new one (create_room only after its capacity checks pass, so a failed create
doesn't evict the user from their current room).

---

## Checked and found clean (assurance)

- **chess other mutators** (`offerDraw` L205+, `respondDraw`, `resign`) already gate on
  `room.players[socket.id]` — R6-2 brings `move` in line; no others were missing the guard.
- **score route validation** (rounds 2/3): token-derived uid, known-gameId, finite + `0..1e6`
  bound, whitelisted mode — unchanged; R6-3 only adds the throttle.
- **`clientIp(socket)`** helper (round 3) is present in all three socket servers; the socket
  IP throttle is independent of these per-action authorization fixes.

---

## Still open (carried forward — next workstream)

- **S2** — scores still not server-authoritative (client SDK can write `scores`/`gameStats`);
  needs the `PlayGameClient` → `/api/games/score` migration **then** locking the Firestore
  rules. Bigger, requires a rules deploy + score-flow testing.
- **N5 / #4 / #5** — leaderboard recompute cron + read-path TTL + denormalized entries.
- **P1/P2** — admin analytics/dashboard caching; **P3** — WebP covers.
- **M1** — Docker healthchecks; **M5** — dead `tts-key.json` mount; **#7** — admin pagination.
- **R4-4** — Facebook email not verification-checked (low, FB-policy-mitigated).
- **Chess legality** — server-side move validation (would need an embedded engine); only
  who-moves-when is enforced today.

---

## Recommended fix order

```
Done this round (2026-06-27):
  [x] R6-1 — TicTacToe make_move: server-derived symbol + turn + bounds (+ rematch guard)
  [x] R6-2 — Chess move: seated-player + turn-ownership check
  [x] R6-3 — rate-limit score / leaderboard / plays (reusing app/lib/rateLimit.ts)
  [x] R6-4 — timing-safe INTERNAL_API_SECRET compare
  [x] R6-5 — generic error bodies on the delete routes
  [x] R6-6 — shared LINKABLE_PROVIDERS (twitter/facebook now unlinkable)
  [x] R6-7 / R6-8 — chroma NaN guard + room-leak fix

Next workstream:
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules (needs deploy)
  [ ] N5 + #4/#5 — leaderboard recompute cron + read-path TTL
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers
  [ ] M1 — Docker healthchecks; #7 — admin pagination; M5 — drop dead tts-key mount
```

**Bottom line:** multiplayer game state can no longer be driven by a non-player or an
out-of-turn/forged-symbol move, the chroma-memory room leak and NaN-poisoning are closed, every
public API route is now throttled by the shared limiter, and the internal secret compare,
delete-route error leakage, and provider link/unlink mismatch are fixed. The remaining backlog
is the architectural/performance work (server-authoritative scoring, leaderboard recompute,
analytics caching) carried since round 2.
