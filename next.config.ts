import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Custom server imports game modules from src/
  experimental: {
    // Keep build simple for MVP
  },
};

export default nextConfig;
