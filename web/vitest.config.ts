import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js's build-time-only marker module (ADR-006) — no-op stub so
      // server-only files are importable under Vitest's plain Node runtime.
      // Production enforcement (the webpack/turbopack client-bundle check)
      // is untouched; this only affects the test harness.
      "server-only": path.resolve(__dirname, "./src/test/stubs/server-only.ts"),
    },
  },
});
