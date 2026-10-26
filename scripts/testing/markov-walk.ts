/**
 * CS 7314 Markov-OP/UBST test generator.
 *
 *   npx tsx scripts/testing/markov-walk.ts [count=200] [seed=2026] [out.json]
 *
 * Draws `count` usage-based test cases (random walks START -> EXIT) from the projected
 * profile in tests/course/models/usageProfile.ts and reports the profile's analytic
 * statistics (expected visits per session, session length), the empirical visit
 * frequencies of the drawn suite, and the most probable distinct paths. The executor
 * that replays these walks in a browser and the reliability analysis come next.
 */
import { writeFileSync } from "node:fs";
import { P, PROFILE_VERSION, SCREENS, expectedVisits, rng, walk, type Screen } from "../../tests/course/models/usageProfile";

const count = Number(process.argv[2] ?? 200);
const seed = Number(process.argv[3] ?? 2026);
const out = process.argv[4];

const next = rng(seed);
const cases = Array.from({ length: count }, (_, i) => {
  const path = walk(next);
  let probability = 1;
  for (let k = 1; k < path.length; k++) probability *= P[path[k - 1]][path[k]] ?? 0;
  return { id: `UB-${String(i + 1).padStart(3, "0")}`, path, steps: path.length - 2, probability };
});

const analytic = expectedVisits();
const visits: Record<string, number> = {};
for (const c of cases) for (const s of c.path) visits[s] = (visits[s] ?? 0) + 1;

const transient = SCREENS.filter((s) => s !== "START" && s !== "EXIT") as Screen[];
const expectedSessionLength = transient.reduce((a, s) => a + analytic[s], 0);

const distinct = new Map<string, { path: Screen[]; probability: number; drawn: number }>();
for (const c of cases) {
  const key = c.path.join(">");
  const d = distinct.get(key) ?? { path: c.path, probability: c.probability, drawn: 0 };
  d.drawn += 1;
  distinct.set(key, d);
}
const topPaths = [...distinct.values()].sort((a, b) => b.probability - a.probability).slice(0, 10);

const report = {
  profile: PROFILE_VERSION,
  seed,
  count,
  expectedSessionLength: Number(expectedSessionLength.toFixed(3)),
  meanDrawnSessionLength: Number((cases.reduce((a, c) => a + c.steps, 0) / count).toFixed(3)),
  screens: transient.map((s) => ({
    screen: s,
    expectedVisitsPerSession: Number(analytic[s].toFixed(3)),
    drawnVisitsPerSession: Number(((visits[s] ?? 0) / count).toFixed(3)),
  })),
  distinctPaths: distinct.size,
  topPaths: topPaths.map((t) => ({ path: t.path.join(" > "), probability: Number(t.probability.toPrecision(3)), drawn: t.drawn })),
  cases,
};

console.log(`profile ${PROFILE_VERSION} seed ${seed}: ${count} walks, ${distinct.size} distinct paths`);
console.log(`expected screens/session ${report.expectedSessionLength}, drawn ${report.meanDrawnSessionLength}`);
for (const s of report.screens) console.log(`  ${s.screen.padEnd(11)} expected ${s.expectedVisitsPerSession}  drawn ${s.drawnVisitsPerSession}`);
if (out) writeFileSync(out, JSON.stringify(report, null, 2));
