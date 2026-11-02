# Markov usage profile (Markov-OP/UBST)

Owner: Jayden. Model: `tests/course/models/usageProfile.ts` (version
`projected-v1`). Checks: `tests/course/markov-profile.test.ts`. Generator:
`scripts/testing/markov-walk.ts`.

## Why projected

Perch is an MVP with no production users, so there is no field data. The initial
profile encodes the designed user journey (onboarding first, then the Flyway feed,
Perches and booking as the core) as team estimates. It will be refined with
navigation counts from the pilot (10-15 student volunteers), and the reliability
figures will be reported as conditional on the profile, with a sensitivity check.

## States and transition matrix (rows sum to 1; EXIT absorbing)

| From \ To | ONB | FEED | PERCH | LIST | BOOK | NEG | MAP | CHIRP | NEST | EXIT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| START | .60 | .40 | | | | | | | | |
| ONBOARDING | | .85 | | | | | | | | .15 |
| FEED | | .10 | .35 | | | | .15 | .15 | .10 | .15 |
| PERCHES | | .10 | .20 | .45 | | .10 | | | | .15 |
| LISTING | | | .45 | | .30 | | | .10 | | .15 |
| BOOKING | | | .30 | | | | | .25 | .15 | .30 |
| NEGOTIATE | | | .30 | .40 | | | | | | .30 |
| MAP | | .35 | .20 | | | | .15 | | | .30 |
| CHIRPS | | .25 | | | | | | .30 | .15 | .30 |
| NEST | | .35 | .20 | | | | | .15 | | .30 |

Routes: ONBOARDING `/onboarding`, FEED `/feed`, PERCHES `/stories`, LISTING and
BOOKING are the detail sheet and request/confirm bar on `/stories`, NEGOTIATE
`/negotiate`, MAP `/map`, CHIRPS `/dms`, NEST `/profile/[id]`.

## Model validation (all pass)

* MK-01 every row is a probability distribution.
* MK-02 EXIT is reachable from every state (absorbing chain).
* MK-03 every screen is reachable from START.
* MK-04 the walk generator is reproducible for a fixed seed.
* MK-05 simulated visit frequencies (20,000 walks) match the analytic expected visits
  from the fundamental matrix N = (I - Q)^-1.

## Profile statistics (analytic) and the first generated suite (200 walks, seed 2026)

| Screen | Expected visits / session | Drawn suite |
| --- | --- | --- |
| ONBOARDING | 0.600 | 0.585 |
| FEED | 1.499 | 1.460 |
| PERCHES | 1.244 | 1.220 |
| LISTING | 0.610 | 0.585 |
| BOOKING | 0.183 | 0.190 |
| NEGOTIATE | 0.124 | 0.090 |
| MAP | 0.264 | 0.260 |
| CHIRPS | 0.529 | 0.455 |
| NEST | 0.257 | 0.210 |

Expected screens per session: 5.31 (drawn: 5.06). The suite has 115 distinct paths;
the most probable are START > ONBOARDING > EXIT (0.090), START > ONBOARDING > FEED >
EXIT (0.077) and START > FEED > EXIT (0.060).

## Next (second half)

1. Add opt-in navigation logging and run the pilot; re-estimate each row from counts
   (maximum likelihood: n(i,j) / n(i)) as `pilot-v1`.
2. Build the executor that replays each walk in Playwright against the live
   Supabase environment, recording a failure on any 5xx, uncaught page error or
   broken invariant.
3. Estimate reliability R = 1 - failures / runs per round, fit a simple reliability
   growth model across rounds, and vary key probabilities (booking and abandonment
   rows) +/- 50% as the sensitivity check.
