/**
 * CS 7314: branch/line coverage of the target modules per technique.
 *
 *   node scripts/testing/coverage-by-technique.mjs <out.json>
 *
 * Runs vitest once per test set (baseline = the pre-existing suite, then each course
 * technique alone, then everything) and records coverage for the modules the project
 * proposal targets. Failing tests do not stop the measurement.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const TARGETS = [
  "lib/bookings.ts",
  "lib/data/source.ts",
  "lib/negotiate/budget.ts",
  "lib/negotiate/lease.ts",
  "lib/negotiate/routine.ts",
  "lib/negotiate/safety.ts",
  "lib/negotiate/scouts.ts",
  "lib/finance/model.ts",
  "lib/parsers/offerLetter.ts",
  "lib/sourcing/freshness.ts",
  "app/api/negotiate/route.ts",
  "app/api/listings/[id]/book/route.ts",
  "app/api/listings/[id]/confirm/route.ts",
  "app/api/cron/expire-listings/route.ts",
];

const SETS = {
  baseline: { args: ["--exclude", "tests/course/**"] },
  fsm: { files: ["tests/course/fsm-booking-live.test.ts", "tests/course/fsm-booking-fixture.test.ts"] },
  pt: { files: ["tests/course/pt-verdict-rules.test.ts", "tests/course/pt-finance.test.ts"] },
  cft: { files: ["tests/course/cft-branches.test.ts", "tests/course/cft-source-fallback.test.ts"] },
  all: { args: [] },
};

const out = process.argv[2] ?? "coverage-by-technique.json";
const result = {};
for (const [name, set] of Object.entries(SETS)) {
  rmSync("coverage", { recursive: true, force: true });
  const args = [
    "vitest", "run", ...(set.files ?? []), ...(set.args ?? []),
    "--coverage.enabled", "--coverage.reportOnFailure", "--coverage.reporter=json-summary",
    ...TARGETS.map((t) => `--coverage.include=${t}`),
  ];
  try {
    execFileSync("npx", args, { stdio: "ignore" });
  } catch {
    /* failing tests still produce coverage */
  }
  const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8"));
  const perFile = {};
  for (const [file, v] of Object.entries(summary)) {
    if (file === "total") continue;
    const rel = TARGETS.find((t) => file.endsWith(t));
    if (rel) perFile[rel] = { lines: v.lines.pct, branches: v.branches.pct, branchesCovered: v.branches.covered, branchesTotal: v.branches.total };
  }
  result[name] = { total: { lines: summary.total.lines.pct, branches: summary.total.branches.pct }, perFile };
  console.log(name.padEnd(9), "lines", summary.total.lines.pct, "branches", summary.total.branches.pct);
}
writeFileSync(out, JSON.stringify(result, null, 2));
