# Perch Testing Project: TA Demo Prep Sheet

Jayden Manyrath and Koen Gennis | CS 7314/5314, Fall 2026 | 15-minute TA demo (Zoom) | Last day: Nov 20

## How to use this sheet

The TA's demo page lists seven things to be ready to show. Sections 1-7 take them in that order. For each one: what to show and where, the facts to know without looking, and the questions the TA is likely to ask with a short answer. Section 8 explains every defect and its fix, and section 9 explains the concepts in plain language. Study in four rounds:

1. **Alone:** read sections 8 and 9 in full, then your own sections.
2. **Together:** a timed run-through with the slides.
3. **Together:** quiz each other.
4. **Morning of:** a 15-minute skim.

The presenter column below says who owns which section.

| # | TA checklist item | Slide | `npm run demo` step | Presenter |
| --- | --- | --- | --- | --- |
| 1 | System under testing | 3-4 | 1 | Jayden |
| 2 | Raw data for model construction, and how collected | 5 | 2 | Koen |
| 3 | Analysis of that data | 6 | 3 | Koen |
| 4 | Testing models | 7-10 | 4 | FSM, Markov: Jayden. PT, CFT: Koen |
| 5 | Test cases (individual and organized suite) | 11 | 5 | Koen |
| 6 | Test execution, live, and results | 12 | 6a-6g | Whoever owns the technique being run |
| 7 | Result data and analysis | 13-15 | 7 | Jayden, Koen for the comparison |

The presenter split follows the roles in our proposal (Jayden: FSM, Markov-OP/UBST, the app; Koen: PT, CFT, baseline and coverage). Change it if you prefer, but decide before the call.

## Before the demo (do these)

- Sign up for a slot on the TA's sheet (demos run Nov 10-20, weekday evenings 6:30-9:00).
- The day before, on the laptop you will present from: `git pull`, `npm ci`, `npm run demo:prepare`. It must end with every step PASS.
- Fill in `docs/testing/effort-log.csv` with your real hours. The TA may ask about cost, and right now we have no hours to show.
- Open before the call: the slides (`docs/testing/demo/Perch_Testing_Demo.pptx`) and a terminal in the repo.
- On the call: share your whole screen, then run `npm run demo`. Enter runs a step, `s` skips, `b` goes back, `r` reruns, `q` quits.
- If anything fails live: press `r` once. If it still fails, run `npm run demo:summary` (needs nothing running) and open `docs/testing/demo/dashboard.html`; every result is saved there.

## 1. System under testing

**Show:** step 1 opens the app at http://localhost:3100. Click: splash, Flyway feed, Perches deck, open a listing, Request to book. Slide 3 is the function and component table.

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

**Show:** slide 5, or step 2 (dashboard section 2).

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

**Show:** slide 6, or step 3 (dashboard section 3).

**Know:**

- **Baseline:** 499 cases, all passing (7 skipped because they need live keys), and **0 of our 16 defects** detected.
- **Branch coverage of the target modules:** 77.3% for the baseline alone, 82.8% with our suites. Both were measured in the same run on the final code. When first measured on the original code it was 76.7%.
- **Gaps the baseline left:** the expiry cron route at 0%, the server-side booking transition never run, and the data-source fallback for bookings only partly covered. That is where we aimed CFT and FSM.
- **Usage profile:** about 5.3 screens per session. Expected visits per session are Feed 1.50, Perches deck 1.24, Listing 0.61, Onboarding 0.60, Messages 0.53, Map 0.26, Profile 0.26, Booking 0.18, Negotiate 0.12. Computed from the fundamental matrix N = (I - Q)^-1.

**Likely question:** *What did the analysis change?* It decided where the tests went: white-box and FSM effort on the low-coverage modules, and most usage-based sessions on the feed and the deck, because that is where users spend their time.

## 4. Testing models

**Show:** slides 7-10, or step 4 (dashboard section 4 has every model in full).

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

**Show:** slide 11, or step 5. Dashboard section 5 lists every test case with its result on the original code and now; open one suite and point at a few cases.

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

**Show:** steps 6a-6g run live. Slide 12 has the rounds table.

| Step | What runs | Time | Expected result |
| --- | --- | --- | --- |
| 6a | Baseline suite | about 14 s | 499 cases: 492 pass, 7 skipped |
| 6b | FSM booking | about 1 s | 64 pass |
| 6c | FSM onboarding (visible browser) | about 12 s | passes, plus 1 observation |
| 6d | PT | about 1 s | 78 pass |
| 6e | CFT | about 1 s | 37 pass |
| 6f | UBST, 10 sessions (visible browser) | about 30 s | dots = passed sessions |
| 6g | Regression | about 1 s | 11 pass |

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

**Show:** step 7 (the summary, then dashboard section 7), and slides 13-15.

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

**The questions the course asks (have these answers ready):**

- *How do you know a technique worked?* Answer with applicability, effectiveness and cost (next three points).
- **Applicability:** each found the kind of defect its model targets, and no defect was found by two techniques.
- **Effectiveness:** 16 defects against the baseline's 0. FSM found the most; PT, CFT and UBST each found one of the three high-severity ones.
- **Cost:** every suite runs in seconds, so model building and triage were the real cost (see the effort log).
- *What is the baseline?* The repo's existing 499-case suite, measured before we wrote anything: 77.3% branch coverage on the target modules and 0 defects found.
- *What about other techniques?* Boundary testing is already built into our PT cases. Data flow testing would fit the finance pipeline (offer letter → take-home → budget) and is the natural next one.
- *Is quality getting better?* Yes: failing course cases went from 25 to 0, UBST reliability from 0.83 to 1.00, and none of the existing 499 tests regressed. The GitHub Actions workflow now runs all suites on every push.

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
| The laptop or network acts up | Show the slides, `npm run demo:summary` and `docs/testing/demo/dashboard.html`; every result is saved |
