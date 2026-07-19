/**
 * Convenience runner for the RLS suite (B2). Requires a running Postgres — point
 * RLS_TEST_DATABASE_URL at one (e.g. `supabase start`'s local db on :54322).
 *
 *   RLS_TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm run rls:test
 */
import { spawnSync } from "node:child_process";

if (!process.env.RLS_TEST_DATABASE_URL) {
  console.error(
    "rls:test — set RLS_TEST_DATABASE_URL to a Postgres instance first.\n" +
      "  e.g. `supabase start` then RLS_TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm run rls:test",
  );
  process.exit(1);
}

// Both gated suites self-bootstrap the same database, so run them sequentially
// (--no-file-parallelism) to avoid two workers racing to apply the migrations.
const res = spawnSync(
  "npx",
  ["vitest", "run", "--no-file-parallelism", "tests/rls.test.ts", "tests/storage-buckets.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, RUN_RLS_TESTS: "1" },
  },
);
process.exit(res.status ?? 1);
