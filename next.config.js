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
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
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
