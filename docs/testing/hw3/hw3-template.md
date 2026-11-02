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

{{TRANSITIONS}}

Table 2. Tabular representation.

{{MATRIX}}

Table 3. Matrix representation.

## 4. Test Cases for Node and Link Coverage

Each test case is a path from S1 to S7, and the expected result is that every step reaches the next screen without an error. One test case covers every node, and five test cases cover all 16 links (Table 4). I ran all six on the app and they passed.

{{TESTS}}

Table 4. Test cases for node coverage (N1) and link coverage (K1-K5).

## 5. Markov Operational Profile

**Data collection.** The best data source for Perch would be navigation logs from real users, either page views recorded by the app or the web server's access logs, grouped into sessions. The probability of a link is the number of times it was taken divided by the number of times users left its source state. Perch does not have real users yet, so I used two subsets of data.

The real data comes from eight team walkthrough sessions, based on the app's documented walkthrough and our earlier test runs. Each one was performed on the running app while recording every screen change, which gave {{REAL_N}} transitions. These sessions came from the team, so they miss some kinds of users, and two links (L10 and L16) were never taken at all.

The imputed data fills these gaps. Data imputation means filling in missing data with values that are reasonable given what is already known, not random guesses. I made up five sessions for user types the walkthroughs did not represent (Table 5). Each one only reuses steps that appear in the real sessions, and together they cover both missing links. They add {{IMP_N}} transitions. Table 6 keeps the real and imputed counts in separate columns, and each probability is (real + imputed) divided by the total for that state.

{{IMP_SESSIONS}}

Table 5. Imputed sessions.

{{MARKOV}}

Table 6. Markov-OP for Perch.

Usage-based test cases are random walks from S1 that follow these probabilities until they reach Exit.

**Karami-Tian method.** Karami and Tian's method keeps a Markov-OP up to date when a web application changes, before any usage data for the new version exists. It compares the old Markov-OP with the activity diagrams of the new version and adds or removes the states and links that changed. It then estimates the new probabilities from partial usage data, from a similar existing model, or by spreading the probability across the links. It cannot be used to build my first Markov-OP, because it needs an existing one to start from. It can be used to update it later, because Perch changes often. For example, if the Negotiate screen becomes part of the main flow, I could add it as a new state and give it a share of the Perches deck's probability until real data is available.

**Comparison with Musa-OP.** A Musa-OP is a flat list of operations and their probabilities, with no order. A Markov-OP gives the probability of the next action based on the current screen, so it captures sequences such as deck to listing to booking. To convert the Markov-OP into a Musa-OP, I counted how many times each screen appears across all the sessions (real and imputed) and divided by the total (Table 7). The conversion keeps how often each screen is used but loses the order. For example, Booking is 7.8% of screen visits, but the Musa-OP no longer shows that Booking can only follow Listing detail.

{{MUSA}}

Table 7. Musa-OP converted from the Markov-OP.
