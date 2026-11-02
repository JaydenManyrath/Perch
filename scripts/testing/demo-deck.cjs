/**
 * CS 7314: build the TA demo slide deck from the saved results.
 *
 *   node scripts/testing/demo-deck.cjs   ->  docs/testing/demo/Perch_Testing_Demo.pptx
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
const cov = read("results/round3/coverage-by-technique.json");
const ubst = read("ubst/analysis.json");

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
const chartText = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", catAxisLabelColor: HEX.accent6, valAxisLabelColor: HEX.accent6, dataLabelColor: HEX.dk1, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, dataLabelFontSize: 10, titleFontSize: 12, titleColor: HEX.dk1 };

// 1. Title
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
s.addText("Testing Perch: FSM, Partition, Control Flow and Usage-Based Testing", { placeholder: "title" });
s.addText("Jayden Manyrath and Koen Gennis  |  CS 7314/5314, Fall 2026  |  Prof. Jeff Tian\nProject demo", { placeholder: "body" });
s.addNotes("Perch is our Next.js + Supabase app that helps interns find sublets, friends and events. We applied four formal techniques and compared them against the existing test suite.");

// 2. Strategy
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Introduction" });
s.addText("Each technique is matched to one kind of risk in Perch", { placeholder: "title" });
const techs = [
  ["FSM / BBT", "Order of events", "Booking lifecycle and onboarding: approve twice, relist a taken place, two interns at once"],
  ["PT / BBT", "Input domains", "Finance and verdict rules over salary, rent, dates, commute, safety flags"],
  ["CFT / WBT", "Hidden branches", "Fallback, expiry and error paths that black-box tests rarely reach"],
  ["Markov-OP / UBST", "Real usage", "Random user sessions drawn from a usage profile, replayed in a browser"],
];
techs.forEach(([name, risk, what], i) => {
  const x = 0.5 + i * 2.3;
  card(s, x, 1.35, 2.1, 2.6, `tech-card-${i}`);
  text(s, name, { x: x + 0.2, y: 1.55, w: 1.7, h: 0.5, fontSize: 16, bold: true, color: C.accent1, objectName: `tech-name-${i}` });
  text(s, risk, { x: x + 0.2, y: 2.1, w: 1.7, h: 0.4, fontSize: 13, bold: true, color: C.accent4, objectName: `tech-risk-${i}` });
  text(s, what, { x: x + 0.2, y: 2.6, w: 1.7, h: 2.0, fontSize: 12, color: C.text1, objectName: `tech-what-${i}` });
});
text(s, "Baseline for comparison: the repository's existing 499-case Vitest suite, measured before we wrote anything.", { x: 0.5, y: 4.25, w: 9, h: 0.5, fontSize: 13, color: C.accent6, objectName: "tech-baseline-note" });

// 3. Baseline
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Introduction" });
s.addText("The existing suite passed everything and found none of the defects", { placeholder: "title" });
stat(s, 0.6, 1.5, 2.6, "499", "existing test cases (baseline)", "base-tests");
stat(s, 3.6, 1.5, 2.6, "0 of 16", "defects found by the baseline", "base-defects", C.accent4);
stat(s, 6.6, 1.5, 2.8, `${cov.baseline.total.branches}%`, "branch coverage of the target modules", "base-cov");
card(s, 0.6, 3.0, 8.8, 1.1, "base-note-card");
text(s, "Never executed by the baseline: the listing-expiry cron route, the server-side booking transition, and the client's live-to-fixture fallback for bookings. That is where several of our defects were.", { x: 0.85, y: 3.2, w: 8.3, h: 0.8, fontSize: 15, objectName: "base-note" });

// 4. FSM
pres.addSection({ title: "Techniques" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Techniques" });
s.addText("FSM: the booking state machine, tested against two implementations", { placeholder: "title" });
s.addImage({ path: path.join(D, "demo/booking-fsm.png"), x: 0.4, y: 1.15, w: 5.6, h: 3.11, altText: "Booking FSM: Listed, Requested, Approved, Booked, Declined, Cancelled, Stale" });
stat(s, 6.3, 1.2, 1.6, "13 + 18", "valid + invalid transitions", "fsm-trans");
stat(s, 8.0, 1.2, 1.6, "74", "FSM test cases", "fsm-cases");
stat(s, 6.3, 2.4, 1.6, "8", "defects found", "fsm-def", C.accent4);
text(s, "Taken listing could be relisted\nRace loser got 500, not 409\nFixture re-approved booked stays\nOnboarding accepted end < start", { x: 8.0, y: 2.4, w: 1.7, h: 1.6, fontSize: 10.5, color: C.accent6, objectName: "fsm-examples" });
text(s, "Demo: npm run demo:fsm   |   HEADED=1 npm run demo:fsm:onboarding", { x: 0.5, y: 4.55, w: 9, h: 0.4, fontSize: 12, fontFace: "Courier New", color: C.accent1, objectName: "fsm-cmd" });

// 5. PT
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Techniques" });
s.addText("PT: partitions on salary, dates and budget found boundary defects", { placeholder: "title" });
const ptRows = [
  ["Pay period in the offer", "Expected", "Round 1"],
  ["Annual \"$145,000\"", "145,000", "pass"],
  ["Hourly \"$45.00 per hour\"", "93,600, flagged", "45 (D09)"],
  ["Monthly \"$8,000 per month\"", "96,000, flagged", "8,000 (D09)"],
  ["Stay dates inverted", "rejected (400)", "accepted (D11)"],
  ["Budget below salary ceiling", "stated budget used", "ignored (D10)"],
];
s.addTable(ptRows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? HEX.lt1 : (c.includes("(D") ? HEX.accent4 : HEX.dk1), fill: { color: i === 0 ? HEX.dk2 : (i % 2 ? HEX.lt2 : HEX.lt1) } } }))), {
  x: 0.5, y: 1.25, w: 5.8, colW: [2.4, 1.8, 1.6], fontSize: 12, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.5, color: "D5E3E5" }, rowH: 0.42, objectName: "pt-table",
});
stat(s, 6.8, 1.25, 2.6, "78", "partition test cases (7 inputs)", "pt-cases");
stat(s, 6.8, 2.45, 2.6, "4", "defects, incl. 1 high severity", "pt-def", C.accent4);
text(s, "All 19 hand-computed tax and rent values matched; the defects sat in the unusual classes.", { x: 6.8, y: 3.6, w: 2.7, h: 0.9, fontSize: 12, color: C.accent6, objectName: "pt-note" });
text(s, "Demo: npm run demo:pt", { x: 0.5, y: 4.55, w: 9, h: 0.4, fontSize: 12, fontFace: "Courier New", color: C.accent1, objectName: "pt-cmd" });

// 6. CFT
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Techniques" });
s.addText("CFT: forcing every branch exposed a fake success on server refusals", { placeholder: "title" });
const nodes = [["Live mode?", 0.5], ["Fetch", 1.95], ["Response OK?", 3.4]];
nodes.forEach(([t, x], i) => {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 1.25, h: 0.6, rectRadius: 0.08, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `cfg-node-${i}` });
  text(s, t, { x, y: 1.4, w: 1.25, h: 0.6, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `cfg-label-${i}` });
  if (i < nodes.length - 1) s.addShape(pres.shapes.LINE, { x: x + 1.25, y: 1.7, w: 0.2, h: 0, line: { color: HEX.accent6, width: 1.5, endArrowType: "triangle" }, objectName: `cfg-edge-${i}` });
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 2.5, w: 4.15, h: 0.75, rectRadius: 0.08, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: "cfg-defect" });
text(s, "4xx refusal took the outage branch: fixture faked a booking (D13)", { x: 0.65, y: 2.5, w: 3.9, h: 0.75, fontSize: 12, bold: true, color: C.text1, valign: "middle", objectName: "cfg-defect-label" });
text(s, "37 CFT cases over 6 control flow graphs. Fixed: a refusal now reaches the user; real outages still fall back.", { x: 0.5, y: 3.45, w: 4.2, h: 0.9, fontSize: 12, color: C.accent6, objectName: "cft-note" });
const covMods = [["lib/sourcing/freshness.ts", "Freshness"], ["lib/negotiate/safety.ts", "Safety scout"], ["lib/negotiate/lease.ts", "Lease scout"], ["lib/bookings.ts", "Bookings"], ["lib/data/source.ts", "Data source"], ["app/api/cron/expire-listings/route.ts", "Expiry cron"]];
s.addChart(pres.charts.BAR, [
  { name: "Baseline", labels: covMods.map((m) => m[1]), values: covMods.map((m) => cov.baseline.perFile[m[0]]?.branches ?? 0) },
  { name: "With course suites", labels: covMods.map((m) => m[1]), values: covMods.map((m) => cov.all.perFile[m[0]].branches) },
], {
  x: 5.0, y: 1.2, w: 4.6, h: 3.3, barDir: "bar", chartColors: [HEX.accent5, HEX.accent1], showTitle: true, title: "Branch coverage (%)",
  showLegend: true, legendPos: "b", legendFontSize: 10, legendFontFace: "+mn-lt", legendColor: HEX.accent6, valAxisMaxVal: 100, valAxisMinVal: 0,
  valGridLine: { color: "D5E3E5", size: 0.5 }, catGridLine: { style: "none" }, showValue: false, ...chartText, objectName: "cft-coverage-chart",
});
text(s, "Demo: npm run demo:cft", { x: 0.5, y: 4.55, w: 4.4, h: 0.4, fontSize: 12, fontFace: "Courier New", color: C.accent1, objectName: "cft-cmd" });

// 7. UBST method
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Techniques" });
s.addText("UBST: random user sessions from a Markov chain, replayed in a browser", { placeholder: "title" });
const visits = read("../testing/ubst/suite-round1.json").screens;
s.addChart(pres.charts.BAR, [{ name: "Expected visits per session", labels: visits.map((v) => v.screen[0] + v.screen.slice(1).toLowerCase()), values: visits.map((v) => v.expectedVisitsPerSession) }], {
  x: 0.4, y: 1.15, w: 4.8, h: 3.4, barDir: "bar", chartColors: [HEX.accent1], showTitle: true, title: "Projected profile: expected visits per session",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valGridLine: { style: "none" }, catGridLine: { style: "none" }, valAxisHidden: true, ...chartText, objectName: "ubst-profile-chart",
});
const steps = ["Markov chain over 9 screens (projected profile)", "Draw 60 random sessions per round", "Executor replays each in Chromium", "Oracle: wrong screen, page exception, 5xx, feature error"];
steps.forEach((t, i) => {
  s.addShape(pres.shapes.OVAL, { x: 5.6, y: 1.3 + i * 0.8, w: 0.45, h: 0.45, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: `ubst-step-dot-${i}` });
  text(s, String(i + 1), { x: 5.6, y: 1.3 + i * 0.8, w: 0.45, h: 0.45, fontSize: 14, bold: true, align: "center", valign: "middle", objectName: `ubst-step-num-${i}` });
  text(s, t, { x: 6.2, y: 1.3 + i * 0.8, w: 3.4, h: 0.5, fontSize: 13, valign: "middle", objectName: `ubst-step-${i}` });
});
text(s, "Demo: HEADED=1 npm run demo:ubst", { x: 5.6, y: 4.55, w: 4, h: 0.4, fontSize: 12, fontFace: "Courier New", color: C.accent1, objectName: "ubst-cmd" });

// 8. Reliability
pres.addSection({ title: "Results" });
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("Reliability grew from 0.83 to 1.00 after fixing what UBST found", { placeholder: "title" });
s.addChart(pres.charts.BAR, [{ name: "Nelson reliability", labels: ubst.perRound.map((r) => `Round ${r.round}`), values: ubst.perRound.map((r) => r.adjustedReliability) }], {
  x: 0.4, y: 1.15, w: 4.6, h: 3.4, barDir: "col", chartColors: [HEX.accent1], showTitle: true, title: "Sessions without failure (60 per round)",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisMinVal: 0.5, valAxisMaxVal: 1.05, valAxisHidden: true,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, ...chartText, objectName: "ubst-reliability-chart",
});
const rel = [
  ["Round 1", "10 of 60 failed on the negotiate scouts (D15, no keys)"],
  ["Round 2", "D15 fixed; 1 failure: deck offers booking on a held listing (D16, open)"],
  ["Round 3", "0 of 60 failed (95% interval 0.94 to 1.00)"],
];
rel.forEach(([r, t], i) => {
  card(s, 5.3, 1.2 + i * 0.85, 4.3, 0.75, `rel-card-${i}`);
  text(s, r, { x: 5.45, y: 1.2 + i * 0.85, w: 0.9, h: 0.75, fontSize: 13, bold: true, color: C.accent1, valign: "middle", objectName: `rel-round-${i}` });
  text(s, t, { x: 6.35, y: 1.2 + i * 0.85, w: 3.15, h: 0.75, fontSize: 11.5, valign: "middle", objectName: `rel-text-${i}` });
});
const sens = ubst.sensitivityByRound[0].variants;
const sv = (name) => sens.find((v) => v.variant.startsWith(name)).predictedReliability.toFixed(2);
text(s, `Sensitivity: booking or abandonment +/-50% moves R by < 0.01; negotiate use x0.5 / x1.5 moves it to ${sv("negotiate x0.5")} / ${sv("negotiate x1.5")}. Two driver false positives excluded (raw numbers kept).`, { x: 5.3, y: 3.85, w: 4.3, h: 0.9, fontSize: 11, color: C.accent6, objectName: "rel-sens" });

// 9. Comparison
s = pres.addSlide({ masterName: "CONTENT", sectionTitle: "Results" });
s.addText("16 defects, and no defect was found by two techniques", { placeholder: "title" });
const cmp = [
  ["Technique", "Cases", "Defects", "High sev.", "Kind of defect found"],
  ["Baseline", "499", "0", "0", "-"],
  ["FSM / BBT", "74", "8", "0", "Event order, two actors, missing transition"],
  ["PT / BBT", "78", "4", "1", "Unusual and invalid input classes"],
  ["CFT / WBT", "37", "1", "1", "Hidden fallback branch"],
  ["Markov-OP / UBST", "180 sessions", "2", "1", "Failures on common user paths"],
  ["Walkthrough", "-", "1", "0", "Hard-coded stay dates"],
];
s.addTable(cmp.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? HEX.lt1 : HEX.dk1, fill: { color: i === 0 ? HEX.dk2 : (i % 2 ? HEX.lt2 : HEX.lt1) } } }))), {
  x: 0.5, y: 1.2, w: 9, colW: [1.9, 1.3, 0.9, 1.0, 3.9], fontSize: 12, fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.5, color: "D5E3E5" }, rowH: 0.38, objectName: "cmp-table",
});
text(s, "ODC types: Checking 8, Function 3, Algorithm 2, Assignment 2, Interface 1.  15 fixed and retested; D16 open (design decision).  Course-suite failures: 25 in round 1, 0 now.", { x: 0.5, y: 4.15, w: 9, h: 0.7, fontSize: 12, color: C.accent6, objectName: "cmp-note" });

// 10. Demo and next steps
s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Results" });
s.addText("Live demo and next steps", { placeholder: "title" });
s.addText("npm run demo:summary prints every result on one screen.\nNext: run the opt-in pilot (/pilot) with 10-15 volunteers to replace the projected profile, re-run UBST against live Supabase, and add data flow testing on the finance pipeline.", { placeholder: "body" });

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
