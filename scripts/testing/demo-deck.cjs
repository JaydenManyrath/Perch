/**
 * CS 7314: build the TA demo slide deck from the saved results. The slides follow the
 * TA's demo checklist in order: system, raw data and collection, data analysis, models,
 * test cases, execution, results and analysis.
 *
 *   npx tsx scripts/testing/demo-dashboard.ts   (writes model-data.json the deck reads)
 *   node scripts/testing/demo-deck.cjs          ->  docs/testing/demo/Perch_Testing_Demo.pptx
 *
 * The committed deck is final; rebuilding needs pptxgenjs (npm i --no-save pptxgenjs).
 * PPTX_SKILL_DIR, when set, points at a helper that writes the theme colors into the
 * file; without it the deck falls back to Office's stock palette.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const SKILL = process.env.PPTX_SKILL_DIR;
const D = "docs/testing/";
const read = (p) => JSON.parse(fs.readFileSync(D + p, "utf8"));
const cov = read("results/round4/coverage-by-technique.json");
const ubst = read("ubst/analysis.json");
const model = read("demo/model-data.json");
const r1 = read("results/round1/course-suites.json");
const now = read("results/round4/course-suites.json");

const THEME = {
  name: "Perch Testing",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2B34", lt1: "FFFFFF", dk2: "0E7C86", lt2: "EEF5F6",
    accent1: "0E7C86", accent2: "F2A541", accent3: "5B8C99", accent4: "C8553D", accent5: "8FB8BF", accent6: "33424A",
    hlink: "0E7C86", folHlink: "5B8C99",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.author = "Jayden Manyrath and Koen Gennis";
pres.title = "Perch Testing Project Demo";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.3, w: 8.8, h: 1.6, fontSize: 34, bold: true, color: C.background1, align: "left", valign: "bottom" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 3.1, w: 8.8, h: 1.8, fontSize: 16, color: C.accent5, align: "left", valign: "top" }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: HEX.lt1 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.35, w: 9, h: 0.65, fontSize: 22, bold: true, color: C.text1, align: "left", valign: "middle" }, text: "" } },
  ],
  slideNumber: { x: 9.3, y: 5.2, fontSize: 10, color: C.accent3 },
});

const card = (slide, x, y, w, h, name) =>
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.background2 }, objectName: name });
const text = (slide, t, o) => slide.addText(t, { isTextBox: true, fontSize: 14, color: C.text1, margin: 0, valign: "top", ...o });
const stat = (slide, x, y, w, big, label, name, color = C.accent1) => {
  text(slide, big, { x, y, w, h: 0.6, fontSize: 30, bold: true, color, fontFace: THEME.headFontFace, objectName: `${name}-value` });
  text(slide, label, { x, y: y + 0.6, w, h: 0.5, fontSize: 11, color: C.accent6, objectName: `${name}-label` });
};
// Which checklist item a slide covers, top right, so the TA can follow along.
const tag = (slide, label, name) =>
  text(slide, label, { x: 7.2, y: 0.08, w: 2.3, h: 0.25, fontSize: 9, bold: true, color: C.accent3, align: "right", objectName: `${name}-tag` });
const cmd = (slide, t, name, x = 0.5, w = 9) =>
  text(slide, t, { x, y: 4.6, w, h: 0.35, fontSize: 12, fontFace: "Courier New", color: C.accent1, objectName: `${name}-cmd` });
const table = (slide, rows, opts) =>
  slide.addTable(
    rows.map((r, i) => r.map((c) => ({ text: String(c), options: { bold: i === 0, color: i === 0 ? HEX.lt1 : String(c).includes("(D") ? HEX.accent4 : HEX.dk1, fill: { color: i === 0 ? HEX.dk2 : i % 2 ? HEX.lt2 : HEX.lt1 } } }))),
    { fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.5, color: "D5E3E5" }, ...opts },
  );
const chartText = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", catAxisLabelColor: HEX.accent6, valAxisLabelColor: HEX.accent6, dataLabelColor: HEX.dk1, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, dataLabelFontSize: 10, titleFontSize: 12, titleColor: HEX.dk1 };
const pretty = (s) => s[0] + s.slice(1).toLowerCase();

// 1. Title
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
s.addText("Testing Perch: FSM, Partition, Control Flow and Usage-Based Testing", { placeholder: "title" });
s.addText("Jayden Manyrath and Koen Gennis  |  CS 7314/5314, Fall 2026  |  Prof. Jeff Tian\nProject demo", { placeholder: "body" });
s.addNotes("Perch is our Next.js + Supabase app that helps interns find sublets, friends and events. We applied four formal techniques and compared them against the existing test suite.");

// 2. Agenda = the TA checklist
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Introduction" });
s.addText("What we will show, in the order of the demo checklist", { placeholder: "title" });
const agenda = [
  ["System under test", "3"], ["Raw data and how it was collected", "5"], ["Analysis of that data", "6"],
  ["Testing models (4 techniques)", "7-10"], ["Test cases and the organized suite", "11"],
  ["Test execution, live", "12"], ["Results and analysis", "13-14"],
];
agenda.forEach(([t, sl], i) => {
  const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
  const x = 0.5 + col * 4.6, y = 1.25 + row * 0.82;
  card(s, x, y, 4.3, 0.68, `agenda-card-${i}`);
  s.addShape(pres.shapes.OVAL, { x: x + 0.15, y: y + 0.12, w: 0.44, h: 0.44, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `agenda-dot-${i}` });
  text(s, String(i + 1), { x: x + 0.15, y: y + 0.12, w: 0.44, h: 0.44, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `agenda-num-${i}` });
  text(s, t, { x: x + 0.75, y, w: 2.7, h: 0.68, fontSize: 14, valign: "middle", objectName: `agenda-text-${i}` });
  text(s, `slide ${sl}`, { x: x + 3.4, y, w: 0.8, h: 0.68, fontSize: 10, color: C.accent3, valign: "middle", align: "right", objectName: `agenda-slide-${i}` });
});
text(s, "Full detail for every item: docs/testing/demo/dashboard.html (opens offline)", { x: 4.9, y: 3.85, w: 4.6, h: 0.5, fontSize: 11, color: C.accent6, objectName: "agenda-dash" });

// 3. System under test
pres.addSection({ title: "System" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "System" });
s.addText("System under test: Perch, a housing and social app for interns", { placeholder: "title" });
tag(s, "1  SYSTEM", "sys");
table(s, [
  ["Function", "Where", "Technique"],
  ["Onboarding from an offer letter", "/onboarding, offer parser", "FSM (browser), PT"],
  ["Swipe deck, listing, request / approve / confirm / cancel", "/stories, booking API, data source", "FSM, CFT, UBST"],
  ["Housing verdicts and finance readout", "/negotiate, lib/negotiate, finance model", "PT, UBST"],
  ["Listing freshness (expire, ping)", "daily cron, freshness pass", "CFT"],
  ["Feed, map, messages, profile", "/feed, /map, /dms, /profile", "UBST"],
], { x: 0.5, y: 1.2, w: 9, colW: [3.6, 3.4, 2.0], fontSize: 12, rowH: 0.42 });
text(s, "Next.js + Supabase. Tested in demo mode: built-in fixture data, no keys, no login.", { x: 0.5, y: 3.95, w: 9, h: 0.4, fontSize: 13, color: C.accent6, objectName: "sys-note" });
cmd(s, "Demo: npm run demo  (step 1 opens the app)", "sys");

// 4. Strategy
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "System" });
s.addText("Each technique is matched to one kind of risk in Perch", { placeholder: "title" });
tag(s, "1  SYSTEM", "strat");
[
  ["FSM / BBT", "Order of events", "Booking lifecycle and onboarding: approve twice, relist a taken place, two interns at once"],
  ["PT / BBT", "Input domains", "Finance and verdict rules over salary, rent, dates, commute, safety flags"],
  ["CFT / WBT", "Hidden branches", "Fallback, expiry and error paths that black-box tests rarely reach"],
  ["Markov-OP / UBST", "Real usage", "Random user sessions drawn from a usage profile, replayed in a browser"],
].forEach(([name, risk, what], i) => {
  const x = 0.5 + i * 2.3;
  card(s, x, 1.35, 2.1, 2.6, `tech-card-${i}`);
  text(s, name, { x: x + 0.2, y: 1.55, w: 1.7, h: 0.5, fontSize: 16, bold: true, color: C.accent1, objectName: `tech-name-${i}` });
  text(s, risk, { x: x + 0.2, y: 2.1, w: 1.7, h: 0.4, fontSize: 13, bold: true, color: C.accent4, objectName: `tech-risk-${i}` });
  text(s, what, { x: x + 0.2, y: 2.6, w: 1.7, h: 1.3, fontSize: 12, objectName: `tech-what-${i}` });
});
text(s, "Baseline for comparison: the repository's existing 499-case test suite, measured before we wrote anything.", { x: 0.5, y: 4.25, w: 9, h: 0.5, fontSize: 13, color: C.accent6, objectName: "tech-baseline-note" });

// 5. Raw data
pres.addSection({ title: "Data" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Data" });
s.addText("Raw data behind each model, and how it was collected", { placeholder: "title" });
tag(s, "2  RAW DATA", "raw");
table(s, [
  ["Model", "Raw data", "How collected"],
  ["FSM booking", "Contract 13.4 state machine, README freshness rules, one-hold DB index", "Read from the spec, not the code (independent oracle)"],
  ["FSM onboarding", "The 8 onboarding screens and the review-screen guard", "Walked through in the running app"],
  ["PT partitions", "2025 tax constants, scout thresholds (10% budget, 7-day lease, 10/20 min)", "Expected values computed by hand"],
  ["CFT graphs", "Source code of the 14 target modules", "Decision points traced into 6 graphs"],
  ["Markov profile", "Designed user journey + team estimates (no production users)", "Projected; opt-in /pilot logger collects real navigation"],
  ["Baseline", "Existing 499-case suite on the original code", "Coverage measured with v8 before any new test"],
], { x: 0.5, y: 1.15, w: 9, colW: [1.6, 4.1, 3.3], fontSize: 11, rowH: 0.44 });
text(s, "Run data: every round's results, UBST sessions and the defect log are saved under docs/testing/.", { x: 0.5, y: 4.4, w: 9, h: 0.4, fontSize: 12, color: C.accent6, objectName: "raw-note" });

// 6. Data analysis
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Data" });
s.addText("Analysis: what the baseline missed, and where users spend time", { placeholder: "title" });
tag(s, "3  DATA ANALYSIS", "an");
const gapMods = [["app/api/cron/expire-listings/route.ts", "Expiry cron"], ["lib/negotiate/safety.ts", "Safety scout"], ["lib/data/source.ts", "Data source"], ["lib/bookings.ts", "Bookings"], ["lib/negotiate/lease.ts", "Lease scout"], ["lib/finance/model.ts", "Finance model"]];
s.addChart(pres.charts.BAR, [{ name: "Baseline branch %", labels: gapMods.map((m) => m[1]), values: gapMods.map((m) => cov.baseline.perFile[m[0]]?.branches ?? 0) }], {
  x: 0.4, y: 1.15, w: 4.5, h: 3.3, barDir: "bar", chartColors: [HEX.accent3], showTitle: true, title: "Baseline branch coverage (%): the gaps",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisMaxVal: 110, valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, ...chartText, objectName: "an-gap-chart",
});
const screens = model.screens.filter((x) => x !== "START" && x !== "EXIT");
s.addChart(pres.charts.BAR, [{ name: "Expected visits", labels: screens.map(pretty), values: screens.map((x) => Number(model.expectedVisits[x].toFixed(2))) }], {
  x: 5.1, y: 1.15, w: 4.5, h: 3.3, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Usage profile: expected visits per session",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" }, ...chartText, objectName: "an-visits-chart",
});
text(s, "Low coverage pointed white-box and FSM work at the cron, bookings and data-source fallback. Feed and the deck dominate usage, so most UBST sessions go there.", { x: 0.5, y: 4.5, w: 9, h: 0.6, fontSize: 12, color: C.accent6, objectName: "an-note" });

// Findings per model group: cases now, and how many failed on the original code (round 1).
function groupFindings(fileParts, labelFor) {
  const g = new Map();
  for (const [res, key] of [[now, "cases"], [r1, "r1fail"]]) {
    for (const f of res.testResults) {
      if (!fileParts.some((p) => f.name.includes(p))) continue;
      for (const a of f.assertionResults) {
        const label = labelFor(a.ancestorTitles[0]);
        if (!label) continue;
        const row = g.get(label) ?? { cases: 0, r1fail: 0 };
        if (key === "cases") row.cases++;
        else if (a.status !== "passed") row.r1fail++;
        g.set(label, row);
      }
    }
  }
  return [...g.entries()];
}
const findingsChart = (slide, rows, { x, y, w, h, title, name }) =>
  slide.addChart(pres.charts.BAR, [
    { name: "Test cases", labels: rows.map((r) => r[0]), values: rows.map((r) => r[1].cases) },
    { name: "Failed on original code", labels: rows.map((r) => r[0]), values: rows.map((r) => r[1].r1fail) },
  ], {
    x, y, w, h, barDir: "bar", barGapWidthPct: 60, chartColors: [HEX.accent5, HEX.accent4], showTitle: true, title,
    showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", legendColor: HEX.accent6,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisHidden: true,
    valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin", ...chartText, objectName: name,
  });

// 7. FSM model
pres.addSection({ title: "Models" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Models" });
s.addText("FSM model: the booking state machine, and what it found", { placeholder: "title" });
tag(s, "4  MODELS", "fsm");
s.addImage({ path: path.join(D, "demo/booking-fsm.png"), x: 0.4, y: 1.15, w: 4.4, h: 2.44, altText: "Booking FSM: Listed, Requested, Approved, Booked, Declined, Cancelled, Stale" });
text(s, `${model.fsm.states} states | ${model.fsm.valid} valid | ${model.fsm.invalid} invalid | ${model.fsm.paths} paths | 2 races`, { x: 0.4, y: 3.68, w: 4.4, h: 0.3, fontSize: 11, bold: true, color: C.accent1, objectName: "fsm-counts" });
text(s, "8 defects (D01-D08): relisting a taken place, race loser got 500, fixture re-approved booked stays, onboarding accepted end < start. 0 tests failing now.", { x: 0.4, y: 4.02, w: 4.4, h: 0.55, fontSize: 10.5, color: C.accent6, objectName: "fsm-found" });
const FSM_GROUPS = { "live API path - valid": "Live: valid", "live API path - invalid": "Live: invalid", "live API path - sequences": "Live: paths", "live API path - concurrency": "Live: races", "fixture source - valid": "Fixture: valid", "fixture source - invalid": "Fixture: invalid" };
findingsChart(s, groupFindings(["fsm-booking-live", "fsm-booking-fixture"], (t) => Object.entries(FSM_GROUPS).find(([k]) => t.includes(k))?.[1]), {
  x: 4.95, y: 1.1, w: 4.75, h: 3.5, title: "Booking FSM: cases per model group", name: "fsm-findings-chart",
});
cmd(s, "Demo: npm run demo:fsm   |   npm run demo:fsm:onboarding", "fsm");

// 8. PT model
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Models" });
s.addText("PT model: boundary partitions, and what they found", { placeholder: "title" });
tag(s, "4  MODELS", "pt");
table(s, [
  ["Input", "Classes (valid / invalid)", "Boundary cases"],
  ["Rent vs budget", "under / 0-10% over / over 10%", "2,000 | 2,001 | 2,200 | 2,201"],
  ["Salary band", "negative, zero / each bracket", "14,600 | 14,601"],
  ["Pay period", "annual / hourly, weekly, monthly / missing", "$45.00 per hour"],
  ["Lease vs stay", "covers / gap <= 7 / gap > 7 / bad dates", "7 vs 8 days"],
  ["Walk to anchor", "<= 10 / <= 20 / > 20 min / no data", "10 | 11 | 20 | 21 min"],
  ["COL index", "low ... capped / zero, negative, NaN", "133 vs 152"],
], { x: 0.4, y: 1.15, w: 5.0, colW: [1.2, 2.3, 1.5], fontSize: 9.5, rowH: 0.34 });
text(s, "4 defects (D09-D12): hourly pay read as a yearly salary, stated budget ignored, bad and inverted dates accepted. 0 tests failing now.", { x: 0.4, y: 4.05, w: 5.0, h: 0.5, fontSize: 10.5, color: C.accent6, objectName: "pt-found" });
const PT_GROUPS = { "PT-B1": "Rent vs budget", "PT-B2": "Salary to budget", "PT-L ": "Lease vs stay", "PT-R ": "Walk to anchor", "PT-S ": "Safety flags", "PT-A ": "Roll-up", "PT-F1": "Take-home bands", "PT-F2": "COL ceiling", "PT-F3": "Offer pay period", "PT-N ": "Negotiate inputs" };
findingsChart(s, groupFindings(["pt-verdict-rules", "pt-finance"], (t) => Object.entries(PT_GROUPS).find(([k]) => t.startsWith(k))?.[1]), {
  x: 5.55, y: 1.1, w: 4.15, h: 3.5, title: "PT: cases per input dimension", name: "pt-findings-chart",
});
cmd(s, "Demo: npm run demo:pt", "pt");

// 9. CFT model
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Models" });
s.addText("CFT model: control flow graphs, one test per branch", { placeholder: "title" });
tag(s, "4  MODELS", "cft");
const nodes = [["Live mode?", 0.5], ["Fetch", 1.95], ["Response OK?", 3.4]];
nodes.forEach(([t, x], i) => {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 1.25, h: 0.6, rectRadius: 0.08, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `cfg-node-${i}` });
  text(s, t, { x, y: 1.4, w: 1.25, h: 0.6, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `cfg-label-${i}` });
  if (i < nodes.length - 1) s.addShape(pres.shapes.LINE, { x: x + 1.25, y: 1.7, w: 0.2, h: 0, line: { color: HEX.accent6, width: 1.5, endArrowType: "triangle" }, objectName: `cfg-edge-${i}` });
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 2.5, w: 4.15, h: 0.75, rectRadius: 0.08, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: "cfg-defect" });
text(s, "4xx refusal took the outage branch: fixture faked a booking (D13)", { x: 0.65, y: 2.5, w: 3.9, h: 0.75, fontSize: 12, bold: true, valign: "middle", objectName: "cfg-defect-label" });
text(s, "6 graphs: freshness planner and pass, expiry cron, transition function, performTransition, fixture/live fallback. 37 cases.", { x: 0.5, y: 3.45, w: 4.2, h: 0.9, fontSize: 12, color: C.accent6, objectName: "cft-note" });
const covMods = [["lib/sourcing/freshness.ts", "Freshness"], ["lib/negotiate/safety.ts", "Safety scout"], ["lib/negotiate/lease.ts", "Lease scout"], ["lib/bookings.ts", "Bookings"], ["lib/data/source.ts", "Data source"], ["app/api/cron/expire-listings/route.ts", "Expiry cron"]];
s.addChart(pres.charts.BAR, [
  { name: "Baseline", labels: covMods.map((m) => m[1]), values: covMods.map((m) => cov.baseline.perFile[m[0]]?.branches ?? 0) },
  { name: "With course suites", labels: covMods.map((m) => m[1]), values: covMods.map((m) => cov.all.perFile[m[0]].branches) },
], {
  x: 5.0, y: 1.2, w: 4.6, h: 3.3, barDir: "bar", chartColors: [HEX.accent5, HEX.accent1], showTitle: true, title: "Branch coverage (%)",
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", legendColor: HEX.accent6, valAxisMaxVal: 100, valAxisMinVal: 0,
  valGridLine: { color: "D5E3E5", size: 0.5 }, catGridLine: { style: "none" }, ...chartText, objectName: "cft-coverage-chart",
});
cmd(s, "Demo: npm run demo:cft", "cft", 0.5, 4.4);

// 10. Markov model
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Models" });
s.addText("Markov-OP model: a usage chain over the main screens", { placeholder: "title" });
tag(s, "4  MODELS", "mk");
const rowsShown = ["START", "FEED", "PERCHES", "LISTING", "BOOKING"];
const colsShown = ["ONBOARDING", "FEED", "PERCHES", "LISTING", "BOOKING", "NEGOTIATE", "CHIRPS", "EXIT"];
const SHORT = { START: "Start", ONBOARDING: "Onb.", FEED: "Feed", PERCHES: "Deck", LISTING: "List", BOOKING: "Book", NEGOTIATE: "Neg.", CHIRPS: "DMs", EXIT: "Exit" };
table(s, [["From \\ To", ...colsShown.map((c) => SHORT[c])], ...rowsShown.map((f) => [f === "PERCHES" ? "Deck" : pretty(f), ...colsShown.map((t) => (model.profile[f][t] ? model.profile[f][t].toFixed(2) : ""))])], {
  x: 0.4, y: 1.15, w: 5.6, colW: [0.88, ...colsShown.map(() => 0.59)], fontSize: 10, rowH: 0.36,
});
text(s, "Excerpt of the 11 x 11 transition matrix (Deck = Perches, DMs = Chirps); every row sums to 1.", { x: 0.4, y: 3.4, w: 5.6, h: 0.3, fontSize: 11, color: C.accent6, objectName: "mk-matrix-note" });
["Projected profile, validated: rows are distributions, Exit reachable, 20,000 simulated sessions match the analytic visits", "Generator draws reproducible sessions (fixed seeds)", "Executor replays each session in Chromium with a failure oracle"].forEach((t, i) => {
  s.addShape(pres.shapes.OVAL, { x: 6.25, y: 1.2 + i * 0.95, w: 0.42, h: 0.42, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: `mk-dot-${i}` });
  text(s, String(i + 1), { x: 6.25, y: 1.2 + i * 0.95, w: 0.42, h: 0.42, fontSize: 13, bold: true, align: "center", valign: "middle", objectName: `mk-num-${i}` });
  text(s, t, { x: 6.8, y: 1.15, w: 2.8, h: 0.85, fontSize: 11.5, objectName: `mk-step-${i}`, ...{ y: 1.15 + i * 0.95 } });
});
cmd(s, "Demo: npm run demo:ubst", "mk");

// 11. Test cases
pres.addSection({ title: "Tests" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Tests" });
s.addText("Test cases: one suite per technique, ids traced to the models", { placeholder: "title" });
tag(s, "5  TEST CASES", "tc");
const suiteCount = (name) => now.testResults.find((f) => f.name.endsWith(name)).assertionResults.length;
// Suites written after round 1 did not exist on the original code: shown as "-".
const r1Fail = (name) => r1.testResults.find((f) => f.name.endsWith(name))?.assertionResults.filter((a) => a.status === "failed").length;
const suites = [
  ["FSM", "fsm-booking-live, fsm-booking-fixture", ["fsm-booking-live.test.ts", "fsm-booking-fixture.test.ts"], "T valid, I invalid, P path, C race"],
  ["FSM (browser)", "onboarding-fsm.e2e", null, "OB-T01..T14", "10", "1"],
  ["PT", "pt-verdict-rules, pt-finance", ["pt-verdict-rules.test.ts", "pt-finance.test.ts"], "PB PL PR PS PA PF PN = partition rows"],
  ["CFT", "cft-branches, cft-source-fallback", ["cft-branches.test.ts", "cft-source-fallback.test.ts"], "CF-nn = one CFG edge each"],
  ["Markov-OP", "markov-profile, pilot-profile", ["markov-profile.test.ts", "pilot-profile.test.ts"], "MK, PL = model checks"],
  ["UBST", "ubst-executor + generated suites", null, "UB-nnn = one session", "240 sessions", "10 sessions"],
  ["Regression", "regression-round3, regression-d16", ["regression-round3.test.ts", "regression-d16.test.ts"], "R3, R16 = later fixes"],
];
table(s, [["Technique", "Suite", "Cases", "Failed on original code", "Id scheme"], ...suites.map(([t, n, files, ids, cases, fails]) => [t, n, cases ?? String(files.reduce((a, f) => a + suiteCount(f), 0)), fails ?? (files.every((f) => r1Fail(f) === undefined) ? "- (added later)" : String(files.reduce((a, f) => a + (r1Fail(f) ?? 0), 0))), ids])], {
  x: 0.5, y: 1.15, w: 9, colW: [1.3, 2.9, 1.2, 1.5, 2.1], fontSize: 11, rowH: 0.4,
});
text(s, "Every case with its original-code and current result: dashboard section 5.", { x: 0.5, y: 4.55, w: 9, h: 0.35, fontSize: 12, color: C.accent6, objectName: "tc-note" });

// 12. Execution
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Tests" });
s.addText("Test execution: run live, and four rounds of results", { placeholder: "title" });
tag(s, "6  EXECUTION", "ex");
table(s, [
  ["Round", "Code", "Course suites failing", "UBST sessions failing"],
  ["1", "original", `${r1.numFailedTests} of ${r1.numPassedTests + r1.numFailedTests} (+1 browser)`, `${ubst.perRound[0].defectFailures} of 60`],
  ["2", "12 defects fixed", "0", `${ubst.perRound[1].defectFailures} of 60`],
  ["3", "D07, D14, D15 fixed", "0", `${ubst.perRound[2].defectFailures} of 60`],
  ["4", "D16 fixed", `0 of ${now.numPassedTests + now.numFailedTests}`, `${ubst.perRound[3].defectFailures} of 60`],
], { x: 0.5, y: 1.15, w: 5.3, colW: [0.7, 1.7, 1.6, 1.3], fontSize: 12, rowH: 0.45 });
card(s, 6.1, 1.15, 3.4, 2.9, "ex-live-card");
text(s, "Live, one command", { x: 6.3, y: 1.3, w: 3.0, h: 0.4, fontSize: 15, bold: true, color: C.accent1, objectName: "ex-live-title" });
text(s, "npm run demo", { x: 6.3, y: 1.8, w: 3.0, h: 0.4, fontSize: 15, fontFace: "Courier New", objectName: "ex-live-cmd" });
text(s, "Walks every step: the tests by name, onboarding and 10 user sessions in a visible browser, then the summary.", { x: 6.3, y: 2.3, w: 3.0, h: 1.4, fontSize: 12, objectName: "ex-live-text" });
text(s, "Proof the tests are real: on commit bfad1d9 (original code) the course suites fail 24 times; on main they all pass.", { x: 0.5, y: 3.65, w: 5.3, h: 0.8, fontSize: 12, color: C.accent6, objectName: "ex-proof" });

// 13. Reliability
pres.addSection({ title: "Results" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("Reliability grew from 0.83 to 1.00 after fixing what UBST found", { placeholder: "title" });
tag(s, "7  RESULTS", "rel");
s.addChart(pres.charts.BAR, [{ name: "Nelson reliability", labels: ubst.perRound.map((r) => `R${r.round}`), values: ubst.perRound.map((r) => r.adjustedReliability) }], {
  x: 0.4, y: 1.15, w: 4.6, h: 3.4, barDir: "col", chartColors: [HEX.accent1], showTitle: true, title: "Reliability per round (60 sessions each)",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisMinVal: 0.5, valAxisMaxVal: 1.05, valAxisHidden: true,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, ...chartText, objectName: "ubst-reliability-chart",
});
[
  ["Round 1", "10 of 60 failed on the negotiate scouts (D15, no keys)"],
  ["Round 2", "D15 fixed; 1 failure: deck offered booking on a held listing (D16)"],
  ["Rounds 3-4", "D16 fixed; 0 of 120 failed (95% interval 0.94 to 1.00 per round)"],
].forEach(([r, t], i) => {
  card(s, 5.3, 1.2 + i * 0.85, 4.3, 0.75, `rel-card-${i}`);
  text(s, r, { x: 5.45, y: 1.2 + i * 0.85, w: 1.0, h: 0.75, fontSize: 12.5, bold: true, color: C.accent1, valign: "middle", objectName: `rel-round-${i}` });
  text(s, t, { x: 6.5, y: 1.2 + i * 0.85, w: 3.0, h: 0.75, fontSize: 11.5, valign: "middle", objectName: `rel-text-${i}` });
});
const sens = ubst.sensitivityByRound[0].variants;
const sv = (name) => sens.find((v) => v.variant.startsWith(name)).predictedReliability.toFixed(2);
text(s, `Sensitivity: booking or abandonment +/-50% moves R by < 0.01; negotiate use x0.5 / x1.5 moves it to ${sv("negotiate x0.5")} / ${sv("negotiate x1.5")}. Two driver false positives excluded (raw numbers kept).`, { x: 5.3, y: 3.85, w: 4.3, h: 0.9, fontSize: 11, color: C.accent6, objectName: "rel-sens" });

// 14. Comparison
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("16 defects, and no defect was found by two techniques", { placeholder: "title" });
tag(s, "7  RESULTS", "cmp");
table(s, [
  ["Technique", "Cases", "Defects", "High sev.", "Kind of defect found"],
  ["Baseline", "499", "0", "0", "-"],
  ["FSM / BBT", "74", "8", "0", "Event order, two actors, missing transition"],
  ["PT / BBT", "78", "4", "1", "Unusual and invalid input classes"],
  ["CFT / WBT", "37", "1", "1", "Hidden fallback branch"],
  ["Markov-OP / UBST", `${ubst.perRound.reduce((a, r) => a + r.runs, 0)} sessions`, "2", "1", "Failures on common user paths"],
  ["Walkthrough", "-", "1", "0", "Hard-coded stay dates"],
], { x: 0.5, y: 1.2, w: 9, colW: [1.9, 1.3, 0.9, 1.0, 3.9], fontSize: 12, rowH: 0.38 });
text(s, `ODC types: Checking 8, Function 3, Algorithm 2, Assignment 2, Interface 1.  All 16 fixed and retested.  Branch coverage ${cov.baseline.total.branches.toFixed(1)}% -> ${cov.all.total.branches.toFixed(1)}% (same run).`, { x: 0.5, y: 4.15, w: 9, h: 0.7, fontSize: 12, color: C.accent6, objectName: "cmp-note" });

// 15. Close
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Results" });
s.addText("What we learned, and next steps", { placeholder: "title" });
s.addText("Building the model found a defect before any test ran; the default fixture path held most FSM defects; CFT and UBST reached what black-box tests could not.\nNext: run the /pilot with 10-15 volunteers, re-run UBST on live Supabase, add data flow testing on the finance pipeline.", { placeholder: "body" });

(async () => {
  const out = path.join(D, "demo/Perch_Testing_Demo.pptx");
  await pres.writeFile({ fileName: out });
  if (SKILL) {
    const { applyTheme } = require(path.join(SKILL, "scripts/apply_theme.js"));
    await applyTheme(out, THEME);
  } else {
    console.warn("PPTX_SKILL_DIR not set: theme colors not applied");
  }
  console.log("wrote", out);
})();
