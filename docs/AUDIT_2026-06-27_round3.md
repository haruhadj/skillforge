# SkillForge — Audit Report (Round 3)

*Audited: 2026-06-27 · Findings verified against the codebase before recording.*

> Follow-up to `docs/AUDIT_2026-06-27.md` (round 2). This pass focused on surfaces the
> first two rounds did not deeply cover — the WordNet SQLite data layer, the REST
> game-server input handling, the host↔iframe postMessage bridge — **and a regression
> review of the H1 socket hardening shipped in round 2.**
>
> Headline: the round-2 H1 per-IP throttle keyed on the wrong IP behind nginx, which
> would have throttled *all* players as one IP. Fixed this round, along with two
> previously-documented spelling-bee items (M4, L3).

---

## HIGH — Fixed this round

### R1. Socket per-IP throttle keyed on the proxy IP (self-introduced regression) — ✅ FIXED
**Files:** `server/games/{tictactoe,chess,chroma-memory}/socket-server.js`

**Verified:** round 2's H1 connection throttle used `socket.handshake.address`. Behind
nginx (`nginx/skillforge.conf` proxies every `*-ws/` location to the socket containers),
that address is the **nginx container's IP for every client**. So `MAX_CONN_PER_IP = 30`
per minute would have been enforced against *all players combined* — the 31st new socket
in any minute, platform-wide, would be rejected. A single user refreshing repeatedly could
lock everyone out. nginx already forwards the real client IP via `X-Forwarded-For` on those
locations, but the throttle ignored it.

**Fixed:** added a `clientIp(socket)` helper to all three servers that reads the first hop
of `X-Forwarded-For` (set by nginx on the `*-ws/` locations) and falls back to
`socket.handshake.address` for direct/local connections. The throttle now keys on the real
client IP, so per-player limits work and players no longer share one bucket.

---

## MEDIUM / LOW — Fixed this round (previously documented as open)

### R2. Spelling-Bee wide-open CORS (was M4) — ✅ FIXED
**File:** `server/games/spelling-bee/server.js`
`app.use(cors())` allowed any origin to drive the compute-heavy `/api/tts` Edge-TTS
endpoint cross-origin. Replaced with the same origin allow-list vocab/hamaru use
(prod origins + localhost dev). The game is served same-origin via the nginx `/api/` proxy,
so legitimate requests are unaffected.

### R3. `/api/log-current-word` log forging (was L3) — ✅ FIXED
**File:** `server/games/spelling-bee/server.js`
The public, unauthenticated logger wrote attacker-controlled `word`/`roundId`/etc. straight
to stdout — newlines enabled log-line forging. Now each field is run through a `clean()`
that strips control chars (`/[\x00-\x1f\x7f]/g`) and caps length at 80; `idx` is coerced to
a finite number. (The endpoint remains unauthenticated by design — it's a gameplay debug
log — but can no longer forge log lines.)

---

## Checked and found clean (assurance — no finding)

- **WordNet SQLite layer** (`server/wordnet/service.js`): **no SQL injection.** Every query
  uses `db.prepare(sql)` with `?` placeholders and a `params` array; user input (`word`,
  `term`) is never string-interpolated, and `difficulty` is resolved against a fixed
  `DIFFICULTY_RANGES` map.
- **Vocab REST server** (`server/games/vocab/server.js`): well-hardened — `express-rate-limit`
  (120/min), `count` clamped (`Math.min(25, Math.max(1, …))` / 5–50 for pairs), `difficulty`
  whitelisted, `express.json({ limit: '16kb' })`, security headers, `x-powered-by` disabled,
  `trust proxy` in prod, `word` param length-validated.
- **Host↔iframe postMessage bridge** (`app/play/[gameId]/PlayGameClient.tsx`): inbound
  messages are origin-checked (`if (event.origin !== allowedOrigin) return`); outbound
  `postMessage` always passes an explicit `targetOrigin` (`window.location.origin`), never
  `'*'`. Games are served same-origin, so the bridge is tight.
- **XSS sinks**: no `dangerouslySetInnerHTML` / `eval` in `app/` source. The only `innerHTML`
  is inside a generated graphify visualization artifact (`app/graphify-out/graph.html`), not
  an app route.

---

## Still open (carried from round 2 — next workstream)

- **S2** — scores not server-authoritative (needs `PlayGameClient` → `/api/games/score`
  migration before locking the rules).
- **N5 / #4 / #5** — leaderboard recompute never scheduled; read paths have no TTL; page does
  ~50 per-profile reads.
- **P1 / P2** — admin analytics/dashboard run uncached full-platform scans client-side.
- **P3** — multi-MB cover PNGs (`code-quest` ≈ 5.5 MB, `dialed-sound` ≈ 3.7 MB).
- **S4** — `forgot-password` has no rate limit (email-bomb / Resend quota).
- **M1** — no Docker healthchecks / `condition: service_healthy`.
- **M2 / M3** — tictactoe `make_move` / chess `move` don't authorize the sender (game-state
  integrity; not an auth bypass).
- **#7** — admin user list loads all users (no pagination).
- **S5 / S6 / S7, L1, L2, L4(done), N4, N6, N7** — see round-2 doc.

**Note (LOW):** `app/graphify-out/` lives under the Next `app/` directory. It's a generated
artifact and not a route, but it doesn't belong in `app/` — consider gitignoring it or moving
it to the repo-root `graphify-out/`.

---

## Recommended fix order

```
Done this round (2026-06-27):
  [x] R1 — socket throttle now keys on the real client IP (X-Forwarded-For)
  [x] R2 — spelling-bee CORS restricted to app origins
  [x] R3 — spelling-bee log endpoint sanitized

Next workstream (highest leverage first):
  [ ] N5 + #4/#5 — leaderboard recompute cron + read-path TTL + denormalized entries
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules
  [ ] P1/P2 — cache admin analytics/dashboard aggregations server-side
  [ ] P3 — convert cover images to WebP
  [ ] S4 — rate-limit forgot-password
```

**Bottom line:** the core data and messaging surfaces (WordNet queries, vocab API, the
iframe bridge) are clean. The one material issue was a regression in round 2's own DoS fix —
now corrected so the per-IP throttle actually works behind the proxy. Remaining items are the
same performance/architecture backlog from round 2.
