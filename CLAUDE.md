# Perch - Architecture Reference

> A social platform that helps interns land in a new city: find other interns (roommates, friends, going out) and subleasers, get familiar with where they're moving, and feel oriented before they arrive. Instagram-shaped UX. Baby-chick mascot, baby-blue-and-white theme.

This document is the single source of truth for the system. It is written to be read cold by someone (or another AI assistant) with no prior context.

> **How to use this doc (this file IS `CLAUDE.md` in Claude Code):** This is persistent CONTEXT, not a single task. Don't try to build all of Perch in one shot. Work SECTION BY SECTION following the build split in §11 - e.g. (1) scaffold Next.js + Tailwind + shadcn + Supabase; (2) build the schema + RLS from §5; (3) build the streaming negotiation hero from §4; (4) realtime DMs; (5) map + stickers; etc. Review each piece before moving on. This is a **demo build in dev/test mode** - no production auth/verification/review flows (see §2). The tool choices in §2 are LOCKED; the real work and open product decisions live in §8 and §12.
>
> **Status (2026-07-16):** Round 1 + Round 2 shipped and merged to `main`. Historical per-person implementation docs have been removed; the shared interface (data model, tokens, API shapes) lives in `docs/FOUNDATION-CONTRACT.md`. Build/feature status is tracked in `docs/PROGRESS.md`. **Round 3 is planned** (upcoming-events + images, comprehensive sublet details + pros + furnished, roommate grouping, a real booking flow, a realistic financial model, fuller checklist, onboarding-percentage removal, richer map-marker info) - seams in `docs/FOUNDATION-CONTRACT.md` §13, split three ways (branches `person-a`/`person-b`/`person-c`), plans in `docs/IMPLEMENTATION-PERSON-{A,B,C}-ROUND3.md`.

---

## 1. What Perch Is

**One-liner:** The social network interns use to land in a new city.

**Core value:** connection. Two connection types:
1. **Intern ↔ Intern** - find others at your company / in your city, moving the same time, similar taste, for roommates, friends, and doing things together ("your flock").
2. **Intern ↔ Subleaser** - connect with people subletting places that fit a ~10-week internship (most listings assume 12-month leases; interns need short-term).

Everything else (taste-matched feed, life-map, first-week itinerary, past-intern notes, community map stickers) exists to **warm up and inform** those connections. It is a genuine social product, built Instagram-shaped (feed, stories, DMs, profile) - NOT an integration with Instagram the company (see §7).

**Emotional frame:** an intern is a fledgling leaving the nest for a season - scary but exciting. The app handles both the *practical* (money, safety, housing) and the *exciting* (a new city, new people, your future self there).

---

## 2. Tech Stack (LOCKED)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (React) + TypeScript** | One repo for frontend + backend (API routes). Team knows React. Biggest ecosystem. |
| Styling | **Tailwind CSS** | Fast, consistent, design tokens in config. Build styles inline, no CSS sprawl. |
| Components | **shadcn/ui** | Clean accessible components built on Tailwind. Saves UI build time. |
| Animation | **Framer Motion** | The chick, transitions, listings "landing" into the tray. Flash/polish. |
| Database + Auth + Realtime + Storage | **Supabase (Postgres)** | ONE managed service, FOUR jobs: relational data, Perch's own login, live DMs (Realtime), image storage. Relational fit + realtime is why it beats Firebase/Mongo here. |
| LLM calls | **OpenAI API via Vercel AI SDK** | Reasoning, matching, parsing. AI SDK gives clean streaming + React hooks + structured output. (OpenAI because that's the credit we have.) |
| Third-party account connections | **Composio** | Handles OAuth for users connecting Spotify (core) and Instagram Business/Creator (limited - see §7). Managed auth, token refresh. |
| Map | **Mapbox** | The life-map + community sticker layer. Custom styling fits the theme; good layer support. |
| Deploy | **Vercel** | Zero-config for Next.js (same company). Free preview URLs per branch. |

**Explicitly NOT using:** AWS, self-managed servers, MongoDB, a VPS, a separate backend server, ElevenLabs/voice. Real-time messaging is handled by Supabase Realtime (no socket server to run). This keeps the whole thing in one TypeScript repo on managed services.

**SCOPE: THIS IS A DEMO, NOT PRODUCTION.** All third-party integrations run in **dev/test mode** with our own accounts. This means NO Meta App Review, NO Google verification, NO Spotify quota extension - all the "days-to-weeks approval" friction is a production concern we are explicitly NOT dealing with. Spotify dev mode allows ~25 allowlisted test accounts (plenty). Google Calendar test mode shows an "unverified app" warning (fine - it's just us clicking through). Instagram runs in a dev-mode Meta app with one connected Business account (no review). Build accordingly: do not implement production auth/verification flows.

### The clean mental model (avoid confusion)
- **Supabase** = Perch's OWN accounts, data, chat, images.
- **Composio** = connecting users' EXTERNAL accounts (Spotify, Instagram Business).
- **OpenAI + Vercel AI SDK** = the reasoning/matching + streaming.
- **Mapbox** = map + stickers.
- **Vercel** = where it lives.

### Why this works together (confidence: high)
Core (Next.js + Supabase + Mapbox + Vercel) is a standard, widely-used web stack - every pairing is same-company or officially supported. The two additions (Composio + Vercel AI SDK) are proven together with this exact stack by a real shipped project (Rekindle: Next.js + Vercel + Composio + LLM-via-Vercel-AI-SDK). Composio publishes an official Instagram + Vercel AI SDK integration guide. Nothing here is a risky or unusual combination.

---

## 3. High-Level System Diagram

```
┌───────────────────────────────────────────────────────────┐
│                     CLIENT (Next.js/React)                 │
│  Instagram-shaped UI: Feed · Stories · Map · DMs · Profile │
│  Tailwind + shadcn/ui + Framer Motion (chick, transitions) │
└───────────────┬───────────────────────────┬───────────────┘
                │                           │
   Supabase JS client            Next.js API routes (/api/*)
   (auth, data reads,            (server-side logic)
    Realtime subscriptions,          │
    Storage up/download)             │
                │            ┌────────┼─────────┬──────────────┐
                │            │        │         │              │
                ▼            ▼        ▼         ▼              ▼
        ┌──────────────┐ ┌──────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
        │  SUPABASE    │ │OpenAI│ │Composio│ │ Mapbox  │ │ Parsers  │
        │ Postgres     │ │(via  │ │(OAuth: │ │(map +   │ │ (offer   │
        │ Auth         │ │Vercel│ │ Spotify│ │ sticker │ │  letter  │
        │ Realtime     │ │ AI   │ │ + IG   │ │ layer)  │ │  PDF +   │
        │ Storage      │ │ SDK) │ │ Business)│ │        │ │  Takeout │
        └──────────────┘ └──────┘ └────────┘ └─────────┘ │  JSON)   │
                                                          └──────────┘
```

Client talks to Supabase directly for auth, data, realtime, and storage. Anything needing secrets or server logic (LLM calls, Composio calls, parsing) goes through Next.js API routes.

---

## 4. Core Features → How They're Built

| Feature | Surface (IG metaphor) | Built with |
|---|---|---|
| Onboarding (upload offer letter, connect Spotify, optional Maps Takeout) | Guided flow w/ chick | Forms + Composio (Spotify) + parsers (PDF/JSON) |
| **Live housing "negotiation"** (scouts check each listing: budget, safety, lease, routine-fit) - HERO DEMO | Streaming results screen | OpenAI via Vercel AI SDK (**streaming**) + deterministic rule code |
| Taste-matched events feed ("the Flyway") | Feed | OpenAI matching Spotify taste → seeded events |
| Sublet / listing shortlist ("perches") | Story tray | Supabase data + Mapbox |
| Life-map (coffee, gym, show, commute pinned) | Map | Mapbox + Takeout-derived places |
| **Community map stickers** (good/vibe spots - see §8 for safety note) | Map layer | Mapbox layer + Supabase (sticker coords/text) |
| First-week itinerary ("landing") | Calendar | OpenAI + optional Google Calendar sync (Composio) |
| Peer connection ("find your flock") | Discovery + DMs | Supabase data + **Supabase Realtime** (live chat) |
| Past-intern notes / Q&A | Feed/thread | Supabase data |
| Verified badge ("banded") | Profile | Supabase auth + verification logic (see §8) |
| Pre-move checklist ("pre-flight") | Profile | Supabase data |

**Architectural principle (from prior Rollaway win, keep it):** the LLM *reasons and explains*; hard math (budget) and hard rules (does it pass a safety flag) are **deterministic code**, never the model. More reliable, and a good thing to tell judges/reviewers.

---

## 5. Data Model (Supabase / Postgres - starting shape)

Define clean normalized tables up front. Starting set (extend as needed):

- **users** - id, name, company, role, city, move_in_date, taste_profile (from Spotify), verified (bool), created_at
- **listings** (sublets) - id, title, address, lat, lng, price, lease_start, lease_end, lease_type, source, photos (Storage refs), safety_flags, created_by
- **stickers** - id, lat, lng, category, note, created_by, created_at
- **messages** - id, conversation_id, sender_id, recipient_id, body, created_at *(Realtime subscribes here for live DMs)*
- **conversations** - id, participant_ids, last_message_at
- **events** - id, title, category, lat, lng, datetime, source *(seeded for demo)*
- **notes** (past-intern Q&A) - id, city/area, topic, body, created_by
- **checklist_items** - id, user_id, label, due_offset, done

**Row-Level Security (RLS) is mandatory** (see §8). E.g. a user can only read/write their own conversations' messages.

---

## 6. Real-Time Messaging (how it works, no servers)

Supabase Realtime IS a managed websocket server. Flow:
1. Intern A sends a message → client inserts a row into `messages`.
2. Postgres records the insert.
3. Supabase Realtime pushes it over websocket to Intern B (subscribed to that conversation).
4. B's screen updates instantly.

We write a DB insert + a client subscription. No socket server code, no VPS, no scaling layer to manage. This is why "we don't need our own live servers" - Supabase runs them.

---

## 7. Instagram & Spotify via Composio - CAPABILITIES & HARD LIMITS

**Spotify:** clean, no unusual restriction. Core integration. Powers taste-matching. Use freely.

**Instagram - READ THIS CAREFULLY:**
- Composio's Instagram toolkit is real and full-featured (fetch media/posts/reels/carousels, comments, insights, DMs, publish). OAuth + token refresh handled. Official Composio + Vercel AI SDK guide exists.
- **HARD LIMIT (Meta's rule, not Composio's): Instagram *Business and Creator* accounts ONLY. Personal accounts CANNOT be connected - by anyone. This is a Meta API wall.**
- **Implication for Perch:** most interns have *personal* IG accounts → they will NOT be able to connect them. Do NOT build a core feature that assumes "interns connect their personal Instagram."
- **Where IG works:** Business/Creator accounts only - e.g. pulling content from venues, events, companies, or a Perch business page. Fine for those.
- **For interns' own photos/vibe:** have them **upload directly to Perch** (Supabase Storage). Do not route this through Instagram.

**Composio adoption note:** proven to work with our stack, but reviews flag a learning curve. **Timebox it** (~1 day to get one integration working). If it fights the team, fall back to hand-written OAuth for Spotify/Calendar - well-documented and predictable. Cost: free tier covers demo scale; verify current limits + whether specific connectors are premium.

### Permissions to grant Composio - LEAST PRIVILEGE (read-only)
Perch only ever READS from these services. Grant the minimum; hold nothing that writes/posts/controls. (Composio lets you configure exactly which scopes/actions are allowed at connect time - use that.)
- **Spotify:** read-only - top artists + top tracks (the taste data that powers matching). Optionally followed artists / saved tracks for a richer profile. **Do NOT grant** playback control, playlist/library modification, or any write scope.
- **Instagram (if used):** read-only - read the specific media/content being displayed, plus basic profile/insights only if actually needed. **Do NOT grant** publishing/posting, comment/DM management, or delete. (The toolkit *can* do all of these - grant none of them.)
- **Why:** the trust story ("verified/banded", safety) is undercut if the app requests post/control access it doesn't use; and less access = smaller blast radius if a key leaks. Requesting only read-only taste data is a clean, defensible ask.
- Exact scope names drift - at setup, pick the read scopes (top items / media read) and decline write/publish/control.

---

## 8. Non-Framework Work (where real build time goes)

These are NOT tool choices - they're the glue/logic you must build, and where teams lose time they assumed they had:

1. **Offer-letter parsing** (PDF → structured: salary, employer, dates). Extract text first, then parse (optionally via LLM).
2. **Google Maps Takeout parsing** (JSON → frequent places: the coffee chain, the gym). Scope tight - only "recurring places." This powers the standout "4 min from your usual coffee spot" beat. Pre-load a sample Takeout for the demo so it never breaks live.
3. **Supabase RLS policies** - SECURITY-CRITICAL for a messaging app. Without correct policies, users could read others' DMs. Budget real time.
4. **Secret management** - all API keys in a gitignored `.env`, never committed. A leaked OpenAI key costs money. Rate-limit any LLM endpoint so it can't be spammed.
5. **Seed data** - convincing fake interns, listings, stickers, messages so the platform LOOKS ALIVE in a demo (a social app that looks empty reads as broken). Real work; don't leave to the last minute.
6. **Demo rehearsal** - run the exact demo flow on the ACTUAL hardware/network you'll present on. "Worked on my laptop" kills demos.

### Two product risks to have answers ready for
- **Cold-start** (a social platform is only as good as who's on it). Real answer: **density-first** - launch one company's cohort / one city / one school hub, get it dense enough to be useful, then expand. NOT "all interns everywhere." For the demo: seed a believable population.
- **Verification** ("banded/verified" is the trust backbone). Actually verifying someone is an intern is non-trivial (company email? offer letter?). Seed for the demo; have a real plan for production.
- **Safety stickers:** "avoid this area / bad" labels carry real risk - they can be wrong, outdated, or track bias (racial/economic) rather than real safety. Recommendation: ship **positive/vibe stickers freely** (good coffee, safe-feeling, interns hang here); treat "unsafe/avoid" labeling with extreme caution or omit it. A friendly app that amplifies neighborhood bias under a chick mascot is a real harm. Decide this before shipping the sticker feature.

---

## 9. Design System

- **Mascot:** a round, cute baby chick. Simple/soft, flat vector, not glossy or over-detailed (reads better small). Appears ONLY in personality moments: onboarding/intro, loading screens, empty states, milestone beats. ABSENT from decision surfaces (listings, safety, money, map decisions) - those stay clean, serious, information-first. Principle: **the chick handles emotion and waiting; the interface handles decisions.** Best implemented as a Lottie animation (or simple Framer Motion) dropped into loading/onboarding states.
- **Palette:** baby blue + white base. PLUS a deeper/dark blue for text and contrast (pure baby-blue-on-white is too low-contrast/inaccessible for body text). PLUS one warm accent (soft yellow/peach - the chick's beak/feet) used sparingly for highlights, "top pick," celebratory moments, so it doesn't feel cold. Safety/functional colors (green = passes/safe, amber-red = flag/scam) must stay UNMUTED and legible - do not pastel-ify warnings.
- **Rule:** theme adds delight via language + iconography + motion; it NEVER costs clarity. Plain meaning always wins; bird words ("perches," "flock," "flyway," "banded," "pre-flight") ride alongside, subtitled where needed.
- **Tokens:** lock exact hex values into Tailwind config early so every screen stays consistent.

**MASCOT ASSET STATUS (important for whoever wires it in):** SVG chick assets exist in `assets/mascot/` - round, plush, rosy cheeks, orange beak/feet, good character. Three files: `plush-chick-idle.svg` (breathe + blink + slow wing-sway loop), `plush-chick-hop.svg` (hop + flap + shadow loop), and `plush-chick-static-fur.svg` (the high-detail `feTurbulence` fur version, single static pose). See `assets/mascot/README.md`. BUT two things need fixing before use:
1. **It's currently mint-green/teal (`#AEE4DE` body, `#8FC7E8` wings), NOT baby blue.** Recolor the body to the baby-blue token and wings to a lighter/darker blue to match the locked palette. Keep the orange beak/feet (already matches the warm accent). (Decision was: recolor the chick to fit the app, not shift the app to teal.)
2. **It uses heavy SVG filters (`feTurbulence` + `feDisplacementMap` for the "fur" texture).** These are expensive and render inconsistently across browsers/mobile, and will stutter if the chick is animated in loading loops. Produce a **flattened/simplified version** (bake down or drop the turbulence filter) for the animated loading/onboarding states; keep the fancy-fur version only for large static hero placements if desired. (The `idle`/`hop` SVGs are already the flattened, animation-ready versions; `static-fur` keeps the filter.)
3. **The animated SVGs reference `@keyframes` (apHop, apBreathe, apBlink, apFlap, apWingSway…) that are NOT defined inside the SVG** - they must be supplied by app CSS. Person A owns adding these keyframes. Animate this single pose with transforms (gentle bob, blink, wing-flap) rather than needing multiple drawn poses - cheaper and keeps it on-model.

---

## 10. Cost Summary (verify current numbers before relying)

- Next.js/React/Tailwind/Framer Motion/shadcn - free (open source).
- Vercel - free hobby tier covers build + demo.
- Supabase - usable free tier (DB size cap, idle-pause after ~1 week of inactivity → poke it before demo day, Realtime connection caps). Paid ~$25/mo when outgrown.
- Mapbox - free up to a monthly map-load limit; plenty for build/demo.
- OpenAI - the one guaranteed cost, pay-per-token, but cents-to-a-few-dollars during dev. Use a cheaper model for testing.
- Composio - free tier covers demo scale; some premium tools cost extra; possible startup credits.
- Google Calendar / Spotify APIs - free at this scale.

**Bottom line:** building + demoing Perch is effectively free; only OpenAI costs (trivially) during dev. Real costs appear only with real traction.

---

## 10b. Keys & Setup Checklist (get before building)

All keys go in a **gitignored `.env`** - NEVER commit. A leaked OpenAI key costs real money even in dev.

**Instant / free - grab these five FIRST (they unblock the entire core build):**
- **Supabase** - project URL + anon (public) key + service-role (secret) key.
- **OpenAI** - API key. (Only thing that costs - pennies for a demo.)
- **Mapbox** - access token.
- **Composio** - API key.
- **Vercel** - connect the GitHub repo (not really a key).

*With just these five you can build EVERYTHING except the third-party account connections: feed, DMs, map, stickers, the negotiation hero, all of it.*

**Afternoon setup, no approvals needed for demo (do when you reach the feature):**
- **Spotify** - register a dev-dashboard app → Client ID + Secret. Dev mode = ~25 allowlisted test accounts. No quota extension / review.
- **Google Calendar** - Google Cloud project, enable Calendar API, OAuth consent screen → Client ID + Secret. Testing mode = add your own accounts as test users; "unverified app" warning is fine.

**Only if Instagram is in-scope (start early, but skippable):**
- **Instagram** - one Business/Creator account + linked Facebook Page + Meta dev app (App ID + Secret) in **development mode**. No App Review for the demo.

**No key needed:**
- **Google Maps Takeout** - users upload their own export.

---

## 11. Suggested Build Split (parallel tracks for a team)

> **This project's actual split (2 people) is in `docs/FOUNDATION-CONTRACT.md`.** The tracks below are the source material that split was derived from.

- **Frontend/social shell** - feed, stories, profile, DMs UI, design system, chick (polished, mostly on seeded data).
- **Realtime messaging** - Supabase Realtime DMs, actually live.
- **Map + stickers** - Mapbox + sticker layer + Supabase coords.
- **Onboarding integrations (TIME SINK - put a strong dev here)** - Composio (Spotify), offer-letter + Takeout parsing.
- **Hero feature** - streaming housing negotiation (OpenAI via Vercel AI SDK + deterministic rules).
- **Cross-cutting** - RLS policies, secret management, seed data, demo script.

**Weighting:** make the HERO (negotiation + Maps beat) genuinely live; run the rest of the social surfaces on polished seeded data. One deep working moment + a coherent, beautiful shell beats ten half-working features.

---

## 12. Open Decisions To Confirm

1. **Hero demo moment:** the live intern *connection* ("Jordan K., same company, same week, verified - message now"), or the housing *negotiation*? **DECIDED (2026-07-15): BOTH are built genuinely live.** Negotiation is wholly Person B; the connection hero is a joint Person A (discovery UI + realtime DM) × Person B (matching engine) beat. See `docs/FOUNDATION-CONTRACT.md`.
2. **Launch wedge:** which one cohort/city/school do we seed first for density?
3. **Exactly what (if anything) Instagram does** - must be Business/Creator content only.
4. **Safety stickers:** positive-only, or attempt "avoid" labeling with safeguards? **Leaning positive-only per §8** - Person A ships positive/vibe stickers only unless changed.
5. **Composio go/no-go** after the timeboxed spike (fallback: hand-written OAuth).

---

## 13. Round 2 Scope (2026-07-16)

Both the v1 app and Round 2 are built and merged to `main`. Round 2 added: perches swipe deck + saved tray, subletter posting + freshness, Airbnb-style reviews, tappable profiles (intern + subletter view), Google-Maps-style map icons + legend + event pins, event card with picture + venue + Going Y/N poll + comments, offer manual-correction, feed events-only, map comments, friends UI + IG-Notes strip in DMs, front-page cleanup, apartment -> office road-following route (Mapbox Directions) + POI-along-route selection + generated schedule. Frozen seams and the ownership map are in `docs/FOUNDATION-CONTRACT.md` sections 11 (batch 1) and 12 (batch 2).

1. Auto-sourced sublets, not manual entry. A server-side sourcing pipeline (adapter interface plus a seed/mock adapter for the demo) fills `listings` in the area. Real scraping of third-party sites is OUT of scope for the dev-mode demo (ToS and legal risk); the adapter pattern leaves room for real sources later.
2. Listing freshness. Listings carry `status` (available/pending/taken/stale) plus `expires_at` and `last_confirmed_at`; an expiry job and "still available?" pings keep the deck honest. Stale listings kill trust, so they never surface in the swipe deck.
3. Subletters post subleases; interns leave Airbnb-style reviews. A `user_type` distinguishes them. A review (1 to 5 stars plus text) attaches to a listing or a subletter and shows as a rating badge.
4. Perches are a swipe deck (Tinder-style): swipe right to save, left to pass, tap for full details. The saved tray is populated by right-swipes.
5. Events come from the Ticketmaster Discovery API (nearby, keyed, with a seeded fallback), and each event shows a count of interns going (attendance).
6. The map uses Google-Maps-style category icons for places, stickers, events, and listings, with event pins.
7. Any name or avatar is tappable to that person's profile; a subletter's profile shows their listings and reviews.
8. Offer-letter parsing is hardened: broader formats, OCR for scanned images, per-field confidence, and a manual-correction fallback in onboarding (v1 was heuristic on one clean PDF format).

Decisions resolved: §12.1 both heroes are live (v1 shipped); §12.4 stickers stay positive-only (enforced by a DB CHECK and the UI). Process: docs and user-facing text use plain ASCII (no emojis, no em-dashes); every merge to `main` updates `README.md` and `docs/PROGRESS.md`.

---

## 14. Round 2 - Additional Scope / batch 2 (2026-07-16)

Still Round 2, a second batch on top of section 11 above. Full seams are in `docs/FOUNDATION-CONTRACT.md` section 12. All shipped and merged to `main`.

1. Comments leave the Flyway feed and live on the map: past-intern notes/comments become map-anchored placeholders; the feed is events-only.
2. On the Flyway, each event gets a comment thread and a going yes/no poll that shows how many interns are going.
3. Feed events show pictures.
4. Friends: interns can add each other (request/accept), with a friends list and a requests inbox.
5. DMs get an Instagram-Notes-style strip showing which friends are going to which events.
6. The front page loses its dev shortcuts ("skip to the app shell", "try the negotiation hero"); onboarding is the entry.
7. After selecting an apartment, the map draws the commute route from the user's office to the apartment in a color; the user picks favorite POIs (coffee, gym) along the route; a schedule is generated from those selections.

Decisions: the commute route uses the Mapbox Directions API (seeded/straight-line fallback) with the office geocoded from the employer; the going poll reuses the round-2 `event_attendance` table as a yes/no; map comments reuse `notes` with added lat/lng.

---

*End of reference. Stack is locked; §8 and §12 are where the real work and decisions live.*

## Agent skills

This repo uses local Markdown for agent issue tracking.

- Issue tracker: `.scratch/<feature-slug>/`
- Specs: `.scratch/<feature-slug>/spec.md`
- Tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`
- Skill config docs:
  - `docs/agents/issue-tracker.md`
  - `docs/agents/triage-labels.md`
  - `docs/agents/domain.md`

When a skill says to publish to the issue tracker, create Markdown files under `.scratch/`.
When a skill mentions triage labels, use the canonical labels in `docs/agents/triage-labels.md`.
Before domain-sensitive work, follow `docs/agents/domain.md`.
