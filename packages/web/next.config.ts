import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  },
}

export default nextConfig
