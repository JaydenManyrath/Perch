# Homework #3: FSM and Markov Operational Profile for Perch

Jayden Manyrath | CSE 5314, Fall 2026 | Prof. Jeff Tian | Homework #3 | November 3, 2026

## 1. FSM Model

I modeled Perch, the intern housing and social app from our course project, from a user's perspective. I focused on the housing flow: a user starts on the splash page, goes through onboarding or comes back as a returning user, browses the event feed, swipes through sublets on the Perches deck, opens a listing, and requests to book it. Each state is a screen and each link is a user action. Figure 1 shows the model, which has 7 states and 16 links, with S1 (Splash) as the start state and S7 (Exit) as the final state. It includes repetition. Opening more event comments (L5) and swiping to the next card (L8) are self-loops, and deck to listing and back (L9, L12) and deck to listing to booking and back (L9, L13, L15) are cycles that a user can repeat many times in one session.

![Figure 1. State diagram of the Perch FSM (original representation).](fsm-diagram.png)

## 2. Model Validation

I validated the first draft in two ways. First, a small script checked the model for dangling links, isolated and unreachable states, states with no way to reach Exit, and duplicate links. Second, I walked through the running app screen by screen to find missing states and links. Table 1 lists what I found and fixed. After the fixes, every state is reachable from Splash and can reach Exit, and there are no dangling or duplicate links.

| Problem in the first draft | Type | Fix |
| --- | --- | --- |
| "Close sheet" from Booking had no destination | Dangling link | Points to Perches deck (L15) |
| Booking had no way to Exit | Trap state | Added L16 |
| Deck to listing appeared twice ("tap card" and "tap Details") | Duplicate link | Merged into L9 |
| Returning users skip onboarding | Missing link | Added L2 |
| The Feed tab is also on the Perches deck | Missing link | Added L10 |
| Users can leave from a listing | Missing link | Added L14 |

Table 1. Problems found during validation.

## 3. Other Representations

I drew the FSM first as a graph (Figure 1). Table 2 converts it to the tabular form and Table 3 to the matrix form, where each cell gives the link from the row state to the column state.

| Link | Current state | Input | Next state |
| --- | --- | --- | --- |
| L1 | S1 Splash | tap Start onboarding | S2 Onboarding |
| L2 | S1 Splash | returning user opens app | S3 Feed |
| L3 | S2 Onboarding | finish onboarding | S3 Feed |
| L4 | S2 Onboarding | abandon onboarding | S7 Exit |
| L5 | S3 Feed | open event comments | S3 Feed |
| L6 | S3 Feed | tap Perches tab | S4 Perches deck |
| L7 | S3 Feed | leave app | S7 Exit |
| L8 | S4 Perches deck | swipe to next card | S4 Perches deck |
| L9 | S4 Perches deck | tap Details | S5 Listing detail |
| L10 | S4 Perches deck | tap Feed tab | S3 Feed |
| L11 | S4 Perches deck | leave app | S7 Exit |
| L12 | S5 Listing detail | close sheet | S4 Perches deck |
| L13 | S5 Listing detail | tap Request to book | S6 Booking |
| L14 | S5 Listing detail | leave app | S7 Exit |
| L15 | S6 Booking | close sheet | S4 Perches deck |
| L16 | S6 Booking | leave app | S7 Exit |

Table 2. Tabular representation.

| From \ To | S1 | S2 | S3 | S4 | S5 | S6 | S7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 |  | L1 | L2 |  |  |  |  |
| S2 |  |  | L3 |  |  |  | L4 |
| S3 |  |  | L5 | L6 |  |  | L7 |
| S4 |  |  | L10 | L8 | L9 |  | L11 |
| S5 |  |  |  | L12 |  | L13 | L14 |
| S6 |  |  |  | L15 |  |  | L16 |
| S7 |  |  |  |  |  |  |  |

Table 3. Matrix representation.

## 4. Test Cases for Node and Link Coverage

Each test case is a path from S1 to S7, and the expected result is that every step reaches the next screen without an error. One test case covers every node, and five test cases cover all 16 links (Table 4). I ran all six on the app and they passed.

| Test | Coverage | Path | Links covered |
| --- | --- | --- | --- |
| N1 | Node | S1 > S2 > S3 > S4 > S5 > S6 > S7 | 1, 3, 6, 9, 13, 16 |
| K1 | Link | S1 > S2 > S3 > S3 > S4 > S4 > S3 > S4 > S5 > S4 > S5 > S6 > S4 > S7 | 1, 3, 5, 6, 8, 10, 6, 9, 12, 9, 13, 15, 11 |
| K2 | Link | S1 > S3 > S7 | 2, 7 |
| K3 | Link | S1 > S2 > S7 | 1, 4 |
| K4 | Link | S1 > S3 > S4 > S5 > S7 | 2, 6, 9, 14 |
| K5 | Link | S1 > S3 > S4 > S5 > S6 > S7 | 2, 6, 9, 13, 16 |

Table 4. Test cases for node coverage (N1) and link coverage (K1-K5).

## 5. Markov Operational Profile

**Data collection.** The best data source for Perch would be navigation logs from real users, either page views recorded by the app or the web server's access logs, grouped into sessions. The probability of a link is the number of times it was taken divided by the number of times users left its source state. Perch does not have real users yet. My real data came from eight team walkthrough sessions, based on the app's documented walkthrough and our earlier test runs. I performed each one on the running app and recorded every screen change, which gave 44 transitions. Two links (L10 and L16) were never taken, so the real data alone would give them a probability of zero. I filled these gaps with imputed data, using a simple add-one rule: each missing link gets a count of one. L16 (leaving right after sending a booking request) gets one more, because our walkthroughs always continued after booking while real users often stop there. That gives 3 imputed transitions. Table 5 keeps the real and imputed counts in separate columns.

| Link | From | To | Real | Imputed | Probability |
| --- | --- | --- | --- | --- | --- |
| L1 | Splash | Onboarding | 3 |  | 0.375 |
| L2 | Splash | Feed | 5 |  | 0.625 |
| L3 | Onboarding | Feed | 2 |  | 0.667 |
| L4 | Onboarding | Exit | 1 |  | 0.333 |
| L5 | Feed | Feed | 3 |  | 0.300 |
| L6 | Feed | Perches deck | 6 |  | 0.600 |
| L7 | Feed | Exit | 1 |  | 0.100 |
| L8 | Perches deck | Perches deck | 3 |  | 0.200 |
| L9 | Perches deck | Listing detail | 6 |  | 0.400 |
| L10 | Perches deck | Feed | 0 | 1 | 0.067 |
| L11 | Perches deck | Exit | 5 |  | 0.333 |
| L12 | Listing detail | Perches deck | 2 |  | 0.333 |
| L13 | Listing detail | Booking | 3 |  | 0.500 |
| L14 | Listing detail | Exit | 1 |  | 0.167 |
| L15 | Booking | Perches deck | 3 |  | 0.600 |
| L16 | Booking | Exit | 0 | 2 | 0.400 |

Table 5. Markov-OP for Perch (probability = (real + imputed) / row total).

Under this profile a typical session visits about 4.2 screens. Usage-based test cases are random walks from S1 that follow these probabilities until they reach Exit.

**Karami-Tian method.** Karami and Tian update an existing Markov-OP after a web application changes, before usage data for the new version exists. They compare the initial Markov-OP with the activity diagrams of the updated application to add or remove states and transitions. They then re-estimate the transition probabilities using, in order of preference, partial usage data from a partly deployed version, analogy with a similar part of an existing Markov-OP, or a redistribution rule. It cannot be used to construct my first profile, because it needs an existing one. It can be used to update it, because Perch changes often. For example, if the Negotiate screen linked from the deck becomes part of the main flow, its activity diagram adds a new state and a link from the Perches deck. With no data, the method estimates the new link as 1/n', where n' is the deck's new number of outgoing links: 1/5 = 0.20. Proportional redistribution then multiplies each existing deck probability by (1 - 0.20). The deck's links become 0.160 (swipe), 0.320 (Details), 0.053 (Feed) and 0.267 (leave), so the row still sums to one.

**Comparison with Musa-OP.** A Musa-OP is a flat list of operations and their probabilities, with no order. A Markov-OP gives the probability of the next action given the current screen, so it captures sequences such as deck to listing to booking. To convert the Markov-OP into a Musa-OP, I computed the expected number of visits to each screen per session, using the fundamental matrix N = (I - Q)^-1 where Q holds the transition probabilities between non-exit states, and normalized the visits (Table 6). The conversion keeps how often each screen is used but loses the order. For example, Booking is used 7.3% of the time, but the Musa-OP no longer shows that it can only follow Listing detail.

| Operation (screen) | Expected visits per session | Musa-OP probability |
| --- | --- | --- |
| S4 Perches deck | 1.53 | 0.363 |
| S3 Feed | 1.40 | 0.331 |
| S5 Listing detail | 0.61 | 0.145 |
| S2 Onboarding | 0.38 | 0.089 |
| S6 Booking | 0.31 | 0.073 |

Table 6. Musa-OP converted from the Markov-OP.
