/**
 * CS 7314: build the demo slide deck from the saved results.
 *
 * Written for a 15-minute slot: about 10 minutes of slides, kept high level so a
 * non-specialist can follow, then a few minutes of live testing at the end (npm run demo).
 * The slides carry what the TA asked us to bring: documentation, diagrams, test cases,
 * collected data, and results with screenshots of a real run. Backup slides at the end
 * hold the detail for questions.
 *
 *   npx tsx scripts/testing/demo-dashboard.ts   (writes model-data.json the deck reads)
 *   node scripts/testing/demo-deck.cjs          ->  docs/testing/demo/Perch_Testing_Demo.pptx
 *
 * Screenshots live in docs/testing/demo/img (app screens, and terminal captures of the
 * demo steps run on Nov 19 2026). The committed deck is final; rebuilding needs pptxgenjs
 * (npm i --no-save pptxgenjs). PPTX_SKILL_DIR, when set, points at a helper that writes the
 * theme colors into the file; without it the deck falls back to Office's stock palette.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const SKILL = process.env.PPTX_SKILL_DIR;
const D = "docs/testing/";
const IMG = (f) => path.join(D, "demo/img", f);
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
pres.title = "How We Tested Perch";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: HEX.dk1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.1, w: 8.8, h: 1.6, fontSize: 34, bold: true, color: C.background1, align: "left", valign: "bottom" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.9, w: 8.8, h: 2.2, fontSize: 16, color: C.accent5, align: "left", valign: "top" }, text: "" } },
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

const card = (slide, x, y, w, h, name, color = C.background2) =>
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color }, line: { color }, objectName: name });
const text = (slide, t, o) => slide.addText(t, { isTextBox: true, fontSize: 14, color: C.text1, margin: 0, valign: "top", ...o });
const stat = (slide, x, y, w, big, label, name, color = C.accent1) => {
  text(slide, big, { x, y, w, h: 0.7, fontSize: 36, bold: true, color, fontFace: THEME.headFontFace, objectName: `${name}-value` });
  text(slide, label, { x, y: y + 0.72, w, h: 0.6, fontSize: 12, color: C.accent6, objectName: `${name}-label` });
};
// What the TA asked for that this slide covers, top right.
const tag = (slide, label, name) =>
  text(slide, label, { x: 6.2, y: 0.08, w: 3.3, h: 0.25, fontSize: 9, bold: true, color: C.accent3, align: "right", objectName: `${name}-tag` });
const note = (slide, t, name, o = {}) => text(slide, t, { x: 0.5, y: 4.75, w: 9, h: 0.4, fontSize: 12, color: C.accent6, objectName: `${name}-note`, ...o });
const table = (slide, rows, opts) =>
  slide.addTable(
    rows.map((r, i) => r.map((c) => ({ text: String(c), options: { bold: i === 0, color: i === 0 ? HEX.lt1 : /^Failed/.test(String(c)) ? HEX.accent4 : HEX.dk1, fill: { color: i === 0 ? HEX.dk2 : i % 2 ? HEX.lt2 : HEX.lt1 } } }))),
    { fontFace: THEME.bodyFontFace, border: { type: "solid", pt: 0.5, color: "D5E3E5" }, valign: "middle", ...opts },
  );
const chartText = { catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", titleFontFace: "+mn-lt", catAxisLabelColor: HEX.accent6, valAxisLabelColor: HEX.accent6, dataLabelColor: HEX.dk1, catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, dataLabelFontSize: 11, titleFontSize: 12, titleColor: HEX.dk1 };
const plainBar = (slide, labels, values, o) =>
  slide.addChart(pres.charts.BAR, [{ name: o.series ?? "value", labels, values }], {
    barDir: "bar", showLegend: false, showValue: true, dataLabelPosition: "outEnd", valAxisHidden: true,
    valGridLine: { style: "none" }, catGridLine: { style: "none" }, catAxisOrientation: "maxMin", showTitle: true, ...chartText, ...o,
  });
// A straight arrow from (x1, y1) to (x2, y2); pptxgenjs wants a positive box plus flips.
const arrow = (slide, x1, y1, x2, y2, color, name, width = 1.2) =>
  slide.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1, line: { color, width, endArrowType: "triangle" }, objectName: name });
const img = (slide, file, x, y, h, ratio, alt) => slide.addImage({ path: IMG(file), x, y, h, w: h * ratio, altText: alt });
const ratioOf = (file) => {
  const b = fs.readFileSync(IMG(file)); // PNG: width and height at bytes 16-23
  return b.readUInt32BE(16) / b.readUInt32BE(20);
};

// The four methods in plain words, with the course name underneath.
const METHODS = [
  ["Step-by-step flows", "State machine testing (FSM)", "Does every order of actions work? Approve twice, book a place that is already taken, two people at once."],
  ["Edge-case inputs", "Partition testing (PT)", "Numbers and dates right at the limits: $2,000 vs $2,001 rent, \"$45 per hour\", dates entered backwards."],
  ["Every code path", "Control flow testing (CFT)", "Force every branch in the code, including error and backup paths that normal use rarely reaches."],
  ["Real user behavior", "Usage-based testing (Markov model)", "Simulated users click through the app the way we expect real interns to, in a real browser."],
];

// 1. Title
let s = pres.addSlide({ masterName: "TITLE_DARK" });
s.addText("How We Tested Perch", { placeholder: "title" });
s.addText("Four testing methods, 16 problems found and fixed\n\nJayden Manyrath and Koen Gennis  |  CS 7314/5314, Fall 2026", { placeholder: "body" });
s.addNotes("JAYDEN (20 s). We tested Perch, an app we built, with four testing methods from the course and compared them with the tests the app already had. We'll walk through the slides for about ten minutes, then run some of the tests live.");

// 2. System under test
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Perch: a housing and social app for summer interns", { placeholder: "title" });
tag(s, "SYSTEM UNDER TEST", "sys");
text(s, [
  { text: "What interns do in it", options: { bold: true, color: C.accent1, breakLine: true } },
  { text: "Upload an offer letter; the app works out pay and a rent budget", options: { bullet: true, breakLine: true } },
  { text: "Swipe through sublets and request to book one", options: { bullet: true, breakLine: true } },
  { text: "Check if a place fits the budget, lease dates and commute", options: { bullet: true, breakLine: true } },
  { text: "Find events and other interns in the city", options: { bullet: true, breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "We tested it with built-in sample data, so tests are repeatable and never touch real users.", options: { color: C.accent6, fontSize: 12 } },
], { x: 0.5, y: 1.2, w: 3.3, h: 3.6, fontSize: 13.5, paraSpaceAfter: 4 });
["app-home.png", "app-feed.png", "app-deck.png"].forEach((f, i) => img(s, f, 4.0 + i * 1.88, 1.15, 3.6, 0.5, ["Perch welcome screen", "Event feed", "Sublet swipe deck"][i]));
s.addNotes("JAYDEN (50 s). Perch helps interns moving for a summer job. These are real screenshots: the welcome screen, the event feed, and the deck of sublets you swipe through and book. The risky parts are booking, the money and date rules, and the code that falls back when something goes wrong. Those are what we tested.");

// 3. Starting point and the plan
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("The starting point: 499 tests, all passing, none caught a problem", { placeholder: "title" });
tag(s, "APPROACH", "base");
stat(s, 0.5, 1.2, 2.6, "499", "tests the app already had; all passed", "base-tests");
stat(s, 0.5, 2.5, 2.6, "0 of 16", "problems we later found that those tests caught", "base-caught", C.accent4);
stat(s, 0.5, 3.8, 2.6, `${Math.round(cov.baseline.total.branches)}%`, "of decision points in the riskiest code that they reached", "base-cov", C.accent3);
METHODS.forEach(([name, formal, what], i) => {
  const x = 3.4 + (i % 2) * 3.1, y = 1.15 + Math.floor(i / 2) * 1.8;
  card(s, x, y, 2.95, 1.65, `m-card-${i}`);
  text(s, name, { x: x + 0.15, y: y + 0.1, w: 2.65, h: 0.32, fontSize: 15, bold: true, color: C.accent1, objectName: `m-name-${i}` });
  text(s, formal, { x: x + 0.15, y: y + 0.42, w: 2.65, h: 0.25, fontSize: 10, color: C.accent3, objectName: `m-formal-${i}` });
  text(s, what, { x: x + 0.15, y: y + 0.72, w: 2.65, h: 0.9, fontSize: 11, objectName: `m-what-${i}` });
});
s.addNotes("JAYDEN (60 s). Passing tests don't mean the app is right. The 499 existing tests all passed, but caught none of the 16 problems we found. So we used four methods, each aimed at a different kind of mistake: the order of actions, edge-case numbers and dates, hidden code paths, and how real users move through the app. The existing tests are our baseline for comparison.");

// 4. Collected data
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Collected data: where our test ideas came from", { placeholder: "title" });
tag(s, "COLLECTED DATA AND ANALYSIS", "data");
table(s, [
  ["Method", "What we collected", "How"],
  ["Step-by-step flows", "The app's written booking rules, the 8 onboarding screens", "Read the spec; walked the app"],
  ["Edge-case inputs", "Tax brackets, rent limits (10% over budget), lease and commute limits", "Right answers worked out by hand"],
  ["Every code path", "The code of the 14 riskiest files", "Traced every decision into 6 diagrams"],
  ["Real user behavior", "How often users move from each screen to the next", "Team estimates of the user journey"],
  ["Baseline", "The 499 existing tests", "Ran them and measured what they reach"],
], { x: 0.4, y: 1.15, w: 5.4, colW: [1.45, 2.35, 1.6], fontSize: 10.5, rowH: 0.5 });
const gapMods = [["app/api/cron/expire-listings/route.ts", "Listing expiry"], ["lib/negotiate/safety.ts", "Safety check"], ["lib/data/source.ts", "Data fallback"], ["lib/bookings.ts", "Bookings"], ["lib/negotiate/lease.ts", "Lease check"], ["lib/finance/model.ts", "Finance"]];
plainBar(s, gapMods.map((m) => m[1]), gapMods.map((m) => Math.round(cov.baseline.perFile[m[0]]?.branches ?? 0)), {
  x: 6.0, y: 1.1, w: 3.6, h: 3.3, chartColors: [HEX.accent4], title: "Analysis: how much the old tests reached (%)", valAxisMaxVal: 115, dataLabelFormatCode: "0",
});
note(s, "The gaps told us where to aim: bookings, the backup path and the expiry job.", "data", { x: 0.4, y: 4.6 });
s.addNotes("KOEN (60 s). Every model is built from data we collected: the written rules, hand-calculated numbers, the code itself, and an estimate of how users move through the app. Perch has no real users yet, so the journey is our estimate; we built an opt-in logger to collect real data later. The chart is our analysis of the baseline: the old tests barely reached the bookings and backup code, so that's where we focused.");

// 5. Diagram: booking flow
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Diagram 1: the booking flow, as a state machine", { placeholder: "title" });
tag(s, "DIAGRAMS / MODELS", "fsm");
img(s, "../booking-fsm.png", 0.3, 1.1, 3.3, ratioOf("../booking-fsm.png"), "Booking flow: Listed, Requested, Approved, Booked, Declined, Cancelled, Stale");
card(s, 6.35, 1.15, 3.25, 2.7, "fsm-card");
text(s, [
  { text: "How we used it", options: { bold: true, color: C.accent1, breakLine: true } },
  { text: `Tested all ${model.fsm.valid} allowed steps (arrows)`, options: { bullet: true, breakLine: true } },
  { text: `Tried ${model.fsm.invalid} steps that must be refused, e.g.:`, options: { bullet: true, breakLine: true } },
  { text: "approve a booking twice", options: { bullet: { indent: 15 }, indentLevel: 1, breakLine: true } },
  { text: "relist a place already booked", options: { bullet: { indent: 15 }, indentLevel: 1, breakLine: true } },
  { text: "two interns request at the same instant", options: { bullet: { indent: 15 }, indentLevel: 1, breakLine: true } },
  { text: "Found 8 problems", options: { bullet: true, bold: true, color: C.accent4 } },
], { x: 6.5, y: 1.3, w: 3.0, h: 3.1, fontSize: 12, paraSpaceAfter: 3 });
note(s, "Drawing the diagram found a problem before any test ran: the rules let an intern cancel, but the app had no way to do it.", "fsm", { y: 4.6 });
s.addNotes("JAYDEN (60 s). Booking a place goes through these stages. The arrows are the steps the rules allow. We tested every arrow, and also tried steps that should be refused, like booking a place someone already has. This found 8 problems; for example a booked place could be put back on the market. Just drawing this found one: cancelling was in the rules but not in the app.");

// 6. Diagrams: edge cases and code paths
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Diagrams 2 and 3: edge cases and code paths", { placeholder: "title" });
tag(s, "DIAGRAMS / MODELS", "pc");
text(s, "Edge-case inputs: rent against a $2,000 budget", { x: 0.5, y: 1.15, w: 4.4, h: 0.3, fontSize: 13, bold: true, color: C.accent1, objectName: "pt-head" });
[["Fits", "up to $2,000", HEX.accent1, 1.6], ["A bit over", "$2,001-$2,200", HEX.accent2, 1.2], ["Too much", "$2,201+", HEX.accent4, 1.5]].forEach(([l, r, col, w], i, arr) => {
  const x = 0.5 + arr.slice(0, i).reduce((a, q) => a + q[3], 0);
  s.addShape(pres.shapes.RECTANGLE, { x, y: 1.6, w, h: 0.55, fill: { color: col }, line: { color: HEX.lt1, width: 1.5 }, objectName: `pt-band-${i}` });
  text(s, l, { x, y: 1.6, w, h: 0.55, fontSize: 12, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `pt-band-l-${i}` });
  text(s, r, { x, y: 2.2, w, h: 0.3, fontSize: 10.5, color: C.accent6, align: "center", objectName: `pt-band-r-${i}` });
});
text(s, "We test both sides of every line: $2,000 and $2,001, $2,200 and $2,201. The same for salary, lease gaps (7 vs 8 days) and walking time (10, 11, 20, 21 min).", { x: 0.5, y: 2.65, w: 4.3, h: 1.0, fontSize: 11.5, objectName: "pt-text" });
text(s, "Found 4 problems, e.g. \"$45 per hour\" was read as $45 a year.", { x: 0.5, y: 3.75, w: 4.3, h: 0.5, fontSize: 11.5, bold: true, color: C.accent4, objectName: "pt-found" });
s.addShape(pres.shapes.LINE, { x: 5.05, y: 1.2, w: 0, h: 3.2, line: { color: "D5E3E5", width: 1 }, objectName: "pc-divider" });
text(s, "Every code path: what happens when you book", { x: 5.25, y: 1.15, w: 4.4, h: 0.3, fontSize: 13, bold: true, color: C.accent1, objectName: "cft-head" });
const flow = [["Send request", 1.55, HEX.accent1], ["Server says yes?", 2.25, HEX.accent1]];
flow.forEach(([t, y, col], i) => {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.45, y, w: 1.9, h: 0.45, rectRadius: 0.08, fill: { color: col }, line: { color: col }, objectName: `cft-node-${i}` });
  text(s, t, { x: 6.45, y, w: 1.9, h: 0.45, fontSize: 11, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `cft-node-l-${i}` });
});
s.addShape(pres.shapes.LINE, { x: 7.4, y: 2.0, w: 0, h: 0.25, line: { color: HEX.accent6, width: 1.5, endArrowType: "triangle" }, objectName: "cft-e0" });
[["Yes: booked", 5.25, HEX.accent3], ["No answer: use backup", 6.95, HEX.accent3], ["Refused: show why", 8.5, HEX.accent2]].forEach(([t, x, col], i) => {
  arrow(s, 7.4, 2.7, x + 0.55, 3.05, HEX.accent6, `cft-e${i + 1}`);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 3.05, w: 1.1, h: 0.6, rectRadius: 0.08, fill: { color: col }, line: { color: col }, objectName: `cft-leaf-${i}` });
  text(s, t, { x, y: 3.05, w: 1.1, h: 0.6, fontSize: 9.5, bold: true, color: i === 2 ? C.text1 : C.background1, align: "center", valign: "middle", objectName: `cft-leaf-l-${i}` });
});
text(s, "One test per branch. A refusal used to take the backup branch and show a fake \"booked\" (fixed).", { x: 5.25, y: 3.8, w: 4.4, h: 0.6, fontSize: 11.5, bold: true, color: C.accent4, objectName: "cft-found" });
s.addNotes("KOEN (60 s). Left: for numbers and dates we split each input into ranges and test right at each edge, because mistakes cluster at the edges. That found 4 problems; the worst was an hourly wage read as a yearly salary, so every listing looked unaffordable. Right: we drew the code's decisions as a flow chart and wrote one test for every branch. When the server refused a booking, the app took the wrong branch and showed a fake success.");

// 7. Diagram: user journey
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Diagram 4: the user journey we simulate", { placeholder: "title" });
tag(s, "DIAGRAMS / COLLECTED DATA", "mk");
const P = model.profile;
const pct = (a, b) => `${Math.round(P[a][b] * 100)}%`;
const path1 = [["START", "Open app"], ["ONBOARDING", "Onboarding"], ["FEED", "Event feed"], ["PERCHES", "Sublet deck"], ["LISTING", "A listing"], ["BOOKING", "Book it"]];
path1.forEach(([k, label], i) => {
  const x = 0.4 + i * 1.55;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.5, w: 1.2, h: 0.6, rectRadius: 0.1, fill: { color: i === 5 ? HEX.accent2 : HEX.accent1 }, line: { color: i === 5 ? HEX.accent2 : HEX.accent1 }, objectName: `mk-node-${i}` });
  text(s, label, { x, y: 1.5, w: 1.2, h: 0.6, fontSize: 11.5, bold: true, color: i === 5 ? C.text1 : C.background1, align: "center", valign: "middle", objectName: `mk-label-${i}` });
  if (i < path1.length - 1) {
    s.addShape(pres.shapes.LINE, { x: x + 1.2, y: 1.8, w: 0.35, h: 0, line: { color: HEX.accent6, width: 1.5, endArrowType: "triangle" }, objectName: `mk-edge-${i}` });
    text(s, pct(k, path1[i + 1][0]), { x: x + 1.12, y: 1.25, w: 0.5, h: 0.25, fontSize: 10.5, bold: true, color: C.accent6, align: "center", objectName: `mk-p-${i}` });
  }
});
[["MAP", "Map"], ["CHIRPS", "Messages"], ["NEST", "Profile"]].forEach(([k, label], i) => {
  const x = 2.4 + i * 1.35;
  arrow(s, 3.7, 2.1, x + 0.55, 2.6, HEX.accent5, `mk-side-e-${i}`);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 2.6, w: 1.1, h: 0.45, rectRadius: 0.1, fill: { color: HEX.lt2 }, line: { color: HEX.accent5 }, objectName: `mk-side-${i}` });
  text(s, `${label} ${pct("FEED", k)}`, { x, y: 2.6, w: 1.1, h: 0.45, fontSize: 10.5, align: "center", valign: "middle", objectName: `mk-side-l-${i}` });
});
text(s, "From every screen there is also a chance to leave the app (15-30%).", { x: 0.4, y: 3.25, w: 5.6, h: 0.3, fontSize: 11, color: C.accent6, objectName: "mk-exit" });
text(s, "We randomly generate visits that follow these odds and replay each one in a real browser: 240 visits over 4 rounds. A visit fails if a screen doesn't load, the page crashes, or a feature shows an error.", { x: 0.4, y: 3.65, w: 5.6, h: 0.9, fontSize: 12, objectName: "mk-how" });
const vs = ["FEED", "PERCHES", "LISTING", "CHIRPS", "MAP", "BOOKING"];
const nice = { FEED: "Event feed", PERCHES: "Sublet deck", LISTING: "Listing", CHIRPS: "Messages", MAP: "Map", BOOKING: "Booking" };
plainBar(s, vs.map((v) => nice[v]), vs.map((v) => Number(model.expectedVisits[v].toFixed(1))), {
  x: 6.3, y: 2.3, w: 3.4, h: 2.4, chartColors: [HEX.accent1], title: "Visits per session (from the model)", dataLabelFormatCode: "0.0", valAxisMaxVal: 1.9,
});
s.addNotes("JAYDEN (50 s). To test what users actually do, we modeled the journey. From each screen, these are the odds of going to the next one; they're our estimates, since there are no real users yet. The computer generates random visits with these odds and plays each one in a real browser. Most time goes to the feed and the sublet deck, so most testing goes there too.");

// 8. Test cases
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Test cases: examples, and the full suite", { placeholder: "title" });
tag(s, "TEST CASES", "tc");
table(s, [
  ["Test", "What it does", "Should happen", "Original app", "Now"],
  ["I13", "Relist a place that is already booked", "Refused", "Failed", "Pass"],
  ["C01", "Two interns request the same place at once", "One wins; other told it's taken", "Failed (server error)", "Pass"],
  ["PB-03", "Rent $2,001 on a $2,000 budget", "Flagged as a bit over", "Pass", "Pass"],
  ["PF-23", "Offer letter says \"$45.00 per hour\"", "About $93,600 a year", "Failed ($45/yr)", "Pass"],
  ["PN-04", "Move-out date before move-in", "Rejected", "Failed", "Pass"],
  ["CF-35", "Server refuses a booking", "Show the refusal", "Failed (fake success)", "Pass"],
  ["OB-T12", "Onboarding: end date before start date", "Can't continue", "Failed", "Pass"],
], { x: 0.4, y: 1.1, w: 6.3, colW: [0.7, 2.2, 1.45, 1.25, 0.7], fontSize: 10, rowH: 0.42 });
const suiteCount = (...names) => names.reduce((a, n) => a + now.testResults.find((f) => f.name.endsWith(n)).assertionResults.length, 0);
const counts = [
  ["Step-by-step flows", suiteCount("fsm-booking-live.test.ts", "fsm-booking-fixture.test.ts") + 10],
  ["Edge-case inputs", suiteCount("pt-verdict-rules.test.ts", "pt-finance.test.ts")],
  ["Every code path", suiteCount("cft-branches.test.ts", "cft-source-fallback.test.ts")],
  ["Simulated user visits", ubst.perRound.reduce((a, r) => a + r.runs, 0)],
];
plainBar(s, counts.map((c) => c[0]), counts.map((c) => c[1]), { x: 6.85, y: 1.1, w: 2.85, h: 2.6, chartColors: [HEX.accent1], title: "New tests by method", dataLabelFormatCode: "0", valAxisMaxVal: 300 });
text(s, "Each test has an ID that points back to its diagram, and a right answer decided before running it.", { x: 6.9, y: 3.8, w: 2.75, h: 0.9, fontSize: 11, color: C.accent6, objectName: "tc-ids" });
s.addNotes("KOEN (60 s). Here are real test cases. Each one does one thing, says what should happen, and the ID ties it back to a diagram: I is a refused step in the booking flow, PB and PF are edge-case ranges, CF is a code branch, OB is onboarding. The original app failed most of these; today they all pass. The full suite is about 190 new tests plus 240 simulated user visits.");

// 9. Execution: test runs
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Running the tests: every check passes on the fixed app", { placeholder: "title" });
tag(s, "TEST EXECUTION (SCREENSHOTS, NOV 19)", "ex");
img(s, "run-tests.png", 0.4, 1.1, 3.4, ratioOf("run-tests.png"), "Terminal: booking-flow, edge-case, code-path and baseline tests all passing");
img(s, "app-onboarding-review.png", 4.65, 1.1, 3.0, 0.5, "Onboarding review screen during the browser test");
text(s, [
  { text: "Browser test", options: { bold: true, color: C.accent1, breakLine: true } },
  { text: "A robot fills in onboarding like a user: 13 of 13 checks passed.", options: { breakLine: true } },
  { text: " ", options: { breakLine: true } },
  { text: "On the original code", options: { bold: true, color: C.accent4, breakLine: true } },
  { text: `${r1.numFailedTests} of these tests failed. Each failure led to a fix, then a rerun.` },
], { x: 6.3, y: 1.15, w: 3.3, h: 3.0, fontSize: 12 });
note(s, "We ran 4 rounds: test, fix, retest. Live in a few minutes: the same commands.", "ex", { y: 4.65 });
s.addNotes("KOEN (40 s). These are screenshots from today's run. Each command runs one method's tests: booking flow, edge cases, code paths, and the original 499. Everything passes now. On the original code, 24 of these failed, which is how we know they catch real problems. On the right is the browser test filling in onboarding like a real user.");

// 10. Reliability
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Simulated users: reliability rose from 83% to 100%", { placeholder: "title" });
tag(s, "RESULTS", "rel");
s.addChart(pres.charts.BAR, [{ name: "Visits without a failure", labels: ubst.perRound.map((r) => `Round ${r.round}`), values: ubst.perRound.map((r) => Math.round(r.adjustedReliability * 100)) }], {
  x: 0.4, y: 1.1, w: 4.4, h: 3.3, barDir: "col", chartColors: [HEX.accent1], showTitle: true, title: "Visits with no failure (%), 60 per round",
  showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0\"%\"", valAxisMinVal: 50, valAxisMaxVal: 108, valAxisHidden: true,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, ...chartText,
});
img(s, "run-ubst.png", 5.1, 1.15, 2.6, ratioOf("run-ubst.png"), "Terminal: 10 simulated user visits, 0 failed");
text(s, "Round 1: the housing check broke on sample data (fixed). Round 2: the deck offered places already taken (fixed). Rounds 3-4: 120 visits, 0 failures.", { x: 5.1, y: 3.9, w: 4.5, h: 0.8, fontSize: 11.5, objectName: "rel-text" });
s.addNotes("JAYDEN (50 s). Each round we ran 60 simulated visits. In round 1, 1 in 6 failed: the housing check broke whenever the app ran on sample data. We fixed it, and round 2 found one more problem: the deck offered places someone else already held. After that fix, 120 visits in a row passed. The screenshot is today's run of 10 visits. We also checked how much this depends on our usage estimates; it moves the number a little, not the trend.");

// 11. Defects found
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("16 problems found and fixed; the old tests found none", { placeholder: "title" });
tag(s, "RESULTS AND ANALYSIS", "res");
plainBar(s, ["Old tests (baseline)", "Step-by-step flows", "Edge-case inputs", "Every code path", "Real user behavior", "Our own walkthrough"], [0, 8, 4, 1, 2, 1], {
  x: 0.4, y: 1.1, w: 4.6, h: 3.4, chartColors: [HEX.accent4], title: "Problems found, by method", dataLabelFormatCode: "0", valAxisMaxVal: 9.5,
});
[
  ["Worst money bug", "\"$45 per hour\" was read as $45 a year, so every place looked unaffordable."],
  ["Worst booking bug", "When the server refused a booking, the app showed a fake \"booked\"."],
  ["Missing checks", "Half the problems were rules the app didn't enforce everywhere, e.g. dates entered backwards."],
].forEach(([h, t], i) => {
  card(s, 5.25, 1.15 + i * 1.12, 4.35, 1.0, `res-card-${i}`);
  text(s, h, { x: 5.4, y: 1.22 + i * 1.12, w: 4.1, h: 0.3, fontSize: 12.5, bold: true, color: C.accent1, objectName: `res-h-${i}` });
  text(s, t, { x: 5.4, y: 1.52 + i * 1.12, w: 4.1, h: 0.6, fontSize: 11.5, objectName: `res-t-${i}` });
});
note(s, "No problem was found by two methods: each one catches a different kind of mistake.", "res", { y: 4.6 });
s.addNotes("KOEN (50 s). Altogether 16 problems, all fixed and retested, and the original tests caught zero. The booking-flow method found the most. No problem was found twice, so each method earned its place. Three were serious, like these two. Half were rules the app didn't check everywhere. The code-path tests also raised how much of the risky code is tested, from 77 to 83 percent.");

// 12. Takeaways
s = pres.addSlide({ masterName: "TITLE_DARK" });
s.addText("What we learned", { placeholder: "title" });
s.addText([
  { text: "Passing tests are not proof: 499 passed, and missed all 16 problems.", options: { bullet: true, breakLine: true } },
  { text: "Different methods find different problems; using several paid off.", options: { bullet: true, breakLine: true } },
  { text: "Drawing the model finds problems before testing even starts.", options: { bullet: true, breakLine: true } },
  { text: "Limits: sample data, not the live database; the user journey is our estimate until real users exist.", options: { bullet: true, color: HEX.accent2 } },
], { placeholder: "body", fontSize: 16, paraSpaceAfter: 6 });
s.addNotes("JAYDEN (40 s). Three lessons, and one honest limit: we tested on sample data and an estimated user journey, so the reliability number holds for that setup. Next would be real users through the logger we built, and the live database. Now we'll run some of the tests live.");

// 13. Live testing
s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Live testing (about 3 minutes)", { placeholder: "title" });
tag(s, "LIVE TESTING", "live");
text(s, "npm run demo", { x: 0.5, y: 1.15, w: 9, h: 0.45, fontSize: 20, fontFace: "Courier New", bold: true, color: C.accent1, objectName: "live-cmd" });
[
  ["Booking flow", "64 tests, about 1 second"],
  ["Edge cases", "78 tests, about 1 second"],
  ["Code paths", "37 tests, about 1 second"],
  ["Onboarding in a visible browser", "13 checks, about 20 seconds"],
  ["10 simulated user visits in a browser", "about 1 minute"],
  ["Summary of all results", "instant"],
].forEach(([t, d], i) => {
  const y = 1.8 + i * 0.5;
  s.addShape(pres.shapes.OVAL, { x: 0.5, y, w: 0.4, h: 0.4, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: `live-dot-${i}` });
  text(s, String(i + 1), { x: 0.5, y, w: 0.4, h: 0.4, fontSize: 13, bold: true, color: C.background1, align: "center", valign: "middle", objectName: `live-num-${i}` });
  text(s, t, { x: 1.1, y, w: 4.6, h: 0.4, fontSize: 14, valign: "middle", objectName: `live-t-${i}` });
  text(s, d, { x: 5.7, y, w: 3.8, h: 0.4, fontSize: 12, color: C.accent6, valign: "middle", objectName: `live-d-${i}` });
});
s.addNotes("Switch to the terminal and run npm run demo. Enter runs each step, s skips. If the TA wants something else, any single step runs on its own (see the prep sheet). If anything fails live, the screenshots on slides 9, 10 and the backup slides show the same run.");

// Backup slides
s = pres.addSlide({ masterName: "TITLE_DARK" });
s.addText("Backup slides", { placeholder: "title" });
s.addText("Full results summary, the onboarding browser test, numbers by method, and where every document lives", { placeholder: "body" });

s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Backup: full results summary (screenshot, Nov 19)", { placeholder: "title" });
tag(s, "RESULTS DATA", "b-sum");
img(s, "run-summary.png", 1.3, 1.05, 4.1, ratioOf("run-summary.png"), "Terminal: results summary by technique, defects, coverage and reliability per round");

s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Backup: onboarding browser test (screenshot, Nov 19)", { placeholder: "title" });
tag(s, "TEST EXECUTION", "b-ob");
const obR = ratioOf("run-onboarding.png");
img(s, "run-onboarding.png", 0.5, 1.2, 9 / obR, obR, "Terminal: onboarding state machine checks OB-T01 to OB-T14");
text(s, "O1-O8 are the 8 onboarding screens. OB-T12 is the check that caught end dates before start dates (fixed). OB-T14 is a note, not a failure: the spec doesn't say whether progress survives a reload.", { x: 0.5, y: 1.3 + 9 / obR, w: 9, h: 0.8, fontSize: 12, color: C.accent6, objectName: "b-ob-note" });

s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Backup: the numbers by method", { placeholder: "title" });
tag(s, "RESULTS DATA", "b-num");
table(s, [
  ["Method", "Course name", "Tests", "Failed on original", "Problems", "Serious"],
  ["Old tests", "Baseline", "499", "0", "0", "0"],
  ["Step-by-step flows", "FSM / black-box", "74", "11", "8", "0"],
  ["Edge-case inputs", "Partition / black-box", "78", "10", "4", "1"],
  ["Every code path", "Control flow / white-box", "37", "4", "1", "1"],
  ["Real user behavior", "Markov usage / UBST", "240 visits", "10 visits", "2", "1"],
  ["Walkthrough", "-", "-", "-", "1", "0"],
], { x: 0.5, y: 1.15, w: 9, colW: [1.8, 2.0, 1.1, 1.6, 1.2, 1.3], fontSize: 12, rowH: 0.4 });
text(s, `Problem types (ODC): missing check 8, missing feature 3, wrong calculation 2, wrong value 2, mismatch between parts 1. Coverage of the riskiest code: ${cov.baseline.total.branches.toFixed(1)}% to ${cov.all.total.branches.toFixed(1)}%.`, { x: 0.5, y: 4.1, w: 9, h: 0.6, fontSize: 12, color: C.accent6, objectName: "b-num-note" });

s = pres.addSlide({ masterName: "CONTENT" });
s.addText("Backup: documentation and where it lives", { placeholder: "title" });
tag(s, "DOCUMENTATION", "b-doc");
table(s, [
  ["What", "Where (in the repo)"],
  ["Final report", "docs/testing/Perch_Testing_Final_Report.docx"],
  ["Models: booking and onboarding state machines", "docs/testing/fsm/"],
  ["Models: edge-case tables, code-path diagrams", "docs/testing/pt/, docs/testing/cft/"],
  ["Model: user journey and how it was built", "docs/testing/markov/"],
  ["Test code", "tests/course/, tests/e2e/"],
  ["Results of every round, simulated visits", "docs/testing/results/, docs/testing/ubst/"],
  ["Problem log (all 16, with fixes)", "docs/testing/defect-log.csv"],
  ["Everything in one offline page", "docs/testing/demo/dashboard.html"],
], { x: 0.5, y: 1.15, w: 9, colW: [4.3, 4.7], fontSize: 12, rowH: 0.38 });

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
