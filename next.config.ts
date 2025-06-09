import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin requests from local development environments
  allowedDevOrigins: ['172.22.224.1'],
  
  // Turbopack configuration (no longer experimental)
  turbopack: {
    rules: {},
  },
};

export default nextConfig;
