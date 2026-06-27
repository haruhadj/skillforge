# SkillForge — Audit Report (Round 4)

*Audited: 2026-06-27 · Findings verified against the codebase before recording.*

> Follow-up to rounds 1–3. This pass went deep on the **OAuth sign-in flow** — the one
> high-value surface earlier rounds only spot-checked: the 5 provider callbacks, the
> `resolveSignInUid` account-resolution logic, custom-token minting/delivery, and the
> Next app's HTTP security headers.
>
> Headline: the Google callback fed an **unverified** email into account unification,
> which is an account-takeover vector. Fixed this round, along with baseline security
> headers (which also reduce the OAuth-token Referer leak).

---

## How sign-in works (context)

Every provider callback exchanges the code, builds an `OAuthProfile`, calls
`resolveSignInUid()` (`app/lib/oauthLinks.ts`), then mints a Firebase **custom token**
(`createCustomToken(uid)`) and redirects to `/auth/callback?token=…`, where the client
calls `signInWithCustomToken`. `resolveSignInUid` resolves in order: (1) explicit
`oauthLinks` mapping, (2) **email unification** — `getUserByEmail(p.email)` returns *any*
existing account with that email, (3) get-or-create a deterministic `provider_providerId`
account. Step 2 is the takeover-sensitive path: it only stays safe if every callback
passes **provider-verified** emails.

---

## HIGH — Fixed this round

### R4-1. Google callback accepted unverified email → account-takeover unification — ✅ FIXED
**File:** `app/api/auth/callback/google/route.ts`

**Verified:** the callback read `email` from Google's `/oauth2/v2/userinfo` and passed it
straight into the `OAuthProfile` **without checking the `verified_email` flag that same
response returns.** Combined with `resolveSignInUid` step 2, an attacker holding a Google
account whose email is set to a victim's address but **not verified** could sign in and be
unified onto — i.e. take over — the victim's existing SkillForge account, receiving a valid
custom token for it. (Round 2 asserted "Google/Facebook verified", but the check was not
actually in the code.)

**Fixed:** destructure `verified_email` and set `email: verified_email === true ? email : null`.
An unverified Google email now falls through to the deterministic `google_<id>` native
account (no unification, no takeover), mirroring the no-email providers.

**Other providers — re-verified clean:**
- **GitHub**: public `user.email` is verified by GitHub policy; the private-email fallback
  filters `e.primary && e.verified`. OK.
- **Twitter/X**: uses `confirmed_email` only. OK.
- **TikTok**: returns no email → keyed by `provider_providerId`, skips unification. OK.
- **Facebook**: see R4-4 (no verification signal available; mitigated by FB policy).

---

## MEDIUM

### R4-2. Baseline HTTP security headers added to the Next app — ✅ FIXED
**Files:** `next.config.js`, `next.config.docker.js`

**Verified:** no `middleware.ts` and no `headers()` in either Next config — the app served
**zero** security headers (no `X-Frame-Options`, `Referrer-Policy`, `X-Content-Type-Options`,
or HSTS), and the nginx layer adds none for the frontend either (round 2 L6).

**Fixed:** added a `headers()` block (applied to `/:path*`) to **both** configs:
- `X-Frame-Options: SAMEORIGIN` — blocks external clickjacking. **SAMEORIGIN, not DENY**,
  because the play page legitimately iframes same-origin games under `/games/*` (DENY would
  break every game).
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin` — cross-origin requests now send only
  the origin, so the OAuth callback token (R4-3) no longer leaks in `Referer` to third parties.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

A full `Content-Security-Policy` was intentionally **not** added — the app loads several
third-party origins (Firebase, Google Maps for geoguessr, Edge-TTS, OAuth) and a wrong CSP
would silently break games. Recommended as a tested follow-up.

### R4-3. OAuth custom token delivered in the URL query string — OPEN (documented)
**Files:** all 5 `app/api/auth/callback/*/route.ts`, `app/auth/callback/page.tsx`

The minted Firebase custom token (≈1 h validity) is passed as
`…/auth/callback?token=<token>`. It therefore lands in **nginx access logs** (query strings
are logged by default), **browser history**, and — until R4-2 — cross-origin `Referer`. A
token leaked within its validity window = account takeover.

R4-2's `Referrer-Policy` closes the cross-origin Referer vector, but **logs and history
remain**. Full fix (next workstream): deliver the token via a short-lived `httpOnly`,
`Secure`, `SameSite=Lax` cookie set by the callback, and have `/auth/callback` exchange it
through a tiny GET endpoint that reads-and-clears the cookie — keeping the token out of the
URL entirely.

---

## LOW

### R4-4. Facebook email is not verification-checked — OPEN (documented)
**File:** `app/api/auth/callback/facebook/route.ts`
The Facebook callback trusts the `email` from Graph `/me` with no verification signal.
Facebook only exposes a **confirmed** primary email via the API (you must confirm an email
before it becomes your account email), so practical risk is low and Graph offers no
`verified` flag to assert on. Documented for awareness; consider dropping email unification
for Facebook (key by `facebook_<id>`) if defense-in-depth is wanted.

---

## Checked and found clean (assurance)

- **CSRF**: every callback validates the `oauth_state` cookie against the `state` param;
  Twitter additionally requires the PKCE verifier cookie.
- **Account linking** (`linkOAuthToAccount`): blocks linking an identity already owned by
  another account (`already_linked` / `provider_has_account`), preventing data orphaning.
- **`oauthLinks` collection**: server-only (`firestore.rules` `allow read, write: if false`);
  the client sees only the denormalized `linkedProviders` on its own user doc.
- **`backfillProfile`**: only sets an email the account lacks; never overwrites an existing
  one, and swallows `email-already-exists` so a backfill can't hijack another account's email.

---

## Still open (carried forward)

- **R4-3** (token in URL — cookie delivery), **R4-4** (Facebook email).
- From round 2/3: **S2** (server-authoritative scoring), **N5/#4/#5** (leaderboard recompute
  cron + TTL + denormalized entries), **P1/P2** (admin analytics caching), **P3** (cover
  images), **S4** (forgot-password rate limit), **M1** (Docker healthchecks), **M2/M3**
  (game-move authorization), **#7** (admin pagination), plus the S5–S7 / L-series items.

---

## Recommended fix order

```
Done this round (2026-06-27):
  [x] R4-1 — Google callback enforces verified_email before unification
  [x] R4-2 — baseline security headers on the Next app (both configs)

Next workstream:
  [ ] R4-3 — move the OAuth custom token out of the URL into an httpOnly cookie
  [ ] N5 + #4/#5 — leaderboard recompute cron + read-path TTL
  [ ] S2 — server-authoritative scoring, then lock scores/gameStats rules
  [ ] P1/P2 — cache admin analytics/dashboard; P3 — WebP covers; S4 — rate-limit reset
  [ ] CSP — add and test a Content-Security-Policy
```

**Bottom line:** the OAuth flow is well-architected (CSRF, PKCE, server-only link mapping,
careful backfill), but it trusted Google's email without checking the verified flag — a real
takeover vector, now closed. Security headers are in place. The remaining notable auth item
is getting the custom token out of the URL.
