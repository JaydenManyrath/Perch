# TA Demo Script (15 minutes)

Jayden Manyrath and Koen Gennis. CS 7314/5314, Fall 2026.

Docs style: plain ASCII only (matches the repo README).

## The short version

| When | Do this |
| --- | --- |
| Once, the day before | `git pull`, `npm ci`, then `npm run demo:prepare`. It installs the test browser, builds the app in demo mode and dry-runs every step. It ends with a PASS/FAIL list; all PASS means you are ready. |
| Demo day, 5 minutes before | Open the slide deck (`docs/testing/demo/Perch_Testing_Demo.pptx`) and a terminal in the repo. Share your whole screen on Zoom. |
| During the call | Present slides 1-12 (about 10 minutes; each slide's notes have a short script). At slide 13, run `npm run demo` for about 3 minutes of live testing: booking flow, edge cases, code paths, onboarding and 10 user visits in a visible browser, then the summary. Enter runs a step, `s` skips, `r` reruns, `q` quits. |
| After | Quitting stops the app. Nothing else to clean up. |

Works the same on macOS, Windows and Linux (plain Command Prompt or PowerShell is fine).
Your own `.env.local` keys are ignored during the demo: it always runs on built-in
fixture data, so no login and no live database.

## The full walkthrough (`npm run demo:full`)

Not needed for the planned demo; use it if the TA wants to go through everything. The steps follow the TA's demo checklist in order. Steps 1-5 open the app or a section of
the demo dashboard (`docs/testing/demo/dashboard.html`, works offline); steps 6a-7 run the
tests live.

| # | Checklist item | Slide | What happens |
| --- | --- | --- | --- |
| 1 | System under test | 1-4 | Opens the app; click splash, feed, Perches deck, a listing, Request to book |
| 2 | Raw data and how it was collected | 5 | Dashboard: data behind each model and its source |
| 3 | Analysis of that data | 6 | Dashboard: baseline coverage gaps, usage-profile visits |
| 4 | Testing models | 7-10 | Dashboard: booking and onboarding FSMs, partition tables, control flow graphs, Markov matrix |
| 5 | Test cases, individual and as a suite | 11 | Dashboard: every case by technique, with its result on the original code and now |
| 6a | Execution: baseline | 12 | The existing 499-case suite (all pass, 0 of 16 defects found) |
| 6b | Execution: FSM booking | 12 | 64 state-machine tests (T valid, I invalid, P paths, C races) |
| 6c | Execution: FSM onboarding | 12 | A visible browser walks all 8 onboarding screens |
| 6d | Execution: PT | 12 | 78 partition tests (PF-23 is the $45/hr case) |
| 6e | Execution: CFT | 12 | 37 branch tests (CF-35 is the fake-success case) |
| 6f | Execution: UBST | 12 | 10 random user sessions replayed in a visible browser (about a minute) |
| 6g | Execution: regressions | 12 | Tests that keep D07, D14, D15 and D16 fixed |
| 7 | Results and analysis | 13-15 | Summary on screen, then the dashboard's defect log and analysis |

If the TA asks to see something in more depth, the dashboard has it: models (section 4),
every individual test case (section 5), raw result files for every round (section 6, links)
and the defect log with ODC classification (section 7).

Single steps can also be run on their own: `npm run demo:fsm`, `demo:pt`, `demo:cft`,
`demo:fsm:onboarding`, `demo:ubst`, `demo:regression`, `demo:summary`, or
`npm run demo:app` to just start the app, `npm run demo:dashboard` to open the dashboard.

## What to say at each step

**The app (0-2).** Perch helps interns find sublets, friends and events in a new city.
With no keys it runs on built-in fixture data, which is how we test without touching a
real database. Click through the screens the tests will exercise.

**FSM/BBT (3-6).** "Booking correctness depends on the order of events, so we modeled the
booking lifecycle as a state machine: 7 states, 13 valid transitions. From the model we
derived every valid transition, 18 invalid ones (approve twice, confirm a taken listing,
two interns requesting the same place), 5 longer paths and 2 race conditions. We ran it
against both implementations of the rules: the live API code and the no-key fixture
code." Run `npm run demo:fsm` and point at the test names (T01..., I01..., P01..., C01).
Then run the onboarding machine in a visible browser (step 4): the TA watches it walk all 8
onboarding screens and check the guard on the review screen. Defects found: 8 (D01-D08),
for example a taken listing could be relisted, and the fixture let a booked booking be
re-approved.

**PT/BBT (6-8).** "The verdict and finance rules are functions of numbers and dates, so
we split each input into valid and invalid classes and tested both sides of every
boundary. All expected values were computed by hand." Run `npm run demo:pt`. Point at the
pay-period classes: "$45.00 per hour" used to be read as a $45 yearly salary (D09),
which made every listing fail the budget check.

**CFT/WBT (8-9).** "Error and fallback paths are rarely reached by black-box tests, so we
drew control flow graphs and forced every branch." Run `npm run demo:cft`. Point at
CF-35: when the server refused a booking, the client used to take the outage branch and
show a fake success (D13). Branch coverage on the target modules: 77.3% baseline to
82.8%.

**Markov-OP/UBST (9-12).** "UBST tests what users do most. We built a Markov chain over
the 9 main screens, generated random sessions from it, and replayed them in a real
browser." Run step 7 (10 sessions, about a minute) and let the TA watch. Explain the oracle: a session fails if a screen is not reached, the page throws,
the server returns a 5xx, or a feature shows an error. Round 1 found D15 (the negotiate
scouts failed with no keys); after the fix, reliability went from 0.83 (round 1) to 0.98
(round 2) and 1.00 (rounds 3 and 4, 60 of 60 sessions each). Round 2 also found D16: the
deck offered "Request to book" on a listing another intern already held, which the app then
refused; held listings are now hidden from the deck.

**Results (12-14).** Run `npm run demo:summary`. It prints, per technique, the cases,
failures in round 1 and now, defects found, the ODC breakdown, coverage, and the UBST
reliability per round with the sensitivity check.

## Questions the TA is likely to ask

**How do you know a technique worked?** We compare against the baseline: the existing
499-test suite passed on the original code and found 0 of our 16 defects. Each technique
found defects of the kind its model targets (FSM: order and concurrency; PT: input
boundaries; CFT: hidden fallback paths; UBST: failures on common user paths), and no
defect was found by two techniques.

**What is the baseline?** The repository's existing Vitest suite, measured before we
wrote anything: 499 cases, about 77% branch coverage on the target modules (76.7% first measured, 77.3% on the final code), 0 defects found.

**Is quality getting better?** Yes, measurably. Course-suite failures went from 25 in
round 1 to 0. UBST reliability went from 0.83 (round 1) to 0.98 (round 2) and 1.00
(rounds 3 and 4; 95% interval 0.94-1.00) after fixing D15 and D16. A Goel-Okumoto growth
fit to the cumulative failures predicts about 0.05 remaining failures, indicative only with
four rounds. See `npm run demo:summary`.

**What about other techniques?** Boundary testing is built into our PT cases (every
threshold has a case on each side). Data flow testing would suit the finance pipeline
(offer letter to take-home to budget) and is the natural next technique.

**Where did the usage profile come from?** It is projected (team estimates from the
designed journey) because Perch has no real users. We built an opt-in pilot logger
(`/pilot`) so volunteers can send real navigation data; `scripts/testing/pilot-profile.ts`
turns those logs into a refined profile. The reliability numbers are conditional on the
profile, which is why we ran the sensitivity check.

**Why did some UBST failures not count?** Two failures were investigated and turned out
to be problems in our test driver, not the app; they are documented in
`docs/testing/ubst/triage.json` and excluded from the adjusted reliability (the raw
number is reported too).

## If something goes wrong live

- "Chromium for the tests is missing": run `npm run demo:prepare` once.
- "The app did not start on port 3100": something else is using the port. Close the
  other app (or an old demo terminal) and run `npm run demo` again.
- A browser step fails on a slow machine: press `r` to run it again.
- Everything is also saved: `npm run demo:summary` needs no app or browser, and the raw
  results are in `docs/testing/results/` and `docs/testing/ubst/`.
