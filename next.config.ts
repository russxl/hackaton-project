import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This project nests under ~/work which has its own lockfile; pin the root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
