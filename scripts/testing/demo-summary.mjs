/**
 * CS 7314 demo: one-screen summary of the whole testing project from the saved results.
 *
 *   npm run demo:summary
 *
 * Reads docs/testing (defect log, round results, coverage, UBST analysis) and prints
 * the per-technique results, the defect breakdown and the reliability trend.
 */
import { existsSync, readFileSync } from "node:fs";

const D = "docs/testing/";
const json = (p) => (existsSync(D + p) ? JSON.parse(readFileSync(D + p, "utf8")) : null);
const line = (s = "") => console.log(s);
const pad = (s, n) => String(s).padEnd(n);

// --- defect log ---
const rows = readFileSync(D + "defect-log.csv", "utf8").trim().split("\n");
const head = rows[0].split(",");
const defects = rows.slice(1).map((r) => {
  const cells = r.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, ""));
  return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
});
const count = (key) => defects.reduce((a, d) => ((a[d[key]] = (a[d[key]] ?? 0) + 1), a), {});

// --- suites per technique, round 1 vs latest ---
const tech = {
  "FSM/BBT": ["fsm-booking-live", "fsm-booking-fixture"],
  "PT/BBT": ["pt-verdict-rules", "pt-finance"],
  "CFT/WBT": ["cft-branches", "cft-source-fallback"],
};
const tally = (res, names) => {
  if (!res) return null;
  let pass = 0, fail = 0;
  for (const f of res.testResults) if (names.some((n) => f.name.includes(n))) for (const a of f.assertionResults) a.status === "passed" ? pass++ : fail++;
  return { pass, fail };
};
const r1 = json("results/round1/course-suites.json");
const latest = json("results/round4/course-suites.json") ?? json("results/round3/course-suites.json") ?? json("results/round2/course-suites.json");

line("PERCH TESTING PROJECT - SUMMARY");
line("=".repeat(72));
line(`${pad("Technique", 10)} ${pad("Cases", 6)} ${pad("Round 1 fail", 13)} ${pad("Now fail", 9)} Defects found`);
for (const [t, names] of Object.entries(tech)) {
  const a = tally(r1, names), b = tally(latest, names);
  const found = defects.filter((d) => d.technique === t).length;
  line(`${pad(t, 10)} ${pad(b.pass + b.fail, 6)} ${pad(a.fail, 13)} ${pad(b.fail, 9)} ${found}`);
}
const ubstDefects = defects.filter((d) => d.technique.startsWith("Markov")).length;
const ubst = json("ubst/analysis.json");
if (ubst) {
  const first = ubst.perRound[0], last = ubst.perRound[ubst.perRound.length - 1];
  const runs = ubst.perRound.reduce((a, r) => a + r.runs, 0);
  line(`${pad("UBST", 10)} ${pad(runs, 6)} ${pad(first.defectFailures, 13)} ${pad(last.defectFailures, 9)} ${ubstDefects}   (sessions)`);
}
line(`Baseline (existing 499-case suite): 0 of ${defects.length} defects detected`);

line();
line("DEFECTS by ODC type:     " + Object.entries(count("odc_type")).map(([k, v]) => `${k} ${v}`).join(", "));
line("DEFECTS by severity:     " + Object.entries(count("severity")).map(([k, v]) => `${k} ${v}`).join(", "));
line("DEFECTS by status:       " + Object.entries(count("status")).map(([k, v]) => `${k} ${v}`).join(", "));

const cov = json("results/round4/coverage-by-technique.json") ?? json("results/round3/coverage-by-technique.json") ?? json("results/round2/coverage-by-technique.json");
if (cov) line(`\nBRANCH COVERAGE (target modules): baseline ${cov.baseline.total.branches}% -> with course suites ${cov.all.total.branches}%`);

if (ubst) {
  line("\nUBST RELIABILITY (Nelson R = 1 - failures/sessions, 95% interval, false positives excluded)");
  for (const r of ubst.perRound) {
    const fp = r.falsePositives.length ? ` (+${r.falsePositives.length} false positive)` : "";
    line(`  round ${r.round}: ${pad(`${r.defectFailures}/${r.runs} failed${fp}`, 32)} R = ${r.adjustedReliability}  [${r.ci95.join(", ")}]`);
  }
  const sens = ubst.sensitivityByRound[0];
  line(`  sensitivity on round ${sens.round} failure data (predicted R if usage changes):`);
  for (const v of sens.variants) line(`    ${pad(v.variant, 38)} ${v.predictedReliability}`);
}
line("=".repeat(72));
