/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Baseline security headers (audit round 4). SAMEORIGIN (not DENY) is required
  // so the play page can iframe same-origin games under /games/*. Referrer-Policy
  // keeps the OAuth callback token from leaking to cross-origin resources.
  async headers() {
    return [
      // Baseline headers on every path, including /games/* (audit round 4).
      // X-Frame-Options SAMEORIGIN gives game iframes clickjacking protection
      // even though the strict CSP below excludes them.
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      // Full CSP (R12 + R13) scoped to app routes — the negative lookahead excludes
      // /games/* because those are pre-built third-party iframe artifacts (e.g.
      // geoguessr-clone pulls in Google Maps' sprawling domain set, others vary).
      // Constraining them risks breaking gameplay for little gain: they're trusted
      // bundles we shipped, sandboxed in iframes, and still clickjacking-protected
      // by the baseline X-Frame-Options above.
      {
        source: '/:path((?!games/).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              // 'unsafe-inline' is required: Next.js App Router emits inline RSC
              // streaming scripts (~258 across prerendered HTML) and the games use
              // eval. Nonce-based hardening is the follow-up (needs middleware +
              // RSC nonce threading). 'self' still blocks external-origin scripts.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              // 'unsafe-inline' for React Hot Toast + the many style={{}} props
              // (animation delays, gradients, dynamic widths). Nonce is the upgrade.
              "style-src 'self' 'unsafe-inline'",
              // next/font self-hosts font files at build time — no runtime fetch.
              "font-src 'self'",
              // 'self' covers /api/* rewrites (proxied server-side) and the
              // same-origin Socket.IO paths (/chess-ws, /tictactoe-ws, etc.).
              // *.googleapis.com: Firestore REST + gRPC/WebChannel, Firebase Auth
              // (identitytoolkit, securetoken), Storage. *.firebaseio.com: RTDB
              // (forward-compat). accounts.google.com: Google OAuth.
              "connect-src 'self' https://*.googleapis.com wss://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://accounts.google.com",
              // Same-origin game iframes + Firebase Auth's hidden helper iframe on
              // the authDomain (signInWithPopup) + Google OAuth.
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              // Supersedes X-Frame-Options in modern browsers (keep both for legacy)
              "frame-ancestors 'self'",
              // Avatar/photo domains matching sanitizePhotoURL allowlist (R12)
              "img-src 'self' data: blob: https://*.googleusercontent.com https://avatars.githubusercontent.com https://pbs.twimg.com https://*.twimg.com https://*.fbcdn.net https://*.fbsbx.com https://graph.facebook.com https://*.tiktokcdn.com https://*.tiktokcdn-eu.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
  async rewrites() {
    const spellingBeeApiOrigin = process.env.SPELLING_BEE_API_ORIGIN || 'http://localhost:8787'
    const vocabApiOrigin = process.env.VOCAB_API_ORIGIN || 'http://localhost:8788'
    const hamaruApiOrigin = process.env.HAMARU_API_ORIGIN || 'http://localhost:8789'

    return [
      // Vocab API (port 8788) — must be listed before the catch-all spelling-bee rewrite
      {
        source: '/api/vocab/:path*',
        destination: `${vocabApiOrigin}/api/vocab/:path*`,
      },
      // Hamaru JMdict API (port 8789) — must be before the catch-all spelling-bee rewrite
      {
        source: '/api/hamaru/:path*',
        destination: `${hamaruApiOrigin}/api/hamaru/:path*`,
      },
      // Spelling Bee API (port 8787)
      {
        source: '/api/:path*',
        destination: `${spellingBeeApiOrigin}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
