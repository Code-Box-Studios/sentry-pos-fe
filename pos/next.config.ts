import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // The repo root has its own lockfile (it carries the one script that runs both apps), so Next
  // would otherwise trace files from there and warn about which root it picked. This app is
  // self-contained.
  outputFileTracingRoot: dirname,
};

export default nextConfig;
