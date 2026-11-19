# Perch Testing Project: TA Demo Prep Sheet

Jayden Manyrath and Koen Gennis | CS 7314/5314, Fall 2026 | 15-minute TA demo (Zoom) | Last day: Nov 20

## How the 15 minutes go

The TA asked us to bring documentation, diagrams, code, test cases and collected data, and to be ready for live testing. Plan: about 6 minutes of slides, then about 3 minutes of live testing at the end, leaving about 5 minutes for questions and discussion of the results (the TA asked us to be ready to discuss them, so that time is useful, not slack). The times below are the speaker notes read at a normal pace plus a few seconds to point at the slide; don't pad them. No switching back and forth. The slides are written for a non-specialist; the technical terms are in the speaker notes and in sections 1-9 below, ready for questions.

| Slide | What it shows | TA's list | Who | Time |
| --- | --- | --- | --- | --- |
| 1 | Title | | Jayden | 0:15 |
| 2 | Perch, with real screenshots | System | Jayden | 0:30 |
| 3 | 499 old tests found 0 of 16 problems; our four methods | Approach, baseline | Jayden | 0:35 |
| 4 | Collected data and how; analysis of what the old tests reached | Collected data | Koen | 0:35 |
| 5 | Diagram 1: booking state machine | Diagrams (FSM) | Jayden | 0:35 |
| 6 | Diagrams 2-3: edge-case ranges, code-path flow chart | Diagrams (PT, CFT) | Koen | 0:40 |
| 7 | Diagram 4: the user journey with its odds | Diagrams, collected data (Markov) | Jayden | 0:35 |
| 8 | Example test cases and the full suite | Test cases | Koen | 0:35 |
| 9 | Screenshots of today's test runs | Execution | Koen | 0:30 |
| 10 | 16 problems by method, with examples | Results, analysis | Koen | 0:35 |
| 11 | What we learned, and the limits | Analysis | Jayden | 0:25 |
| 12 | Live testing: run `npm run demo` | Live testing | Jayden drives, both talk | 3:00 |
| | **Total** | | | **about 9 minutes**, leaving 6 min for questions |
| 13-17 | Backup: full summary, onboarding run, numbers by method (with course names), where every document lives | Documentation | Whoever is asked | |

Each slide's speaker notes have a short script in plain words. The presenter split follows our proposal (Jayden: FSM, Markov/UBST, the app; Koen: PT, CFT, baseline and coverage).

**Live testing (slide 12).** `npm run demo` starts the app and runs six steps, one per Enter: booking flow (64 tests), edge cases (78), code paths (37), onboarding in a visible browser (13 checks, about 50 s), 10 simulated user visits in a visible browser (about 70 s), and the summary. `s` skips a step, `r` reruns it, `q` quits. The browser steps are slowed down on purpose so the TA can follow each screen. To change the speed, set `SLOWMO` (milliseconds between actions) before running: in PowerShell `$env:SLOWMO=800; npm run demo` is slower, `$env:SLOWMO=300` is faster (it lasts until you close that terminal). If the TA asks for something else, any single step runs on its own: `npm run demo:baseline`, `demo:regression`, `demo:dashboard`, or `npm run demo:full` for the long checklist walkthrough.

**If live testing fails:** press `r` once. If it still fails, go to the backup slides; the screenshots on slides 9, 14 and 15 are from a real run on Nov 19.

## How to study this sheet

Sections 1-7 follow the TA's checklist. For each one: where it is in the deck, the facts to know without looking, and likely questions with short answers. Section 8 explains every defect and its fix; section 9 explains the concepts in plain language. Study in four rounds:

1. **Alone:** read sections 8 and 9 in full, then your own slides and sections, then the live testing script.
2. **Together:** a timed run-through of the slides plus the live testing; aim for 9-10 minutes.
3. **Together:** quiz each other from "All likely questions in one place" near the end.
4. **Morning of:** a 15-minute skim.

## Before the demo (do these)

- Sign up for a slot on the TA's sheet (demos run Nov 10-20, weekday evenings 6:30-9:00).
- The day before, on the laptop you will present from: `git pull`, `npm ci`, `npm run demo:prepare`. It must end with every step PASS.
- Fill in `docs/testing/effort-log.csv` with your real hours (for the final report).
- Open before the call: the slides (`docs/testing/demo/Perch_Testing_Demo.pptx`) and a terminal in the repo. Run nothing yet.
- On the call: share your whole screen and present the slides. At slide 12, switch to the terminal and run `npm run demo`.

## Live testing script (slide 12, about 3 minutes)

Jayden types and Koen narrates steps 2 and 3. Read this once on its own before the run-through. The same lines are in slide 12's speaker notes.

**Before step 1, on the slide:** "Now the same tests from the screenshots, running live on the fixed app." Switch to the terminal and run `npm run demo`. It starts the app first, which takes a few seconds.

1. **Booking flow (Jayden).** Press Enter. "Each line is one step from the booking diagram. T lines are allowed steps, I lines are steps that must be refused, C lines are two people booking at the same moment. All 64 pass." Point at C01: "this one used to crash."
2. **Edge cases (Koen).** "Each line is one range from the edge-case diagram, tested right at its edges. PF-23 is the $45-per-hour case that used to be read as $45 a year." 78 pass.
3. **Code paths (Koen).** "One test for every branch of the flowchart. CF-35 is the refused booking that used to show a fake success." 37 pass.
4. **Onboarding in a browser (Jayden).** A browser window opens; let the TA watch it. "A robot fills in onboarding like a user. Continue stays locked until the flagged fields are checked. It also tries an end date before the start date, which the app used to accept." If asked about the orange OBS line: "That's a note, not a failure. The spec doesn't say what should happen on a reload."
5. **Simulated users (Jayden, about 70 seconds, so keep talking).** "This generates 10 random visits using the odds from the user-journey diagram. The top lists each screen's planned visits next to the actual ones. Each dot is one visit that passed. A visit fails if a screen doesn't load, the page crashes, or a feature shows an error. Our first round had 1 in 6 fail; now it's zero." Ends with "10 runs, 0 failed, R = 1".
6. **Summary (Koen).** "Everything on one screen: tests per method, the 16 problems, 0 caught by the old tests, and reliability by round."

**Close (Jayden):** "That's our project. Happy to take questions or run anything else." Leave the terminal up; the TA may ask for another command (see the questions section).

**If a step fails:** press `r` once. If it fails again: "That's this laptop; here's the same run from today." Go back to the slides: 9 (test runs), 14 (summary), 15 (onboarding).

## 1. System under testing

**Show:** slide 2 (screenshots of the app). If the TA wants to see it running: `npm run demo:app`, then http://localhost:3100.

**Know:**

- Perch is a Next.js + Supabase web app for interns relocating for a summer job: onboarding from an offer letter, an event feed, a swipe deck of sublets with booking, a city map, messages and a profile.
- We test it in demo mode: built-in fixture data, no keys, no login. That is also the app's default when no keys are set.
- The parts under test, and which technique covers each:

| Function | Component | Technique |
| --- | --- | --- |
| Onboarding from an offer letter | onboarding screens, offer parser | FSM (browser), PT |
| Booking: request, approve, confirm, cancel | `lib/bookings.ts`, booking and listing API routes, `lib/data/source.ts` | FSM, CFT, UBST |
| Housing verdicts and finance readout | `lib/negotiate/*`, `lib/finance/model.ts`, `/api/negotiate` | PT, UBST |
| Listing freshness (expire, ping) | `lib/sourcing/freshness.ts`, expiry cron | CFT |
| Feed, map, messages, profile | whole app | UBST |

**Likely questions:**

- *Why these parts?* They are the riskiest: booking depends on the order of events, the verdict rules are numbers and dates, and the fallback and expiry code is full of rarely-run branches.
- *Is this the real app?* Yes. The tests run the real route handlers and library code, and the browser tests click through a real production build.

## 2. Raw data for model construction, and how it was collected

**Show:** slide 4 (the table on the left). Detail: dashboard section 2 (`npm run demo:dashboard`).

**Know:**

| Model | Raw data | How collected |
| --- | --- | --- |
| FSM booking | Contract section 13.4 state machine, README freshness rules, one-live-hold database index | Read from the spec, not the code, so the model is an independent oracle |
| FSM onboarding | The 8 onboarding screens and the review-screen guard | Walked through in the running app |
| PT partitions | Documented 2025 single-filer tax constants; scout thresholds (10% over budget = flag, 7-day lease gap, 10/20-minute walk) | Expected values computed by hand |
| CFT graphs | Source code of the 14 target modules | Decision points traced by hand into 6 graphs |
| Markov profile | Designed user journey plus team estimates | Projected (no production users); the opt-in `/pilot` logger collects real navigation data to refine it |
| Baseline | The existing 499-case test suite on the original code | Coverage measured with Vitest's v8 coverage before any course test was written |

Run data: every round's test results, all usage-based sessions and the defect log are saved under `docs/testing/`.

**Likely questions:**

- *Where did the transition probabilities come from?* Team estimates of the designed journey, because Perch has no real users yet. We built `/pilot` so volunteers can record real screen-to-screen data, and `scripts/testing/pilot-profile.ts` turns their logs into a refined profile. The pilot has not been run, so say so plainly.
- *Why build the FSM from the spec instead of the code?* If the model came from the code, the tests could only confirm what the code already does. From the spec, they can show where the code disagrees with what it should do.

## 3. Analysis of that data

**Show:** slide 4 (the chart) and slide 7 (visits per session). Detail: dashboard section 3.

**Know:**

- **Baseline:** 499 cases, all passing (7 skipped because they need live keys), and **0 of our 16 defects** detected.
- **Branch coverage of the target modules:** 77.3% for the baseline alone, 82.8% with our suites. Both were measured in the same run on the final code. When first measured on the original code it was 76.7%.
- **Gaps the baseline left:** the expiry cron route at 0%, the server-side booking transition never run, and the data-source fallback for bookings only partly covered. That is where we aimed CFT and FSM.
- **Usage profile:** about 5.3 screens per session. Expected visits per session are Feed 1.50, Perches deck 1.24, Listing 0.61, Onboarding 0.60, Messages 0.53, Map 0.26, Profile 0.26, Booking 0.18, Negotiate 0.12. Computed from the fundamental matrix N = (I - Q)^-1.

**Likely question:** *What did the analysis change?* It decided where the tests went: white-box and FSM effort on the low-coverage modules, and most usage-based sessions on the feed and the deck, because that is where users spend their time.

## 4. Testing models

**Show:** slides 5-7. Dashboard section 4 has every model in full.

**FSM/BBT (Jayden).**

- Booking model: **7 states** (Listed, Requested, Approved, Booked/taken, Declined, Cancelled, Stale), **13 valid transitions**, **18 invalid pairs** (sneak paths: wrong actor gets 403, wrong state gets 409, state unchanged), **5 multi-event paths** and **2 race cases**.
- It was run against two implementations: the live API code and the fixture code the app uses by default.
- Onboarding model: 8 screens, with the guard on leaving the review screen.

**PT/BBT (Koen).** 7 input dimensions, each split into valid and invalid classes with a case on both sides of every boundary:

- rent vs budget: 2,000 | 2,001 | 2,200 | 2,201
- salary band: 14,600 | 14,601 | the Social Security wage base
- pay period in the offer letter: annual / hourly / weekly / monthly / missing
- lease window vs stay: 7 vs 8 days at each end
- walk to anchor: 10 | 11 | 20 | 21 minutes
- cost-of-living index: low, average, high, capped / zero, negative, NaN
- safety flags

**CFT/WBT (Koen).** 6 control flow graphs:

1. freshness planner
2. freshness pass
3. expiry cron route
4. booking transition function
5. `performTransition`
6. the fixture/live fallback

One test per branch edge.

**Markov-OP/UBST (Jayden).** A chain over 9 screens plus Start and Exit, as an 11 x 11 transition matrix where every row sums to 1. Validated 5 ways:

- every row is a probability distribution;
- Exit is reachable from every screen;
- every screen is reachable from Start;
- the generator is reproducible with a fixed seed;
- 20,000 simulated sessions match the analytic expected visits.

**Likely questions:**

- *Why an FSM for booking?* Correctness depends on the order of events, such as approving twice or confirming a taken listing. A flat partition can't express order.
- *Why PT for the rules?* They are near-pure functions of numbers and dates, so classes and boundaries cover them cheaply and systematically.
- *Why CFT?* Error and fallback branches are rarely reached by black-box tests.
- *Why Markov?* It puts test effort where users actually go, and it yields a reliability estimate.

## 5. Test cases (individual and the organized suite)

**Show:** slide 8. Dashboard section 5 lists every test case with its result on the original code and now.

**Know:**

| Technique | Suite | Cases | Failed on original code | Id scheme |
| --- | --- | --- | --- | --- |
| FSM | `fsm-booking-live`, `fsm-booking-fixture` | 64 (40 + 24) | 10 | T valid, I invalid, P path, C race |
| FSM (browser) | `onboarding-fsm.e2e` | 10 | 1 | OB-T01..T14 |
| PT | `pt-verdict-rules`, `pt-finance` | 78 (45 + 33) | 10 | PB, PL, PR, PS, PA, PF, PN = partition rows |
| CFT | `cft-branches`, `cft-source-fallback` | 37 (27 + 10) | 4 | CF-nn = one graph edge |
| Markov-OP | `markov-profile`, `pilot-profile` | 10 | added later | MK, PL = model checks |
| UBST | generated suites, 60 per round | 240 sessions | 10 sessions | UB-nnn = one session |
| Regression | `regression-round3`, `regression-d16` | 11 | added later | R3, R16 = later fixes |

That is 200 course cases (all in `tests/course`), plus 10 browser cases and 240 usage-based sessions.

**Good individual cases to point at:**

- **PF-23:** "$45.00 per hour" must be annualized, not read as a $45 yearly salary.
- **I13:** relisting a booked listing must be refused.
- **C01:** two interns request the same listing at once; the loser must get 409, not 500.
- **CF-35:** a server refusal must reach the user, not a fake success.

**Likely question:** *How do the test cases trace to the models?* Each id maps to one model element: T05 is FSM transition 5, PL-05 is a row of the lease partition table, CF-35 is one edge of control flow graph 6. That is how we show transition, class and branch coverage.

## 6. Test execution, live, and results

**Show:** slide 9 (screenshots), then live on slide 12 (`npm run demo`).

`npm run demo` runs these in order (Enter for each):

| # | What runs | Time | Expected result |
| --- | --- | --- | --- |
| 1 | Booking flow (FSM) | about 1 s | 64 pass |
| 2 | Edge cases (PT) | about 1 s | 78 pass |
| 3 | Code paths (CFT) | about 1 s | 37 pass |
| 4 | Onboarding in a visible browser (FSM) | about 50 s | 9 PASS lines, plus 1 OBS observation |
| 5 | 10 simulated user visits in a visible browser (UBST) | about 70 s | dots = passed visits; ends "10 runs, 0 failed, R = 1" |
| 6 | Summary | instant | the numbers on slide 10, plus reliability per round |

On request: `npm run demo:baseline` (499 cases: 492 pass, 7 skipped, about 14 s) and `npm run demo:regression` (11 pass).

**Rounds:**

| Round | Code | Course suites failing | UBST sessions failing (of 60) |
| --- | --- | --- | --- |
| 1 | original | 24 of 174, plus 1 browser case | 10 |
| 2 | 12 defects fixed | 0 | 1 |
| 3 | D07, D14, D15 fixed | 0 | 0 |
| 4 | D16 fixed | 0 of 200 | 0 |

**The UBST failure oracle:** a session fails if the expected screen is not reached, the page throws an exception, the server returns a 5xx error, or a feature shows an error to the user.

**Likely question:** *How do we know these are real tests and not tests written to pass?* On commit `bfad1d9`, the original code, the course suites fail 24 times. On `main` they all pass. The D16 tests fail 4 of 5 on the code from before the fix. To prove it live: `git checkout bfad1d9`, run `npx vitest run tests/course`, then `git checkout main` and run it again. Expected values came from the spec and hand calculation, not from the code's output.

## 7. Result data and analysis

**Show:** slides 10-11, and the live summary for reliability per round; backup slides 14 and 16 for the full numbers. Dashboard section 7 has the defect log.

**Defects: 16 found, all 16 fixed and retested.**

| Technique | Defects | High severity | What kind |
| --- | --- | --- | --- |
| FSM | 8 (D01-D08; D07 found while building the model) | 0 | Event order, two actors, a missing transition |
| PT | 4 (D09-D12) | 1 (D09: hourly pay read as a yearly salary) | Unusual and invalid input classes |
| CFT | 1 (D13) | 1 (fake success on a server refusal) | A hidden fallback branch |
| UBST | 2 (D15, D16) | 1 (D15: negotiate broken with no keys) | Failures on common user paths |
| Code walkthrough | 1 (D14: hard-coded stay dates) | 0 | Not a testing technique |
| Baseline | 0 | 0 | - |

- **By ODC type:** Checking 8, Function 3, Algorithm 2, Assignment 2, Interface 1. The largest group, half the defects, were rules in the spec that were not enforced on every path.
- **By ODC trigger:** FSM defects came from test sequencing and interaction, PT from test variation, CFT from a complex path, and UBST from workload/usage.
- **By severity:** high 3, medium 8, low 5.

**Reliability (UBST, Nelson model R = 1 - failures/sessions):**

| Round | R | 95% interval |
| --- | --- | --- |
| 1 | 0.833 | 0.72-0.91 |
| 2 | 0.983 | 0.91-1.00 |
| 3 | 1.000 | 0.94-1.00 |
| 4 | 1.000 | 0.94-1.00 |

- **Growth model:** Goel-Okumoto on cumulative failures vs cumulative sessions, a = 11.05, b = 0.0395; it predicts about 0.05 failures remaining. That is indicative only with four rounds.
- **Sensitivity (round 1 data):** changing the booking or onboarding-abandonment probability by ±50% moves predicted reliability by less than 0.01. Changing how often users open negotiate moves it to 0.94 (x0.5) or 0.84 (x1.5). The estimate is sensitive exactly where the failures were, which is why the reliability figures depend on the profile.
- **Two UBST failures were not app bugs.** UB-015 and UB-032 were mistakes in our own test script; we investigated, documented them in `ubst/triage.json`, and report reliability with and without them.

**Likely questions (about slides 10-11):**

- *How do you know a technique worked?* Each found the kind of problem its model targets, and no problem was found by two methods (slide 10). 16 problems against the old tests' 0; the booking-flow method found the most, and edge cases, code paths and simulated users each found one of the three serious ones.
- *What is the baseline?* The 499 tests the app already had, run before we wrote anything: they all passed, reached about 77% of the decision points in the riskiest code, and caught 0 of the 16 problems (slide 3).
- *Is quality getting better?* Yes. The course tests went from 24 failures on the original code to 0 (slide 9), all 16 problems are fixed and retested, and none of the 499 old tests broke. The live summary also shows simulated-user visits going from 83% to 100% without failure.

## 8. Every defect: what went wrong, how it was found, how it was fixed

Know each one in a sentence; the TA may point at any row of the defect log. Every fix has a regression test, so it stays fixed.

| Id | What went wrong | Caught by | How we fixed it |
| --- | --- | --- | --- |
| D01 | A subletter could relist a listing that was already booked, so it showed up in the deck again | FSM I13 (live API) | The relist route refuses a taken listing (409) |
| D02 | Two interns requesting the same listing at once: the loser got a server error (500) instead of "already held" (409) | FSM C01 (race) | The book route maps the database's duplicate-hold error to 409 |
| D03 | In fixture mode, a booked or declined booking could be re-approved or declined | FSM I04, I05, I07 (fixture) | Fixture approve/decline now go through the same state-machine function as the live code, so illegal moves change nothing |
| D04 | In fixture mode, you could request a listing that was already held, taken or stale | FSM I09, I11, I12 (fixture) | The fixture request checks the listing is available and has no live hold |
| D05 | In fixture mode, relisting a taken listing made it available again | FSM I13 (fixture) | The fixture relist refuses a taken listing, same rule as the live route |
| D06 | The fixture relist used a 14-day freshness window instead of the 7 days in the spec | FSM T12 (fixture) | It uses the shared 7-day freshness function |
| D07 | The spec says a booker can cancel, but no route or button existed | Found while building the FSM model | Added a cancel API route, a fixture cancel and a Cancel button; cancelling a booked stay releases the listing |
| D08 | Onboarding let you continue with an end date before the start date | FSM OB-T12 (browser) | Continue is disabled and a message shows when end is before start |
| D09 | "$45.00 per hour" in an offer letter was read as a $45 yearly salary, with high confidence (high severity) | PT PF-23 to PF-26 | The parser spots hourly, weekly and monthly pay, annualizes it (x2,080 hours, x52, x12) and flags the salary for the user to check |
| D10 | When a salary was known, the negotiate route ignored a lower budget the intern typed | PT PN-01 | The route uses the lower of the stated budget and the salary-based ceiling |
| D11 | The negotiate route accepted made-up dates ("June 8") and move-out before move-in | PT PN-03, PN-04 | Request validation requires real calendar dates with move-in on or before move-out (400 otherwise) |
| D12 | The lease check printed "Gap of NaN days" on bad dates and said "covers your stay" for an inverted stay | PT PL-13 to PL-15 | Bad or inverted dates return a clear fail ("Lease dates unknown" / "Stay dates invalid") |
| D13 | When the server refused a booking (409/403), the app treated it like a network outage and showed a fake successful request (high severity) | CFT CF-35 to CF-38 | Refusals now reach the user as an error message; real outages still fall back to fixture data |
| D14 | The negotiate screen always used the same hard-coded 2026 stay dates | Code walkthrough | The stay starts on the intern's own move-in date (10-week default) and both dates are editable |
| D15 | The negotiate feature failed with an authorization error whenever the app ran without keys (high severity) | UBST round 1 (10 of 60 sessions) | In fixture mode the route scores the fixture listings without needing a login |
| D16 | The deck offered "Request to book" on listings another intern already held, then refused the request | UBST round 2 (1 session) | Listings held by someone else are hidden from the deck (the people in that booking still see them) |

**Patterns worth saying out loud:**
- Half of the FSM defects (D03-D06) were in the fixture path, the code the app actually runs by default. We would have missed them if we had only tested the live API.
- All three high-severity defects came from different techniques: PT (D09), CFT (D13) and UBST (D15).

## 9. Concepts in plain language

For each: what it means, and the sentence to say if the TA asks.

**Black-box, white-box and usage-based testing.**
- **BBT** designs tests from the specification, without looking at the code.
- **WBT** designs tests from the code's structure.
- **UBST** designs tests from how users actually use the system.
- *Say:* "We used two black-box techniques, FSM and PT, one white-box technique, CFT, and one usage-based technique, Markov-OP, so we covered all three perspectives."

**FSM, transition coverage, sneak paths.**
- A finite state machine models the system as states plus the events that move it between them.
- **Transition coverage** means every valid transition is tested at least once.
- **Sneak paths** are events that should NOT be allowed in a state (approving twice, confirming a taken listing). We test that they are rejected and leave the state unchanged.
- **Path coverage** tests longer sequences of events.
- *Say:* "Most booking bugs were about order of events, so the model had to remember state; a flat list of inputs can't express 'approve twice'."

**Partition testing, equivalence classes, boundaries.**
- Split each input's range into classes the system should treat the same way (for example "rent under budget"), including invalid classes such as a negative salary or bad dates.
- Test one value per class, plus the values right at each edge, because bugs cluster at edges.
- *Say:* "Every normal-value test passed. All four PT defects were in the unusual or invalid classes, which is exactly what partitioning is designed to reach."

**Control flow testing, CFG, branch coverage.**
- A control flow graph draws the code's decisions as nodes and their outcomes as edges.
- **Branch coverage** means every decision has gone both ways at least once.
- We measured it with Vitest's built-in (v8) coverage tool.
- *Say:* "CFT found the fake-success bug because the server refusal and a network outage look the same on screen; only the code path differs."

**Baseline.**
- The repository's existing 499-case suite, measured before we wrote anything.
- *Say:* "The baseline passed on the original code and found none of the 16 defects, so it's the reference point for every comparison."

**Test oracle.**
- How a test knows the right answer.
- Ours come from the spec and hand calculation, not from running the code, so a test can disagree with the code.
- *Say:* "If we had copied the code's output as the expected value, every test would pass and catch nothing."

**Markov-OP (Markov chain operational profile).**
- A model of usage: screens are states, and each arrow has the probability that a user goes from one screen to the next.
- Each row of the transition matrix sums to 1.
- **Exit** is an absorbing state: once there, the session is over.
- *Say:* "Ours is projected from the designed user journey because Perch has no real users yet; the /pilot logger is how we would measure the real one."

**Expected visits (fundamental matrix).**
- From the transition matrix you can compute how many times an average session visits each screen: N = (I - Q)^-1, where Q is the matrix without the Exit state.
- *Say:* "That's how we know Feed (1.5) and the deck (1.2) are the most-used screens, and why most usage-based sessions go there."

**Usage-based test cases and the failure oracle.**
- Each test case is a random walk through the chain from Start to Exit, drawn with a fixed seed so it can be reproduced.
- The executor replays it in a real browser.
- A session fails if a screen isn't reached, the page crashes, the server returns a 5xx error, or a feature shows an error.
- *Say:* "Because sessions follow the usage probabilities, the most-used paths get tested the most."

**Musa-OP vs Markov-OP.**
- A Musa operational profile is a flat list of operations with how often each is used. It has no order.
- Markov adds order: the next screen depends on the current one.
- *Say:* "We needed order, because booking only happens after viewing a listing."

**Nelson reliability model and the 95% interval.**
- **Nelson:** reliability R = 1 - (failed sessions / total sessions), the share of sessions that succeed.
- **Wilson interval:** a 95% range for R that stays honest with small samples and zero failures. 0 of 60 failures does not prove R = 1; the interval says it is at least about 0.94.
- *Say:* "Reliability went 0.83, 0.98, 1.00, 1.00 across rounds, and the interval shows how sure we can be with 60 sessions per round."

**Reliability growth (Goel-Okumoto).**
- A curve fitted to cumulative failures over cumulative testing: m(t) = a(1 - e^(-bt)).
- **a** is the total number of failures the model expects ever to find (about 11).
- **b** is how fast they are found.
- **a** minus failures found so far is the expected number remaining (about 0.05).
- *Say:* "It predicts almost nothing left, but with only four rounds that's indicative, not proof."

**Sensitivity analysis.**
- Change one usage probability (×0.5 or ×1.5) and recompute the predicted reliability.
- *Say:* "Reliability barely moves when booking or abandonment changes, but moves a lot with negotiate use, because that's where the round 1 failures were; so our reliability figure depends on the usage profile."

**ODC (Orthogonal Defect Classification).**
- **Defect type** is what kind of fix was needed: Checking (missing or wrong validation), Assignment (a wrong value), Algorithm (a wrong computation), Function (missing or wrong capability), Interface (two parts misunderstanding each other).
- **Trigger** is what exposed it: test sequencing, interaction, variation, coverage, a complex path, workload/usage.
- *Say:* "8 of 16 were Checking: rules in the spec that weren't enforced on every path."

**Severity.** 2-High breaks a core feature or shows users wrong information; 3-Medium is wrong behavior with a workaround; 4-Low is minor. We had 3 high, 8 medium and 5 low.

**Regression testing and CI.** Every fixed defect has a test that would fail if it came back, and GitHub Actions runs all suites on every push.

**False positive.** A test failure that is not an app bug. Two UBST failures were mistakes in our own test script (UB-015, UB-032); we documented them and excluded them, and report the raw numbers too.

**Our test setup.**
- **Fixture mode:** the app running on built-in sample data with no keys.
- **In-memory database:** a stand-in for Supabase in the unit tests, so runs are fast and repeatable. It enforces the one-booking-per-listing rule.
- **Playwright:** drives a real Chromium browser for the onboarding and usage-based tests.

## All likely questions in one place

The TA only knows what we show her, so these are the questions the slides and the live testing can raise, with the slide each one comes from. The same answers also sit in sections 1-7. Course names are in brackets: step-by-step flows = FSM, edge-case inputs = PT, every code path = CFT, real user behavior = Markov usage model / UBST.

**Slides 2-3: the app and the starting point**

- *Is this the real app?* Yes. The screenshots are the real app, the tests run its real code, and the browser tests click through a real build of it.
- *Why test those parts of the app?* They're the riskiest: booking depends on the order of actions, the budget rules are numbers and dates, and the backup and error code is rarely exercised.
- *Why sample data and not the real database?* Runs are repeatable and never touch real users, and it's how the app runs by default without keys. The limit is that nothing ran against the real database; we say so on slide 11.
- *What does "77% of decision points" mean?* Of all the if/else branches in the riskiest code, the old tests went down about 77%. Our code-path tests raised that to about 83%.
- *Why these four methods?* Each targets a different kind of mistake: the order of actions, edge-case numbers and dates, hidden code paths, and what real users do. Slide 10 shows no problem was found by two of them.

**Slides 4-7: data and diagrams**

- *Where did the user-journey odds come from?* Our own estimates of how interns move through the app, because Perch has no real users yet. We built an opt-in logger to collect real data later; it hasn't been run.
- *Why build the booking diagram from the written rules instead of the code?* A model built from the code can only confirm what the code already does. One built from the rules can show where the code is wrong.
- *What did the coverage chart change?* It told us where to aim: bookings, the backup path and the expiry job were barely tested, so the booking-flow and code-path tests went there.
- *How did drawing the diagram find a problem?* The rules say an intern can cancel a booking, but when we drew every arrow, the app had no way to do it.
- *Why test both sides of every limit?* Mistakes cluster at edges: $2,000 vs $2,001, 7 vs 8 days. One case on each side catches a limit that is off by one.
- *What counts as a failed simulated visit?* A screen doesn't load, the page crashes, the server errors, or a feature shows an error message.

**Slides 8-9: test cases and running them**

- *How do the test IDs trace to the diagrams?* Each ID is one piece of a diagram: T and I are allowed and refused booking steps, C is two people at once, PB and PF are edge-case ranges, CF is one branch of the flowchart, OB is an onboarding screen.
- *How do we know these are real tests, not tests written to pass?* On the original code 24 of them failed (slide 9); on the fixed code they all pass. The right answers came from the rules and hand calculation, not from the code's output. To prove it live: `git checkout bfad1d9`, `npx vitest run tests/course`, then `git checkout main` and run it again.
- *What were the 4 rounds?* Test, fix, retest. Round 1 on the original code found 15 of the 16 problems. Round 2, after the first fixes, found the last one (the deck offering places already taken). Rounds 3 and 4 found nothing new and confirmed every fix.

**Slides 10-11: results**

- *Which problems were most serious?* "$45 per hour" read as $45 a year, so every place looked unaffordable; a refused booking showed a fake "booked"; and the housing check broke in sample-data mode.
- *How do you know a method worked?* It found the kind of problem it targets, and nothing another method found. 16 problems against the old tests' 0.
- *Is quality getting better?* Yes: 24 failing tests to 0, all 16 problems fixed and retested, and none of the 499 old tests broke.
- *What would you do next?* Collect real user data with the logger to replace our estimated journey, and run the tests against the real database.
- *What are the limits?* Read "Honest limits" below; say them before she asks.

**Slide 12: live testing**

- *What does the orange OBS line mean?* A note, not a failure: the rules don't say whether onboarding should remember progress after a reload, so we record what happens.
- *What are the dots in the simulated-users step?* One dot per visit that passed. "R = 1" means all 10 passed.
- *Can you run something else?* `npm run demo:baseline` (the 499 old tests), `npm run demo:regression` (tests that keep later fixes fixed), or `npm run demo:summary`.

## Honest limits (say these before the TA asks)

- The unit tests use an in-memory stand-in for the database, which mimics the one rule that matters (one live booking per listing). Nothing ran against the real Supabase.
- The browser and usage-based runs used the built-in fixture data, and the usage profile is projected, so the reliability numbers hold for that setup.
- Some expected results are design choices we made: hourly pay times 2,080 hours, and hiding listings another intern holds.
- We changed one pre-existing test, because the D16 fix intentionally changed what it checked. Its original intent is kept.

## If something goes wrong on the call

| Problem | Fix |
| --- | --- |
| "Chromium for the tests is missing" | `npm run demo:prepare` (once) |
| "The app did not start on port 3100" | Close the other app or an old demo terminal, run `npm run demo` again |
| A browser step fails or is slow | Press `r` to rerun it once |
| The laptop or network acts up | Skip live testing; the backup slides have screenshots of a real run, and `npm run demo:summary` needs nothing running |
