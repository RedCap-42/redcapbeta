import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local development environments
  allowedDevOrigins: ['172.22.224.1', '10.2.0.2', 'localhost', '127.0.0.1'],
  
  // Turbopack configuration (no longer experimental)
  turbopack: {
    rules: {},
  },
  
  // Ensure proper headers for authentication
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
