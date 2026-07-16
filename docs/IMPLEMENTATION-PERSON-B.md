# Perch - Implementation Plan: Person B (Intelligence, Data & Hero)

**Mission:** Own everything that makes Perch *smart, real, and safe* - the Supabase schema + RLS, auth, seed data, the external-data pipelines (Spotify taste, offer-letter PDF, Maps Takeout), the matching engine behind the feed and discovery, and the flagship **live streaming housing negotiation** end-to-end.

**Branch:** `person-b`

**You are Person B - Intelligence, Data & Hero.** Person A builds the visible shell and consumes your data + routes. You build the brain, the database, the security, and the one flagship you own top-to-bottom.

> Read alongside this doc: `CLAUDE.md` (product truth), `docs/FOUNDATION-CONTRACT.md` (the frozen shared interface - data model §2, tokens §3, API types §4, realtime §5). This doc never re-specifies the contract; it references it and tells you how to build your half. When this doc and the contract disagree, **the contract wins** - fix this doc.

---

## 1. Scope at a glance

You own **B1-B12** plus your half of the Day-0/Day-1 foundation sprint.

### 1.1 Features you own (each with its outcome)

- **B1 - Supabase schema.** All 8 §5 tables + indexes + Storage buckets + versioned migrations. Outcome: a fresh `supabase db reset` produces the exact schema the contract §2 describes.
- **B2 - RLS policies (SECURITY-CRITICAL).** Per-table row security; `messages`/`conversations` locked to participants. Outcome: a user provably cannot read another pair's DMs, and every table denies by default. **This is demo-blocking - no live DM demo ships without it.**
- **B3 - Auth (dev mode).** Supabase Auth + session handling + the `banded`/`verified` flag logic (seeded). Outcome: a demo login yields a session whose `auth.uid()` drives RLS; some seeded users are banded.
- **B4 - Seed-data generator.** Idempotent script producing believable interns, listings, stickers, events, notes, messages, checklist items. Outcome: `npm run seed` twice = same populated DB, no duplicates; the shell looks alive.
- **B5 - Composio Spotify connect.** Read-only top artists/tracks → `taste_profile`. **Timeboxed ~1 day**, with a documented hand-written-OAuth fallback. Outcome: a test account connects Spotify and its taste vector lands in `users.taste_profile`; if the spike fails, the fallback path does the same.
- **B6 - Parsers.** Offer-letter PDF → `OfferParse` (§4.6: employer, role, salary, dates, city); Google Maps Takeout JSON → recurring `Place[]`. A sample Takeout is pre-loaded so the demo never depends on a live upload. Outcome: uploading the sample offer PDF and Takeout produces structured records behind `POST /api/parse/offer` + `POST /api/parse/takeout` (consumed by A's onboarding UI, A12).
- **B7 - Matching engine.** (a) taste → ranked events for the Flyway → `GET /api/feed`; (b) cohort/taste match for discovery → `GET /api/matches` returning the frozen `Match` shape. **Deterministic scoring; LLM only writes the human-readable reason.** Outcome: both routes return ranked, stable results with explanations.
- **B8 - First-week itinerary ("landing").** OpenAI-generated plan + optional Google Calendar sync via Composio → `GET /api/itinerary`. Outcome: a new user gets a plausible first-week plan; calendar sync is optional and degrades gracefully.
- **B9 - Life-map places pipeline.** Takeout-derived recurring places → `GET /api/map/places`; owns the deterministic **"4 min from your usual coffee spot"** distance/ETA math. Outcome: the route returns pins with a deterministic distance line to a named anchor place.
- **B10 - HERO: streaming housing NEGOTIATION (LIVE), END-TO-END.** `POST /api/negotiate` streaming route; per-listing scouts check budget, safety, lease-fit, routine-fit; **deterministic code owns every pass/fail verdict**, the LLM only narrates. Includes its own results screen (built with A's tokens + shared motion primitive). Outcome: you paste/select an offer + shortlist, watch scouts stream verdicts live, and land on a results screen - all real.
- **B11 - Connection-hero BACK half.** The matching engine + `GET /api/matches` that A's discovery + connection beat consume. Outcome: A's match cards are driven by your live ranking.
- **B12 - Secret management + rate-limiting.** Every LLM/API route rate-limited; all secrets in gitignored `.env`; `.env.example` maintained. Outcome: no route can be spammed to burn OpenAI credit; no secret is committed.

### 1.2 NOT yours - owned by Person A (`docs/IMPLEMENTATION-PERSON-A.md`)

Do **not** build these; consume/coordinate only:

- **A1 Design system** - tailwind tokens, shadcn setup, primitives. You *consume* the tokens (names + hex from contract §3), you don't author them.
- **A2 Mascot** - recolor, keyframes, `Mascot` component, prefers-reduced-motion. You *drop it in* to your negotiation loading state; you don't build it.
- **A3 App shell + nav.** A4 **Feed UI** (you supply `/api/feed` data, A renders). A5 **Stories/perches UI**. A6 **Profile UI**. 
- **A7 Peer discovery UI / match cards** - A renders; you supply `/api/matches`.
- **A8 Realtime DM UI + subscription + optimistic send** - A owns the client subscription and UI. **You own only the `messages`/`conversations` schema + RLS.**
- **A9 Map + stickers UI** - Mapbox render, custom style, pin/sticker placement UI. You own the `stickers` schema+RLS and `/api/map/places` data.
- **A10 Connection-hero FRONT half** - the match card → "message now" → live DM. You own the BACK half only.
- **A11 Seed-consuming polish** - skeletons/empty/loading. (You *produce* seed; A consumes it.)
- **A12 Onboarding flow UI + A13 Landing/itinerary screen** - A builds these consumer screens; **you supply the routes behind them**: the §4.6 parse/connect routes (`/api/parse/offer`, `/api/parse/takeout`, `/api/composio/spotify/*`) and `/api/itinerary` (B8). You never build the onboarding or landing UI.

**Rule of thumb:** if it renders pixels, it's probably A's. If it's a table, a policy, a parser, a score, a stream, or a secret, it's yours. The one exception you own front-to-back is the **negotiation results screen** (B10 is single-owner end-to-end, including its UI).

---

## 2. What you depend on / expose

### 2.1 You EXPOSE (A consumes) - all specified in `FOUNDATION-CONTRACT.md`

| Interface | Contract ref | Consumer |
|---|---|---|
| `GET /api/feed` | §4.1 | A4 Feed |
| `GET /api/matches` → `Match {user, company, moveWeek, banded, tasteScore, reasons[]}` (FROZEN) | §4.2 | A7 discovery, A10 connection hero |
| `POST /api/negotiate` (streaming `NegotiateStreamEvent` union) | §4.3 | Your own results screen (B10) |
| `GET /api/itinerary` | §4.4 | A6 Profile / landing |
| `GET /api/map/places` | §4.5 | A9 Map |
| Supabase tables via RLS: `listings, stickers, notes, events, users, messages, conversations, checklist_items` | §2 | A reads/writes through the anon client under your policies |
| `messages`/`conversations` schema + participant-locked RLS | §2, §5 | A8 DM subscription + optimistic send |

**Frozen seams you must not unilaterally change:** the `Match` object shape (§4.2), the `NegotiateStreamEvent` union (§4.3), the participant-locked RLS requirement (§2/§5), the design token names (§3). Changing any of these requires an integration checkpoint with A (§10).

### 2.2 You CONSUME (A exposes)

- **Design tokens** (names + hex) from contract §3 - you use them in the negotiation results screen and any B-owned surface. Until A merges the real `tailwind.config`, use a local stub with the exact hex from §3 so you're never blocked.
- **Shared components** - the `Mascot` component and the "card-lands-into-tray" motion primitive. Until A ships them, stub `Mascot` as a static image and the motion as a plain Framer `motion.div` slide; swap in the real ones at integration.

### 2.3 What blocks you and how you avoid waiting

| Potential block | Mitigation |
|---|---|
| A's tokens/components not merged | Local token stub (§2.2); stub components. Swap at checkpoint C2. |
| Real Spotify/Google/Composio keys | Every pipeline (B5/B8) has a deterministic **fallback/fixture** path. Build against a canned taste vector + sample Takeout first; wire live keys second. |
| OpenAI key/quota | LLM narration is *additive*. Every route returns full deterministic data with `reason: null` if the model call fails or is disabled via `LLM_DISABLED=1`. |
| A not ready to consume routes | You own the seed, so you can drive every route from `curl`/tests without A. Don't wait for UI. |

**Principle: you are never idle waiting on A or a third party** - deterministic core first, integrations layered on.

---

## 3. Your part of the Day-0 / Day-1 foundation sprint

From the contract §6 (6-item ordered checklist). Your leads and your holds:

1. **Supabase project creation - YOU LEAD.** Create the project, capture URL + anon key + service-role key. Share creds with A via gitignored `.env` (never committed, never Slacked in plaintext - use the agreed secret channel).
2. Next.js + TS + Tailwind + shadcn scaffold - *A leads.* You just pull `main` once it's up.
3. Design tokens in tailwind config - *A authors.* You consume; provide feedback on the functional colors (`func.pass/flag/scam`) since your negotiation verdicts depend on them staying unmuted (§3, §8).
4. **Secret-management convention + `.env.example` - YOU LEAD.** Author `.env.example` with every key name (Supabase URL/anon/service-role, `OPENAI_API_KEY`, `MAPBOX_TOKEN`, `COMPOSIO_API_KEY`, `SPOTIFY_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `LLM_DISABLED`, `RATE_LIMIT_*`). Confirm `.env*` (except `.env.example`) is gitignored. Document the convention in a short `docs/SECRETS.md`.
5. **Section 5 data model is the single source of truth** - lives in `FOUNDATION-CONTRACT.md` §2. You implement it as migrations (B1); if reality forces a schema change, update the contract first, then migrate.
6. Vercel deploy wiring - *A leads repo connection.* **YOU ensure server env vars** are set in Vercel (service-role key, OpenAI key, Composio key) and that server-only secrets are never exposed to the client bundle (no `NEXT_PUBLIC_` prefix on secrets).

**Day-0 acceptance:** repo scaffolds, `.env.example` committed, real `.env` present locally for both people, `supabase` CLI linked, a trivial migration applies cleanly.

---

## 4. Repo layout you'll create

```
/supabase
  /migrations
    0001_core_tables.sql          # B1
    0002_indexes.sql              # B1
    0003_rls_enable_and_deny.sql  # B2 (enable RLS + default-deny)
    0004_rls_policies.sql         # B2 (per-table policies)
    0005_storage_buckets.sql      # B1 (listing-photos, offer-letters, takeout)
  seed.sql                        # optional static seed hook
  config.toml
/scripts
  seed.ts                         # B4 idempotent seed generator
  fixtures/
    taste_vectors.json            # canned Spotify taste (fallback)
    sample-offer-letter.pdf       # B6 demo fixture
    sample-takeout.json           # B6/B9 demo fixture (PRE-LOADED)
/src
  /lib
    supabase/{server.ts,admin.ts,client.ts}
    llm/{openai.ts,ratelimit.ts,prompts.ts}
    scoring/{taste.ts,match.ts,feed.ts}        # deterministic B7
    negotiate/{scouts.ts,budget.ts,safety.ts,lease.ts,routine.ts,types.ts}  # B10 deterministic
    parsers/{offerLetter.ts,takeout.ts}         # B6
    places/{distance.ts,recurring.ts}           # B9
    composio/{spotify.ts,calendar.ts}           # B5/B8
  /app/api
    feed/route.ts                 # B7
    matches/route.ts              # B7/B11
    negotiate/route.ts            # B10 (streaming)
    itinerary/route.ts            # B8
    map/places/route.ts           # B9
    parse/offer/route.ts          # B6
    parse/takeout/route.ts        # B6
    composio/spotify/connect/route.ts   # B5 (onboarding: begin Spotify connect)
    composio/spotify/status/route.ts    # B5 (onboarding: poll connected + taste)
  /app/negotiate                  # B10 results screen (single-owner B UI)
    page.tsx
    _components/{ScoutStream.tsx, ListingVerdictCard.tsx, ResultsSummary.tsx}
/tests
  rls.test.ts                     # B2 - highest priority
  scoring.test.ts  budget.test.ts  lease.test.ts  parsers.test.ts
```

---

## 5. Ordered build phases

Test-first where it pays off (RLS, budget math, lease-fit, parsers, scoring). Each phase has acceptance criteria you can *check*, not just typecheck.

### Phase 0 - Foundation (Day 0/1)
**Goal:** DB and secrets exist; you can run migrations and hit an empty route.
- Tasks: create Supabase project; `supabase init` + link; write `.env.example` + `docs/SECRETS.md`; add `src/lib/supabase/{server,admin,client}.ts` (server uses service-role only server-side; client uses anon).
- Files: `/supabase/config.toml`, `.env.example`, `docs/SECRETS.md`, `src/lib/supabase/*`.
- **Acceptance:** `supabase db reset` runs clean; a smoke API route returns 200; no secret is `NEXT_PUBLIC_`; `git status` shows no `.env`.

### Phase 1 - Schema + Storage (B1)
**Goal:** all 8 tables + indexes + buckets, matching contract §2 exactly.
- Tasks: write `0001`-`0002`, `0005`. Column types per contract §2. Add the `stickers.category` `CHECK` restricting it to the **six frozen positive values from contract §2** - `'good_coffee'`, `'safe_feeling'`, `'interns_hang'`, `'good_vibe'`, `'great_food'`, `'green_space'` - **no** `avoid`/`unsafe` values ever. (A's sticker UI writes exactly these six; a mismatched CHECK would reject A's inserts.) Indexes on FKs + hot query paths (`messages.conversation_id`, `messages.created_at`, `events(lat,lng)`, `listings.price`, `stickers(lat,lng)`). Storage buckets: `listing-photos` (public read), `offer-letters` (private), `takeout` (private).
- **Acceptance:** `supabase db reset` builds the whole schema; `\d+` shows every column/type from §2; inserting a sticker with a non-positive category is **rejected** by the CHECK.

### Phase 2 - RLS (B2) - *HIGHEST RISK, DEMO-BLOCKING*
**Goal:** default-deny everywhere; `messages`/`conversations` provably participant-locked. **Write the tests first.**
- Tasks:
  1. `0003`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on **every** table. No policy = no access (default deny). Confirm no table is left with RLS disabled.
  2. `0004` per-table policies (see §6.4 below for the messaging policies verbatim intent).
  3. `/tests/rls.test.ts`: with two seeded users U1/U2 and a conversation between U1/U3, assert U2 **cannot** `select` those messages, U2 **cannot** `insert` a message into that conversation, U1 **can** read/insert its own; assert a user can only `update`/`delete` their own `stickers`/`notes`/`listings`/`checklist_items`; assert `events`/`notes`/`listings`/`stickers` are readable by any authenticated user (they're public-ish content) but writable only by owner.
- **Acceptance (checkable):** `npm run test tests/rls.test.ts` is green; the negative cases (U2 reading U1↔U3 DMs) return **zero rows / permission denied**, not filtered-but-present. **No live DM demo happens until this passes.**

### Phase 3 - Auth + banded flag (B3)
**Goal:** demo login → session → `auth.uid()` drives RLS; banded logic seeded.
- Tasks: Supabase Auth (email/password or magic-link in dev mode); a dev "log in as seeded user" helper; `users.verified` (banded) set by seed for a subset. Document that banded is *seeded* for the demo (real verification is a production concern per CLAUDE.md §8).
- **Acceptance:** logging in as a seeded user yields a session; RLS tests pass under that real session (not just service-role); some profiles show `banded=true`.

### Phase 4 - Seed generator (B4)
**Goal:** idempotent, believable population so A's shell looks alive.
- Tasks: `scripts/seed.ts` using the service-role client. Idempotent via stable UUIDs / `upsert` on natural keys - running twice yields identical state, no dupes. Generate: ~20-30 interns (varied companies, cities, `move_in_date` clustered into "move weeks", taste_profiles, a subset banded); ~15 listings (varied price/lease dates, some with safety_flags, photos as Storage refs); ~30 positive/vibe stickers; ~15 events (categories that map to taste); ~10 notes; a few conversations + messages between seed users; checklist_items per user. Seed the fixtures: pre-load `sample-takeout.json`-derived places for the demo user.
- **Acceptance:** `npm run seed` then `npm run seed` again → row counts identical; A can open Feed/Map/Discovery/DMs on seed and nothing is empty; a demo conversation already has message history.

### Phase 5 - Parsers (B6)
**Goal:** offer PDF → `{salary, employer, startDate, endDate}`; Takeout JSON → recurring places. Fixtures pre-loaded so demo never breaks.
- Tasks:
  - `parsers/offerLetter.ts`: extract text (pdf lib) → deterministic regex/heuristic extraction of salary/employer/dates; optional LLM *only* to normalize ambiguous fields, never to invent numbers. `parse/offer/route.ts` accepts an upload, stores to `offer-letters` bucket, returns structured JSON.
  - `parsers/takeout.ts`: parse Location History / Timeline JSON → cluster visits → **recurring places only** (visit-count/frequency threshold), tight scope (the coffee chain, the gym). `parse/takeout/route.ts`.
  - Tests against `fixtures/sample-offer-letter.pdf` and `fixtures/sample-takeout.json`.
- **Acceptance:** `npm run test tests/parsers.test.ts` green; posting the sample offer returns the known salary/employer/dates; posting the sample Takeout returns a stable list of recurring places incl. a "usual coffee spot".

### Phase 6 - Composio Spotify spike (B5) - *TIMEBOXED ~1 day*
**Goal:** read-only top artists/tracks → `taste_profile`; fallback ready.
- Tasks: Composio Spotify connect, **read-only scopes only** (top artists + top tracks; optionally followed artists/saved tracks). **Grant no playback/playlist/write scope** (CLAUDE.md §7). Map raw top-items → a deterministic `taste_profile` vector (genres/audio-feature buckets) in `composio/spotify.ts`. **Fallback:** if Composio fights the team past the timebox, switch to hand-written Spotify OAuth *or* to `fixtures/taste_vectors.json` - the rest of the system consumes `taste_profile` identically either way.
- **Acceptance:** a test account connects and its taste vector persists to `users.taste_profile`; **AND** with `COMPOSIO_DISABLED=1` the fallback fixture path still populates a valid `taste_profile`. Document the go/no-go decision (CLAUDE.md §12.5).

### Phase 7 - Matching engine → feed + matches (B7/B11)
**Goal:** `GET /api/feed` and `GET /api/matches` return ranked, stable results; LLM writes only the `reason`.
- Tasks:
  - `scoring/taste.ts` - deterministic similarity between a user's `taste_profile` and event/person taste. Pure function, unit-tested, stable ordering (tie-break by id).
  - `scoring/feed.ts` → `/api/feed`: rank seeded events by taste + recency/proximity. Response per contract §4.1.
  - `scoring/match.ts` → `/api/matches`: cohort/taste match for discovery. Returns the **frozen** `Match {user, company, moveWeek, banded, tasteScore, reasons[]}` (§4.2). `moveWeek` from `move_in_date` bucketing; `banded` from `users.verified`; `tasteScore` deterministic; `reasons[]` - deterministic structured reasons, with an optional single LLM-polished human sentence layered on top.
- **Acceptance:** both routes return 200 with the exact contract shapes; running twice yields identical ordering (deterministic); disabling the LLM (`LLM_DISABLED=1`) still returns full results with reasons present (from the deterministic template).

### Phase 8 - Life-map places + distance (B9)
**Goal:** `GET /api/map/places` returns pins; deterministic "4 min from your usual coffee spot".
- Tasks: `places/recurring.ts` turns Takeout-derived places into map pins; `places/distance.ts` owns the deterministic haversine + walking-ETA math to a named anchor ("your usual coffee spot"). No LLM in the distance number - ever. Response per contract §4.5.
- **Acceptance:** route returns pins A can render; the ETA line ("N min from your usual coffee spot") is computed by `distance.ts` and is stable/reproducible for the sample Takeout.

### Phase 9 - Itinerary (B8)
**Goal:** `GET /api/itinerary` returns a first-week plan; optional Calendar sync.
- Tasks: OpenAI generates a plausible first-week plan seeded from the user's move date + city + recurring places; deterministic scaffolding (dates, day slots) fixed in code, LLM fills *content* only. Optional Google Calendar sync via Composio (read/write calendar is the one place a write scope is justified - gate it, make it optional, degrade if unavailable). Rate-limited.
- **Acceptance:** route returns a 5-7 day plan for a seeded user; with `LLM_DISABLED=1` returns a deterministic template plan; calendar sync is optional and never blocks the response.

### Phase 10 - HERO: streaming negotiation (B10)
See the deep-dive in §6. Built after Phases 1-5 so budget/lease/safety have real data. **Acceptance summarized:** you can drive the full flow live (offer + shortlist → streaming scout verdicts → results screen), every pass/fail is deterministic, the LLM only narrates, the route is rate-limited, and it renders with A's tokens + the shared motion primitive.

### Phase 11 - Hardening (B12) across all routes
- Rate-limit middleware on every LLM/external route (`llm/ratelimit.ts` - per-IP/session token bucket; return 429 on abuse). Confirm no secret leaks to client. Re-run `tests/rls.test.ts`. Final `.env.example` sweep.
- **Acceptance:** hammering `/api/negotiate` returns 429 after the limit; grep for `NEXT_PUBLIC_.*SECRET|SERVICE_ROLE` in client bundle finds nothing.

---

## 6. Deep-dive: the live heroes

### 6.1 HERO A - Streaming housing NEGOTIATION (B10, single-owner, end-to-end)

**The one architectural principle, hammered:** the **LLM reasons and explains; hard math (budget) and hard rules (safety, lease-fit, dates) are deterministic code - never the model.** The model may *narrate* a verdict but may never *decide* one. If OpenAI is down, every verdict is still correct; only the prose is missing.

**Input:** the user's parsed offer (`{salary, startDate, endDate}` from B6) + their listing shortlist ("perches") + their recurring places (from B9).

**Per-listing scouts (all deterministic - `src/lib/negotiate/`):**

Each scout's `check` name and `verdict` values are **the frozen contract §4.3 `scout_verdict` shape** - do not invent your own (`good`/`ok`/`far`, `lands`/`caution`/`skip` etc. are NOT the contract): every check emits `verdict: "pass" | "flag" | "fail"`.

| Scout (`check`) | File | Deterministic rule | `verdict` |
|---|---|---|---|
| **Budget** (`budget`) | `budget.ts` | `affordable = min(constraints.monthlyBudget, 0.30 × monthlyTakeHome)`, where `monthlyTakeHome = (offer.salary / 12) × 0.75` (flat 25% withholding assumption for the demo; if there's no parsed salary, use `constraints.monthlyBudget` directly). Then vs `listing.price`: `pass` if `price ≤ affordable`; `flag` if `price ≤ affordable × 1.10`; `fail` otherwise. Pure arithmetic. | `pass`/`flag`/`fail` |
| **Safety** (`safety`) | `safety.ts` | Rule table over `listing.safety_flags`: any scam signal → `fail`; soft/advisory note → `flag`; clean → `pass`. Positive-only framing; no bias-laden "avoid area" inference (CLAUDE.md §8). | `pass`/`flag`/`fail` |
| **Lease-fit** (`lease_fit`) | `lease.ts` | Date logic: does `[lease_start, lease_end]` cover `[constraints.moveIn, constraints.moveOut]`? `pass` if fully covered; `flag` if within a small gap (≤ N days, N in code); `fail` otherwise. | `pass`/`flag`/`fail` |
| **Routine-fit** (`routine_fit`) | `routine.ts` | Deterministic distance/ETA (reuse `places/distance.ts`) from listing to the user's recurring anchors (coffee/gym/commute). `pass` if the nearest anchor is a short walk; `flag` if moderate; `fail` if far (thresholds in code). | `pass`/`flag`/`fail` |

Each scout returns `{ check, verdict, value }` - `check` and `verdict` exactly per the contract §4.3 `scout_verdict` event, and `value` a **preformatted deterministic fact string** (e.g. `"$1,850 / $2,000 budget"`, `"covers your full internship"`, `"4 min from your usual coffee spot"`). Keep the raw numbers internally if useful, but the streamed event carries the single `value` string. The **verdict is decided in code**; `value` is the only thing the LLM is allowed to phrase around - it may never change a verdict or a number.

**The LLM's only job:** given a listing's structured verdicts + facts, stream a one-to-two-sentence human explanation ("This one lands - rent's comfortably under your budget and it covers your full internship, and you're a 6-minute walk from your usual coffee spot"). It receives the verdicts as **given** and must not contradict them. Use the Vercel AI SDK streaming; prompt in `llm/prompts.ts` explicitly instructs: "You are narrating a decision already made by deterministic code. Never change a verdict. Explain the provided facts."

**Streamed event shape** - this **IS** the frozen contract §4.3 `NegotiateStreamEvent` union, reproduced verbatim. Do not diverge from it; if you genuinely need a different shape, amend contract §4.3 in a reviewed PR first.

```ts
// Streamed event union - one JSON object per chunk (contract §4.3, verbatim):
type NegotiateStreamEvent =
  | { type: "listing_start"; listingId: string; title: string }
  | { type: "scout_verdict";            // DETERMINISTIC verdict, emitted per check
      listingId: string;
      check: "budget" | "safety" | "lease_fit" | "routine_fit";
      verdict: "pass" | "flag" | "fail";     // maps to func.pass / func.flag / func.scam
      value: string;                          // deterministic fact, e.g. "$1,850 / $2,000 budget"
    }
  | { type: "explanation_delta";        // LLM prose, streamed token-by-token
      listingId: string;
      textDelta: string;
    }
  | { type: "listing_summary";          // deterministic overall roll-up
      listingId: string;
      overall: "pass" | "flag" | "fail";
      passedChecks: number;
      totalChecks: number;
    }
  | { type: "done" };
```

**Ordering guarantee (per listing):** emit `listing_start` first, then the four deterministic `scout_verdict` events, then the `explanation_delta` prose tokens, then a `listing_summary`. The `overall` is a deterministic aggregation of the four verdicts (**any `fail` → `fail`; else any `flag` → `flag`; else `pass`**), with `passedChecks`/`totalChecks` counted in code - **not** by the model. A single terminal `{ type: "done" }` closes the stream. **Ranking is computed client-side** on the results screen by deterministically sorting the collected `listing_summary` events (by `overall`, then `passedChecks/totalChecks`, tie-break by `listingId`) - the contract's `done` carries no payload, so the screen owns the sort.

**Route:** `POST /api/negotiate` (`src/app/api/negotiate/route.ts`), streaming response, **rate-limited** (B12), secrets server-side only.

**Results screen (single-owner B UI - `src/app/negotiate/`):**
- `ScoutStream.tsx` subscribes to the stream, renders each listing card filling in live as verdicts arrive.
- `ListingVerdictCard.tsx` uses A's tokens, keyed on the `verdict`/`overall` values: `func.pass #16A34A` for `pass`, `func.flag #D97706` for `flag`, `func.scam #DC2626` for `fail` - **kept unmuted** (§8). Budget/safety numbers rendered as clean, serious, information-first surfaces (no mascot on decision surfaces - CLAUDE.md §9).
- The **shared "card-lands-into-tray" motion primitive** (from A) animates a passing listing (`listing_summary.overall === "pass"`) settling into the shortlist/results tray - this is the emotional "it landed" beat. While the stream runs, the `Mascot` **hop** variant sits in the loading/working area only (personality moment), never over the numbers.
- `ResultsSummary.tsx` renders the final ranked list, sorted **client-side** from the collected `listing_summary` events (see the ordering guarantee) - `done` carries no payload.

**Acceptance (drive the flow, not just typecheck):**
1. Select the seeded demo offer + a 4-listing shortlist → POST.
2. Watch scout verdicts stream in per listing (budget/safety/lease/routine), each with real numbers.
3. Confirm narration appears *after* verdicts and never contradicts them.
4. With `LLM_DISABLED=1`, verdicts + ranking still stream correctly (no prose) - proves determinism.
5. Results screen ranks listings, colors verdicts unmuted, and the winning card "lands into the tray".
6. Hammer the endpoint → 429 after the limit.

### 6.2 HERO B (JOINT) - Connection beat, your BACK half (B11)

The **one deliberately joint seam.** You own the matching engine + `GET /api/matches`; A owns the discovery UI, the "message now" action, and the live DM.

**Your half:**
- `/api/matches` returns ranked `Match[]` (frozen shape §4.2): `{ user, company, moveWeek, banded, tasteScore, reasons[] }`. Deterministic scoring (same-company, same move-week, taste similarity, banded boost); `reasons[]` deterministic (+ optional LLM-polished sentence). `moveWeek` bucketed from `move_in_date`; `banded` from `users.verified`.
- You own the `messages`/`conversations` **schema + participant-locked RLS** (B2) that the DM rides on. A's realtime subscription and optimistic send only work *because* your RLS lets exactly the two participants read/write that conversation.

**The exact handoff seam (5 steps, per contract §7):**
1. **B →** `/api/matches` returns ranked people with reasons.
2. **A** renders the discovery match card ("Jordan K., same company, same week, banded - message now").
3. **A** "message now" → ensures a `conversations` row exists between the two users (insert allowed by *your* RLS only if the caller is a participant).
4. **A** inserts into `messages` (your RLS gates it) → Supabase Realtime pushes to the recipient (A's subscription).
5. Live DM open. **Your RLS is the security backstop** - if it's wrong, the whole beat is a data leak. This is why Phase 2 is demo-blocking.

**What must be agreed with A at the checkpoint:** the `Match` field names/types (frozen - don't drift), and the exact `conversations`/`messages` column names + how a conversation is keyed (participant pair). Lock these before A writes the subscription.

---

## 7. Seed / mock strategy

**You produce seed; A consumes it.** A social app that looks empty reads as broken (CLAUDE.md §8.5), so the seed is real work, not an afterthought.

- **Idempotent** (`scripts/seed.ts`): stable UUIDs + upserts → re-running never duplicates. This lets A reset to a known-good state anytime.
- **Believable population:** varied companies/cities/roles; `move_in_date` clustered so `moveWeek` matching has real cohorts; taste_profiles that make `/api/feed` and `/api/matches` produce *interesting* (not random) rankings; a subset banded; a few pre-populated conversations so DMs aren't empty on open.
- **Demo-safe fixtures (never depend on a live upload):** `fixtures/sample-offer-letter.pdf`, `fixtures/sample-takeout.json` pre-loaded; `fixtures/taste_vectors.json` as the Spotify fallback. The negotiation hero + map beat both run off fixtures if any live integration fails.
- **Mocks for A's unblocking:** A can hit your seeded routes directly; if a route lags, provide a static JSON fixture matching the contract shape so A's UI is never blocked.

---

## 8. Constraints that bind you (Person B)

Non-negotiable engineering constraints for your half:

1. **LLM reasons/explains; hard math + hard rules are deterministic code.** Budget math, safety rules, lease-fit dates, distance/ETA, verdict aggregation, ranking order - all deterministic. The model never decides a pass/fail, a number, or an ordering. Every LLM output is *additive narration* that the system works without.
2. **RLS security is demo-blocking.** Default-deny on every table; `messages`/`conversations` participant-locked and adversarially tested (Phase 2). No live DM demo before `tests/rls.test.ts` is green. This is your highest-risk work - budget real time (CLAUDE.md §8.3).
3. **Least-privilege, read-only external scopes.** Spotify: top artists/tracks read-only, no playback/playlist/write. Instagram (if ever used): read-only media, no publish/DM/delete. The trust story ("banded"/safety) is undercut if you request write access you don't use (CLAUDE.md §7). The one justified write is optional Google Calendar sync (B8) - gated and optional.
4. **Rate-limit every LLM/external route.** `/api/negotiate`, `/api/itinerary`, `/api/feed`, `/api/matches`, `/api/parse/*` all pass through `llm/ratelimit.ts`. A leaked/abused key costs money (CLAUDE.md §8.4).
5. **Secrets in gitignored `.env`; server-only.** Service-role key + OpenAI + Composio keys never reach the client bundle, never `NEXT_PUBLIC_`, never committed. Maintain `.env.example`.
6. **Timeboxed Composio spike with fallback (~1 day).** If it fights the team, fall back to hand-written OAuth or the fixture taste vector; the rest of the system is agnostic to how `taste_profile` got populated. Record the go/no-go.
7. **Positive-only stickers.** The `stickers.category` CHECK enforces positive/vibe values only - no "avoid/unsafe" labeling (bias/harm risk, CLAUDE.md §8). Enforced at the schema level so A cannot write a negative sticker even by mistake.
8. **Functional colors stay unmuted.** When you render verdicts, use `func.pass/flag/scam` at full legibility - never pastel-ify a warning (§3 / CLAUDE.md §9). The chick is absent from all decision surfaces (negotiation numbers, safety, budget).

---

## 9. Definition of done + demo checklist

**Done when:**
- [ ] `supabase db reset` builds all 8 tables + indexes + buckets matching contract §2.
- [ ] `tests/rls.test.ts` green: cross-user DM read/write **denied**; owner-only writes on stickers/notes/listings/checklist enforced; default-deny verified.
- [ ] Auth login yields a session that drives RLS; banded seeded.
- [ ] `npm run seed` idempotent; shell looks alive on seed.
- [ ] Parsers pass on both fixtures; sample Takeout + offer pre-loaded.
- [ ] Spotify connect works **and** fallback populates `taste_profile` with Composio disabled.
- [ ] `/api/feed`, `/api/matches` return exact contract shapes, deterministic ordering, reasons present even with `LLM_DISABLED=1`.
- [ ] `/api/map/places` returns pins + deterministic "N min from your usual coffee spot".
- [ ] `/api/itinerary` returns a plan; calendar sync optional/degrading.
- [ ] `/api/negotiate` streams deterministic verdicts before narration; results screen ranks + colors verdicts unmuted + lands-into-tray motion + mascot only in loading; correct with LLM disabled.
- [ ] Every LLM/external route rate-limited (429 on abuse); no secret in client bundle; `.env.example` complete.

**Live demo checklist (drive it end-to-end):**
1. Log in as seeded banded user → shell is populated (A's UI on your seed).
2. Onboarding: connect Spotify (or fallback) → taste lands; upload sample offer → parsed; sample Takeout pre-loaded.
3. Open Discovery → `/api/matches` cards (same company/week, banded, reasons) → "message now" → live DM (RLS-backed).
4. **Negotiation hero:** offer + 4-listing shortlist → watch scouts stream budget/safety/lease/routine verdicts with real numbers → results screen ranks, winner "lands into the tray."
5. Map → life-map pins + "4 min from your usual coffee spot."
6. Prove determinism: rerun with `LLM_DISABLED=1` - verdicts + rankings unchanged, only prose gone.

---

## 10. Integration checkpoints with Person A

| # | When | What must be agreed / merged | Owner action |
|---|---|---|---|
| **C0 - Day 0** | Sprint start | Supabase project + creds shared; `.env.example` + `docs/SECRETS.md` merged to `main`. | You lead. |
| **C1 - Schema freeze** | After Phase 1 | Table/column names for `messages`/`conversations`/`stickers` locked with A (A8/A9 write against them). Contract §2 is truth; any change updates the contract first. | You + A. |
| **C2 - Tokens/components** | When A merges tokens + Mascot + motion primitive | Swap your local token stub → real tokens; swap stub Mascot/motion → real ones in the negotiation screen. | You consume. |
| **C3 - Match shape** | Before A writes discovery UI | Freeze `Match {user, company, moveWeek, banded, tasteScore, reasons[]}` (§4.2). No drift after. | You + A. |
| **C4 - Connection seam** | Before A writes DM subscription | Agree the 5-step handoff (§6.2) + conversation keying; **RLS green** (Phase 2) is the gate for any live DM demo. | You + A. |
| **C5 - Negotiate stream** | Before A references it (A doesn't render it, but shares tokens/motion) | Confirm `NegotiateStreamEvent` union (§4.3) + that the results screen uses A's motion primitive correctly. | You own screen; A confirms motion API. |
| **C6 - Pre-demo** | Merge cadence / rehearsal | Full flow on real hardware/network; re-run RLS tests; verify rate-limits; poke Supabase so it isn't idle-paused (CLAUDE.md §10). | You + A. |

Merge cadence: foundation merges to `main` early (C0-C1); feature branches `person-b` → `main` behind the frozen seams; never break a frozen seam without a checkpoint.

---

## 11. Bird-word glossary (plain meanings)

| Word | Plain meaning |
|---|---|
| **perches** | Saved/shortlisted sublet listings (the "story tray" of places). |
| **flock** | Your peer group - other interns at your company/city moving the same time. |
| **flyway** | The taste-matched events feed. |
| **banded** | Verified - an intern whose status is confirmed (seeded for the demo). Like a banded bird, tagged and known. |
| **pre-flight** | The pre-move checklist of things to do before you arrive. |
| **landing** | Arriving in the new city - the first-week itinerary; also the "it landed" moment when a good listing settles into the tray. |

Bird words ride alongside plain meaning - subtitle them in UI; plain meaning always wins (CLAUDE.md §9). In your surfaces (negotiation numbers, safety, budget) clarity beats cuteness: the chick handles waiting; the interface handles decisions.