# CS 7314/5314 Testing Project - Perch

Jayden Manyrath and Koen Gennis. Fall 2026, Prof. Jeff Tian.

Docs style: plain ASCII only (matches the repo README).

This folder holds the models, test suites, raw results and analysis for the course
project "Comparing Black-Box, White-Box, and Usage-Based Testing Techniques on
Perch". Everything here was produced specifically for the course.

## Index

| Artifact | Path |
| --- | --- |
| Progress report (Part 2/4) | [progress-report.md](progress-report.md) |
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
| Models | `tests/course/models/` |
| Harness (in-memory Supabase, booking world) | `tests/course/helpers/` |

## How to run

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
