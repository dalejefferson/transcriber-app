import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [],
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
