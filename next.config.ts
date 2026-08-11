import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native addon; @react-pdf/renderer loads a WASM layout
  // engine from disk relative to its own package dir — both must stay a live
  // `require()` at runtime instead of being bundled, or their __dirname-based
  // lookups break inside the ESM server bundle.
  serverExternalPackages: ["better-sqlite3", "@react-pdf/renderer"],
};

export default nextConfig;
