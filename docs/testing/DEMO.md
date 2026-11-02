# TA Demo Script (15 minutes)

Jayden Manyrath and Koen Gennis. CS 7314/5314, Fall 2026.

Docs style: plain ASCII only (matches the repo README).

## Before the call (10 minutes)

1. `npm ci` (once).
2. Start the app with no keys (fixture data): `npm run demo:app`. Leave it running on
   http://localhost:3100.
3. In a second terminal, run `npm run demo:summary` once to make sure the saved results
   load.
4. Open these tabs so you can switch quickly:
   - the slide deck (`docs/testing/demo/Perch_Testing_Demo.pptx`),
   - `docs/testing/fsm/booking-fsm.md` (FSM model and diagram),
   - `docs/testing/pt/partitions.md` (partition tables),
   - `docs/testing/cft/cfg.md` (control flow graphs),
   - `docs/testing/markov/usage-profile.md` (Markov chain),
   - `docs/testing/defect-log.csv`,
   - http://localhost:3100 (the app).
5. Share your whole screen on Zoom so the TA sees both the terminal and the browser.

## Agenda

| Minute | Show | Command or file |
| --- | --- | --- |
| 0-2 | The app and what we test | Browser: splash, feed, Perches deck, a listing, request to book |
| 2-3 | The problem and the four techniques | Slides 1-3 |
| 3-5 | FSM/BBT: model, then run it | `booking-fsm.md`, then `npm run demo:fsm` |
| 5-6 | FSM in a real browser | `HEADED=1 npm run demo:fsm:onboarding` |
| 6-8 | PT/BBT: partition tables, then run | `partitions.md`, then `npm run demo:pt` |
| 8-9 | CFT/WBT: control flow graph, then run | `cfg.md`, then `npm run demo:cft` |
| 9-12 | Markov-OP/UBST: chain, live usage-based run | `usage-profile.md`, then `HEADED=1 npm run demo:ubst` |
| 12-14 | Results and analysis | `npm run demo:summary`, slides 7-9 |
| 14-15 | Questions | Q&A notes below |

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
Then run the onboarding machine in a visible browser: the TA watches it walk all 8
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
show a fake success (D13). Branch coverage on the target modules: 76.6% baseline to
82.8%.

**Markov-OP/UBST (9-12).** "UBST tests what users do most. We built a Markov chain over
the 9 main screens, generated random sessions from it, and replayed them in a real
browser." Run `HEADED=1 npm run demo:ubst` (10 sessions, about a minute) and let the TA
watch. Explain the oracle: a session fails if a screen is not reached, the page throws,
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
wrote anything: 499 cases, 76.6% branch coverage on the target modules, 0 defects found.

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

- Port in use: stop the other server or change 3100 in the `demo:*` commands.
- A browser test times out on a slow machine: run it again without `HEADED=1`.
- Everything is also saved: show `docs/testing/results/round*/` and
  `docs/testing/ubst/round*.json` and run `npm run demo:summary`.
