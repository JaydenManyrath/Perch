# Comparing Black-Box, White-Box, and Usage-Based Testing Techniques on Perch, a Full-Stack Housing and Social Platform for Interns: Final Report

Jayden Manyrath and Koen Gennis | CS 7314/5314, Fall 2026 | Prof. Jeff Tian | Final Project Report | December 8, 2026

## Abstract

We applied four formal testing techniques to Perch, a Next.js and Supabase web application that helps interns find sublets, friends and events in a new city. Finite state machine testing (FSM/BBT) covered the booking lifecycle and the onboarding flow, partition testing (PT/BBT) covered the affordability and housing-verdict rules, control flow testing (CFT/WBT) covered the expiry, transition and fallback code, and Markov chain operational profile testing (Markov-OP/UBST) replayed randomly generated user sessions in a real browser. The repository's existing 499-case test suite served as the baseline. The model-driven suites found 16 defects that the baseline missed completely, including three of high severity: hourly pay read as a yearly salary, a fabricated booking success when the server refused a request, and a negotiation feature that failed whenever the app ran without live keys. No defect was found by more than one technique. Each technique found the kind of defect its model targets, and branch coverage of the targeted modules rose from 76.6% to {{COV_ALL}}%. All 16 defects were fixed and retested. Usage-based reliability rose from 0.83 to {{R_LAST}} over {{N_ROUNDS}} rounds of 60 sessions.

## 1. Introduction

Perch is a social network for interns relocating for a summer role. Users onboard by uploading an offer letter, browse events, swipe through short-term sublets, request to book, message other interns and view their city on a map. One team member developed Perch and the other joined as an independent tester. All testing, models and data in this report were produced for this course; the models, suites and raw results are in the repository under `docs/testing` and `tests/course`.

## 2. Background and Problem

Perch combines three kinds of risky behavior. Booking requests move a listing through requested, approved, booked and taken states, and the specification says stale or taken listings must never surface. A deterministic rule engine decides budget, lease-window, safety and commute verdicts from numbers and dates. Every data getter falls back to built-in fixture data when a live route fails or a key is missing. These behaviors are state-dependent, input-domain-heavy and branch-heavy, respectively. Before this project the repository had a Vitest suite, but its tests were not driven by explicit models, and there was no evidence of which techniques find which defects or how reliable the app is under expected use. Our problem was therefore twofold: to find defects systematically in the highest-risk features, and to learn which technique is most applicable, effective and cost-efficient for each kind of feature.

## 3. Strategy

We paired each technique with the class of feature it suits best and kept the booking and listing area as common ground so the techniques could be compared on the same code. Unit-level and route-level tests ran in Vitest against an in-memory database fake that also enforces the one-live-hold unique index, so every run is deterministic. Browser-level tests ran in Chromium with Playwright against the app in fixture mode, which needs no keys. Each technique followed the same cycle. We built the model from the specification rather than the code, derived test cases from it, recorded round 1 against the unmodified code, logged each defect with an ODC defect type and trigger, fixed it, and retested in later rounds.

Three decisions changed the plan after the code walkthrough, as reported in the progress report. First, the app's default demo mode runs every booking action against fixture data, which is a second implementation of the same rules, so the FSM model was run against both the live API code and the fixture code. Second, FSM, PT and CFT used the in-memory database instead of live Supabase for repeatability. Third, the volunteer pilot was moved later; usage-based testing used a projected profile, and we built an opt-in navigation logger so the pilot can refine it.

## 4. Baseline

Before writing any test we measured the existing suite: 499 test cases (492 passing, 7 skipped because they need live keys), about 12 seconds to run, and 76.6% branch coverage on the 14 modules we targeted. It never executed the listing-expiry job, the server-side booking transition or the booking fallback paths. Because it passed completely on the original code, it detected none of the defects reported below. It is the reference point for every comparison in Section 9.

## 5. FSM/BBT: Booking Lifecycle and Onboarding

**Model.** The booking model pairs the latest booking status with the listing status. It has seven states (listed, requested, approved, booked and taken, declined, cancelled, stale) and thirteen valid transitions over eight events (request, a second intern's request, approve, decline, confirm, cancel, relist and expire). From the model we derived eighteen invalid "sneak path" pairs. Each must be rejected with 403 for the wrong actor or 409 for the wrong state, and must leave the state unchanged. Examples are approving twice, confirming a taken listing and a second intern requesting a held listing. We added five multi-event paths with the invariant "at most one live hold per listing" and two concurrency cases. The onboarding model has eight states, from offer upload through review, account creation, Spotify, Takeout, photo and flock to done. Its key element is the guard on leaving the review screen.

**Test cases and results.** The booking model ran as 40 cases against the live API routes and 24 against the fixture source, and the onboarding model as 10 browser cases. In round 1, 11 cases failed, traced to seven defects:
- A subletter could relist a taken listing while it was booked (D01).
- The loser of two simultaneous requests received a server error instead of 409 (D02).
- In fixture mode, booked or declined bookings could be re-approved or declined (D03), and held, taken or stale listings could be requested again (D04).
- The fixture relisted taken listings (D05) and used a 14-day freshness window instead of 7 (D06).
- Onboarding accepted an end date before the start date (D08).

Building the model also exposed that the specified booker-cancel transition had no route at all (D07). After the fixes all 74 cases pass, including the cancel transitions through the new route.

## 6. PT/BBT: Finance and Verdict Rules

**Model.** We partitioned seven input dimensions into valid and invalid equivalence classes and chose cases on both sides of every boundary: rent against budget (pass up to the budget, flag up to 110%, fail beyond), salary against tax bracket, cost-of-living index, the pay period written in the offer letter, lease window against the intern's stay (flag tolerance of seven days), walking minutes, and safety flags. All expected values were computed by hand from the documented 2025 single-filer constants, not read back from the code.

**Test cases and results.** The 78 cases found four defects in round 1, through ten failing cases. Every one of the 19 hand-computed tax and rent values matched the code; the defects sat in the unusual and invalid classes:
- An offer stating "$45.00 per hour" was parsed as a $45 yearly salary with high confidence, which zeroes take-home pay and fails every listing on budget (D09). Monthly and weekly pay had the same problem. Intern offers are often hourly, so this is a common input.
- The negotiation route ignored a budget the intern set lower than the salary-derived ceiling (D10).
- The route accepted malformed and inverted stay dates (D11).
- The lease scout reported "Gap of NaN days" on bad dates and full coverage on an inverted stay (D12).

All four were fixed and all 78 cases pass.

## 7. CFT/WBT: Expiry, Transitions and Fallbacks

**Model.** We drew six control flow graphs: the freshness planner, the freshness pass, the expiry cron route, the booking transition function, the server-side transition procedure and the client's fixture/live fallback for booking actions. Test cases force every decision outcome. Examples include a listing expiring exactly at the current time, an auto-sourced listing that must never be pinged, a database write error after confirming a booking, and each edge of the fallback.

**Test cases and results.** The 37 cases found no defects in the expiry and transition code, but they raised its coverage from zero in several places. The expiry cron route went from 0% to 87.5% branch coverage and the booking module from 76% to 86%. The fallback graph exposed a high-severity defect (D13). When the live server deliberately refused a booking (409 "listing already held" or 403 "own listing"), the client took the same branch as a network outage, fell back to fixture data and showed the user a fabricated successful request. No black-box test could see this, because the screen looks the same whichever internal edge produced it. After the fix a refusal reaches the user, while real outages still fall back.

## 8. Markov-OP/UBST: Usage-Based Testing and Reliability

**Model and data.** The usage model is a Markov chain over nine main screens (onboarding, feed, perches, listing detail, booking, negotiate, map, messages, profile) plus start and exit states. Perch has no production users, so the transition probabilities are a projected profile from the designed user journey and team estimates. We validated it by checking that every row is a probability distribution, that exit is reachable from every state, and that 20,000 simulated sessions match the analytic expected visits from the fundamental matrix. The profile predicts 5.3 screens per session, with the feed (1.5 visits) and the perches deck (1.2) used most. To replace the projection with measured data, we added an opt-in pilot logger: a volunteer turns it on at `/pilot`, and only screen names and timestamps are kept, in their browser. A converter turns downloaded logs into a refined profile and keeps a prior share for transitions the pilot never observed.

**Execution.** Each round draws 60 sessions from the profile with a fixed seed. An executor replays each session in a fresh browser context, performing the user action for each transition and checking that the expected screen is reached. A session fails if a screen is not reached, the page throws an exception, the server returns a 5xx error, or a feature reports an error to the user. Failures were triaged, and those caused by our own test driver are documented and excluded, with the raw figures kept.

{{UBST_TABLE}}

Table 1. Usage-based test rounds (60 sessions each; Nelson reliability with 95% Wilson interval).

Round 1 found D15. The negotiation scouts failed with an authorization error whenever the app ran without live keys, because their route always required a signed-in user, even though every other screen falls back to fixture data. FSM and PT had tested that route with keys mocked in, so only realistic usage exposed it. Round 2 found D16: the deck offered "Request to book" on a listing another intern already held, and the app then refused the request. Both were fixed, D16 by hiding listings held by others from the deck. {{ROUND_TAIL}}

**Reliability growth and sensitivity.** A Goel-Okumoto model fitted to cumulative failures against cumulative sessions gives a = {{GO_A}} and b = {{GO_B}}, predicting {{GO_REMAINING}} remaining failures. With so few rounds this is indicative only. For the sensitivity check we estimated each transition's failure probability from the round 1 runs and computed the session reliability the chain predicts when one usage probability is scaled by 0.5 or 1.5. Changing the booking or onboarding-abandonment probabilities moved predicted reliability by less than 0.01. Changing how often users open the negotiate screen moved it from {{SENS_LOW}} to {{SENS_HIGH}}. The estimate is sensitive exactly where the failures were, which is why our reliability figures are conditional on the profile.

## 9. Cross-Technique Analysis

{{CMP_TABLE}}

Table 2. Results by technique.

**Applicability.** Each technique found defects of the kind its model targets, and no defect was found by two techniques:
- **FSM:** every defect depends on the order of events or on two actors interacting, which flat models cannot express.
- **PT:** fit the numeric and date rules, where the defects sat at unusual classes rather than ordinary values.
- **CFT:** was the only technique able to reach an internal edge that produces no visible difference on screen.
- **UBST:** tested whole sessions on the deployed configuration and found what users would hit most often.

Against the baseline, which found none of the 16, every technique added value.

**Effectiveness and cost.** By count FSM found the most defects (eight). Weighted by severity, PT, CFT and UBST each found one of the three high-severity defects. Execution cost was low for every technique: the course suites run in a few seconds, the onboarding browser run in about a minute and a 60-session UBST round in about four minutes. Model construction and failure triage dominated the effort.

**Defect classification.** By ODC type the defects are 8 Checking, 3 Function, 2 Algorithm, 2 Assignment and 1 Interface. Missing or wrong validation dominates: most defects were rules that existed in the specification but were not enforced on every path. This was especially true of the fixture path, which is what the app runs by default. By trigger, the FSM defects came from test sequencing and interaction, the PT defects from test variation, the CFT defect from a complex path, and the UBST defects from workload and usage.

**Quality trend.** Course-suite failures fell from 25 in round 1 to zero with no regression in the baseline. Usage-based reliability rose from 0.83 to {{R_LAST}}. The suites now run in a GitHub Actions workflow on every push as regression tests.

## 10. Lessons Learned and Follow-Up

Four lessons stood out:
- **Building the model is itself a defect-finding activity.** The missing cancel transition was found before any test ran.
- **Every implementation needs testing against the model.** Most FSM defects were in the fixture path the app uses by default, not the live path we would have tested first.
- **White-box and usage-based testing reach what black-box tests cannot.** CFT found a fake success that looked identical on screen, and UBST found a feature that only failed in the configuration users actually run.
- **Triage is part of the cost of browser-level testing.** Two of our UBST failures were our own driver's mistakes, and documenting them kept the reliability figures honest.

Several follow-up items remain:
- Run the pilot with 10 to 15 volunteers and replace the projected profile with measured probabilities.
- Re-run the usage-based rounds against the deployed app with live Supabase; the executor already accepts any base URL.
- Complete the per-technique effort log so defects per hour can be compared.
- Apply data flow testing to the finance pipeline (offer letter to take-home to budget) as the next technique.

## 11. Summary

Four formal techniques, each matched to one class of risk, found 16 defects in Perch that its existing test suite could not, with no overlap between techniques. All 16 were fixed and retested, branch coverage of the targeted code rose by about six percentage points, and usage-based reliability under the projected profile rose from 0.83 to {{R_LAST}}. The models, test suites, raw results and the defect log are in the repository, and `npm run demo:summary` prints every result in this report from the saved data.

## Appendix

All material is in the repository: `docs/testing/` (models, partition tables, control flow graphs, Markov profile, defect log, raw results for every round, UBST triage and analysis, demo script and slides) and `tests/course/`, `tests/e2e/` (all test code).
