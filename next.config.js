/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: 'dist',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async rewrites() {
    const spellingBeeApiOrigin = process.env.SPELLING_BEE_API_ORIGIN || 'http://localhost:8787'

    return [
      {
        source: '/api/:path*',
        destination: `${spellingBeeApiOrigin}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
