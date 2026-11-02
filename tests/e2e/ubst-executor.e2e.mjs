/**
 * CS 7314 Markov-OP/UBST executor: replays usage-based test cases (random walks drawn
 * by scripts/testing/markov-walk.ts) against the running app in a real browser.
 *
 *   node tests/e2e/ubst-executor.e2e.mjs <baseUrl> <suite.json> <out.json> [maxRuns]
 *
 * Each walk is one simulated user session in a fresh browser context. Every step fires
 * the user action for the transition and checks the app landed on the expected screen.
 * Failure oracle (a run fails at its first failure):
 *   - the expected screen is not reached (action impossible or wrong landing),
 *   - an uncaught exception on the page,
 *   - an HTTP 5xx from the app's own origin (images proxied from external hosts the
 *     sandbox cannot reach are excluded and counted separately as environment noise),
 *   - a feature reporting an error to the user (the negotiate scouts' error state).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";

const { chromium } = createRequire(import.meta.url)("playwright");
const [BASE = "http://localhost:3000", SUITE, OUT, MAX] = process.argv.slice(2);
const suite = JSON.parse(readFileSync(SUITE, "utf8"));
const cases = suite.cases.slice(0, MAX ? Number(MAX) : undefined);

const TAB = { FEED: "Flyway", PERCHES: "Perches", MAP: "Migration", CHIRPS: "Chirps", NEST: "Nest" };
const ROUTE = { ONBOARDING: "/onboarding", FEED: "/feed", PERCHES: "/stories", NEGOTIATE: "/negotiate", MAP: "/map", CHIRPS: "/dms", NEST: "/profile/" };

class StepFailure extends Error {
  constructor(kind, detail) {
    super(detail);
    this.kind = kind;
  }
}

const path = (p) => new URL(p.url()).pathname;
const dialogOpen = async (p) => (await p.getByRole("dialog").count()) > 0;

async function tab(p, screen) {
  if (await dialogOpen(p)) {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
  }
  await p.getByRole("link", { name: new RegExp(`^${TAB[screen]}`) }).locator("visible=true").first().click({ timeout: 8000 });
  await p.waitForURL((u) => u.pathname.startsWith(ROUTE[screen]), { timeout: 10000 });
  await p.waitForTimeout(500);
}

/** The negotiate page sits outside the tab shell; its Back button returns to the deck. */
async function backToDeck(p) {
  await p.getByRole("button", { name: /^Back/ }).or(p.getByRole("link", { name: /^Back/ })).first().click({ timeout: 8000 });
  await p.waitForURL((u) => u.pathname === "/stories", { timeout: 10000 });
  await p.waitForTimeout(500);
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
}

/** Enter a screen's main function where it has one (negotiate runs the scouts). */
async function exercise(p, screen) {
  if (screen === "NEGOTIATE") {
    await p.getByRole("button", { name: /Send the scouts/ }).click({ timeout: 8000 });
    const done = p.getByText("Ranked perches");
    const failed = p.getByText(/is the backend seeded and are you signed in/);
    await Promise.race([done.waitFor({ timeout: 15000 }), failed.waitFor({ timeout: 15000 })]);
    if (await failed.count()) {
      throw new StepFailure("feature-error", (await failed.first().innerText()).slice(0, 120));
    }
  }
}

/** Fire the user action for from -> to. */
async function fire(p, from, to) {
  if (to === "EXIT") return;
  if (from === "START" && to === "ONBOARDING") {
    await p.goto(`${BASE}/`);
    await p.getByRole("link", { name: /Start onboarding/ }).click();
    await p.waitForURL((u) => u.pathname === "/onboarding");
    return;
  }
  if (from === "START") return void (await p.goto(`${BASE}${ROUTE[to]}`));
  if (from === "ONBOARDING" && to === "FEED") return finishOnboarding(p);
  if (from === to && from === "FEED") return p.getByRole("button", { name: "Comments" }).first().click();
  if (from === to && from === "PERCHES") return p.getByRole("button", { name: "Pass", exact: true }).click({ timeout: 8000 });
  if (from === to && from === "MAP") return p.getByRole("button", { name: "Events" }).click();
  if (from === to && from === "CHIRPS") {
    if (path(p) !== "/dms") await tab(p, "CHIRPS");
    const threads = p.getByRole("link", { name: /Open conversation with/ });
    await threads.nth(Math.floor(Math.random() * (await threads.count()))).click();
    return p.waitForURL((u) => u.pathname.startsWith("/dms/"));
  }
  if (to === "LISTING") {
    if (from === "NEGOTIATE") await backToDeck(p); // a scouted perch is opened from the deck
    return p.getByRole("button", { name: "Details", exact: true }).click({ timeout: 8000 });
  }
  if (from === "LISTING" && to === "BOOKING") {
    // One request per listing: reopening a listing already requested this session shows
    // the existing request, which is the BOOKING screen (round 1 counted it as a failure).
    if (await p.getByText("Waiting on the host").count()) return;
    await p.getByRole("button", { name: /Request to book/ }).click({ timeout: 8000 });
    return p.getByText("Waiting on the host").waitFor({ timeout: 8000 });
  }
  if ((from === "LISTING" || from === "BOOKING") && to === "PERCHES") {
    await p.keyboard.press("Escape");
    return p.waitForTimeout(400);
  }
  if (from === "PERCHES" && to === "NEGOTIATE") {
    await p.getByRole("link", { name: /Scout perches/ }).click({ timeout: 8000 });
    return p.waitForURL((u) => u.pathname === "/negotiate");
  }
  if (from === "NEGOTIATE" && to === "PERCHES") return backToDeck(p);
  if (from === "NEGOTIATE") await backToDeck(p); // negotiate has no tab bar, only Back
  if (TAB[to]) return tab(p, to);
  throw new StepFailure("no-driver", `${from}->${to}`);
}

async function landed(p, screen) {
  switch (screen) {
    case "EXIT":
      return true;
    case "LISTING":
      return (await p.getByRole("button", { name: /Request to book/ }).count()) > 0 || (await p.getByText("Waiting on the host").count()) > 0;
    case "BOOKING":
      return (await p.getByText("Waiting on the host").count()) > 0;
    case "PERCHES":
      return path(p) === "/stories" && !(await dialogOpen(p));
    default:
      return path(p).startsWith(ROUTE[screen]);
  }
}

// HEADED=1 shows the browser (slowed down) so a demo audience can watch each step.
const browser = await chromium.launch(process.env.HEADED ? { headless: false, slowMo: 250 } : {});
const runs = [];
let envNoise = 0;
const started = Date.now();
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  const p = await ctx.newPage();
  const problems = [];
  p.on("pageerror", (e) => problems.push({ kind: "page-exception", detail: String(e.message).slice(0, 160) }));
  p.on("response", (r) => {
    if (r.status() < 500 || !r.url().startsWith(BASE)) return;
    if (r.url().includes("/_next/image")) envNoise += 1;
    else problems.push({ kind: "http-5xx", detail: `${r.status()} ${new URL(r.url()).pathname}` });
  });
  let failure = null;
  const t0 = Date.now();
  for (let k = 1; k < c.path.length && !failure; k++) {
    const [from, to] = [c.path[k - 1], c.path[k]];
    try {
      await fire(p, from, to);
      if (!(await landed(p, to))) throw new StepFailure("wrong-screen", `expected ${to}, at ${path(p)}`);
      await exercise(p, to);
      await p.waitForTimeout(150);
    } catch (err) {
      failure = { step: k, from, to, kind: err.kind ?? "action-failed", detail: String(err.message).split("\n")[0].slice(0, 160) };
    }
    if (!failure && problems.length) failure = { step: k, from, to, ...problems[0] };
  }
  runs.push({ id: c.id, path: c.path, ok: !failure, failure, ms: Date.now() - t0 });
  process.stdout.write(failure ? "F" : ".");
  await ctx.close();
}
await browser.close();

const failures = runs.filter((r) => !r.ok);
const result = {
  base: BASE,
  profile: suite.profile,
  seed: suite.seed,
  ranAt: new Date().toISOString(),
  minutes: Number(((Date.now() - started) / 60000).toFixed(1)),
  runs: runs.length,
  failures: failures.length,
  reliability: Number((1 - failures.length / runs.length).toFixed(4)),
  environmentNoise: { externalImage5xx: envNoise },
  byTransition: Object.entries(
    failures.reduce((acc, r) => ((acc[`${r.failure.from}->${r.failure.to} ${r.failure.kind}`] = (acc[`${r.failure.from}->${r.failure.to} ${r.failure.kind}`] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]),
  details: runs,
};
console.log(`\n${runs.length} runs, ${failures.length} failed, R = ${result.reliability}`);
for (const [k, v] of result.byTransition) console.log(`  ${v}x ${k}`);
if (OUT) writeFileSync(OUT, JSON.stringify(result, null, 2));
