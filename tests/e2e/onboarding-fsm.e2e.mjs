/**
 * CS 7314 - FSM/BBT, onboarding step machine, executed end to end in a real browser.
 *
 * Model (docs/testing/fsm/onboarding-fsm.md):
 *   O1 Upload -> O2 Review -> O3 Account -> O4 Spotify -> O5 Takeout -> O6 Photo
 *   -> O7 Flock -> O8 Done, with guards on O2's Continue and skip/continue edges.
 *
 * Usage: start the app in fixture mode (NEXT_PUBLIC_DATA_SOURCE=fixture npm run dev),
 * then `node tests/e2e/onboarding-fsm.e2e.mjs [baseUrl] [out.json]`.
 * Not part of `npm test` (needs a running server and a browser).
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

// CommonJS require so a globally installed Playwright resolves too.
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[3];

const STATE_MARKERS = {
  O1: /Upload your offer letter/,
  O2: /Here's what we got/,
  O3: /(Creating your account|Account created|No live account was created)/,
  O4: /Spotify/,
  O5: /(Takeout|places)/i,
  O6: /Put a face to your name/,
  O7: /flock/i,
  O8: /You're set/,
};

async function observe(page) {
  const text = await page.locator("body").innerText();
  // Most specific first: later steps reuse words from earlier ones.
  for (const s of ["O8", "O2", "O3", "O6", "O1"]) if (STATE_MARKERS[s].test(text)) return s;
  if (/Skip for now/.test(text) && /Spotify/.test(text)) return "O4";
  if (/I'll find my flock later/.test(text)) return "O7";
  if (/Maps Takeout|usual spots/.test(text)) return "O5";
  return "?";
}

const continueBtn = (page) => page.getByRole("button", { name: /^Continue/ });

async function toReview(page) {
  await page.goto(`${BASE}/onboarding`);
  await page.getByRole("button", { name: /Use sample offer/ }).click();
  await page.getByText("Here's what we got").waitFor();
}

async function clearFlags(page) {
  // Blurring a flagged field marks it reviewed (the documented way to confirm it).
  const flagged = page.locator('input[aria-invalid="true"]');
  while ((await flagged.count()) > 0) {
    await flagged.first().focus();
    await flagged.first().blur();
  }
}

async function field(page, label) {
  return page.locator("label", { hasText: label }).locator("input");
}

async function toAccount(page) {
  await toReview(page);
  await clearFlags(page);
  await continueBtn(page).click();
  await page.getByText(/Continuing with the demo profile|Account created/).first().waitFor();
}

async function advance(page, name) {
  await page.getByRole("button", { name }).first().click({ timeout: 10_000 }).catch((err) => {
    throw new Error(`no button ${name} in state ${page.url()}: ${String(err.message).split("\n")[0]}`);
  });
  await page.waitForTimeout(400);
}

const cases = [
  {
    id: "OB-T01", desc: "O1 --use sample--> O2",
    run: async (p) => { await toReview(p); return { observed: await observe(p), expected: "O2" }; },
  },
  {
    id: "OB-T02", desc: "O2 guard false (flags outstanding): Continue disabled",
    run: async (p) => { await toReview(p); return { observed: await continueBtn(p).isDisabled(), expected: true }; },
  },
  {
    id: "OB-T03", desc: "O2 guard true after confirming flagged fields: Continue enabled",
    run: async (p) => { await toReview(p); await clearFlags(p); return { observed: await continueBtn(p).isEnabled(), expected: true }; },
  },
  {
    id: "OB-T04", desc: "O2 --continue--> O3 (fixture: visible fallback, no silent swap)",
    run: async (p) => {
      await toAccount(p);
      const t = await p.locator("body").innerText();
      return { observed: /No live account was created/.test(t) ? "O3-fallback" : await observe(p), expected: "O3-fallback" };
    },
  },
  {
    id: "OB-T05..T09", desc: "Skip path O3 -> O4 -> O5 -> O6 -> O7 -> O8",
    run: async (p) => {
      const seen = [];
      await toAccount(p); seen.push(await observe(p));
      await advance(p, /^Continue/); seen.push(await observe(p));
      await advance(p, /Skip for now/); seen.push(await observe(p));
      await advance(p, /Use sample Takeout/); await p.getByText("We found your usual spots").waitFor();
      await advance(p, /^Continue/); seen.push(await observe(p));
      await advance(p, /Skip - use my initials/); seen.push(await observe(p));
      await advance(p, /I'll find my flock later/); seen.push(await observe(p));
      return { observed: seen.join(">"), expected: "O3>O4>O5>O6>O7>O8" };
    },
  },
  {
    id: "OB-T10", desc: "Continue path O6 -> O7 (no photo) and add a friend before O8",
    run: async (p) => {
      await toAccount(p);
      await advance(p, /^Continue/);
      await advance(p, /Skip for now/);
      await advance(p, /Use sample Takeout/); await p.getByText("We found your usual spots").waitFor();
      await advance(p, /^Continue/);
      await advance(p, /^Continue/);
      const add = p.getByRole("button", { name: /Add/ });
      const canAdd = (await add.count()) > 0;
      if (canAdd) await add.first().click();
      await advance(p, /^Continue/);
      return { observed: `${canAdd}:${await observe(p)}`, expected: "true:O8" };
    },
  },
  {
    id: "OB-T11", desc: "O2 guard: clearing Employer disables Continue",
    run: async (p) => {
      await toReview(p); await clearFlags(p);
      await (await field(p, "Employer")).fill("");
      return { observed: await continueBtn(p).isDisabled(), expected: true };
    },
  },
  {
    id: "OB-T12", desc: "O2 guard: End date before Start date must not be accepted",
    run: async (p) => {
      await toReview(p); await clearFlags(p);
      await (await field(p, "End date")).fill("2026-05-01");
      return { observed: await continueBtn(p).isDisabled(), expected: true };
    },
  },
  {
    id: "OB-T13", desc: "O2 self-loop: editing salary recomputes take-home before leaving the state",
    run: async (p) => {
      await toReview(p);
      await (await field(p, "Salary")).fill("60000");
      await p.waitForTimeout(500);
      const t = await p.locator("body").innerText();
      return { observed: /\$60,000/.test(t) && !/\$102,319/.test(t), expected: true };
    },
  },
  {
    id: "OB-T14", desc: "Reload in O5 (observation: spec does not say whether progress persists)",
    observation: true,
    run: async (p) => {
      await toAccount(p);
      await advance(p, /^Continue/);
      await advance(p, /Skip for now/);
      await p.reload();
      await p.waitForTimeout(800);
      return { observed: await observe(p), expected: "O1 (progress lost)" };
    },
  },
];

const browser = await chromium.launch();
const results = [];
for (const c of cases) {
  const page = await browser.newPage();
  const started = Date.now();
  let r;
  try {
    r = await c.run(page);
  } catch (err) {
    r = { observed: `error: ${String(err.message).split("\n")[0]}`, expected: "-" };
  }
  const pass = c.observation ? null : JSON.stringify(r.observed) === JSON.stringify(r.expected);
  results.push({ id: c.id, desc: c.desc, ...r, verdict: pass === null ? "OBS" : pass ? "PASS" : "FAIL", ms: Date.now() - started });
  await page.close();
}
await browser.close();

for (const r of results) console.log(`${r.verdict.padEnd(4)} ${r.id.padEnd(12)} ${r.desc}  [observed=${JSON.stringify(r.observed)} expected=${JSON.stringify(r.expected)}]`);
if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, ranAt: new Date().toISOString(), results }, null, 2));
process.exitCode = results.some((r) => r.verdict === "FAIL") ? 1 : 0;
