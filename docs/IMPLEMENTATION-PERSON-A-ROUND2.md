# Perch Round 2 - Implementation Plan: PERSON A (Experience & Social Shell)

Mission: layer the round-2 consumer features onto the shipped v1 shell - a Tinder-style swipe deck for perches, subletter posting, Airbnb-style reviews, tappable profiles, Google-Maps-style map icons, event attendance, listing-freshness UI, and the offer manual-correction fallback. Build on fixtures first so nothing blocks on Person B.

Branch: person-a. You are Person A. Round 2 is split THREE ways: you own every consumer surface; Person B owns the schema + core CRUD API routes; Person C owns the background pipelines, external integrations, and AI parsing. You consume routes from both B and C; the frozen shape is all you depend on, so who owns a given route does not change your code.

Read together, do not restate them:
- docs/FOUNDATION-CONTRACT.md section 11 (the frozen round-2 seams: tables, routes, types) and the three-way ownership map in 11.11. When this plan and the contract disagree, the contract wins.
- docs/SOURCING-PROPOSAL.md (context for freshness/status; Person C owns it).
- docs/IMPLEMENTATION-PERSON-B-ROUND2.md and docs/IMPLEMENTATION-PERSON-C-ROUND2.md (who builds the routes you consume).
- Your v1 plan docs/IMPLEMENTATION-PERSON-A.md and the shipped code.

Working agreements (contract 11.12):
- Plain ASCII only. No emojis, no em-dashes or en-dashes in docs or user-facing strings. Use "-" or reword.
- Every merge to main: update README.md (status) and docs/PROGRESS.md (mark your RA item done, dated).
- Contract-first: consume the frozen types from lib/types/contract.ts (section 11.10). If a shape is missing there, add it in the same PR; never invent a local shape.
- Fixtures-first: extend lib/fixtures/* for every new shape and drive on NEXT_PUBLIC_DATA_SOURCE=fixture; wire live behind env.

---

## 1. Scope - what Person A owns in round 2

- RA1 Perches swipe deck (Tinder-style). Replace the v1 saved-shortlist tray with a swipe deck of fresh listings from GET /api/perches: drag left/right plus reject/save buttons, a card stack, and a detail sheet on tap. Right swipe calls POST /api/perches/swipe (direction "right"); left calls it with "left". Outcome: the intern swipes through fresh area sublets like Tinder and can open full details on any card.
- RA2 Saved tray. A "saved perches" view backed by GET /api/perches/saved (right-swipes). Reuse the existing LandInTray motion for the save beat. Outcome: right-swiped listings collect in a reviewable tray.
- RA3 Subletter posting. A "post a sublease" form for subletter accounts (user_type = "subletter") that calls POST /api/listings (PostListingInput). Outcome: a subletter can list a place; it enters the deck as sourced=false.
- RA4 Listing freshness UI. A status badge (available / pending / taken / stale) on listing surfaces, and a subletter confirm/relist affordance calling POST /api/listings/{id}/confirm. Outcome: freshness is visible; a subletter can answer "still available?".
- RA5 Reviews UI (Airbnb-style). A star-rating composer plus review list, shown on the perch detail sheet (subject listing) and on a subletter profile (subject subletter). Reads GET /api/reviews, writes POST /api/reviews. A compact rating badge (avg + count) wherever a listing or subletter appears. Outcome: interns leave and read reviews.
- RA6 Tappable profiles. Any avatar or name (feed, discovery, DMs, reviews, a perch host) taps through to app/(shell)/profile/[id]. Extend the profile screen to render a subletter profile (their listings + review summary) via GET /api/users/{id}. Outcome: you can inspect anyone from anywhere.
- RA7 Map icons + event pins. Replace generic map markers with a Google-Maps-style category icon set for places, stickers, events, and listings; add a legend; event pins open the event card. Outcome: the map reads like Google Maps.
- RA8 Event attendance UI. The event card shows venue + image + "N interns going" and a Going toggle calling POST /api/events/{id}/attend, with an optimistic count. Outcome: interns see who is going and can join.
- RA9 Offer manual-correction UI. In onboarding OfferStep, show parsed fields, highlight needsReview (low-confidence) fields, and let the intern edit any field before continuing. Outcome: bad OCR/parse never blocks onboarding.
- RA10 Plain-ASCII sweep. Remove emojis and em/en dashes from existing user-facing strings across components and pages (the v1 UI still has some). Outcome: the app matches the plain-ASCII rule.

### NOT yours - Person B (schema + core APIs) and Person C (integrations + AI)
You consume these; you never build them. Build on fixtures until they land.

Person B (docs/IMPLEMENTATION-PERSON-B-ROUND2.md) - schema + core CRUD routes:
- Migrations + RLS: user_type, listing status/expiry/sourced fields, listing_swipes, reviews, event_attendance (RB1, RB2).
- GET /api/perches, POST /api/perches/swipe, GET /api/perches/saved (RB3).
- POST /api/listings, POST /api/listings/{id}/confirm (RB4).
- GET/POST /api/reviews (RB5).
- POST /api/events/{id}/attend + counts + feed additions (RB6).
- GET /api/users/{id} (RB7).
- Exposing kind/category per mappable row + round-2 base seed (RB8).

Person C (docs/IMPLEMENTATION-PERSON-C-ROUND2.md) - pipelines + integrations + AI:
- Sourcing pipeline + adapter + freshness expiry job + "still available?" ping dispatch (RC1, RC2; SOURCING-PROPOSAL.md). Your status badges reflect what the pipeline sets; your confirm affordance calls B's confirm route.
- Ticketmaster nearby events + events upsert (RC3). Your event card + map pins render these events (venue/image/category).
- Offer parser OCR + broader formats + confidence/needsReview (RC4). You render needsReview and let the intern correct; you do not parse.

Either way you only depend on the frozen shapes (contract 11.10); build on fixtures and swap fixture -> live per route as B and C ship stubs.

---

## 2. What you depend on / expose

You consume (frozen shapes, contract section 11.10):

| Interface | Contract | You use it in | If not ready |
|---|---|---|---|
| GET /api/perches -> PerchDeckResponse | 11.3 | RA1 swipe deck | local PerchCard[] fixture |
| POST /api/perches/swipe (SwipeInput) | 11.3 | RA1 swipe action | no-op locally, optimistic advance |
| GET /api/perches/saved -> PerchCard[] | 11.3 | RA2 saved tray | local subset fixture |
| POST /api/listings (PostListingInput) | 11.4 | RA3 post form | local echo |
| POST /api/listings/{id}/confirm | 11.4 | RA4 confirm | local status flip |
| GET/POST /api/reviews -> ReviewsResponse | 11.5 | RA5 reviews | local Review[] fixture |
| POST /api/events/{id}/attend -> AttendResponse | 11.6 | RA8 going toggle | local count bump |
| GET /api/feed (event gains venue/url/imageUrl/priceRange, internsGoing, viewerGoing) | 11.6 | RA8 event card | extend feed fixture |
| GET /api/users/{id} -> PublicProfile | 11.8 | RA6 profiles | local PublicProfile fixture |
| OfferParse gains confidence + needsReview | 11.9 | RA9 correction | extend onboarding fixture |

You expose: nothing new that B consumes (round 2 is UI-side). Keep the v1 shared exports (Mascot, LandInTray) stable.

Types: add the round-2 types from contract 11.10 to lib/types/contract.ts if B has not yet (Review, ReviewSummary, ReviewsResponse, PerchCard, PerchDeckResponse, SwipeInput, PostListingInput, AttendResponse, PublicProfile, UserType, ListingStatus, OfferField, and the FeedItem/OfferParse additions). Whoever lands first adds them; the other consumes. Never fork a local shape.

Fixtures: extend lib/fixtures/ with perches.ts (PerchCard deck + saved), reviews.ts, attendance-augmented feed, publicProfiles.ts, and an OfferParse-with-needsReview sample. Route them through lib/data/source.ts so fixture and live both work.

---

## 3. Build phases (commit after each; update PROGRESS.md + README each merge)

Reuse what exists: components/discovery/DiscoveryStack.tsx is already a swipeable card stack - lift its drag/threshold logic for the perch deck. components/ui/* (Card, Chip, Badge, Sheet, Avatar, Button) cover most primitives; add a Stars/Rating and StatusBadge primitive.

### Phase R2A-1 - Types + fixtures + data source
- Add the round-2 types (contract 11.10) to lib/types/contract.ts.
- Add fixtures: lib/fixtures/perches.ts (a deck of PerchCard with varied status/reviewSummary/host + a saved subset), lib/fixtures/reviews.ts, lib/fixtures/publicProfiles.ts; extend lib/fixtures/feed.ts events with venue/imageUrl/internsGoing/viewerGoing; extend lib/fixtures/onboarding.ts offer with confidence + needsReview.
- Wire getters in lib/data/source.ts: getPerchDeck, recordSwipe, getSavedPerches, getReviews, postReview, attendEvent, getPublicProfile, postListing, confirmListing.
- Acceptance: typecheck passes; every getter returns a fixture matching the frozen shape.

### Phase R2A-2 - Perches swipe deck (RA1) + saved tray (RA2)
- Rework components/stories/ into a swipe deck: PerchDeck.tsx (card stack + drag + Reject/Save buttons, using DiscoveryStack logic), PerchCard.tsx (photo, price, lease window, status badge, rating badge, host), and keep PerchDetailSheet.tsx for tap-to-detail (add reviews section from RA5). app/(shell)/stories/page.tsx renders the deck from getPerchDeck; each swipe calls recordSwipe optimistically then advances.
- Saved tray: a view (tab or sheet) from getSavedPerches; a right swipe plays LandInTray into the tray.
- Only fresh listings appear (B filters server-side; fixtures mirror this).
- Acceptance: swipe left/right advances the stack; buttons match gestures; tap opens details; right-swipes show in the saved tray; empty deck shows a chick-fronted empty state.

### Phase R2A-3 - Freshness UI (RA4) + subletter posting (RA3)
- StatusBadge component: available (func.pass), pending (func.flag), taken/stale (ink.muted). Show on perch card, detail sheet, and a subletter's own listings.
- Post-a-sublease form (subletter accounts only, gate on user_type): app/(shell)/post/page.tsx with fields for PostListingInput (title, address, map-pick lat/lng, price, lease dates, lease type, photos upload, optional safety notes) -> postListing. Confirm/relist affordance on the subletter's listings -> confirmListing.
- Acceptance: a subletter account sees the post form and can submit (fixture echoes it into the deck); an intern account does not see it; a near-expiry listing shows a confirm action that flips status back to available.

### Phase R2A-4 - Reviews UI (RA5)
- Stars primitive (read + input), ReviewComposer (rating + text -> postReview), ReviewList (from getReviews), RatingBadge (avg + count).
- Mount reviews on the perch detail sheet (subject listing) and on subletter profiles (subject subletter). Only intern accounts see the composer.
- Acceptance: leaving a review updates the list and the badge optimistically; average recomputes; a listing/subletter with no reviews shows a friendly empty state.

### Phase R2A-5 - Tappable profiles (RA6)
- A shared TappableUser wrapper: any avatar/name in feed, discovery, DMs, reviews, and perch host routes to /profile/[id].
- Extend app/(shell)/profile/[id]/page.tsx: for user_type "subletter" render their listings (with status badges) + review summary via getPublicProfile; for interns keep the v1 profile.
- Acceptance: tapping any user anywhere opens their profile; a subletter profile shows listings + reviews; back navigation returns cleanly.

### Phase R2A-6 - Map icons + event pins (RA7) + event attendance (RA8)
- Map: replace generic markers in components/map/ with a category icon marker set (an inline SVG icon per kind for places, per StickerCategory for stickers, per events.category for events, a coarse kind for listings). Add a legend and optional clustering. Event pins open the event card.
- Event card (components/feed/EventCard.tsx): show venue + image + "N interns going"; add a Going toggle -> attendEvent with an optimistic count and viewerGoing state. Feed reads the new event fields.
- Acceptance: map markers are recognizable category icons with a legend; tapping an event pin opens the card; the Going toggle updates the count optimistically and persists on live.

### Phase R2A-7 - Offer manual-correction (RA9) + ASCII sweep (RA10)
- OfferStep (app/onboarding/_steps/OfferStep.tsx): render parsed fields; visually flag needsReview fields; make every field editable before continue; corrected values proceed. Keep the mascot only in the waiting/celebration beats, never over the numbers.
- ASCII sweep: grep components/ app/ for emojis and em/en dashes in user-facing strings and replace; keep it out of future strings.
- Acceptance: an offer parse with low-confidence fields highlights them and lets the user fix them before continuing; grep finds no emoji or em/en dash in user-facing strings.

---

## 4. Definition of done + demo checklist

Done when:
- Perches is a swipe deck (drag + buttons + detail), driven by getPerchDeck; right-swipes populate the saved tray; only fresh listings appear.
- Subletter accounts can post a sublease and confirm/relist; freshness status is visible everywhere a listing shows.
- Reviews (compose + list + badge) work on perch details and subletter profiles; intern-only compose.
- Any name/avatar is tappable to a profile; subletter profiles show listings + reviews.
- Map uses category icons + legend; event pins open cards; event cards show venue/image + "N interns going" + a working Going toggle.
- OfferStep highlights and lets the user correct low-confidence fields.
- No emoji or em/en dash remains in any user-facing string; README + PROGRESS.md updated on every merge.
- Everything works on fixture and on live where B's routes exist.

Demo checklist (drive it):
1. Perches: swipe through fresh sublets, save a few, open details, read reviews.
2. As a subletter: post a sublease, see it in the deck, answer a "still available?" confirm.
3. Leave a review on a listing and on a subletter; see the rating badge update.
4. Tap a host or a match to open their profile; a subletter profile shows listings + reviews.
5. Map: recognizable category icons + legend; tap an event pin.
6. Feed: an event shows venue/image + "N interns going"; tap Going and watch the count move.
7. Onboarding: an offer with a low-confidence field is flagged and correctable.

---

## 5. Integration checkpoints with Person B

- Types freeze: agree the contract 11.10 types before wiring; whoever lands them in lib/types/contract.ts tells the other.
- Route stubs first: B ships each round-2 route as a typed stub returning the frozen shape from seed, so you swap fixture -> live with no code change.
- Perch freshness: confirm the deck server-filters to fresh listings so your UI never has to hide stale ones (defense in depth: still guard client-side).
- Reviews/attendance RLS: confirm write policies are deployed before demoing writes on live.
- user_type: agree how the demo switches between an intern account and a subletter account.
- Every merge to main: update README + PROGRESS.md.

---

## 7. Round 2 - Batch 2 (additional UI, contract section 12)

Still Round 2. These land on top of the batch-1 UI above. Frozen shapes + ownership in FOUNDATION-CONTRACT.md section 12; consume from B (core routes) and C (route/directions). Build on fixtures first.

- RA11 Feed is events-only. Remove the NoteThread interleave from app/(shell)/feed/page.tsx (drop getNotes + the note rows). The "random comments" (past-intern notes) move to the map (RA12). Outcome: the Flyway shows only events.
- RA12 Map comments. Render notes that carry lat/lng as placeholder markers on the map (components/map/), with a sheet to read and to add a comment at a tapped location. Consume GET /api/map/comments (by viewport bbox) and POST /api/map/comments. Outcome: past-intern comments live on the map with a marker each.
- RA13 Event comments. A comment composer + list on the event card (components/feed/EventCard.tsx). GET/POST /api/events/{id}/comments (EventComment). Outcome: interns can comment on an event.
- RA14 Event going Y/N poll. A Yes/No control on the event card plus a live "N interns going" count. POST /api/events/{id}/attend { going } -> { going, viewerGoing }. Outcome: interns vote going yes/no and see the count.
- RA15 Feed pictures. Render events.image_url on the event card (with a graceful fallback when absent). Outcome: the feed shows pictures.
- RA16 Friends. An add-friend button on profiles / match cards (components/profile/ProfileHeader.tsx, components/discovery/MatchCard.tsx), a friends list, and a requests inbox. Consume GET /api/friends, GET /api/friends/requests, POST /api/friends/request, POST /api/friends/{id}/accept|decline. Outcome: interns can friend each other.
- RA17 DMs Notes strip. An Instagram-Notes-style strip above the conversation list in app/(shell)/dms/page.tsx showing friends who are going to an event ("Alex is going to Fred again.."). Consume GET /api/friends/notes. Outcome: you see friends' event plans at the top of DMs.
- RA18 Front-page cleanup. In app/page.tsx remove the "Skip to the app shell" (-> /feed) and "Try the negotiation hero" (-> /negotiate) links; keep "Start onboarding". Optionally drop the "(dev) design tokens" link too. Outcome: the splash offers only onboarding.
- RA19 Apartment route + POIs + schedule. After an apartment is selected (from the perch detail sheet), render the commute route in a color on the map (POST /api/route -> RouteResponse geometry), let the user pick favorite POIs along the route (POST /api/route/pois -> RoutePoi[] with a select control), then show the generated schedule (POST /api/route/schedule -> a day). Outcome: pick a place, see the office-to-home route and choose coffee/gym stops, get a schedule.

NOT yours in batch 2: the routes above are built by B (map comments, event comments, attend, friends, friends-notes, route/pois, route/schedule) and C (POST /api/route directions, office geocode, POI search). You render; you consume the frozen shapes.

Acceptance (batch 2): feed shows only events with pictures; comments appear on the map with markers; event cards have a comment thread and a working going Y/N poll with a count; friends can be added and show a requests inbox; the DMs Notes strip shows friends' event plans; the front page has no skip/negotiation links; selecting an apartment draws the colored route, offers along-route POIs, and renders a schedule. All on fixture and on live where B/C routes exist. Update README + PROGRESS.md on merge.
