# Cross-Technique Analysis

Docs style: plain ASCII only. Numbers come from `docs/testing/results/round*/`,
`docs/testing/ubst/` and `docs/testing/defect-log.csv`; `npm run demo:summary` prints
them.

## 1. Results per technique

| Technique | Test cases | Failing in first round | Failing now | Defects found | High severity |
| --- | --- | --- | --- | --- | --- |
| Baseline (existing suite) | 499 | 0 | 0 | 0 | 0 |
| FSM/BBT (booking, live + fixture) | 64 | 10 | 0 | 7 + D07 from modeling | 0 |
| FSM/BBT (onboarding, browser) | 10 | 1 | 0 | D08 | 0 |
| PT/BBT | 78 | 10 | 0 | 4 (D09-D12) | 1 (D09) |
| CFT/WBT | 37 | 4 | 0 | 1 (D13) | 1 (D13) |
| Markov-OP/UBST | 180 sessions | 10 sessions | 0 sessions | 2 (D15, D16) | 1 (D15) |
| Code walkthrough (not a technique) | - | - | - | 1 (D14) | 0 |

Sixteen defects in total; 15 are fixed and retested, and D16 is open as a design
decision (hide or label listings another intern already holds).

## 2. Applicability

Each technique found the kind of defect its model targets, and none of the 16 defects
was found by two techniques.

- **FSM** fit the booking and onboarding workflows. All eight of its defects depend on
  the order of events or on two actors interacting (double approve, relisting a taken
  listing, two interns requesting at once, onboarding with inverted dates). Building the
  model also found a specified transition (cancel) that had no implementation.
- **PT** fit the numeric and date rules. All 19 hand-computed tax and rent values
  matched the code; every PT defect sat in an unusual or invalid class (pay period,
  malformed or inverted dates, a stated budget below the salary ceiling).
- **CFT** was the only technique that reached the internal edge where a server refusal
  was treated like an outage (D13). A black-box test sees the same screen either way.
- **UBST** found the failures users would actually hit most: the negotiate scouts were
  broken whenever the app ran without keys (D15), which the other techniques missed
  because they test the route with keys mocked in.

## 3. Effectiveness and cost

By count FSM found the most defects. Weighted by severity, PT, CFT and UBST each found
one of the three high-severity defects. Execution cost is small for every technique:
the 195 course unit/integration cases run in a few seconds, the onboarding browser run
in about a minute, and 60 UBST sessions in about 4 minutes. Model construction and
triage dominate the cost; hours per technique are recorded in `effort-log.csv` (team to
complete) for the defects-per-hour comparison.

Coverage (branch, target modules, v8): baseline 76.6%, with the course suites 82.7%.
The largest gains are on code the baseline never ran: the expiry cron route (0% to
87.5%), `lib/bookings.ts` (76% to 86%), the safety scout (63% to 89%) and the lease
scout (81% to 100%).

## 4. Defect classification (ODC)

| ODC type | Count | Defects |
| --- | --- | --- |
| Checking | 8 | D01-D05, D08, D11, D12 |
| Function | 3 | D07, D15, D16 |
| Algorithm | 2 | D09, D10 |
| Assignment | 2 | D06, D14 |
| Interface | 1 | D13 |

Missing or wrong validation (Checking) dominates: most defects are rules that existed in
the specification but were not enforced on every path, especially the fixture path that
the app uses by default.

## 5. Reliability and quality trend

| UBST round | Code | Sessions | Defect failures | Nelson R | 95% interval |
| --- | --- | --- | --- | --- | --- |
| 1 | before D15 fix | 60 | 10 | 0.833 | 0.720-0.907 |
| 2 | D15 fixed | 60 | 1 (D16) | 0.983 | 0.911-0.997 |
| 3 | same as round 2 | 60 | 0 | 1.000 | 0.940-1.000 |

Two further failures (one in round 1, one in round 2) were investigated and found to be
test-driver problems, not app defects; they are excluded above and listed in
`ubst/triage.json`. A Goel-Okumoto model fitted to cumulative failures against
cumulative sessions (a = 11.05, b = 0.0395) predicts almost no remaining failures, but
that is optimistic because D16 is still open and appears only on rare paths.

The course-suite failures fell from 25 in round 1 to 0, with no regression in the 499
baseline tests.

Sensitivity check (round 1 failure data): changing the booking or onboarding
abandonment probabilities by +/-50% moves predicted reliability by less than 0.01, but
changing how often users open the negotiate screen moves it from 0.94 (x0.5) to 0.84
(x1.5). The estimate is sensitive exactly where the failures were, which is why the
reliability figures are stated as conditional on the projected profile.

## 6. Limits and next steps

- The usage profile is projected; the pilot logger (`/pilot`) is ready, and the pilot
  with 10-15 volunteers will replace it with measured probabilities
  (`scripts/testing/pilot-profile.ts`), after which the UBST rounds should be re-run.
- UBST ran on the fixture data source; the executor takes any base URL, so the same
  suite can be run against the deployed app with live Supabase.
- Data flow testing on the finance pipeline (offer letter to take-home to budget) is the
  natural next technique.
