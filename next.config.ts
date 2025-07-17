import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'localhost',
      },
      {
        hostname: '127.0.0.1',
      },
    ],
  },
};

export default nextConfig;
