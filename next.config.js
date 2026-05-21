/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async rewrites() {
    const spellingBeeApiOrigin = process.env.SPELLING_BEE_API_ORIGIN || 'http://localhost:8787'
    const vocabApiOrigin = process.env.VOCAB_API_ORIGIN || 'http://localhost:8788'

    return [
      // Vocab API (port 8788) — must be listed before the catch-all spelling-bee rewrite
      {
        source: '/api/vocab/:path*',
        destination: `${vocabApiOrigin}/api/vocab/:path*`,
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
