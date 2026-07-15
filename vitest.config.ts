import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // RLS test needs a live Postgres; opt it in via RUN_RLS_TESTS=1.
    exclude: process.env.RUN_RLS_TESTS ? [] : ["tests/rls.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
