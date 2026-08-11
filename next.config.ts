import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon; it must stay a live `require()` at
  // runtime instead of being bundled, or its __dirname-based binary lookup
  // breaks inside the ESM server bundle.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
