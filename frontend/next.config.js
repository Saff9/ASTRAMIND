/** @type {import('next').NextConfig} */
require('dotenv').config({ path: '.env.production' });
const path = require('path');
const nextConfig = {
  reactStrictMode: true,
  // Image domains for media uploads
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'your-backend-domain.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_SECRET_KEY: process.env.API_SECRET_KEY,
  },
  // Enable standalone output for Docker deployments
  output: 'standalone',
  // Security and caching headers
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:",
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
      {
        // Caching for static assets
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
turbopack: {},
// Removed custom webpack alias configuration; Turbopack handles module resolution.
};

module.exports = nextConfig;
