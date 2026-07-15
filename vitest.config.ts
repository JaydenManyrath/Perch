import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Merged: Person A's reconcile tests live under lib/hooks/, Person B's live under tests/.
 * RLS test + live-narration test require external services — opt in via env flags.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.ts",
      "components/**/*.test.ts",
      "tests/**/*.test.ts",
    ],
    exclude: [
      ...(process.env.RUN_RLS_TESTS ? [] : ["tests/rls.test.ts"]),
      ...(process.env.RUN_LIVE_NARRATION ? [] : ["tests/live-narration.test.ts"]),
    ],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
