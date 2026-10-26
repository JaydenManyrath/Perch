# Baseline: the existing Vitest suite

The proposal names the repository's existing Vitest suite as the baseline for
comparison. It was measured before any course test was written (commit `60f8295`).

## Size and outcome

| Measure | Value |
| --- | --- |
| Test files | 72 (69 run, 3 skipped: they need live keys) |
| Test cases | 499 (492 pass, 7 skipped, 0 fail) |
| Wall time | about 12 s |
| Statement / line coverage, `lib/**` + `app/api/**` | 69.9% |
| Branch coverage, `lib/**` + `app/api/**` | 73.7% |

## Coverage of the modules this project targets (branch %)

Measured with `@vitest/coverage-v8` (`scripts/testing/coverage-by-technique.mjs`,
"baseline" set = everything except `tests/course/**`).

| Module | Baseline branch coverage |
| --- | --- |
| `app/api/cron/expire-listings/route.ts` | 0% (never executed) |
| `app/api/negotiate/route.ts` | 75% |
| `lib/bookings.ts` | 76% (`performTransition` never executed) |
| `lib/data/source.ts` | 67% (booking fallback paths not executed) |
| `lib/finance/model.ts` | 84% |
| `lib/negotiate/lease.ts` | 81% |
| `lib/negotiate/safety.ts` | 63% |
| `lib/sourcing/freshness.ts` | 91% (`runFreshnessPass` never executed) |
| Target set total | 76.7% |

## Defects detected

The baseline suite passes completely on the original code, so it detected **none** of
the 13 defects later found by the model-driven suites (see `defect-log.csv`). The
existing tests are largely example-based: they check the happy path of each
transition or rule and a few named error cases, but no invalid-transition matrix, no
partition edges on dates or pay periods, and no live-rejection fallback edge.

Note on v8 branch counts: the branch denominator for a file can change between runs
because v8 counts only branches in code that was loaded. Compare percentages within
one run of the script; the raw JSON is in `results/round*/coverage-by-technique.json`.
