// Content-Security-Policy as a per-request nonce (audit round 16). This replaces
// the static `next.config.js` CSP (rounds R12/R13) whose `script-src` still carried
// 'unsafe-inline' because a config-level header cannot mint a nonce. middleware.ts
// generates the nonce and Next.js stamps it onto every framework <script> it emits
// during SSR, so 'unsafe-inline' (the injected-<script> XSS vector) is gone.
//
// The non-script directives are copied verbatim from the prior next.config.js CSP.
// Game iframes under /games/* are excluded by the middleware matcher (not here),
// matching the old `(?!games/)` source scoping.

/**
 * A fresh, unpredictable nonce for one request. base64 of 16 random bytes.
 * Uses Web Crypto (not node:crypto) so it runs in the Edge middleware runtime.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

/**
 * The full CSP header value for an app route, keyed to `nonce`.
 * `isDev` allows 'unsafe-eval' in script-src only: Turbopack/React dev mode
 * uses eval() for HMR and cross-environment call-stack reconstruction. React
 * never uses eval() in production, so the prod policy stays eval-free (R16).
 */
export function buildCsp(nonce: string, isDev = false): string {
  return [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    // Nonce + 'self' replaces 'unsafe-inline'. Next.js applies this nonce to
    // its inline RSC streaming/bootstrap scripts; chunk loads come from
    // /_next/static ('self'). External-origin scripts stay blocked.
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline' kept: nonces don't cover style="" attributes, and React Hot
    // Toast + assorted style={{}} props rely on inline styles. Removing it is a
    // separate refactor (out of scope, same stance as R13).
    "style-src 'self' 'unsafe-inline'",
    // next/font self-hosts font files at build time — no runtime fetch.
    "font-src 'self'",
    // 'self' covers /api/* rewrites and same-origin Socket.IO paths. *.googleapis.com:
    // Firestore REST + gRPC/WebChannel, Firebase Auth, Storage. *.firebaseio.com: RTDB
    // (forward-compat). accounts.google.com: Google OAuth.
    "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://accounts.google.com",
    // Same-origin game iframes + Firebase Auth's hidden helper iframe on the
    // authDomain (signInWithPopup) + Google OAuth.
    "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
    // Supersedes X-Frame-Options in modern browsers (kept in next.config.js for legacy).
    "frame-ancestors 'self'",
    // Avatar/photo domains matching the sanitizePhotoURL allowlist (R12).
    "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com https://pbs.twimg.com https://*.twimg.com https://*.fbcdn.net https://*.fbsbx.com https://graph.facebook.com https://*.tiktokcdn.com https://*.tiktokcdn-eu.com https://cdn.discordapp.com",
  ].join('; ')
}
