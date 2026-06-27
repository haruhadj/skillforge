# SkillForge — Audit Report (Round 5)

*Audited: 2026-06-27 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–4. This pass closed the two auth-surface items rounds 2–4
> flagged as the next workstream but left open: **the OAuth custom token rode in the
> redirect URL** (R4-3), and **`forgot-password` had no rate limit** (S4).
>
> Headline: every provider callback handed the freshly-minted Firebase custom token to
> the browser as `…/auth/callback?token=<token>`. A ~1-hour-valid credential in a URL
> lands in nginx access logs and browser history — anyone who reads either within the
> validity window can replay it for full account takeover. The token is now delivered
> in a single-use httpOnly cookie and never appears in a URL.

---

## HIGH — Fixed this round

### R5-1. OAuth custom token delivered in the URL query string (was R4-3) — ✅ FIXED
**Files:** all 5 `app/api/auth/callback/*/route.ts`, `app/auth/callback/page.tsx`,
`app/lib/oauth.ts`, **new** `app/api/auth/token/route.ts`

**Verified:** each of the 5 sign-in callbacks redirected to
`${appUrl}/auth/callback?token=${encodeURIComponent(customToken)}`. The custom token
(`createCustomToken`, ~1 h validity, exchangeable for a full session via
`signInWithCustomToken`) therefore landed in:
- **nginx access logs** — query strings are logged by default;
- **browser history** — persists on the device long after the ~1 h window;
- cross-origin **`Referer`** — closed in R4-2 by `Referrer-Policy`, but logs + history remained.

A token leaked inside its validity window = account takeover. R4 documented this and
deferred the fix; this round implements the cookie-exchange design R4-3 proposed.

**Fixed (read-and-clear cookie exchange):**
- Added `OAUTH_TOKEN_COOKIE = 'oauth_token'` to `app/lib/oauth.ts`.
- Each callback now sets the token in a **short-lived httpOnly cookie**
  (`oauthCookieOptions(120)` → `httpOnly`, `secure` in prod, `SameSite=Lax`, 120 s,
  `path=/`) and redirects to a bare `${appUrl}/auth/callback` — **no token in the URL**.
- New `GET /api/auth/token` is a **single-use** exchange: it reads the cookie, returns
  `{ token }` as JSON with `Cache-Control: no-store`, and **deletes the cookie on the way
  out** so it can never be replayed.
- `app/auth/callback/page.tsx` no longer reads `?token`; it `fetch`es `/api/auth/token`
  (same-origin, `cache: 'no-store'`), then calls `signInWithCustomToken`. On a missing/used
  cookie it redirects to `/?error=missing_token`, matching the prior failure UX.

**Why this is safe end-to-end:** the cookie is `SameSite=Lax`, so it rides the top-level
callback→`/auth/callback` navigation and the subsequent same-origin `fetch`, but not
cross-site requests. `httpOnly` keeps it out of reach of any in-page script (incl. a future
XSS), and the 120 s TTL + read-and-clear make a stolen-at-rest cookie near-useless. Response
bodies are not written to nginx access logs, so the token no longer persists anywhere.

---

## MEDIUM — Fixed this round

### R5-2. `forgot-password` had no rate limit (was S4) — ✅ FIXED
**Files:** `app/api/auth/forgot-password/route.ts`, **new** `app/lib/rateLimit.ts`

**Verified:** the route called `generatePasswordResetLink` + Resend `emails.send` on every
POST with **no throttle**. An attacker could email-bomb any victim (each request sends a
real reset email to the target inbox) and burn the Resend monthly quota / trip its rate
caps, breaking password reset platform-wide.

**Fixed:** added a small process-local sliding-window limiter (`app/lib/rateLimit.ts`) and
applied two buckets before any Resend call:
- **per client IP** — 5 requests / 15 min (IP read from `X-Forwarded-For` first hop, the
  real client behind nginx; falls back to `x-real-ip` then `'unknown'`);
- **per target email** — 3 requests / 60 min (key normalized `trim().toLowerCase()`), so one
  inbox can't be bombed even from rotating IPs.

Over-limit returns a generic `429` + `Retry-After` (no existence disclosure). Buckets
self-expire and a capped `sweepExpired()` runs per request so the map can't grow unbounded.

**Scope note:** the limiter is **in-memory / single-process** — and that is the right
design here, not a stopgap. SkillForge prod is one long-lived Next container on a single
Raspberry Pi serving one school (`docker-compose.prod.yml`), never run as multiple replicas,
so a process-local map throttles correctly with zero extra infrastructure. A shared store
(Redis) would be unnecessary at this scale and is **not** planned; it would only matter if the
app were ever fanned out horizontally. Documented in the file header.

---

## Checked and found clean (assurance — no finding)

- **Link-mode callbacks** (`?linkUid` branch): these redirect to `/profile?linked=…` and
  **never** mint or carry a custom token, so R5-1 didn't touch them — confirmed all 5 still
  clear `oauth_state` / `oauth_link_uid` (+ PKCE for twitter) exactly as before.
- **`oauthCookieOptions`** already sets `httpOnly` + `secure` (prod) + `SameSite=Lax`; the
  120 s token cookie reuses it, so the new cookie inherits the same hardening as the existing
  state/PKCE cookies — no new bespoke cookie config to get wrong.
- **CSRF / PKCE / verified-email unification** (rounds 2 & 4): unchanged by this round; the
  token-delivery swap happens strictly *after* `resolveSignInUid`, so the R4-1 verified-email
  gate and the state/PKCE checks still run first.

---

## Still open (carried forward)

- **R4-4** (Facebook email not verification-checked — low, mitigated by FB policy).
- From rounds 2/3: **S2** (server-authoritative scoring + lock `scores`/`gameStats` rules),
  **N5 / #4 / #5** (leaderboard recompute cron + read-path TTL + denormalized entries),
  **P1/P2** (admin analytics/dashboard caching), **P3** (WebP covers), **M1** (Docker
  healthchecks), **M2/M3** (game-move authorization), **#6/#7** (API rate-limit middleware +
  admin pagination), **M5** (dead `tts-key.json` mount), plus the S5–S7 / L-series items.
- **General API rate limiting (#6):** `app/lib/rateLimit.ts` is now a reusable primitive —
  the score route and leaderboard read paths should adopt it next.

---

## Recommended fix order

```
Done this round (2026-06-27):
  [x] R5-1 — OAuth custom token moved out of the URL into a single-use httpOnly cookie
  [x] R5-2 — forgot-password rate-limited per IP + per email

Next workstream:
  [ ] #6 — apply app/lib/rateLimit.ts to /api/games/score + leaderboard read paths
  [ ] N5 + #4/#5 — leaderboard recompute cron + read-path TTL
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers
  [ ] CSP — add and test a Content-Security-Policy (carried from R4)
```

**Bottom line:** the OAuth flow no longer leaks a usable session credential into logs or
browser history — the custom token now travels in a 120 s, single-use, httpOnly cookie and is
exchanged once via `/api/auth/token`. Password reset is throttled per IP and per address, and
the new in-memory limiter is ready to be reused for the remaining unprotected public APIs.
