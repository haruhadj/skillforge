/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: '/skillforge',
  images: {
    unoptimized: false,
  },
  trailingSlash: true,
  async rewrites() {
    const spellingBeeApiOrigin = process.env.SPELLING_BEE_API_ORIGIN || 'http://spelling-bee:8787'
    const vocabApiOrigin = process.env.VOCAB_API_ORIGIN || 'http://vocab:8788'
    return [
      {
        source: '/skillforge/api/vocab/:path*',
        destination: `${vocabApiOrigin}/api/vocab/:path*`,
      },
      {
        source: '/skillforge/api/:path*',
        destination: `${spellingBeeApiOrigin}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
