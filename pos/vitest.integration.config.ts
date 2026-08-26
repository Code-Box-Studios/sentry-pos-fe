import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/integration/**/*.test.ts"],
    globals: true,
    testTimeout: 30000,
    // one worker — the suite is a sequential golden path against one live server
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
