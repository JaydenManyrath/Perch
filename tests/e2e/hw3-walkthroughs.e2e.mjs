/**
 * CS 5314 HW3: team walkthrough sessions over the screen-level FSM
 * (docs/testing/hw3/fsm-v1.json: 7 states, 16 links), executed on the running app.
 *
 * Each session is a task a team member walks through (taken from the README
 * walkthrough and our earlier onboarding test runs). Every step fires one FSM input,
 * then checks the app really landed in the expected state, so the trace doubles as a
 * check that each link exists. The recorded traces are the "real" (observed) part of
 * the Markov-OP data; they come from the team, not from end users.
 *
 * Usage: NEXT_PUBLIC_DATA_SOURCE=fixture npm run build && npx next start -p 3100
 *        node tests/e2e/hw3-walkthroughs.e2e.mjs http://localhost:3100 out.json
 *        node tests/e2e/hw3-walkthroughs.e2e.mjs http://localhost:3100 out.json docs/testing/hw3/analysis.json
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");
const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3];

const EXIT = "S7";
const TAB_HREF = { S3: "/feed", S4: "/stories" };
const TAB_LABEL = { S3: "Flyway", S4: "Perches" };

async function tab(p, s) {
  // Select the nav tab by its label: other links share the href prefix (host profiles).
  await p.getByRole("link", { name: new RegExp(`^${TAB_LABEL[s]}`) }).locator("visible=true").first().click();
  await p.waitForURL((u) => u.pathname.startsWith(TAB_HREF[s]));
  await p.waitForTimeout(600);
}

async function finishOnboarding(p) {
  await p.getByRole("button", { name: /Use sample offer/ }).click();
  await p.getByText("Here's what we got").waitFor();
  const flagged = p.locator('input[aria-invalid="true"]');
  while ((await flagged.count()) > 0) {
    await flagged.first().focus();
    await flagged.first().blur();
  }
  await p.getByRole("button", { name: /^Continue/ }).click();
  await p.getByText(/Continuing with the demo profile|Account created/).first().waitFor();
  await p.getByRole("button", { name: /^Continue/ }).click();
  await p.getByRole("button", { name: /Skip for now/ }).click();
  await p.getByRole("button", { name: /^Skip$/ }).click();
  await p.getByRole("button", { name: /Skip - use my initials/ }).click();
  await p.getByRole("button", { name: /find my flock later/ }).click();
  await p.getByText("You're set").waitFor();
  await p.getByRole("link", { name: /Open the shell/ }).click();
  await p.waitForURL((u) => u.pathname.startsWith("/feed"));
  await p.waitForTimeout(600);
}

/** Fire the input for link from -> to; return true when the app is in `to` afterwards. */
async function fire(p, from, to) {
  if (to === EXIT) return true; // the user leaves; nothing to drive
  if (from === "S1" && to === "S2") {
    await p.getByRole("link", { name: /Start onboarding/ }).click();
    await p.waitForURL((u) => u.pathname === "/onboarding");
    return true;
  }
  if (from === "S1" && to === "S3") {
    await p.goto(`${BASE}/feed`); // a returning user reopens the app on the feed
    return true;
  }
  if (from === "S2" && to === "S3") {
    await finishOnboarding(p);
    return new URL(p.url()).pathname === "/feed";
  }
  if (from === to && from === "S3") {
    await p.getByRole("button", { name: "Comments" }).first().click();
    await p.waitForTimeout(500);
    return new URL(p.url()).pathname === "/feed";
  }
  if (from === to && from === "S4") {
    await p.getByRole("button", { name: "Pass", exact: true }).click();
    await p.waitForTimeout(500);
    return true;
  }
  if (from === "S4" && to === "S5") {
    await p.getByRole("button", { name: "Details", exact: true }).click();
    return (await p.getByRole("button", { name: /Request to book/ }).count()) > 0 || (await p.getByRole("dialog").count()) > 0;
  }
  if ((from === "S5" || from === "S6") && to === "S4") {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
    return (await p.getByRole("dialog").count()) === 0;
  }
  if (from === "S5" && to === "S6") {
    await p.getByRole("button", { name: /Request to book/ }).click();
    await p.getByText("Waiting on the host").waitFor();
    return true;
  }
  if (TAB_HREF[from] && TAB_HREF[to]) {
    await tab(p, to);
    return new URL(p.url()).pathname.startsWith(TAB_HREF[to]);
  }
  throw new Error(`no driver for ${from}->${to}`);
}

// Walkthrough tasks. Sequences are state ids; S1 is the splash page, S7 is Exit.
const SESSIONS = [
  { id: "W1", task: "README walkthrough (new user)", path: ["S1", "S2", "S3", "S4", "S5", "S6", "S4", "S7"] },
  { id: "W2", task: "Find a sublet and request it", path: ["S1", "S3", "S4", "S4", "S4", "S5", "S4", "S5", "S6", "S4", "S7"] },
  { id: "W3", task: "Check events", path: ["S1", "S3", "S3", "S3", "S7"] },
  { id: "W4", task: "Look at one listing", path: ["S1", "S3", "S4", "S5", "S7"] },
  { id: "W5", task: "Onboarding, stop after the offer step", path: ["S1", "S2", "S7"] },
  { id: "W6", task: "New user books right away", path: ["S1", "S2", "S3", "S4", "S5", "S6", "S4", "S7"] },
  { id: "W7", task: "Browse sublets", path: ["S1", "S3", "S4", "S4", "S5", "S4", "S7"] },
  { id: "W8", task: "Events, then a quick look at sublets", path: ["S1", "S3", "S3", "S4", "S7"] },
];

// Optional 4th argument: analysis.json -> run its node and link coverage tests instead.
let RUN = SESSIONS;
if (process.argv[4]) {
  const a = JSON.parse(readFileSync(process.argv[4], "utf8"));
  RUN = [...a.nodeTests, ...a.linkTests].map((t) => ({ id: t.id, task: "coverage test", path: t.path }));
}

// HEADED=1 shows the browser (slowed down) so a demo audience can watch each step.
const browser = await chromium.launch(process.env.HEADED ? { headless: false, slowMo: 250 } : {});
const results = [];
for (const s of RUN) {
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.goto(`${BASE}/`);
  const steps = [];
  let ok = true;
  for (let i = 1; i < s.path.length; i++) {
    const [from, to] = [s.path[i - 1], s.path[i]];
    let landed;
    try {
      landed = await fire(page, from, to);
    } catch (err) {
      landed = false;
      steps.push({ from, to, ok: false, error: String(err.message).split("\n")[0] });
      ok = false;
      break;
    }
    steps.push({ from, to, ok: landed });
    if (!landed) ok = false;
  }
  results.push({ ...s, ok, steps });
  console.log(`${ok ? "OK  " : "FAIL"} ${s.id} ${s.task}: ${s.path.join(" > ")}`);
  if (!ok) console.log("     ", JSON.stringify(steps.filter((x) => !x.ok)));
  await page.close();
}
await browser.close();
if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), sessions: results }, null, 2));
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
