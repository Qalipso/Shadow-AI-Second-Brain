import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Trim memory: disable source maps in dev, smaller pages buffer.
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};

export default nextConfig;
