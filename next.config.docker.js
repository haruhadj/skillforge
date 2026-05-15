/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
  },
  trailingSlash: true,
}

module.exports = nextConfig
