# CS 7314/5314 Testing Project - Perch

Jayden Manyrath and Koen Gennis. Fall 2026, Prof. Jeff Tian.

Docs style: plain ASCII only (matches the repo README).

This folder holds the models, test suites, raw results and analysis for the course
project "Comparing Black-Box, White-Box, and Usage-Based Testing Techniques on
Perch". Everything here was produced specifically for the course.

## Start here for the demo

- [DEMO.md](DEMO.md): the 15-minute TA demo script, with commands and talking points.
- [demo/Perch_Testing_Demo.pptx](demo/Perch_Testing_Demo.pptx): the slide deck
  (rebuild with `node scripts/testing/demo-deck.cjs`).
- `npm run demo:summary`: every result on one screen.
- [analysis.md](analysis.md): the cross-technique analysis (applicability,
  effectiveness, cost, ODC, reliability, sensitivity).

## Index

| Artifact | Path |
| --- | --- |
| Progress report (Part 2/4) | [progress-report.md](progress-report.md) |
| Final report draft (Part 4/4) | [final-report.md](final-report.md) (template), [Perch_Testing_Final_Report.docx](Perch_Testing_Final_Report.docx) (filled by `python3 scripts/testing/render-final-report.py`) |
| Cross-technique analysis | [analysis.md](analysis.md) |
| Baseline measurement of the existing suite | [baseline.md](baseline.md) |
| FSM model: booking lifecycle | [fsm/booking-fsm.md](fsm/booking-fsm.md) |
| FSM model: onboarding steps | [fsm/onboarding-fsm.md](fsm/onboarding-fsm.md) |
| Partition tables (PT) | [pt/partitions.md](pt/partitions.md) |
| Control flow graphs (CFT) | [cft/cfg.md](cft/cfg.md) |
| Markov usage profile (UBST) | [markov/usage-profile.md](markov/usage-profile.md) |
| Generated UBST suite (200 walks) | [markov/ubst-suite-projected-v1.json](markov/ubst-suite-projected-v1.json) |
| Defect log (ODC type + trigger) | [defect-log.csv](defect-log.csv) |
| Effort log (team to fill) | [effort-log.csv](effort-log.csv) |
| Round 1 raw results (before fixes) | [results/round1](results/round1) |
| Round 2 raw results (after fixes) | [results/round2](results/round2) |
| Round 3 raw results (after D07, D14, D15 fixes) | [results/round3](results/round3) |
| Round 4 raw results (after the D16 fix) | [results/round4](results/round4) |
| UBST suites, runs, triage and reliability analysis | [ubst](ubst) |

## Test code

| Technique | Code |
| --- | --- |
| FSM/BBT booking, live API path | `tests/course/fsm-booking-live.test.ts` |
| FSM/BBT booking, fixture data source | `tests/course/fsm-booking-fixture.test.ts` |
| FSM/BBT onboarding, real browser | `tests/e2e/onboarding-fsm.e2e.mjs` |
| PT/BBT verdict rules | `tests/course/pt-verdict-rules.test.ts` |
| PT/BBT finance, salary, negotiate inputs | `tests/course/pt-finance.test.ts` |
| CFT/WBT freshness, cron, transitions | `tests/course/cft-branches.test.ts` |
| CFT/WBT fixture/live fallback | `tests/course/cft-source-fallback.test.ts` |
| Markov-OP model checks | `tests/course/markov-profile.test.ts` |
| Markov-OP/UBST executor (browser) | `tests/e2e/ubst-executor.e2e.mjs` |
| UBST reliability analysis | `scripts/testing/ubst-analysis.ts` |
| Usage pilot logger and converter | `/pilot`, `lib/pilot/navlog.ts`, `scripts/testing/pilot-profile.ts` |
| Round 3 regression cases (D07, D14, D15) | `tests/course/regression-round3.test.ts` |
| D16 regression cases | `tests/course/regression-d16.test.ts` |
| Models | `tests/course/models/` |
| Harness (in-memory Supabase, booking world) | `tests/course/helpers/` |

## How to run

One command per technique (see DEMO.md; start the app first with `npm run demo:app`
for the browser ones, and add `HEADED=1` to watch them):

```
npm run demo:baseline          # the existing suite (the baseline)
npm run demo:fsm               # FSM booking suites
npm run demo:fsm:onboarding    # FSM onboarding in a browser
npm run demo:pt                # partition suites
npm run demo:cft               # control flow suites
npm run demo:ubst              # 10 usage-based sessions in a browser
npm run demo:regression        # regression cases for the round 3 fixes
npm run demo:coverage          # branch coverage per technique
npm run demo:summary           # all results on one screen
```

Lower-level commands:

```
npm test                                   # whole suite, course suites included
npx vitest run tests/course                # course suites only
node scripts/testing/coverage-by-technique.mjs out.json   # coverage per technique
npx tsx scripts/testing/markov-walk.ts 200 2026 out.json   # draw UBST walks

# onboarding FSM in a browser (fixture mode, no keys needed)
NEXT_PUBLIC_DATA_SOURCE=fixture npm run dev -- -p 3100
node tests/e2e/onboarding-fsm.e2e.mjs http://localhost:3100 out.json
```

Round 1 results were recorded against the unmodified code (commit `bfad1d9`); the
fixes are in `fd5f75e`, `15ad94d` and `646fe01`; round 2 was recorded after them.
Round 3 covers the fixes for D07, D14 and D15 (`d95345b`); round 4 covers the D16 fix. UBST rounds:
`npx tsx scripts/testing/markov-walk.ts 60 <seed> suite.json`, then
`node tests/e2e/ubst-executor.e2e.mjs <baseUrl> suite.json round.json`, then
`npx tsx scripts/testing/ubst-analysis.ts analysis.json round1.json round2.json ...`.
