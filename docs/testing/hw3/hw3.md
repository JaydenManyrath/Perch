# Homework #3: FSM and Markov Operational Profile Models of Perch

Jayden Manyrath | CSE 5314, Fall 2026 | Prof. Jeff Tian | Homework #3 | November 3, 2026

## 1. System and Modeling Perspective

The system for this assignment is Perch, the web app our course project tests. Perch is a social app for interns moving to a new city. A new user starts on a splash page and goes through onboarding. After that the app has five bottom-navigation tabs: Flyway (an event feed), Perches (a swipe deck of sublets), Migration (a city map), Chirps (direct messages), and Nest (the user's profile). From the Perches deck the user can open a listing's detail sheet and request to book it. I modeled Perch from a user's perspective at the level of these screens, because that is the level at which a usage profile makes sense. Each state is a screen the user is looking at, and each link is one user action that moves them to another screen or keeps them on the same one. I left out secondary screens reached from inside a tab (Negotiate, Post a listing, Friends, and the landing plan) to keep the model at the level of the main user tasks. I also treated the detail sheet and the booking bar as their own states even though they open on top of the Perches page, because the user's choices there are different.

## 2. The FSM Model

I first drew the model as a state diagram (Figure 1). This is the original representation. Section 4 converts it to the other two. The model has 10 states (Table 1) and 39 links. S1 is the start state and S10 (Exit) is the final state.

| State | Name | What the user sees |
| --- | --- | --- |
| S1 | Splash | Landing page; start onboarding or reopen the app |
| S2 | Onboarding | Offer upload, review, account, Spotify, Takeout, photo, flock |
| S3 | Flyway (feed) | Event feed with comments (Flyway tab) |
| S4 | Perches (deck) | Swipe deck of sublets (Perches tab) |
| S5 | Listing detail | Detail sheet for one listing |
| S6 | Booking requested | Request-to-book sent, waiting on the host |
| S7 | Migration (map) | City map with layers (Migration tab) |
| S8 | Chirps (DMs) | Conversation list and threads (Chirps tab) |
| S9 | Nest (profile) | Own profile and checklist (Nest tab) |
| S10 | Exit | User leaves the app |

Table 1. States of the Perch FSM.

![Figure 1. State diagram of the Perch FSM. Panel (a) shows the task flow, the self-loops and the exits; panel (b) shows the bottom-navigation links between the five tabs, drawn separately so the diagram stays readable. Link numbers match Table 3.](fsm-diagram.png)

The model has the repetition the assignment asks for. Four states have self-loops: opening another event's comments on the feed (L25), swiping to the next card on the deck (L26), switching layers on the map (L31), and opening another conversation in Chirps (L32). It also has cycles that bring the user back to a state they already visited. Perches to Listing detail and back (L27, L28) repeats every time a user looks at several places, and Perches to Listing to Booking and back to Perches (L27, L29, L30) is the booking loop. The bottom navigation lets any tab return to any other tab, so a session can visit the feed or the deck many times. A tree or a flat partition model could not express this kind of repeated, order-dependent behavior, which is why an FSM is the right model here.

## 3. Model Validation

I validated the model in two ways. First, I wrote a small checker that reads the model and reports the problems the assignment lists. A dangling link is a link with a missing source or destination. An isolated state is a state with no links. An unreachable state cannot be reached from the start, and a trap state has no path to Exit. A duplicate link is a second link between the same two states. Second, I compared the model against the running app by walking through it screen by screen in a browser, which is how missing states and missing links show up. My first draft had 20 links, and Table 2 lists what the validation found and how I fixed each problem.

| Problem found in the first draft | Type | Fix in the final model |
| --- | --- | --- |
| "Close sheet" from Booking had no destination | Dangling link | Points to Perches (L30), where the app returns |
| Nest (S9) had no links at all | Isolated state | Added the Nest tab links into and out of S9 (L08, L12, L16, L20-L24) and an exit (L39) |
| Booking (S6) and Migration (S7) had no way to Exit | Trap states | Added exits L36 and L37 |
| Perches to Listing appeared twice ("tap card" and "tap Details") | Duplicate link | Merged into one link, L27 |
| Bottom-nav links existed only from Flyway, Perches and Chirps | Missing links | The tab bar is on every tab, so every tab links to every other tab (L05-L24) |
| A returning user skips onboarding | Missing link | Added Splash to Flyway (L02) |
| Users can close the app from the listing detail sheet | Missing link | Added exit L35 |

Table 2. Problems found while validating the FSM and how they were fixed.

After the fixes the checker reports no problems: every state is reachable from Splash, every state can reach Exit, and there are no dangling or duplicate links. The final check was to drive the app itself through every link. The node and link coverage tests in Section 5 passed on the running app (fixture mode, no live keys), which confirms that each of the 39 links really exists.

## 4. The Other Two Representations

The two representations I did not start with are the tabular form (a list of transitions) and the matrix form. Table 3 is the transition list, with one row per link giving the current state, the input, and the next state.

| Link | From | Input (user action) | To |
| --- | --- | --- | --- |
| L01 | S1 Splash | tap Start onboarding | S2 Onboarding |
| L02 | S1 Splash | returning user opens the app | S3 Flyway |
| L03 | S2 Onboarding | finish onboarding | S3 Flyway |
| L04 | S2 Onboarding | abandon onboarding | S10 Exit |
| L05 | S3 Flyway | tap Perches tab | S4 Perches |
| L06 | S3 Flyway | tap Migration tab | S7 Migration |
| L07 | S3 Flyway | tap Chirps tab | S8 Chirps |
| L08 | S3 Flyway | tap Nest tab | S9 Nest |
| L09 | S4 Perches | tap Flyway tab | S3 Flyway |
| L10 | S4 Perches | tap Migration tab | S7 Migration |
| L11 | S4 Perches | tap Chirps tab | S8 Chirps |
| L12 | S4 Perches | tap Nest tab | S9 Nest |
| L13 | S7 Migration | tap Flyway tab | S3 Flyway |
| L14 | S7 Migration | tap Perches tab | S4 Perches |
| L15 | S7 Migration | tap Chirps tab | S8 Chirps |
| L16 | S7 Migration | tap Nest tab | S9 Nest |
| L17 | S8 Chirps | tap Flyway tab | S3 Flyway |
| L18 | S8 Chirps | tap Perches tab | S4 Perches |
| L19 | S8 Chirps | tap Migration tab | S7 Migration |
| L20 | S8 Chirps | tap Nest tab | S9 Nest |
| L21 | S9 Nest | tap Flyway tab | S3 Flyway |
| L22 | S9 Nest | tap Perches tab | S4 Perches |
| L23 | S9 Nest | tap Migration tab | S7 Migration |
| L24 | S9 Nest | tap Chirps tab | S8 Chirps |
| L25 | S3 Flyway | open an event's comments | S3 Flyway |
| L26 | S4 Perches | swipe/pass to next card | S4 Perches |
| L27 | S4 Perches | tap Details | S5 Listing detail |
| L28 | S5 Listing detail | close detail sheet | S4 Perches |
| L29 | S5 Listing detail | tap Request to book | S6 Booking requested |
| L30 | S6 Booking requested | close sheet | S4 Perches |
| L31 | S7 Migration | switch map layer | S7 Migration |
| L32 | S8 Chirps | open a conversation | S8 Chirps |
| L33 | S3 Flyway | leave the app | S10 Exit |
| L34 | S4 Perches | leave the app | S10 Exit |
| L35 | S5 Listing detail | leave the app | S10 Exit |
| L36 | S6 Booking requested | leave the app | S10 Exit |
| L37 | S7 Migration | leave the app | S10 Exit |
| L38 | S8 Chirps | leave the app | S10 Exit |
| L39 | S9 Nest | leave the app | S10 Exit |

Table 3. Tabular representation of the FSM (transition list).

Table 4 is the matrix form. Row i and column j hold the number of the link that goes from state i to state j, and an empty cell means there is no such link. The diagonal holds the four self-loops, and the Exit row is empty because Exit is final.

| From \ To | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 |  | 1 | 2 |  |  |  |  |  |  |  |
| S2 |  |  | 3 |  |  |  |  |  |  | 4 |
| S3 |  |  | 25 | 5 |  |  | 6 | 7 | 8 | 33 |
| S4 |  |  | 9 | 26 | 27 |  | 10 | 11 | 12 | 34 |
| S5 |  |  |  | 28 |  | 29 |  |  |  | 35 |
| S6 |  |  |  | 30 |  |  |  |  |  | 36 |
| S7 |  |  | 13 | 14 |  |  | 31 | 15 | 16 | 37 |
| S8 |  |  | 17 | 18 |  |  | 19 | 32 | 20 | 38 |
| S9 |  |  | 21 | 22 |  |  | 23 | 24 |  | 39 |
| S10 |  |  |  |  |  |  |  |  |  |  |

Table 4. Matrix representation of the FSM (cell = link number).

## 5. Test Cases for Node and Link Coverage

Each test case is a path from Splash (S1) to Exit (S10). The expected result for every step is that the app lands on the screen the model predicts without an error. I built the test sets with a breadth-first search that keeps extending a path toward states or links not yet covered, and I checked the result in code. I then ran each test case in a browser on the running app with a script that performs each action and checks the screen it lands on.

Node coverage needs every state visited at least once. Two test cases are enough (Table 5).

| Test | Path (states) | New states covered | Result on app |
| --- | --- | --- | --- |
| N1 | S1 > S2 > S3 > S4 > S7 > S8 > S9 > S4 > S5 > S10 | S1, S2, S3, S4, S5, S7, S8, S9, S10 | pass |
| N2 | S1 > S3 > S4 > S5 > S6 > S10 | S6 | pass |

Table 5. Test cases for node coverage.

Link coverage needs every one of the 39 links traversed at least once, which takes eight test cases (Table 6). The longer tests use the self-loops and the bottom-navigation cycle, so repeated states such as S3, S4 and S8 appear several times in one test. The short tests K5 to K8 exist only to reach exit links that a longer path cannot use, since a path ends as soon as it leaves the app.

| Test | Path (states) | Links covered | Result on app |
| --- | --- | --- | --- |
| K1 | S1 > S2 > S3 > S3 > S4 > S4 > S3 > S7 > S7 > S3 > S8 > S8 > S3 > S9 > S10 | 1, 3, 25, 5, 26, 9, 6, 31, 13, 7, 32, 17, 8, 39 | pass |
| K2 | S1 > S3 > S4 > S7 > S4 > S8 > S4 > S9 > S3 > S4 > S5 > S4 > S10 | 2, 5, 10, 14, 11, 18, 12, 21, 5, 27, 28, 34 | pass |
| K3 | S1 > S3 > S7 > S8 > S7 > S9 > S4 > S8 > S9 > S7 > S9 > S8 > S10 | 2, 6, 15, 19, 16, 22, 11, 20, 23, 16, 24, 38 | pass |
| K4 | S1 > S3 > S4 > S5 > S6 > S4 > S3 > S10 | 2, 5, 27, 29, 30, 9, 33 | pass |
| K5 | S1 > S2 > S10 | 1, 4 | pass |
| K6 | S1 > S3 > S7 > S10 | 2, 6, 37 | pass |
| K7 | S1 > S3 > S4 > S5 > S10 | 2, 5, 27, 35 | pass |
| K8 | S1 > S3 > S4 > S5 > S6 > S10 | 2, 5, 27, 29, 36 | pass |

Table 6. Test cases for link coverage.

All 10 test cases passed. On the first run one link test failed, but the cause was my test script, not Perch: it clicked a host's profile link on the Perches page instead of the Nest tab. After I fixed the script's tab selection, every test passed.

## 6. Markov Operational Profile

To turn the FSM into a Markov-OP, I kept the same states and links and attached a probability to each link. The probabilities on the links leaving each state add up to one. The probabilities come from usage data.

### 6.1 Data Collection Method and Sources

The best source for Perch would be navigation logs from real users. These would be page-view events recorded by the app's router, or the access logs of the Vercel deployment, grouped into sessions and counted as screen-to-screen transitions. The probability of a link is then the number of times users took it divided by the number of times they left its source state. A short survey asking new users which screens they use most would be a weaker second source. Perch has no real users yet, so for this assignment I used two subsets of data and kept them separate.

The real subset comes from team walkthrough sessions. I took ten tasks from the app's documented walkthrough in the README and from our earlier onboarding test runs, and I performed each one on the running app in a browser while recording every screen change. Table 7 lists the sessions. Together they produced 69 observed transitions and covered 29 of the 39 links. These are real executions of the real app, but they come from the team rather than from end users, so they show what the app allows more than how strangers would use it.

| Session | Task | Observed path |
| --- | --- | --- |
| W1 | README walkthrough (new user, full tour) | S1 > S2 > S3 > S4 > S5 > S6 > S4 > S7 > S8 > S9 > S10 |
| W2 | Find a sublet and request it | S1 > S3 > S4 > S4 > S4 > S5 > S4 > S5 > S6 > S4 > S10 |
| W3 | Check events and message a friend | S1 > S3 > S3 > S3 > S8 > S8 > S8 > S10 |
| W4 | Look at the city and commute | S1 > S3 > S7 > S7 > S7 > S4 > S5 > S10 |
| W5 | Check my profile and checklist | S1 > S3 > S9 > S3 > S4 > S10 |
| W6 | Onboarding, stop after the offer step (as in our e2e runs) | S1 > S2 > S10 |
| W7 | New user books right after onboarding | S1 > S2 > S3 > S4 > S5 > S6 > S4 > S8 > S10 |
| W8 | Quick tour of every tab | S1 > S3 > S4 > S7 > S8 > S9 > S10 |
| W9 | Browse sublets, then the map | S1 > S3 > S4 > S4 > S5 > S4 > S7 > S3 > S10 |
| W10 | Reply to messages, check events | S1 > S3 > S8 > S8 > S3 > S3 > S10 |

Table 7. Team walkthrough sessions (the real data).

The imputed subset fills the gaps. Ten links exist but were never taken in the walkthroughs, so the real data alone would give them a probability of zero, and test cases generated from the profile would never exercise them. Imputation means filling in missing data with values estimated from what is known, instead of leaving them empty or guessing at random. I used a simple rule-based imputation that is a form of add-one smoothing. Every unobserved link gets an imputed count of one. A link gets two when it leads into a core screen (Flyway or Perches) or when the walkthroughs are known to understate it. One example of understatement is leaving the app from the map: a task-driven walkthrough always continues to the next step, while a real user often checks a commute and closes the app. In total I imputed 13 transitions (Table 8), against 69 real ones, so the real data still dominates.

| Link | Imputed count | Rule |
| --- | --- | --- |
| L09 | 2 | Perches -> Flyway: core screen, back to events after browsing |
| L12 | 1 | Perches -> Nest: add-one |
| L16 | 1 | Migration -> Nest: add-one |
| L18 | 2 | Chirps -> Perches: core screen, check a place a friend sent |
| L19 | 1 | Chirps -> Migration: add-one |
| L22 | 1 | Nest -> Perches: add-one |
| L23 | 1 | Nest -> Migration: add-one |
| L24 | 1 | Nest -> Chirps: add-one |
| L36 | 1 | Booking -> Exit: add-one (walkthroughs always closed the sheet) |
| L37 | 2 | Migration -> Exit: map is often a last stop; walkthroughs understate it |

Table 8. Imputed counts and the rule behind each one.

### 6.2 The UBST Model

Table 9 gives the final Markov-OP. For each link it shows the real count and the imputed count as separate columns, then the probability, which is (real + imputed) divided by the total for that source state.

| Link | From | To | Real | Imputed | Prob. |
| --- | --- | --- | --- | --- | --- |
| L01 | Splash | Onboarding | 3 |  | 0.300 |
| L02 | Splash | Flyway | 7 |  | 0.700 |
| L03 | Onboarding | Flyway | 2 |  | 0.667 |
| L04 | Onboarding | Exit | 1 |  | 0.333 |
| L05 | Flyway | Perches | 6 |  | 0.400 |
| L06 | Flyway | Migration | 1 |  | 0.067 |
| L07 | Flyway | Chirps | 2 |  | 0.133 |
| L08 | Flyway | Nest | 1 |  | 0.067 |
| L25 | Flyway | Flyway | 3 |  | 0.200 |
| L33 | Flyway | Exit | 2 |  | 0.133 |
| L09 | Perches | Flyway | 0 | 2 | 0.111 |
| L10 | Perches | Migration | 3 |  | 0.167 |
| L11 | Perches | Chirps | 1 |  | 0.056 |
| L12 | Perches | Nest | 0 | 1 | 0.056 |
| L26 | Perches | Perches | 3 |  | 0.167 |
| L27 | Perches | Listing detail | 6 |  | 0.333 |
| L34 | Perches | Exit | 2 |  | 0.111 |
| L28 | Listing detail | Perches | 2 |  | 0.333 |
| L29 | Listing detail | Booking requested | 3 |  | 0.500 |
| L35 | Listing detail | Exit | 1 |  | 0.167 |
| L30 | Booking requested | Perches | 3 |  | 0.750 |
| L36 | Booking requested | Exit | 0 | 1 | 0.250 |
| L13 | Migration | Flyway | 1 |  | 0.111 |
| L14 | Migration | Perches | 1 |  | 0.111 |
| L15 | Migration | Chirps | 2 |  | 0.222 |
| L16 | Migration | Nest | 0 | 1 | 0.111 |
| L31 | Migration | Migration | 2 |  | 0.222 |
| L37 | Migration | Exit | 0 | 2 | 0.222 |
| L17 | Chirps | Flyway | 1 |  | 0.091 |
| L18 | Chirps | Perches | 0 | 2 | 0.182 |
| L19 | Chirps | Migration | 0 | 1 | 0.091 |
| L20 | Chirps | Nest | 2 |  | 0.182 |
| L32 | Chirps | Chirps | 3 |  | 0.273 |
| L38 | Chirps | Exit | 2 |  | 0.182 |
| L21 | Nest | Flyway | 1 |  | 0.167 |
| L22 | Nest | Perches | 0 | 1 | 0.167 |
| L23 | Nest | Migration | 0 | 1 | 0.167 |
| L24 | Nest | Chirps | 0 | 1 | 0.167 |
| L39 | Nest | Exit | 2 |  | 0.333 |

Table 9. Markov-OP for Perch (real and imputed counts kept separate).

A few things stand out. Seven of ten sessions start as returning users (S1 to Flyway, 0.70). From the deck, opening a listing is the most likely action (0.333). From a listing, half of the time the user requests to book it (0.5). Using this profile, an average session visits about 5.74 screens, with the feed and the deck visited most. Usage-based test cases are generated by random walks from S1 that follow these probabilities until they reach Exit. Each run tests the paths a user is most likely to take, and a failure rate measured on many such runs estimates reliability under this profile.

## 7. Can the Karami-Tian Method Be Used?

Karami and Tian (2018) proposed a way to keep a Markov-OP accurate when a web application changes. They start from the initial Markov-OP and the UML activity diagrams of the updated application, and they analyze the differences between the two to find states and transitions that were added, removed, or changed. They then update the Markov-OP to match, without waiting for new usage logs. In their study, the updated model was closer to a Markov-OP built later from real usage of the new version than the initial model was.

The method does not help me construct the first Markov-OP, because it needs an existing profile to update. For this assignment the initial profile had to come from the walkthrough data and imputation. It fits Perch well for updating, though, because Perch changes every development round. The onboarding flow already gained an account-creation step, a photo step and a flock step in earlier rounds, and each change would have made an old profile wrong. A concrete next update is the Negotiate screen, which the Perches page already links to through "Scout perches". If the next version makes it part of the main flow, an activity diagram of the new flow would show Perches to Negotiate and Negotiate to Listing detail. In the spirit of the Karami-Tian method, I would add a state S11 Negotiate with those links. I would then give the new Perches-to-Negotiate link a starting probability, for example 0.10, by scaling the existing Perches row down proportionally (each existing probability times 0.9) so the row still sums to one. The first real logs from the new version would then correct the estimate. The method's main requirement is up-to-date activity diagrams, which Perch does not have today. They could be drawn from the README walkthrough and the code, since the screen flows are small.

## 8. Comparison with Musa-OP and Conversion

A Musa operational profile is a flat list of operations with the probability that each one is used. It says nothing about order. The Markov-OP is sequence-based: the probability of the next action depends on the current screen, so it can generate realistic sessions and capture paths like deck to listing to booking. Musa-OP is simpler to build and explain, and it is enough to decide how much test effort each operation deserves. Markov-OP needs more data (a count for every link instead of for every operation), but it is a better fit for an interactive app like Perch where what a user can do depends on where they are.

A Markov-OP can be converted into a Musa-OP by computing how often each state, or each action, is used per session and normalizing. Let Q be the transition matrix restricted to the non-exit states. The fundamental matrix N = (I - Q)^-1 gives, in its row for the start state, the expected number of visits to each state in one session. Dividing each expected visit count by their total gives a probability per screen, which is a Musa-OP whose operations are the screens (Table 10).

| Screen (operation) | Expected visits per session | Musa-OP probability |
| --- | --- | --- |
| S3 Flyway (feed) | 1.570 | 0.273 |
| S4 Perches (deck) | 1.475 | 0.257 |
| S8 Chirps (DMs) | 0.673 | 0.117 |
| S7 Migration (map) | 0.610 | 0.106 |
| S5 Listing detail | 0.492 | 0.086 |
| S9 Nest (profile) | 0.377 | 0.066 |
| S2 Onboarding | 0.300 | 0.052 |
| S6 Booking requested | 0.246 | 0.043 |

Table 10. Musa-OP over screens, converted from the Markov-OP.

The same idea works at the level of user actions. The expected number of times a link is taken per session is the expected visits to its source state times the link probability. Adding these up for links with the same action and normalizing gives a Musa-OP over operations (Table 11). Here all twenty bottom-navigation links are grouped into one "switch tab" operation, and the start and exit links are left out.

| Operation (user action) | Expected per session | Probability |
| --- | --- | --- |
| switch tab (bottom nav) | 2.577 | 0.544 |
| tap Details | 0.492 | 0.104 |
| open an event's comments | 0.314 | 0.066 |
| swipe/pass to next card | 0.246 | 0.052 |
| tap Request to book | 0.246 | 0.052 |
| finish onboarding | 0.200 | 0.042 |
| close sheet | 0.184 | 0.039 |
| open a conversation | 0.184 | 0.039 |
| close detail sheet | 0.164 | 0.035 |
| switch map layer | 0.136 | 0.029 |

Table 11. Musa-OP over user actions, converted from the Markov-OP.

The conversion keeps how often things happen but loses the order in which they happen. The Musa-OP in Table 11 says that "tap Request to book" is about 5% of user actions, but not that it can only follow "tap Details". Conversion therefore only goes one way: a Markov-OP can be turned into a Musa-OP, but a Musa-OP cannot be turned back into a Markov-OP without the transition data.

## References

J. Tian, Software Quality Engineering: Testing, Quality Assurance, and Quantifiable Improvement, John Wiley and Sons and IEEE Computer Society Press, 2005.

G. Karami and J. Tian, "Maintaining accurate web usage models using updates from activity diagrams," Information and Software Technology, vol. 96, 2018.
