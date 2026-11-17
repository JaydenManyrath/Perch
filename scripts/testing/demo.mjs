/**
 * CS 7314 demo runner: one command for the TA demo, the same on macOS, Linux and Windows.
 *
 *   npm run demo:prepare   the day before: install the test browser, build the app in
 *                          demo mode, then dry-run every step (prints PASS/FAIL)
 *   npm run demo           the day of: starts the app and walks through each step.
 *                          Shows what to say, waits for Enter, runs the step with a
 *                          visible browser, then stops everything at the end
 *   npm run demo:check     dry-run every step without stopping (no browser windows)
 *   npm run demo:app       just start the app in demo mode (http://localhost:3100)
 *   node scripts/testing/demo.mjs step <name> [--show]   run one step
 *
 * Demo mode = fixture data and no keys. Values set here override .env.local, so a
 * developer's real Supabase keys never switch the demo to the live backend.
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const PORT = 3100;
const APP_URL = `http://localhost:${PORT}`;
const MARKER = path.join(ROOT, ".next", "perch-demo-build");
const BUILD_ID = path.join(ROOT, ".next", "BUILD_ID");
const NODE = process.execPath;
const bin = {
  next: path.join(ROOT, "node_modules/next/dist/bin/next"),
  vitest: path.join(ROOT, "node_modules/vitest/vitest.mjs"),
  tsx: path.join(ROOT, "node_modules/tsx/dist/cli.mjs"),
};

// Demo mode: fixture data, no keys, no LLM calls. Empty strings beat .env.local.
const DEMO_ENV = {
  NEXT_PUBLIC_DATA_SOURCE: "fixture",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  OPENAI_API_KEY: "",
  LLM_DISABLED: "1",
  NEXT_TELEMETRY_DISABLED: "1",
};

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

/** Run a node entry point; resolves with the exit code. */
function run(args, { env = {}, quiet = false } = {}) {
  return new Promise((resolve) => {
    const child = spawn(NODE, args, { cwd: ROOT, env: { ...process.env, ...DEMO_ENV, ...env }, stdio: quiet ? "ignore" : ["ignore", "inherit", "inherit"] }); // stdin stays with the menu
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// ---------------- the steps, in the order of the TA's demo checklist ----------------
const DASHBOARD = path.join(ROOT, "docs/testing/demo/dashboard.html");
const dashboard = (section) => async () => {
  openBrowser(`${pathToFileURL(DASHBOARD).href}#${section}`);
  return 0;
};
const vitest = (...files) => () => run([bin.vitest, "run", ...files, "--reporter=verbose"]);

const STEPS = [
  {
    id: "app",
    title: "1. System under test: the app",
    slide: "slides 1-4",
    say: [
      "Perch helps interns find sublets, friends and events in a new city.",
      "It runs here on built-in fixture data, no keys, which is how we test it.",
      "Click through: splash, Flyway feed, Perches deck, a listing, Request to book.",
    ],
    action: async () => {
      openBrowser(APP_URL);
      return 0;
    },
  },
  {
    id: "rawdata",
    title: "2. Raw data for the models, and how it was collected",
    slide: "slide 5",
    say: [
      "Each model's raw data and how we got it: the spec for the FSM, hand-computed constants for PT,",
      "the code for CFT, a projected usage profile for Markov (no real users yet; /pilot collects them).",
    ],
    action: dashboard("rawdata"),
  },
  {
    id: "analysis",
    title: "3. Analysis of that data",
    slide: "slide 6",
    say: [
      "Baseline coverage showed the gaps (expiry cron 0%, bookings, the data-source fallback).",
      "The usage profile shows Feed and the deck dominate, so most UBST sessions go there.",
    ],
    action: dashboard("analysis-data"),
  },
  {
    id: "models",
    title: "4. Testing models (all four techniques)",
    slide: "slides 7-10",
    say: ["Booking FSM and onboarding FSM, PT partition tables, CFT graphs, the Markov transition matrix."],
    action: dashboard("models"),
  },
  {
    id: "testcases",
    title: "5. Test cases and the organized suite",
    slide: "slide 11",
    say: [
      "Every test case, grouped by technique and model element, with its result on the original code and now.",
      "Open a suite to show individual cases (T/I/P/C for FSM, PB..PN for PT, CF for CFT).",
    ],
    action: dashboard("testcases"),
  },
  {
    id: "baseline",
    title: "6a. Execution: the baseline suite",
    slide: "slide 12",
    say: ["The repo already had 499 tests. They all pass, but they found none of our 16 defects."],
    action: () => run([bin.vitest, "run", "--exclude", "tests/course/**", "--reporter=dot"]),
  },
  {
    id: "fsm",
    title: "6b. Execution: FSM booking state machine",
    slide: "slide 12",
    say: [
      "7 states, 13 valid transitions (T..), 18 invalid ones (I..), 5 paths (P..), 2 races (C..).",
      "Run against both the live API code and the no-key fixture code. Found 8 defects.",
    ],
    action: vitest("tests/course/fsm-booking-live.test.ts", "tests/course/fsm-booking-fixture.test.ts"),
  },
  {
    id: "onboarding",
    title: "6c. Execution: FSM onboarding, in a real browser",
    slide: "slide 12",
    say: ["Watch the browser walk all 8 onboarding screens and test the review-screen guard."],
    browser: true,
    action: (show) => run(["tests/e2e/onboarding-fsm.e2e.mjs", APP_URL], { env: show ? { HEADED: "1" } : {} }),
  },
  {
    id: "pt",
    title: "6d. Execution: PT partitions",
    slide: "slide 12",
    say: [
      "Every input split into valid and invalid classes, both sides of every boundary.",
      "PF-23: \"$45.00 per hour\" used to be read as a $45 yearly salary (D09).",
    ],
    action: vitest("tests/course/pt-verdict-rules.test.ts", "tests/course/pt-finance.test.ts"),
  },
  {
    id: "cft",
    title: "6e. Execution: CFT branches",
    slide: "slide 12",
    say: ["CF-35: a server refusal used to take the outage branch and fake a booking (D13)."],
    action: vitest("tests/course/cft-branches.test.ts", "tests/course/cft-source-fallback.test.ts"),
  },
  {
    id: "ubst",
    title: "6f. Execution: UBST, random user sessions in a browser",
    slide: "slide 12",
    say: [
      "10 sessions drawn from the Markov usage profile, replayed in Chromium.",
      "A session fails on a wrong screen, a page error, a 5xx or a feature error. Dots = passed sessions.",
    ],
    browser: true,
    action: async (show) => {
      const gen = await run([bin.tsx, "scripts/testing/markov-walk.ts", "10", "7", "ubst-demo-suite.json"]);
      if (gen !== 0) return gen;
      return run(["tests/e2e/ubst-executor.e2e.mjs", APP_URL, "ubst-demo-suite.json", "ubst-demo-result.json"], { env: show ? { HEADED: "1" } : {} });
    },
  },
  {
    id: "regression",
    title: "6g. Execution: regression tests for the later fixes",
    slide: "slide 12",
    say: ["Each defect found later (D07, D14, D15, D16) got a regression test so it stays fixed."],
    action: vitest("tests/course/regression-round3.test.ts", "tests/course/regression-d16.test.ts"),
  },
  {
    id: "summary",
    title: "7. Results and analysis",
    slide: "slides 13-15",
    say: ["Per technique: cases, round-1 failures, defects. Then ODC, coverage and UBST reliability.", "The dashboard opens on the defect log and cross-technique analysis."],
    action: async () => {
      const code = await run(["scripts/testing/demo-summary.mjs"]);
      await dashboard("results")();
      return code;
    },
  },
];

// ---------------- app server ----------------
let server = null;

async function isUp() {
  try {
    const res = await fetch(`${APP_URL}/`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function build() {
  console.log(c.cyan("\nBuilding the app in demo mode (about 1-2 minutes)..."));
  const code = await run([bin.next, "build"]);
  if (code !== 0) throw new Error("next build failed");
  // Remember which build was made in demo mode; any later build or dev run changes it.
  writeFileSync(MARKER, readFileSync(BUILD_ID, "utf8"));
}

async function startApp({ rebuild = false } = {}) {
  if (await isUp()) {
    console.log(c.dim(`App already running at ${APP_URL}; using it.`));
    return;
  }
  const demoBuild = existsSync(MARKER) && existsSync(BUILD_ID) && readFileSync(MARKER, "utf8") === readFileSync(BUILD_ID, "utf8");
  if (rebuild || !demoBuild) await build();
  console.log(c.cyan(`Starting the app at ${APP_URL} ...`));
  server = spawn(NODE, [bin.next, "start", "-p", String(PORT)], {
    cwd: ROOT,
    env: { ...process.env, ...DEMO_ENV },
    stdio: "ignore",
  });
  for (let i = 0; i < 60; i++) {
    if (await isUp()) return console.log(c.green("App is up.\n"));
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`the app did not start on port ${PORT} (is something else using it?)`);
}

function stopApp() {
  if (server && !server.killed) server.kill();
}
process.on("exit", stopApp);
process.on("SIGINT", () => process.exit(130));

function openBrowser(url) {
  const cmd = process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(cmd[0], cmd[1], { stdio: "ignore", detached: true }).on("error", () => {}).unref();
  } catch {
    /* no desktop browser: the URL is printed */
  }
  console.log(`Open ${c.bold(url)} in your browser.`);
}

async function browserReady() {
  try {
    const { chromium } = createRequire(path.join(ROOT, "package.json"))("playwright");
    const b = await chromium.launch();
    await b.close();
    return true;
  } catch {
    return false;
  }
}

async function installBrowser() {
  console.log(c.cyan("\nInstalling the Chromium browser for the tests..."));
  const cli = path.join(ROOT, "node_modules/playwright/cli.js");
  const code = await run([cli, "install", "chromium"]);
  if (code !== 0) throw new Error("playwright install chromium failed");
}

// ---------------- modes ----------------
async function check() {
  console.log(c.bold("\nDry run of every demo step (no browser windows)\n"));
  if (!(await browserReady())) {
    console.log(c.red("Chromium for the tests is missing. Run: npm run demo:prepare"));
    process.exit(1);
  }
  await startApp();
  const results = [];
  for (const s of STEPS) {
    if (s.opensOnly || ["app", "rawdata", "analysis", "models", "testcases"].includes(s.id)) continue;
    console.log(c.bold(`\n--- ${s.title} ---`));
    const t0 = Date.now();
    const code = await s.action(false);
    results.push({ step: s.title, ok: code === 0, sec: Math.round((Date.now() - t0) / 1000) });
  }
  console.log(c.bold("\nDemo check"));
  for (const r of results) console.log(`  ${r.ok ? c.green("PASS") : c.red("FAIL")}  ${r.step} ${c.dim(`(${r.sec}s)`)}`);
  const ok = results.every((r) => r.ok);
  console.log(ok ? c.green("\nEverything works. On demo day run: npm run demo\n") : c.red("\nSomething failed above; fix it before the demo.\n"));
  stopApp();
  process.exit(ok ? 0 : 1);
}

async function guided() {
  if (!(await browserReady())) {
    console.log(c.red("Chromium for the tests is missing. Run: npm run demo:prepare (once)"));
    process.exit(1);
  }
  await startApp();
  // Queue typed lines so none are lost, and treat end of input as quit.
  const rl = createInterface({ input: process.stdin });
  const lines = [];
  let waiting = null;
  rl.on("line", (l) => (waiting ? (waiting(l), (waiting = null)) : lines.push(l)));
  rl.on("close", () => {
    lines.push("q");
    if (waiting) waiting("q");
  });
  const ask = (q) => {
    process.stdout.write(q);
    const take = (l) => l.trim().toLowerCase();
    if (lines.length) return Promise.resolve(take(lines.shift()));
    return new Promise((r) => (waiting = (l) => r(take(l))));
  };
  console.log(c.bold("Perch testing demo") + c.dim("  (Enter = run step, s = skip, b = back, q = quit)"));
  for (let i = 0; i < STEPS.length; ) {
    const s = STEPS[i];
    console.log(`\n${c.bold(`[${i + 1}/${STEPS.length}] ${s.title}`)}  ${c.dim(s.slide)}`);
    for (const line of s.say) console.log(`  ${c.cyan(">")} ${line}`);
    const a = await ask(c.dim("  Enter to run, s skip, b back, q quit: "));
    if (a === "q") break;
    if (a === "b") {
      i = Math.max(0, i - 1);
      continue;
    }
    if (a !== "s") {
      const code = await s.action(true);
      if (code !== 0) console.log(c.red(`  Step exited with code ${code}. Press r to retry, or Enter to go on.`));
      const after = await ask(c.dim("  Enter for the next step, r to run again: "));
      if (after === "r") continue;
      if (after === "q") break;
    }
    i++;
  }
  rl.close();
  console.log(c.green("\nDone. Stopping the app."));
  stopApp();
  process.exit(0);
}

async function prepare() {
  if (!(await browserReady())) await installBrowser();
  if (await isUp()) console.log(c.dim("An app is already running on port 3100; stop it so the demo build is used."));
  await build();
  await check();
}

async function step(id, show) {
  const s = STEPS.find((x) => x.id === id);
  if (!s) {
    console.log(`Unknown step "${id}". Steps: ${STEPS.map((x) => x.id).join(", ")}`);
    process.exit(1);
  }
  if (s.browser || s.id === "app") await startApp();
  const code = await s.action(show);
  stopApp();
  process.exit(code);
}

const [mode = "guided", ...rest] = process.argv.slice(2);
const show = rest.includes("--show");
try {
  if (mode === "guided") await guided();
  else if (mode === "check") await check();
  else if (mode === "prepare") await prepare();
  else if (mode === "app") {
    await startApp();
    console.log(`Demo app running at ${c.bold(APP_URL)}. Press Ctrl+C to stop.`);
    await new Promise(() => {});
  } else if (mode === "step") await step(rest.find((r) => !r.startsWith("--")), show);
  else {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
    process.exit(1);
  }
} catch (err) {
  console.error(c.red(`\nDemo error: ${err.message}`));
  stopApp();
  process.exit(1);
}
