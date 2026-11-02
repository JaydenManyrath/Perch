/**
 * CS 7314 UBST reliability analysis.
 *
 *   npx tsx scripts/testing/ubst-analysis.ts out.json round1.json round2.json [...]
 *
 * docs/testing/ubst/triage.json lists failures investigated and found to be test-driver
 * false positives; reliability is reported both raw and with those excluded.
 *
 * Per round (one executor result file each, in order):
 *   - Nelson reliability R = 1 - f/n with a 95% Wilson interval,
 *   - failure rate per 100 sessions, and the change from the previous round.
 * Sensitivity (per round): estimate each transition's failure probability from
 * the runs (failures at that transition / times it was attempted), then compute the
 * session reliability the chain predicts under the projected profile and under
 * variants with the booking and abandonment probabilities scaled by 0.5 and 1.5.
 * Session reliability r(i) solves r(i) = sum_j p(i,j) (1 - f(i,j)) r(j), r(EXIT) = 1.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { P, SCREENS, type Screen } from "../../tests/course/models/usageProfile";

type Run = { path: Screen[]; ok: boolean; failure: null | { step: number; from: Screen; to: Screen; kind: string } };
type RoundFile = { runs: number; failures: number; profile: string; seed: number; details: Run[] };

const [out, ...files] = process.argv.slice(2);
const rounds = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as RoundFile);
const TRIAGE = "docs/testing/ubst/triage.json";
const falsePositives: Record<string, Record<string, string>> = existsSync(TRIAGE)
  ? JSON.parse(readFileSync(TRIAGE, "utf8")).falsePositives
  : {};

function wilson(f: number, n: number) {
  const z = 1.96;
  const p = (n - f) / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Number((c - h).toFixed(4)), Number(Math.min(1, c + h).toFixed(4))];
}

const perRound = rounds.map((r, k) => {
  const fp = Object.keys(falsePositives[String(k + 1)] ?? {}).filter((id) => r.details.some((d) => (d as Run & { id: string }).id === id && !d.ok));
  const real = r.failures - fp.length;
  const byCause: Record<string, number> = {};
  for (const d of r.details as (Run & { id: string })[]) {
    if (d.ok || fp.includes(d.id)) continue;
    const key = `${d.failure!.from}->${d.failure!.to} ${d.failure!.kind}`;
    byCause[key] = (byCause[key] ?? 0) + 1;
  }
  return {
    round: k + 1,
    file: files[k],
    runs: r.runs,
    failures: r.failures,
    falsePositives: fp,
    defectFailures: real,
    reliability: Number((1 - r.failures / r.runs).toFixed(4)),
    adjustedReliability: Number((1 - real / r.runs).toFixed(4)),
    ci95: wilson(real, r.runs),
    failuresPer100: Number(((100 * real) / r.runs).toFixed(1)),
    byCause,
  };
});

// Per-transition failure probability for one round (false positives excluded).
function failureModel(k: number) {
  const fp = new Set(Object.keys(falsePositives[String(k + 1)] ?? {}));
  const attempts: Record<string, number> = {};
  const fails: Record<string, number> = {};
  for (const run of rounds[k].details as (Run & { id: string })[]) {
    if (fp.has(run.id)) continue;
    const end = run.failure ? run.failure.step : run.path.length - 1;
    for (let j = 1; j <= end; j++) {
      const key = `${run.path[j - 1]}->${run.path[j]}`;
      attempts[key] = (attempts[key] ?? 0) + 1;
    }
    if (run.failure) {
      const key = `${run.failure.from}->${run.failure.to}`;
      fails[key] = (fails[key] ?? 0) + 1;
    }
  }
  const f = (a: Screen, b: Screen) => (attempts[`${a}->${b}`] ? (fails[`${a}->${b}`] ?? 0) / attempts[`${a}->${b}`] : 0);
  const failing = Object.entries(fails).map(([t, v]) => ({ transition: t, failures: v, attempts: attempts[t], f: Number((v / attempts[t]).toFixed(3)) }));
  return { f, failing };
}

type Profile = Record<Screen, Partial<Record<Screen, number>>>;
function scaled(base: Profile, from: Screen, to: Screen, factor: number): Profile {
  const row = { ...base[from] };
  const old = row[to] ?? 0;
  const neu = Math.min(0.95, old * factor);
  const rest = 1 - old;
  for (const k of Object.keys(row) as Screen[]) row[k] = k === to ? neu : ((row[k] ?? 0) * (1 - neu)) / rest;
  return { ...base, [from]: row };
}

function sessionReliability(profile: Profile, f: (a: Screen, b: Screen) => number): number {
  const T = SCREENS.filter((s) => s !== "EXIT");
  const n = T.length;
  // (I - A) r = b, where A(i,j) = p(i,j)(1 - f(i,j)) over transient j, b(i) = p(i,EXIT)(1 - f(i,EXIT)).
  const M = T.map((i, a) => [
    ...T.map((j, b) => (a === b ? 1 : 0) - (profile[i][j] ?? 0) * (1 - f(i, j))),
    (profile[i].EXIT ?? 0) * (1 - f(i, "EXIT")),
  ]);
  for (let c = 0; c < n; c++) {
    let pv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pv][c])) pv = r;
    [M[c], M[pv]] = [M[pv], M[c]];
    const d = M[c][c];
    for (let k = c; k <= n; k++) M[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const m = M[r][c];
      for (let k = c; k <= n; k++) M[r][k] -= m * M[c][k];
    }
  }
  return M[T.indexOf("START")][n];
}

const variants: [string, Profile][] = [
  ["projected profile", P],
  ["booking x0.5 (LISTING->BOOKING)", scaled(P, "LISTING", "BOOKING", 0.5)],
  ["booking x1.5", scaled(P, "LISTING", "BOOKING", 1.5)],
  ["abandonment x0.5 (ONBOARDING->EXIT)", scaled(P, "ONBOARDING", "EXIT", 0.5)],
  ["abandonment x1.5", scaled(P, "ONBOARDING", "EXIT", 1.5)],
  ["negotiate x0.5 (PERCHES->NEGOTIATE)", scaled(P, "PERCHES", "NEGOTIATE", 0.5)],
  ["negotiate x1.5", scaled(P, "PERCHES", "NEGOTIATE", 1.5)],
];
const sensitivityByRound = rounds.map((_, k) => {
  const { f, failing } = failureModel(k);
  return {
    round: k + 1,
    failingTransitions: failing,
    variants: variants.map(([name, prof]) => ({ variant: name, predictedReliability: Number(sessionReliability(prof, f).toFixed(4)) })),
  };
});
// Reliability growth: Goel-Okumoto m(t) = a(1 - e^(-b t)) fitted by least squares to
// cumulative defect failures against cumulative sessions (grid search; tiny data set).
const cum: { t: number; m: number }[] = [];
perRound.reduce((acc, r) => {
  const next = { t: acc.t + r.runs, m: acc.m + r.defectFailures };
  cum.push(next);
  return next;
}, { t: 0, m: 0 });
let best = { a: 0, b: 0, sse: Infinity };
const mMax = cum[cum.length - 1].m;
for (let a = Math.max(1, mMax); a <= mMax * 3 + 1; a += 0.05) {
  for (let b = 0.0005; b <= 0.2; b += 0.0005) {
    const sse = cum.reduce((e, c) => e + (a * (1 - Math.exp(-b * c.t)) - c.m) ** 2, 0);
    if (sse < best.sse) best = { a, b, sse };
  }
}
const tEnd = cum[cum.length - 1].t;
const growth = {
  model: "Goel-Okumoto",
  points: cum,
  a: Number(best.a.toFixed(2)),
  b: Number(best.b.toFixed(4)),
  expectedRemaining: Number((best.a - mMax).toFixed(2)),
  failureIntensityPerSessionNow: Number((best.a * best.b * Math.exp(-best.b * tEnd)).toFixed(5)),
};

const report = { perRound, growth, sensitivityByRound };
writeFileSync(out, JSON.stringify(report, null, 2));
for (const r of perRound)
  console.log(`round ${r.round}: ${r.defectFailures}/${r.runs} defect failures (+${r.falsePositives.length} false positive), R=${r.adjustedReliability} [${r.ci95.join(", ")}]`);
console.log(`growth (Goel-Okumoto): a=${growth.a} b=${growth.b} expected remaining=${growth.expectedRemaining} intensity now=${growth.failureIntensityPerSessionNow}/session`);
for (const r of sensitivityByRound) {
  console.log(`sensitivity, round ${r.round}:`);
  for (const v of r.variants) console.log(`  ${v.variant.padEnd(38)} R=${v.predictedReliability}`);
}
