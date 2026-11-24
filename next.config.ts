import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep tracing inside this project even when a parent folder has a lockfile.
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
};

export default nextConfig;
