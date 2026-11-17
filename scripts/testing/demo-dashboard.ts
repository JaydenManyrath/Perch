/**
 * CS 7314 demo dashboard: one offline HTML page that walks the TA demo checklist
 * (system, raw data and collection, data analysis, models, test cases, execution and
 * results, result analysis), generated from the saved models and result files.
 *
 *   npx tsx scripts/testing/demo-dashboard.ts   ->  docs/testing/demo/dashboard.html
 *
 * Open the file in any browser; no network needed. `npm run demo` opens it per step.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { P, SCREENS, expectedVisits } from "../../tests/course/models/usageProfile";
import { STATES, VALID, INVALID, PATHS } from "../../tests/course/models/bookingFsm";

const D = "docs/testing/";
const OUT = D + "demo/dashboard.html";
const OUT_DIR = path.dirname(OUT);
const json = (p: string) => JSON.parse(readFileSync(D + p, "utf8"));
const esc = (s: unknown) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rel = (fromDocDir: string, href: string) => (/^[a-z]+:|^#/.test(href) ? href : path.relative(OUT_DIR, path.join(fromDocDir, href)));
const link = (file: string, label = file) => `<a href="${esc(path.relative(OUT_DIR, file))}"><code>${esc(label)}</code></a>`;

// ---------- tiny Markdown -> HTML (headings, tables, lists, code, paragraphs) ----------
function inline(s: string, dir: string) {
  return esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, t, h) => `<a href="${esc(rel(dir, h))}">${t}</a>`);
}
function md(file: string, { skipTitle = true, replaceMermaid = "" } = {}) {
  const dir = path.dirname(file);
  const lines = readFileSync(file, "utf8").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      if (lang === "mermaid" && replaceMermaid) out.push(replaceMermaid);
      else out.push(`<pre>${esc(body.join("\n"))}</pre>`);
      continue;
    }
    const h = l.match(/^(#{1,4}) (.*)/);
    if (h) {
      if (!(skipTitle && h[1] === "#")) out.push(`<h${h[1].length + 2}>${inline(h[2], dir)}</h${h[1].length + 2}>`);
      i++;
      continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        i++;
      }
      out.push(`<div class="scroll"><table><thead><tr>${rows[0].map((c) => `<th>${inline(c, dir)}</th>`).join("")}</tr></thead><tbody>${rows
        .slice(1)
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c, dir)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.) /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i])) {
        let item = lines[i++].replace(/^\s*([-*]|\d+\.) /, "");
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*([-*]|\d+\.) /.test(lines[i])) item += " " + lines[i++].trim();
        items.push(`<li>${inline(item, dir)}</li>`);
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (!l.trim() || l.startsWith("Docs style:")) {
      i++;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||```|\s*([-*]|\d+\.) )/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(" "), dir)}</p>`);
  }
  return out.join("\n");
}

// ---------- data ----------
const r1 = json("results/round1/course-suites.json");
const now = json("results/round4/course-suites.json");
const cov = json("results/round4/coverage-by-technique.json");
const ubst = json("ubst/analysis.json");
const triage = json("ubst/triage.json");
const defectRows = readFileSync(D + "defect-log.csv", "utf8").trim().split("\n");
const dHead = defectRows[0].split(",");
const defects = defectRows.slice(1).map((r) => {
  const cells = r.match(/("([^"]|"")*"|[^,]*)(,|$)/g)!.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"'));
  return Object.fromEntries(dHead.map((h, i) => [h, cells[i] ?? ""]));
});

type Assertion = { title: string; status: string; ancestorTitles: string[]; duration?: number };
const r1Status = new Map<string, string>();
for (const f of r1.testResults) for (const a of f.assertionResults as Assertion[]) r1Status.set(`${path.basename(f.name)}::${a.title}`, a.status);

const SUITES: { file: string; technique: string; what: string }[] = [
  { file: "fsm-booking-live.test.ts", technique: "FSM/BBT", what: "Booking state machine, live API routes over an in-memory database" },
  { file: "fsm-booking-fixture.test.ts", technique: "FSM/BBT", what: "Booking state machine, fixture data source (the no-key demo mode)" },
  { file: "pt-verdict-rules.test.ts", technique: "PT/BBT", what: "Budget, lease, routine, safety partitions and roll-up" },
  { file: "pt-finance.test.ts", technique: "PT/BBT", what: "Take-home bands, COL index, offer pay period, negotiate inputs" },
  { file: "cft-branches.test.ts", technique: "CFT/WBT", what: "Freshness, cron route, transition function, performTransition" },
  { file: "cft-source-fallback.test.ts", technique: "CFT/WBT", what: "Fixture/live fallback edges for booking actions" },
  { file: "markov-profile.test.ts", technique: "Markov-OP", what: "Usage-profile model validation" },
  { file: "pilot-profile.test.ts", technique: "Markov-OP", what: "Pilot logger and log-to-profile conversion" },
  { file: "regression-round3.test.ts", technique: "Regression", what: "D07, D14, D15 fixes" },
  { file: "regression-d16.test.ts", technique: "Regression", what: "D16 fix" },
];

function catalog() {
  const blocks: string[] = [];
  for (const s of SUITES) {
    const f = now.testResults.find((x: { name: string }) => x.name.endsWith(s.file));
    if (!f) continue;
    const groups = new Map<string, Assertion[]>();
    for (const a of f.assertionResults as Assertion[]) {
      const g = a.ancestorTitles.join(" > ");
      groups.set(g, [...(groups.get(g) ?? []), a]);
    }
    const r1Fails = (f.assertionResults as Assertion[]).filter((a) => r1Status.get(`${s.file}::${a.title}`) === "failed").length;
    const rows = [...groups.entries()]
      .map(
        ([g, list]) =>
          `<tr class="group"><td colspan="3">${esc(g)}</td></tr>` +
          list
            .map((a) => {
              const was = r1Status.get(`${s.file}::${a.title}`);
              const wasCell = was === undefined ? `<span class="muted">added later</span>` : was === "passed" ? `<span class="pass">pass</span>` : `<span class="fail">FAIL</span>`;
              return `<tr><td>${esc(a.title)}</td><td>${wasCell}</td><td>${a.status === "passed" ? `<span class="pass">pass</span>` : `<span class="fail">FAIL</span>`}</td></tr>`;
            })
            .join(""),
      )
      .join("");
    blocks.push(`<details><summary><strong>${esc(s.technique)}</strong> &middot; ${link("tests/course/" + s.file, s.file)} &middot; ${f.assertionResults.length} cases${r1Fails ? ` &middot; <span class="fail">${r1Fails} failed in round 1</span>` : ""}<br><span class="muted">${esc(s.what)}</span></summary>
<div class="scroll"><table><thead><tr><th>Test case</th><th>Round 1 (original code)</th><th>Now</th></tr></thead><tbody>${rows}</tbody></table></div></details>`);
  }
  return blocks.join("\n");
}

const onboardingRuns = ["results/round1/onboarding-fsm-e2e.json", "results/round2/onboarding-fsm-e2e.json"].filter((p) => existsSync(D + p)).map(json);
function onboardingTable() {
  const [a, b] = onboardingRuns;
  return `<div class="scroll"><table><thead><tr><th>Case</th><th>Covers</th><th>Round 1</th><th>Round 2</th></tr></thead><tbody>${a.results
    .map((r: { id: string; desc: string; verdict: string }, i: number) => {
      const v = (x: string) => (x === "PASS" ? `<span class="pass">pass</span>` : x === "FAIL" ? `<span class="fail">FAIL</span>` : `<span class="muted">observation</span>`);
      return `<tr><td>${esc(r.id)}</td><td>${esc(r.desc)}</td><td>${v(r.verdict)}</td><td>${v(b.results[i].verdict)}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}

function bar(pct: number, cls = "") {
  return `<span class="bar ${cls}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></span>`;
}

const modules = Object.keys(cov.all.perFile);
const covTable = `<div class="scroll"><table><thead><tr><th>Module under test</th><th>Baseline branch %</th><th>With course suites</th></tr></thead><tbody>${modules
  .map((m) => {
    const b = cov.baseline.perFile[m]?.branches ?? 0;
    const a = cov.all.perFile[m].branches;
    return `<tr><td><code>${esc(m)}</code></td><td>${bar(b, "base")} ${b}%</td><td>${bar(a)} ${a}%</td></tr>`;
  })
  .join("")}<tr class="group"><td>All target modules</td><td>${bar(cov.baseline.total.branches, "base")} ${cov.baseline.total.branches}%</td><td>${bar(cov.all.total.branches)} ${cov.all.total.branches}%</td></tr></tbody></table></div>`;

const visits = expectedVisits();
const transient = SCREENS.filter((s) => s !== "START" && s !== "EXIT");
const matrix = `<div class="scroll"><table class="matrix"><thead><tr><th>From \\ To</th>${SCREENS.filter((s) => s !== "START").map((s) => `<th>${s}</th>`).join("")}</tr></thead><tbody>${SCREENS.filter((s) => s !== "EXIT")
  .map((f) => `<tr><th>${f}</th>${SCREENS.filter((s) => s !== "START").map((t) => `<td>${P[f][t] ? P[f][t]!.toFixed(2) : ""}</td>`).join("")}</tr>`)
  .join("")}</tbody></table></div>`;
const maxV = Math.max(...transient.map((s) => visits[s]));
const visitBars = `<div class="scroll"><table><thead><tr><th>Screen</th><th>Expected visits per session</th></tr></thead><tbody>${transient
  .map((s) => `<tr><td>${s}</td><td>${bar((100 * visits[s]) / maxV)} ${visits[s].toFixed(2)}</td></tr>`)
  .join("")}</tbody></table></div>`;

const ubstRows = `<div class="scroll"><table><thead><tr><th>Round</th><th>Suite (seed)</th><th>Sessions</th><th>Failed (defects)</th><th>Driver false positives</th><th>Reliability</th><th>95% interval</th><th>Failures by cause</th></tr></thead><tbody>${ubst.perRound
  .map(
    (r: { round: number; runs: number; defectFailures: number; falsePositives: string[]; adjustedReliability: number; ci95: number[]; byCause: Record<string, number> }) =>
      `<tr><td>${r.round}</td><td>${link(`${D}ubst/suite-round${r.round}.json`, `suite-round${r.round}.json`)}</td><td>${r.runs}</td><td>${r.defectFailures}</td><td>${r.falsePositives.join(", ") || "-"}</td><td>${bar(r.adjustedReliability * 100)} ${r.adjustedReliability.toFixed(3)}</td><td>${r.ci95.join(" - ")}</td><td>${Object.entries(r.byCause).map(([k, v]) => `${v}x ${esc(k)}`).join("<br>") || "-"}</td></tr>`,
  )
  .join("")}</tbody></table></div>`;
const suite4 = json("ubst/suite-round4.json");
const ubstSample = `<div class="scroll"><table><thead><tr><th>Test case</th><th>Session (screens in order)</th><th>Probability under the profile</th></tr></thead><tbody>${suite4.cases
  .slice(0, 8)
  .map((c: { id: string; path: string[]; probability: number }) => `<tr><td>${c.id}</td><td>${esc(c.path.join(" > "))}</td><td>${c.probability.toPrecision(3)}</td></tr>`)
  .join("")}</tbody></table></div>`;
const sens = ubst.sensitivityByRound[0].variants
  .map((v: { variant: string; predictedReliability: number }) => `<tr><td>${esc(v.variant)}</td><td>${bar(v.predictedReliability * 100)} ${v.predictedReliability.toFixed(3)}</td></tr>`)
  .join("");

const defectTable = `<div class="scroll"><table><thead><tr><th>Id</th><th>Defect</th><th>Technique</th><th>Found by</th><th>ODC type / trigger</th><th>Severity</th><th>Status</th></tr></thead><tbody>${defects
  .map((d) => `<tr><td>${d.id}</td><td>${esc(d.title)}<br><span class="muted"><code>${esc(d.module)}</code></span></td><td>${esc(d.technique)}</td><td>${esc(d.detected_by)}</td><td>${esc(d.odc_type)} / ${esc(d.odc_trigger)}</td><td>${esc(d.severity)}</td><td>${esc(d.status)}<br><span class="muted">${esc(d.retest)}</span></td></tr>`)
  .join("")}</tbody></table></div>`;
const countBy = (k: string) => Object.entries(defects.reduce((a: Record<string, number>, d) => ((a[d[k]] = (a[d[k]] ?? 0) + 1), a), {}));

const r1Total = r1.numFailedTests;
const rawData = [
  ["FSM booking model", "Contract section 13.4 (booking state machine), README freshness rules, the one-live-hold DB index", "Read from the spec, not the code, so the model is an independent oracle", "tests/course/models/bookingFsm.ts"],
  ["FSM onboarding model", "The onboarding screens and the review-screen guard, observed in the running app", "Walked through in a browser; guard conditions read from the screen", "tests/e2e/onboarding-fsm.e2e.mjs"],
  ["PT partitions", "Documented 2025 single-filer tax constants, scout thresholds (10% budget flag, 7-day lease gap, 10/20-minute walk)", "Expected values computed by hand, not read back from the code", "docs/testing/pt/partitions.md"],
  ["CFT control flow graphs", "Source code of the target modules", "Decision points traced by hand into six graphs", "docs/testing/cft/cfg.md"],
  ["Markov usage profile", "Designed user journey and team estimates (Perch has no production users)", "Projected profile; the opt-in /pilot logger collects real navigation data to refine it", "tests/course/models/usageProfile.ts"],
  ["Baseline coverage", "The existing 499-case Vitest suite on the original code", "Measured with @vitest/coverage-v8 before any course test was written", "docs/testing/results/round1/coverage-by-technique.json"],
  ["Test execution results", "Every course-suite run, each round", "Vitest JSON reporter, saved per round", "docs/testing/results"],
  ["UBST session runs", "60 generated sessions per round replayed in Chromium", "Executor records each session's path, outcome and failure cause", "docs/testing/ubst"],
  ["Defect log", "Every failure traced to a fault, classified with ODC type and trigger", "Triage of each round's failures; fixes and retests recorded", "docs/testing/defect-log.csv"],
];

const fsmImg = `<img src="booking-fsm.png" alt="Booking FSM" class="diagram">`;
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Perch Testing Dashboard</title>
<style>
:root{--ink:#1B2B34;--teal:#0E7C86;--amber:#F2A541;--red:#C8553D;--muted:#5B6B73;--line:#D5E3E5;--tint:#EEF5F6;--bg:#FFFFFF}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Calibri,Segoe UI,Arial,sans-serif}
header{background:var(--ink);color:#fff;padding:24px 28px}header h1{margin:0;font:700 26px Cambria,Georgia,serif}header p{margin:6px 0 0;color:#B9CDD2}
nav{position:sticky;top:0;z-index:2;background:#fff;border-bottom:1px solid var(--line);padding:8px 16px;display:flex;flex-wrap:wrap;gap:6px}
nav a{color:var(--teal);text-decoration:none;font-weight:600;padding:4px 10px;border-radius:14px;background:var(--tint);font-size:13px}
main{max-width:1180px;margin:0 auto;padding:8px 20px 60px}section{scroll-margin-top:48px;padding-top:18px;border-bottom:1px solid var(--line);padding-bottom:18px}
h2{font:700 22px Cambria,Georgia,serif;margin:14px 0 6px}h2 .n{color:var(--teal);margin-right:8px}h3{font:700 17px Cambria,Georgia,serif;margin:18px 0 6px}h4,h5,h6{margin:14px 0 4px}
.lead{color:var(--muted);margin-top:0}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13.5px}
th,td{border:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}th{background:var(--tint)}tr.group td{background:#F6FAFA;font-weight:600}
.matrix td{text-align:center}code{font:12.5px Consolas,Menlo,monospace;background:var(--tint);padding:1px 4px;border-radius:3px}
pre{background:var(--tint);padding:10px;overflow-x:auto;font:12.5px/1.45 Consolas,Menlo,monospace}
.pass{color:#1E7B3A;font-weight:700}.fail{color:var(--red);font-weight:700}.muted{color:var(--muted);font-size:12.5px}
.bar{display:inline-block;width:110px;height:9px;background:var(--tint);border-radius:5px;vertical-align:middle;margin-right:6px;overflow:hidden}
.bar span{display:block;height:100%;background:var(--teal)}.bar.base span{background:#8FB8BF}
.stats{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0}.stat{background:var(--tint);border-radius:10px;padding:10px 14px;min-width:150px}
.stat b{display:block;font:700 26px Cambria,Georgia,serif;color:var(--teal)}.stat.red b{color:var(--red)}
details{border:1px solid var(--line);border-radius:8px;margin:8px 0;padding:6px 10px}summary{cursor:pointer}
.diagram{max-width:min(100%,760px);height:auto;display:block;margin:8px 0}.cmd{font:13px Consolas,Menlo,monospace;background:var(--ink);color:#E6F2F3;padding:8px 12px;border-radius:6px;display:inline-block}
.doc{border-left:3px solid var(--line);padding-left:14px;margin-top:8px}
</style></head><body>
<header><h1>Perch Testing Project - Demo Dashboard</h1><p>Jayden Manyrath and Koen Gennis | CS 7314/5314, Fall 2026 | Prof. Jeff Tian | generated from the saved models and results</p></header>
<nav><a href="#system">1 System</a><a href="#rawdata">2 Raw data</a><a href="#analysis-data">3 Data analysis</a><a href="#models">4 Models</a><a href="#testcases">5 Test cases</a><a href="#execution">6 Execution &amp; results</a><a href="#results">7 Result analysis</a></nav>
<main>

<section id="system"><h2><span class="n">1</span>System under test</h2>
<p class="lead">Perch: a Next.js + Supabase web app that helps interns relocating for a summer find sublets, friends and events in a new city.</p>
<div class="scroll"><table><thead><tr><th>Function</th><th>Screen / route</th><th>Component tested</th><th>Technique</th></tr></thead><tbody>
<tr><td>Onboarding from an offer letter (parse, review, account, Spotify, Takeout, photo, flock)</td><td><code>/onboarding</code></td><td><code>lib/parsers/offerLetter.ts</code>, onboarding steps</td><td>FSM (browser), PT (salary parsing)</td></tr>
<tr><td>Swipe deck of sublets, listing detail, request / approve / confirm / cancel a booking</td><td><code>/stories</code>, <code>/post</code></td><td><code>lib/bookings.ts</code>, booking + listing API routes, <code>lib/data/source.ts</code></td><td>FSM, CFT, UBST</td></tr>
<tr><td>Housing verdicts (budget, safety, lease fit, commute) and the finance readout</td><td><code>/negotiate</code>, <code>/landing</code></td><td><code>lib/negotiate/*</code>, <code>lib/finance/model.ts</code>, <code>/api/negotiate</code></td><td>PT, UBST</td></tr>
<tr><td>Listing freshness (expire stale listings, ping subletters)</td><td>daily cron</td><td><code>lib/sourcing/freshness.ts</code>, <code>/api/cron/expire-listings</code></td><td>CFT</td></tr>
<tr><td>Feed, map, messages, profile (navigation for usage-based testing)</td><td><code>/feed</code>, <code>/map</code>, <code>/dms</code>, <code>/profile</code></td><td>whole app</td><td>UBST</td></tr>
</tbody></table></div>
<p>Live: <span class="cmd">npm run demo:app</span> then open <a href="http://localhost:3100">http://localhost:3100</a> (fixture data, no keys, no login).</p>
</section>

<section id="rawdata"><h2><span class="n">2</span>Raw data for model construction, and how it was collected</h2>
<div class="scroll"><table><thead><tr><th>Data</th><th>Source</th><th>How collected</th><th>File</th></tr></thead><tbody>
${rawData.map(([a, b, c, f]) => `<tr><td><strong>${esc(a)}</strong></td><td>${esc(b)}</td><td>${esc(c)}</td><td>${link(f)}</td></tr>`).join("")}
</tbody></table></div>
</section>

<section id="analysis-data"><h2><span class="n">3</span>Analysis of the raw data</h2>
<h3>Baseline: what the existing suite left untested</h3>
<div class="stats"><div class="stat"><b>499</b>existing test cases</div><div class="stat"><b>${cov.baseline.total.branches}%</b>branch coverage of target modules</div><div class="stat red"><b>0 of ${defects.length}</b>defects detected by the baseline</div></div>
${covTable}
<p class="muted">Modules at 0% or low coverage (expiry cron, booking transitions, the fallback in the data source) are where the white-box and FSM work was aimed.</p>
<h3>Usage profile: where users spend their time</h3>
<p>Analytic expected visits per session from the fundamental matrix N = (I - Q)<sup>-1</sup>; about ${transient.reduce((a, s) => a + visits[s], 0).toFixed(1)} screens per session. Feed and the Perches deck dominate, so usage-based testing spends most sessions there.</p>
${visitBars}
</section>

<section id="models"><h2><span class="n">4</span>Testing models</h2>
<h3>FSM/BBT: booking lifecycle (${Object.keys(STATES).length} states, ${VALID.length} valid transitions, ${INVALID.length} invalid pairs, ${PATHS.length} paths)</h3>
<div class="doc">${md(D + "fsm/booking-fsm.md", { replaceMermaid: fsmImg })}</div>
<h3>FSM/BBT: onboarding</h3>
<div class="doc">${md(D + "fsm/onboarding-fsm.md")}</div>
<h3>PT/BBT: partition tables</h3>
<div class="doc">${md(D + "pt/partitions.md")}</div>
<h3>CFT/WBT: control flow graphs</h3>
<div class="doc">${md(D + "cft/cfg.md")}</div>
<h3>Markov-OP/UBST: transition matrix (projected-v1)</h3>
${matrix}
<div class="doc">${md(D + "markov/usage-profile.md")}</div>
</section>

<section id="testcases"><h2><span class="n">5</span>Test cases and the organized suite</h2>
<p class="lead">Every case, grouped by technique, suite and model element. Ids map to the models: T/I/P/C = FSM transitions, invalid pairs, paths, concurrency; PB/PL/PR/PS/PF/PN = PT classes; CF = CFG edges; R = regressions. "Round 1" is the result on the original, unfixed code.</p>
<div class="stats"><div class="stat"><b>${now.numPassedTests + now.numFailedTests}</b>course test cases</div><div class="stat red"><b>${r1Total}</b>failed on the original code</div><div class="stat"><b>${now.numFailedTests}</b>failing now</div><div class="stat"><b>${ubst.perRound.reduce((a: number, r: { runs: number }) => a + r.runs, 0)}</b>UBST sessions</div></div>
${catalog()}
<details><summary><strong>FSM/BBT</strong> &middot; ${link("tests/e2e/onboarding-fsm.e2e.mjs", "onboarding-fsm.e2e.mjs")} &middot; browser cases</summary>${onboardingTable()}</details>
<details><summary><strong>Markov-OP/UBST</strong> &middot; generated sessions (first 8 of round 4)</summary>${ubstSample}<p class="muted">Each session is a random walk from START to EXIT drawn from the profile with a fixed seed: <span class="cmd">npx tsx scripts/testing/markov-walk.ts 60 404 suite.json</span></p></details>
</section>

<section id="execution"><h2><span class="n">6</span>Test execution and results</h2>
<h3>Run it live</h3>
<p><span class="cmd">npm run demo</span> walks through every step; single steps: <span class="cmd">npm run demo:fsm</span> <span class="cmd">npm run demo:pt</span> <span class="cmd">npm run demo:cft</span> <span class="cmd">npm run demo:ubst</span> <span class="cmd">npm run demo:summary</span></p>
<h3>Rounds</h3>
<div class="scroll"><table><thead><tr><th>Round</th><th>Code</th><th>Course suites</th><th>Raw results</th></tr></thead><tbody>
<tr><td>1</td><td>original (commit <code>bfad1d9</code>)</td><td><span class="fail">${r1.numFailedTests} failed</span> / ${r1.numPassedTests + r1.numFailedTests}</td><td>${link(D + "results/round1", "results/round1")}</td></tr>
<tr><td>2</td><td>D01-D06, D08-D13 fixed</td><td><span class="pass">0 failed</span></td><td>${link(D + "results/round2", "results/round2")}</td></tr>
<tr><td>3</td><td>D07, D14, D15 fixed</td><td><span class="pass">0 failed</span></td><td>${link(D + "results/round3", "results/round3")}</td></tr>
<tr><td>4</td><td>D16 fixed</td><td><span class="pass">0 failed</span> / ${now.numPassedTests + now.numFailedTests}</td><td>${link(D + "results/round4", "results/round4")}</td></tr>
</tbody></table></div>
<h3>Usage-based runs (60 browser sessions per round)</h3>
${ubstRows}
<p class="muted">False positives were investigated and found to be test-driver mistakes, not app defects: ${esc(Object.values(triage.falsePositives).flatMap((r) => Object.keys(r as object)).join(", "))} (see ${link(D + "ubst/triage.json", "triage.json")}).</p>
</section>

<section id="results"><h2><span class="n">7</span>Result data and analysis</h2>
<div class="stats"><div class="stat red"><b>${defects.length}</b>defects found</div><div class="stat"><b>${defects.filter((d) => d.status === "Fixed").length}</b>fixed and retested</div><div class="stat"><b>${cov.baseline.total.branches}% &rarr; ${cov.all.total.branches}%</b>branch coverage</div><div class="stat"><b>${ubst.perRound[0].adjustedReliability.toFixed(2)} &rarr; ${ubst.perRound[ubst.perRound.length - 1].adjustedReliability.toFixed(2)}</b>usage-based reliability</div></div>
<h3>Defect log (ODC)</h3>
${defectTable}
<p>By ODC type: ${countBy("odc_type").map(([k, v]) => `${esc(k)} ${v}`).join(", ")}. By severity: ${countBy("severity").map(([k, v]) => `${esc(k)} ${v}`).join(", ")}.</p>
<h3>Sensitivity (round 1 failure data)</h3>
<div class="scroll"><table><thead><tr><th>Usage change</th><th>Predicted reliability</th></tr></thead><tbody>${sens}</tbody></table></div>
<p>Reliability growth (Goel-Okumoto on cumulative failures vs sessions): a = ${ubst.growth.a}, b = ${ubst.growth.b}, expected remaining ${ubst.growth.expectedRemaining}.</p>
<h3>Cross-technique analysis</h3>
<div class="doc">${md(D + "analysis.md")}</div>
</section>
</main></body></html>`;

writeFileSync(OUT, html);
// Model data for the slide deck (scripts/testing/demo-deck.cjs).
writeFileSync(
  D + "demo/model-data.json",
  JSON.stringify({ screens: SCREENS, profile: P, expectedVisits: visits, fsm: { states: Object.keys(STATES).length, valid: VALID.length, invalid: INVALID.length, paths: PATHS.length } }, null, 1),
);
console.log(`wrote ${OUT} (${Math.round(html.length / 1024)} KB)`);
