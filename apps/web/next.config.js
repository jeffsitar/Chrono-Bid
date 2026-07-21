/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chrono-bid/shared-types', '@chrono-bid/game-engine'],
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000',
  },
};

module.exports = nextConfig;
