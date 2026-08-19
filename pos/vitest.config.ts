import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  // tsconfig.json sets `jsx: "preserve"` for Next; esbuild would fall back to the
  // classic runtime and blow up on an undefined `React` in tests without this.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    // Dialog tests drive dozens of pointer events; the 5s default is tight on a busy machine,
    // and a timed-out test leaves the runner unable to finish.
    testTimeout: 20000,
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
