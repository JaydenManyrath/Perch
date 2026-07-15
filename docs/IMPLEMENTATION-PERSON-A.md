# Perch — Implementation Plan: PERSON A (Experience & Social Shell)

> **Mission:** Build the entire Instagram-shaped social shell of Perch — the design system, the plush-chick mascot, the app navigation, the Flyway feed, the perches story tray, the profile, the map + positive stickers, the LIVE realtime DMs, and the FRONT half of the live connection hero (match card → "message now" → a real DM). Make it look alive on seed data so nothing here ever blocks on Person B's intelligence work.
>
> **Branch:** `person-a`
> **You are Person A — Experience & Social Shell.** You author the design tokens and shared UI primitives the whole team consumes; Person B consumes them. You own every consumer-facing surface and the realtime DM client.

**Read these three together — this doc assumes them:**
- `CLAUDE.md` — full product context, locked stack, design-system rules (§9), safety/sticker rules (§8).
- `docs/FOUNDATION-CONTRACT.md` — the frozen shared seams: data model (§2), design tokens (§3), API contract (§4), realtime DM contract (§5), the connection-hero handoff (§7). **When this plan and the contract disagree, the contract wins** — amend it in a PR both people review, never drift silently.
- `assets/mascot/README.md` — the three chick SVGs, the recolor table, the `@keyframes` starter set.

---

## 1. Scope — What Person A Owns

Each item is a work-package ID from the contract (`A1`–`A13`) with a one-line outcome.

- **A1 — Design system.** `tailwind.config.ts` carries the frozen §3 tokens; shadcn/ui is installed; a typography scale, spacing, and a primitives layer (`Button`, `Card`, `Avatar`, `Badge`, `Sheet`, `Skeleton`, `Chip`) exist and are themed. Outcome: any screen in the app is built from consistent tokens and primitives, and Person B can reference `sky.*`, `ink.*`, `accent.*`, `func.*` by name.
- **A2 — Mascot.** The three SVGs in `assets/mascot/` recolored teal→baby-blue (orange beak/feet kept), the `@keyframes` supplied in app CSS, and a `<Mascot variant="idle"|"hop">` React component wired into loading / onboarding / empty / milestone states, honoring `prefers-reduced-motion`. Outcome: the chick breathes and hops on-model, appears ONLY in personality moments, and never stutters.
- **A3 — App shell + IG-shaped navigation.** Responsive shell with the five destinations: **Feed, Stories, Map, DMs, Profile**. Outcome: the app looks and navigates like Instagram — bottom tab bar on mobile, side rail on desktop.
- **A4 — Feed (the Flyway).** Taste-matched events feed UI + past-intern notes / Q&A threads UI, consuming `GET /api/feed` (ranking) plus `events`/`notes` data. Outcome: a scrollable feed of taste-ranked events with reason chips, interleaved with intern Q&A threads.
- **A5 — Stories / perches.** Listing-shortlist story tray UI + the Framer Motion **"listing lands into the tray"** motion. Consumes `listings`. Outcome: an IG-stories-style tray of saved sublets with a signature landing animation — and this motion is extracted as a shared primitive Person B reuses in the negotiation screen.
- **A6 — Profile.** Profile screen + **banded**/verified badge UI + **pre-flight** checklist UI. Consumes `users` + `checklist_items`. Outcome: a profile with the trust badge and a working, toggleable pre-move checklist.
- **A7 — Peer discovery (find your flock).** Browse + match-card surface consuming `GET /api/matches`. Outcome: a discovery grid/stack of ranked people showing name, company, move-week, banded badge, and taste-reason chips.
- **A8 — Realtime DMs (LIVE — you own this end-to-end on the client).** Messaging UI + Supabase Realtime subscription + optimistic send, on the `messages`/`conversations` tables (schema + RLS by B). Outcome: two browsers, a message typed in one appears live in the other.
- **A9 — Map + stickers.** Mapbox render + a custom baby-blue map style + life-map pins (from `GET /api/map/places`) + community **sticker** placement/read UI — **POSITIVE / VIBE stickers only** (no avoid/unsafe). Sticker writes go to the `stickers` table. Outcome: a themed map with your recurring places pinned and a friendly positive-only sticker layer.
- **A10 — Connection-hero FRONT half (LIVE — the visible flagship beat).** Discovery match card → **"Message now"** → creates-or-opens a `conversations` row → opens a live DM. Outcome: the demo money-shot — "Jordan K., same company, same week, banded — message now" → a real chat opens and the recipient's screen updates live.
- **A11 — Seed-consuming polish.** Skeletons / empty / loading states on every surface so the app looks alive on seed data. Outcome: no surface ever reads as broken/empty; everything degrades gracefully to a skeleton or a chick-fronted empty state.
- **A12 — Onboarding flow (guided UI, the chick's home turf).** The pre-shell guided flow that consumes Person B's onboarding routes (contract §4.6): upload offer letter → `POST /api/parse/offer`; connect Spotify → `POST /api/composio/spotify/connect` + poll `GET /api/composio/spotify/status`; optional Maps Takeout upload → `POST /api/parse/takeout`. This is a *personality* surface — the `<Mascot>` lives here (progress, waiting, celebration), but the parsed *results* (salary, dates, places) are shown clean and information-first. Outcome: a new intern completes a warm, chick-guided onboarding and lands in the shell with taste + offer + places populated. You build the screens and consume the routes; you never parse or call Composio (that's B5/B6).
- **A13 — Landing plan (first-week itinerary screen).** The screen that renders `ItineraryResponse` from `GET /api/itinerary` (B8) — the "landing" week as a day-by-day plan, reachable at onboarding completion and from Profile. Outcome: after arriving, the intern sees a plausible first-week plan; you render it (day cards, map links), B generates it. Decision content (times, places) stays clean; the chick only bookends it (a milestone beat on completion).
- **Shared deps you provide to Person B:** the design tokens (names + hex, §3) and the shared components — the **Mascot** component and the **card-lands-into-tray motion primitive** — which B drops into the negotiation screen.

### NOT yours — owned by Person B (see `docs/IMPLEMENTATION-PERSON-B.md`)

You **consume** these; you never build them. If one isn't ready, you build against its stub/seed (see §3, §7).

- **All Supabase schema, indexes, Storage buckets, migrations (B1)** — every table in contract §2. You read them; you never author DDL.
- **All RLS policies (B2)** — especially the participant-locked `messages`/`conversations` policies. **You must not demo live DMs until B confirms this is deployed** (hard gate, §10).
- **Auth + session + the banded/verified flag logic (B3).** You render `users.verified`; you don't decide it.
- **Seed data (B4)** — the believable interns, listings, stickers, events, notes, messages, checklist items your shell renders.
- **Composio Spotify integration + `taste_profile` (B5).**
- **Parsers: offer-letter PDF, Maps Takeout JSON (B6).**
- **The matching / ranking engines (B7/B11)** behind `GET /api/feed` and `GET /api/matches`. You render the ranked results; you don't score them.
- **`GET /api/itinerary` (B8)** and **`GET /api/map/places` (B9)** — the itinerary and the life-map places pipeline incl. the deterministic "4 min from your usual coffee spot" distance. You render places; the distance math is B's. (A13 renders the itinerary/landing *screen*; B8 generates the plan.)
- **The onboarding parse/connect routes (§4.6): `/api/parse/offer`, `/api/parse/takeout`, `/api/composio/spotify/*` (B5/B6).** You build the onboarding *screens* (A12) that call them; you never parse a PDF, read Takeout, or talk to Composio.
- **The streaming housing NEGOTIATION hero (B10), END-TO-END including its own results screen.** You do **not** build any part of the negotiation screen. Your only contribution to it is the reusable tokens + the card-lands-into-tray motion primitive.
- **Secret management + rate-limiting on every LLM/API route (B12).**

---

## 2. What You Depend On / Expose

### You consume (from Person B) — all shapes frozen in the contract
| Interface | Contract ref | You use it in | If not ready |
|---|---|---|---|
| `GET /api/feed` → `FeedResponse` | §4.1 | A4 Flyway feed | render against a local seed JSON matching `FeedItem[]` |
| `GET /api/matches` → `MatchesResponse` (`Match` shape **frozen**) | §4.2 | A7 discovery + A10 connection hero | B ships a typed stub early (§10); until then a local `Match[]` fixture |
| `GET /api/map/places` → `MapPlacesResponse` | §4.5 | A9 life-map pins | local `Place[]` fixture |
| `GET /api/itinerary` → `ItineraryResponse` | §4.4 | A13 landing/itinerary screen | local `ItineraryResponse` fixture |
| `POST /api/parse/offer` → `OfferParse` | §4.6 | A12 onboarding (offer step) | local `OfferParse` fixture + a canned parsed offer |
| `POST /api/parse/takeout` → `TakeoutParse` | §4.6 | A12 onboarding (Takeout step) | local `Place[]` fixture |
| `POST /api/composio/spotify/connect` + `GET /api/composio/spotify/status` | §4.6 | A12 onboarding (Spotify step) | stub "connected" + a canned `TasteProfile` |
| Supabase tables: `users`, `listings`, `stickers`, `events`, `notes`, `checklist_items`, `conversations`, `messages` | §2 | every data surface | B's seed script populates them; use a local fixture layer until migrations land |
| Realtime `messages` INSERT channel | §5 | A8 DMs | needs RLS deployed before a real demo (hard gate) |
| `users.verified` (banded flag) | §2 / B3 | A6 badge, A7 card | seed rows carry it |

**Rate-limit / secrets:** every `/api/*` route is server-side and rate-limited by B (B12). You call them from the client or via server components; you never hold OpenAI/Composio secrets. Supabase anon key + Mapbox token are the only client-visible keys, both from the gitignored `.env`.

### You expose (to Person B)
| What | Where | B consumes it in |
|---|---|---|
| Design tokens (names + hex, §3) | `tailwind.config.ts` (you author in the foundation sprint) | B's negotiation results screen, every B surface |
| `<Mascot>` component | `components/mascot/Mascot.tsx` | B's negotiation "working" state |
| Card-lands-into-tray motion primitive | `components/motion/LandInTray.tsx` (+ a `useLandInTray` variant) | B's negotiation screen, when a listing verdict "lands" |

Keep these three exports **stable**. If you must change a token name or the Mascot/motion prop API after B has adopted it, that's a contract-level change — coordinate (§10).

### What blocks you and how you avoid waiting
The whole point of the split is that **Person A never blocks on Person B's intelligence work.** Mechanism:
1. **Fixtures mirror the frozen shapes.** Build a `lib/fixtures/` module returning exactly `FeedResponse`, `MatchesResponse`, `MapPlacesResponse`, `ItineraryResponse`, and arrays of table rows. Because the shapes are frozen in the contract, swapping fixture → real API is a one-line data-source change.
2. **A data-source switch.** A single `lib/data/source.ts` reads `NEXT_PUBLIC_DATA_SOURCE=fixture|live`. `fixture` returns local JSON; `live` calls the real route / Supabase. Develop on `fixture`, demo on `live`.
3. **The one true hard gate:** live DMs need B's participant-locked RLS deployed (§5, §10). Everything else you can build, style, and demo entirely on fixtures.

---

## 3. Your Part of the Day-0 / Day-1 Shared Foundation Sprint

From contract §6. Built collaboratively, merged to `main` **before** `person-a`/`person-b` diverge. Your leads:

- **Item 2 — Next.js + TS + Tailwind + shadcn scaffold (you lead).**
  - `npx create-next-app@latest perch --typescript --tailwind --app --eslint` (App Router).
  - `npx shadcn@latest init` — commit `components.json`, the `cn()` util (`lib/utils.ts`), and the base CSS variables file.
  - Acceptance: `npm run dev` boots a page; `components.json` + shadcn init committed; TypeScript strict mode on.
- **Item 4 — Design tokens locked into `tailwind.config.ts` (you author, B consumes).**
  - Transcribe **every** token in contract §3 into `tailwind.config.ts` under `theme.extend.colors` with the exact names (`sky.50`–`sky.500`, `white`, `ink.strong/soft/muted`, `accent.beak/beakDeep/beakLight`, `func.pass/flag/scam/passBg/flagBg/scamBg`).
  - Acceptance: token names frozen and committed; B can write `bg-sky-200 text-ink-strong` and `text-func-scam` and it renders the right hex. A quick `/tokens` debug page renders every swatch so both people eyeball it.
- **Item 6 — Vercel deploy wiring (you connect the repo; B sets server env vars).**
  - Connect the GitHub repo to Vercel; confirm preview URL per branch; B adds server env vars (Supabase service role, OpenAI, Composio) in Vercel project settings.
  - Acceptance: a preview URL exists for `person-a`; the scaffold deploys green.

You **hold** the Supabase URL + anon key + Mapbox token in your gitignored `.env` (B leads the `.env.example` convention, item 3). You **do not** create the Supabase project (item 1, B leads) or commit the data model (item 5, both review).

**Gate to diverge:** items 1–6 merged to `main`; app boots; tokens present; `.env.example` complete; one migration applied; preview deploy live. Only then does `person-a` branch off.

---

## 4. Ordered Build Phases

Directory conventions (App Router):
```
app/
  (shell)/                      # authenticated shell group with the nav chrome
    feed/page.tsx               # A4
    stories/page.tsx            # A5
    map/page.tsx                # A9
    dms/page.tsx                # A8 list
    dms/[conversationId]/page.tsx  # A8 thread
    profile/[id]/page.tsx       # A6
    discovery/page.tsx          # A7
    landing/page.tsx            # A13 first-week itinerary screen
    layout.tsx                  # A3 shell chrome (nav)
  onboarding/                   # A12 pre-shell guided flow (chick's home turf)
    page.tsx                    # step router: offer → spotify → takeout → done
    _steps/{OfferStep,SpotifyStep,TakeoutStep,DoneStep}.tsx
  tokens/page.tsx               # A1 debug swatches (dev only)
components/
  ui/                           # shadcn primitives (Button, Card, Avatar, Badge, Sheet, Skeleton, Chip...)
  mascot/Mascot.tsx             # A2
  motion/LandInTray.tsx         # A5 shared primitive (exported to B)
  shell/BottomNav.tsx SideRail.tsx  # A3
  feed/ stories/ profile/ discovery/ dms/ map/  # per-surface components
lib/
  supabase/client.ts server.ts # Supabase browser + server clients
  data/source.ts                # fixture|live switch
  fixtures/                     # frozen-shape JSON fixtures
  hooks/useRealtimeMessages.ts useConversation.ts  # A8
  types/contract.ts             # TS types copied from contract §4/§5 (frozen)
styles/
  mascot-keyframes.css          # A2 @keyframes + reduced-motion gate
public/mascot/                  # recolored SVGs (built from assets/mascot/)
```

`lib/types/contract.ts` is a **verbatim copy** of the frozen TS types from contract §4/§5 (`FeedResponse`, `Match`, `MessageRow`, `ConversationRow`, `MapPlacesResponse`, `ItineraryResponse`, `NegotiateStreamEvent`). Import from here everywhere; if the contract changes, this file changes in the same PR.

---

### Phase 0 — Foundation (shared sprint, above)
Covered in §3. Exit when items 1–6 are on `main` and `person-a` has branched.

---

### Phase 1 — Design system + mascot (A1, A2)
**Goal:** the whole visual language and the chick exist before any screen is built on top of them.

Tasks:
- Author `tailwind.config.ts` tokens (done in foundation; verify against §3).
- Configure the typography scale (a display / h1 / h2 / body / caption ramp using `ink.strong` for headings+body, `ink.soft` for captions) and spacing scale in the Tailwind theme. Register a friendly rounded font (e.g. via `next/font`) but keep it legible.
- Install + theme the shadcn primitives you need: `Button`, `Card`, `Avatar`, `Badge`, `Sheet`, `Skeleton`. Add two Perch-specific primitives: `Chip` (for reason/taste chips) and `BandedBadge` (the verified badge). Default variants use `sky.*` surfaces on `white`, text in `ink.strong`.
- **Mascot recolor (A2).** Copy the three SVGs into `public/mascot/`. Apply the contract §3 recolor table to each (`#AEE4DE`→`#BFE3F7`, `#8FC7E8`→`#7FB2DB`, `#9AD0EF`→`#8FC7E8`, `#CDEBE6`→`#DCEFFB`, `#5FA79B`→`#5E7E97`, `#7FB9C9`→`#9CC5DD`, keep `#F6A22C`/`#E5851C`/`#E9A24C`, eyes `#2B333B`→`#2C4A63`). Same fills across all three files. Verify `plush-chick-idle.svg` and `plush-chick-hop.svg` are flattened (no `feTurbulence`); `plush-chick-static-fur.svg` keeps its filter and is **static only**.
- **Keyframes (A2).** Put the starter `@keyframes` from `assets/mascot/README.md` (`apBreathe`, `apWingSwaySlow`, `apBlink`, `apHop`, `apFlap`, `apShadow`) into `styles/mascot-keyframes.css`. Gate every loop behind `@media (prefers-reduced-motion: no-preference)`; with reduced motion, freeze to the static pose.
- **Mascot component (A2).** `components/mascot/Mascot.tsx` — props `variant: "idle" | "hop"`, optional `size`, `caption`. `idle` loads the idle SVG (breathe+blink+wing-sway), `hop` loads the hop SVG (hop+flap+shadow) for "working" states. Import the keyframes CSS. Component reads a reduced-motion check and renders the static pose if set.

Files touched: `tailwind.config.ts`, `components/ui/*`, `components/mascot/Mascot.tsx`, `styles/mascot-keyframes.css`, `public/mascot/*.svg`, `app/tokens/page.tsx`.

Acceptance criteria:
- `/tokens` renders a swatch for every §3 token at the correct hex; no body text is ever baby-blue-on-white (WCAG rule).
- The recolored SVGs show a baby-blue chick with an orange beak/feet — no teal/mint pixels remain (grep the SVGs for `#AEE4DE`/`#8FC7E8` → zero hits in body/wing roles).
- `<Mascot variant="idle" />` breathes and blinks; `variant="hop"` hops and flaps; both smooth, no filter stutter.
- Toggling OS "reduce motion" freezes the chick to a static pose (verify in devtools emulation).

Verify/demo: open `/tokens` and a scratch `/mascot-demo` page; toggle reduced-motion in devtools; confirm both variants and the freeze.

---

### Phase 2 — App shell + navigation (A3)
**Goal:** the IG-shaped chrome the five surfaces live inside.

Tasks:
- `app/(shell)/layout.tsx` — the authenticated shell. Bottom tab bar on mobile (`components/shell/BottomNav.tsx`), left side rail on desktop (`components/shell/SideRail.tsx`), five destinations: Feed, Stories, Map, DMs, Profile, each with an icon + active state (active = `sky.400` fill / `ink.strong`).
- Route stubs for all five destinations rendering a titled empty state with a `<Mascot variant="idle">` so navigation is walkable before content lands.
- Responsive: single column + bottom nav under `md`, two/three-column with side rail at/above `md`. Body never scrolls horizontally.

Files: `app/(shell)/layout.tsx`, `components/shell/BottomNav.tsx`, `components/shell/SideRail.tsx`, the five `page.tsx` stubs.

Acceptance:
- All five tabs navigate; active tab is visually distinct; layout reflows cleanly at 375px, 768px, 1280px.
- No horizontal body scroll at any width; wide content scrolls inside its own container.

Verify/demo: resize the browser across the three breakpoints; click every tab.

---

### Phase 3 — Seed-driven surfaces: Feed, Stories, Profile (A4, A5, A6, A11)
**Goal:** the social surfaces look alive on seed/fixture data, with skeletons and empty states everywhere.

Tasks:
- **A4 Flyway feed.** `app/(shell)/feed/page.tsx` renders `FeedResponse.items`: an event card per item (title, category, datetime, a `tasteScore` visual, and the LLM `reason` as a chip), interleaved with `notes` Q&A threads (`components/feed/NoteThread.tsx`). Data via `lib/data/source.ts` (`getFeed()` → fixture or `GET /api/feed`).
- **A5 Stories / perches + the landing motion.** `app/(shell)/stories/page.tsx` renders a horizontal tray of shortlisted `listings` as story bubbles; tapping opens a listing detail sheet. Build `components/motion/LandInTray.tsx` — a Framer Motion primitive that animates a listing card flying/settling into the tray (a "lands on a perch" motion: arc in, small overshoot, settle). Expose it as `<LandInTray>` + a `landInTrayVariants` export so **Person B reuses the exact motion** in the negotiation screen.
- **A6 Profile.** `app/(shell)/profile/[id]/page.tsx` renders a `users` row: avatar, name, company/role/city, **`<BandedBadge>`** when `verified`, and the **pre-flight checklist** (`checklist_items` sorted by `due_offset`, each a toggleable row updating `done`). Toggle writes to the `checklist_items` table (owner-scoped by RLS) — optimistic toggle with revert on error.
- **A11 polish pass.** Every surface gets: a `<Skeleton>` loading state matching its final layout, and an empty state fronted by `<Mascot variant="idle">` with a friendly line ("No perches yet — save a place you like").

Files: `components/feed/*`, `components/stories/*`, `components/motion/LandInTray.tsx`, `components/profile/*`, `components/ui/BandedBadge.tsx`, `lib/data/source.ts`, `lib/fixtures/*`.

Acceptance:
- Feed renders ≥8 event cards + ≥2 Q&A threads from fixture; each event shows its reason chip and a taste indicator.
- A listing "lands" into the story tray with the signature motion; the `LandInTray` export is importable and documented for B.
- Profile shows the banded badge only when `verified` is true; checklist toggles persist optimistically and survive a reload (against live tables).
- Every surface shows a skeleton while loading and a chick-fronted empty state when empty.

Verify/demo: load each surface on `fixture` and on `live`; save a listing and watch it land; toggle a checklist item and reload.

---

### Phase 4 — Realtime DMs (A8) — LIVE, you own the client
**Goal:** two browsers, a message in one appears live in the other. This is a hero-grade LIVE system you own end-to-end on the client. Deep-dive in §5.

Tasks (test-first where it fits — write the optimistic-reconcile logic against a fake channel first):
- `lib/supabase/client.ts` — the browser Supabase client (anon key from `.env`).
- `lib/hooks/useRealtimeMessages.ts` — subscribes to `channel("conversation:<id>")` on `messages` INSERT filtered by `conversation_id` (exact snippet in contract §5); appends `payload.new` and reconciles optimistic rows.
- `lib/hooks/useConversation.ts` — create-or-open a conversation (used by A10 too): look up a `conversations` row whose `participant_ids` = `{me, other}`; INSERT if none; return its `id`.
- `app/(shell)/dms/page.tsx` — conversation list sorted by `last_message_at`.
- `app/(shell)/dms/[conversationId]/page.tsx` — the thread: message bubbles (sender vs recipient styling), a composer, optimistic send.
- **Optimistic send:** on submit, append a bubble with a temp id + `pending` state immediately; INSERT the row; when the Realtime echo arrives, swap temp id → real `id`/`created_at` and clear `pending`. On INSERT error (e.g. RLS reject), mark the bubble failed + offer retry.

Files: `lib/supabase/client.ts`, `lib/hooks/useRealtimeMessages.ts`, `lib/hooks/useConversation.ts`, `app/(shell)/dms/*`, `components/dms/*`.

Acceptance:
- Open the same conversation in two browser profiles (two seeded users); a message sent in A appears in B within ~1s without reload.
- Optimistic bubble shows instantly; reconciles to the canonical row (no duplicate, correct timestamp).
- Conversation list re-sorts on new message.
- **Gate:** this runs against B's participant-locked RLS. Do not demo live DMs until B confirms RLS is deployed (§10). Before that, exercise the UI on fixtures / a dev conversation only.

Verify/demo: two browser windows, seeded users, send messages both directions; kill the network mid-send to see the failed-state + retry.

---

### Phase 5 — Map + positive stickers (A9)
**Goal:** a themed Mapbox map with your life-map pins and a friendly, **positive-only** sticker layer.

Tasks:
- Mapbox GL render in `app/(shell)/map/page.tsx` with a **custom baby-blue map style** (author a Mapbox style tuned to `sky.*`/`ink.*`, or restyle a base style's water/land/roads toward the palette). Mapbox token from `.env`.
- **Life-map pins** from `GET /api/map/places` (`Place[]`): a pin per place with an icon by `kind` (coffee/gym/grocery/transit/show/work). If a place carries `nearestListingMinutes`, show the "4 min from your usual coffee spot" beat in its popup — **that number is B's deterministic computation, you only display it.**
- **Sticker layer + placement UI.** Render `stickers` as map markers styled by `category`. Placement flow: tap-to-place opens a small sheet exposing **only** the positive categories from the enum — `good_coffee`, `safe_feeling`, `interns_hang`, `good_vibe`, `great_food`, `green_space` — plus a short note; write inserts a `stickers` row (`created_by = auth.uid()`, RLS-scoped).
- **Positive-only enforcement in the UI (A's half of the safety rule).** The category picker has NO avoid/unsafe/negative option — not disabled, *absent*. B enforces the same via a DB `CHECK`; your UI must never present a path to a negative sticker.

Files: `app/(shell)/map/page.tsx`, `components/map/*` (`MapCanvas`, `PlacePin`, `StickerMarker`, `PlaceStickerSheet`), Mapbox style JSON.

Acceptance:
- Map renders in the baby-blue theme; pans/zooms smoothly.
- Places from fixture/live render with kind icons; the "N min from…" beat shows when present.
- Placing a sticker offers ONLY the six positive categories; a placed sticker persists and re-renders on reload.
- There is no UI path, anywhere, to create a negative/avoid sticker.

Verify/demo: place a `good_coffee` sticker, reload, confirm it's there; open a place popup and read the minutes beat; confirm the category list contains zero negative options.

---

### Phase 6 — Connection hero FRONT half (A7 + A10) — LIVE flagship
**Goal:** the visible money-shot: a ranked match card → "Message now" → a real live DM. Deep-dive + exact seam in §6.

Tasks:
- **A7 discovery.** `app/(shell)/discovery/page.tsx` calls `GET /api/matches` → renders `Match[]` as cards: `user.name`, `user.avatarUrl`, `company`, a human `moveWeek` ("moving the week of Jun 8"), `<BandedBadge>` when `banded`, and `reasons[]` as chips. A `tasteScore` visual (subtle). Browse as a grid or a swipeable stack.
- **A10 "Message now" → live DM.** Each card has a primary **"Message now"** action. On tap: call `useConversation.createOrOpen(me, match.user.id)` (Phase 4) to get a `conversation.id`, navigate to `/dms/[conversationId]`, subscribe to the Realtime channel, and focus the composer. The first send is optimistic (Phase 4 flow) and the recipient sees it live.
- Wire the flagship copy: the card should read like the demo line — "Jordan K. — same company, same week, banded — Message now."

Files: `app/(shell)/discovery/page.tsx`, `components/discovery/MatchCard.tsx`, reuse `lib/hooks/useConversation.ts` + the DM thread.

Acceptance:
- Discovery renders ranked cards from the frozen `Match` shape (via B's stub or fixture).
- "Message now" on a card lands you in a live DM thread with that exact person in ≤1 interaction, composer focused.
- End-to-end on two browsers: message now → type → the other seeded user sees it live.

Verify/demo: the full beat in one take — open discovery, tap "Message now" on a banded same-company match, send a message, watch it arrive live in the second browser.

---

### Phase 7 — Onboarding flow + Landing plan (A12, A13)
**Goal:** the warm, chick-guided front door (onboarding) and the first-week plan screen — the two consumer surfaces that sit on top of B's onboarding + itinerary routes.

Tasks:
- **A12 Onboarding flow.** `app/onboarding/page.tsx` as a step router: **Offer → Spotify → Takeout (optional) → Done**, each in `app/onboarding/_steps/`.
  - *Offer step:* a file upload → `POST /api/parse/offer`; while parsing, show `<Mascot variant="hop">` ("reading your offer…"); on return, show the parsed `OfferParse` (employer, salary, dates) **clean and information-first** (no mascot over the numbers) with an edit-to-correct affordance.
  - *Spotify step:* a "Connect Spotify" button → `POST /api/composio/spotify/connect` → open `redirectUrl`; poll `GET /api/composio/spotify/status` until `connected`; render the returned `TasteProfile` as taste chips. A "skip for now" path uses B's fallback taste.
  - *Takeout step (optional):* upload → `POST /api/parse/takeout`; preview the recurring `Place[]` ("we found your usual coffee spot"). Skippable — B pre-loads a sample so the demo never depends on a live upload.
  - *Done step:* a milestone beat (`<Mascot variant="idle">` + celebratory `accent.beak`) → route into the shell.
- **A13 Landing plan.** `app/(shell)/landing/page.tsx` renders `ItineraryResponse` (§4.4): day cards (`dayLabel`, each item's `time`/`title`/`kind`/`note`, map link when `lat`/`lng` present). Reachable from the onboarding Done step and from Profile. Decision content stays clean; the chick only bookends (a completion milestone), never sits over the plan.
- Consume both via `lib/data/source.ts` (fixture|live); build entirely on fixtures first (a canned `OfferParse`, `TasteProfile`, `Place[]`, `ItineraryResponse`).

Files: `app/onboarding/*`, `app/(shell)/landing/page.tsx`, `components/onboarding/*`, `components/landing/*`, `lib/data/source.ts`, `lib/fixtures/*`.

Acceptance:
- The full onboarding flow completes on fixtures and on live routes; parsed results render clean (no mascot over money/dates); the mascot appears only in the waiting/celebration beats.
- Skipping Spotify and Takeout still completes onboarding (B's fallback taste + pre-loaded places).
- The landing screen renders a 5–7 day plan from `ItineraryResponse`; each item is legible; map links open the right place.
- Reduced-motion: onboarding/celebration mascot freezes to the static pose.

Verify/demo: run onboarding end-to-end (upload the sample offer, connect-or-skip Spotify, skip Takeout, finish), land in the shell, open the landing plan.

---

### Phase 8 — Integration, polish, demo hardening (A11 continued)
**Goal:** flip everything from `fixture` to `live`, exercise both heroes, and make it demo-proof.

Tasks: switch `NEXT_PUBLIC_DATA_SOURCE=live`; verify each surface against B's real routes + seed; final skeleton/empty/error pass; motion-reduced pass; a11y/contrast sweep; run the exact demo flow on the presentation hardware/network (joint with B, §10).

Acceptance: the full demo checklist (§9) passes on `live` on the demo machine.

---

## 5. Deep-Dive: Realtime DMs (A8) — the LIVE system you own

This is your independently-owned live system (distinct from the joint connection hero). The contract's realtime split (§5): **B owns `messages`/`conversations` schema + RLS; you own the subscription + messaging UI + optimistic send.**

**Architecture:** no socket server. Supabase Realtime IS the managed websocket layer (CLAUDE.md §6). You (1) INSERT a row into `messages` and (2) subscribe to a per-conversation channel.

**Channel (one per conversation, exact from contract §5):**
```ts
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages",
      filter: `conversation_id=eq.${conversationId}` },
    (payload) => appendMessage(payload.new as MessageRow)
  )
  .subscribe();
// cleanup: supabase.removeChannel(channel) on unmount / conversation change
```

**Row shapes (frozen, contract §5):** `MessageRow { id, conversation_id, sender_id, recipient_id, body, created_at }`, `ConversationRow { id, participant_ids: string[], last_message_at, created_at }`. Copy verbatim into `lib/types/contract.ts`.

**The optimistic send + reconcile flow (contract §5 flow, you implement client-side):**
1. On submit: append a local bubble `{ tempId, body, sender_id: me, pending: true, created_at: now() }` — UI updates instantly.
2. INSERT the real row into `messages` (`{ conversation_id, sender_id: me, recipient_id: other, body }`).
3. RLS (B) confirms the sender is a participant; Postgres records it.
4. Realtime pushes the canonical row over the channel — **including back to the sender.** On echo, match by `(sender_id, body)` among `pending` rows, swap `tempId → id`, set the real `created_at`, clear `pending`. De-dupe so the echo doesn't create a second bubble.
5. On INSERT error (RLS reject / network): mark the bubble `failed`, show a retry affordance.

**Reconcile detail that bites:** because the sender is also subscribed, you'll receive your own message back. Reconcile-by-match (not blind-append) is what prevents a duplicate. Test this first, against a fake channel, before wiring real Supabase.

**Security gate (contract §5):** the participant-locked RLS on `messages`/`conversations` is the real boundary — the channel `filter` is only convenience, not security. **No live DM demo until B confirms RLS is deployed** (§10 hard gate). Build/exercise the UI on fixtures until then.

**Acceptance (repeat of Phase 4):** two browsers, live delivery ≤1s, optimistic bubble reconciles without duplication, failed-send retry works.

---

## 6. Deep-Dive: Connection Hero (JOINT) — the exact handoff seam

This is the ONE deliberately joint feature (contract §7). Both docs must describe both halves and the exact handoff.

- **Person B (back half, B11):** the matching engine behind **`GET /api/matches`** (§4.2), returning ranked `Match` objects. Deterministic scoring for `tasteScore`/ordering; the LLM only writes the human-readable `reasons[]` strings. **You do not touch this.**
- **Person A (front half, A7 + A10 — yours):** the discovery browse surface + match card, then **"Message now" → a live DM.**

**The frozen seam you consume — `Match` (contract §4.2), do not reshape:**
```ts
type Match = {
  user: { id: string; name: string; role: string; city: string; avatarUrl: string | null };
  company: string;      // "Stripe"
  moveWeek: string;     // ISO Monday of their move week, e.g. "2026-06-08"
  banded: boolean;      // from users.verified
  tasteScore: number;   // 0..1, deterministic
  reasons: string[];    // ["Same company", "Moving the same week", "Shared taste: indie, techno"]
};
```

**The exact handoff (contract §7 — implement to this, both sides):**
1. **A7** calls `GET /api/matches` → renders match cards (name, company, `moveWeek` humanized, `<BandedBadge>` from `banded`, `reasons[]` chips).
2. **A10** shows **"Message now"** on the card (the flagship line: *"Jordan K. — same company, same week, banded — message now"*).
3. On tap, **A creates-or-opens a conversation** — client-side via the Supabase client under participant RLS, **no separate API route:** look up a `conversations` row whose `participant_ids` = `{ me, match.user.id }`; if none, INSERT one; take its `id`.
4. **A** navigates to the DM view for that `conversation.id` and **subscribes to the Realtime channel** (§5).
5. First send is optimistic (§5 flow); the recipient's screen updates live.

**Contract points both must honor:** the `Match` shape is frozen; `conversations.participant_ids` is a 2-element `uuid[]`; conversation creation is client-side under participant RLS (not an API route); the DM channel + optimistic reconcile follow §5.

**How you avoid blocking on B here:** B publishes a **typed stub `GET /api/matches`** returning the frozen shape from seed early (§10 seam checkpoint). You build the entire card + "Message now" + create-or-open + DM against that stub; when B's real ranking lands, nothing in your code changes because the shape is frozen.

**Note on the OTHER hero (negotiation, B10) — NOT yours:** it is single-owner Person B end-to-end including its own results screen. Your only contribution is the design tokens (§3) and the **card-lands-into-tray motion primitive** (`components/motion/LandInTray.tsx`) B imports. Keep that export stable; do not build any negotiation UI.

---

## 7. Seed / Mock Strategy

**Principle:** A consumes seed; B produces it. A social app that looks empty reads as broken (CLAUDE.md §8), so every surface must look alive from day one — and you achieve that without waiting on B via the fixture layer.

- **B produces (B4):** the idempotent seed script populating `users` (with `verified`/taste), `listings`, `stickers`, `events`, `notes`, `messages`, `conversations`, `checklist_items` — a believable density-first cohort (one company/city).
- **A produces (yours):** `lib/fixtures/*` — local JSON mirroring the **exact frozen shapes**: `FeedResponse`, `MatchesResponse`, `MapPlacesResponse`, `ItineraryResponse`, and arrays of each table row. Rich enough to fill each surface (≥8 feed items, ≥12 matches with varied `banded`/reasons, ≥6 map places, ≥6 stickers spread across categories, a full checklist).
- **The switch:** `lib/data/source.ts` keyed on `NEXT_PUBLIC_DATA_SOURCE`. `fixture` → local JSON; `live` → real routes/Supabase. Develop and style on `fixture`; integrate and demo on `live`. Because shapes are frozen, the swap is a data-source change, not a refactor.
- **Keep fixtures honest:** every fixture must typecheck against `lib/types/contract.ts`. If B's real payload ever fails to match, that's a contract violation — fix via a contract PR, not a local patch.

---

## 8. Design / Engineering Constraints That Bind You (Person A)

These are the rules the whole app is judged on — you author most of them.

- **Full design system is yours.** Tokens (§3) are authored once into `tailwind.config.ts`; everyone (incl. B's hero screen) consumes them by name. No off-palette hex anywhere.
- **Palette discipline (contract §3 WCAG rule — do not violate):** body text is **always** `ink.strong` (#2C4A63) on white/`sky.50`, secondary `ink.soft`. **NEVER** render body text in baby-blue (`sky.*`) on white — it fails contrast. Baby-blue is for **surfaces, fills, and large shapes only.**
- **Functional colors stay UNMUTED.** `func.pass`/`func.flag`/`func.scam` are legible green/amber/red — never pastel-ify a warning. The pale `*Bg` tokens are backgrounds only, paired with the strong foreground for the label.
- **Mascot placement rule (CLAUDE.md §9 + mascot README):** the chick appears ONLY in personality moments — onboarding, loading, empty states, milestones. It is **ABSENT** from decision surfaces: listings, safety, money, map decisions. *The chick handles emotion and waiting; the interface handles decisions.* Never put the mascot on a match card, a listing, the map decision layer, or a money/safety readout.
- **Motion budget + reduced motion:** animate the chick with cheap transforms only (the flattened `idle`/`hop` SVGs); never loop the `feTurbulence` `static-fur` version. Every loop gates behind `@media (prefers-reduced-motion: no-preference)` and falls back to the static pose. The `LandInTray` motion also respects reduced motion.
- **Positive-only stickers (product safety rule, CLAUDE.md §8 / contract §2, §8):** your sticker UI exposes **only** the six positive categories — no avoid/unsafe path exists in the UI, at all. B backstops with a DB `CHECK`; you must never present the negative path.
- **Least-privilege / secrets (you inherit, don't hold):** you never hold OpenAI/Composio secrets — those live server-side (B12). Client only ever sees the Supabase anon key + Mapbox token from the gitignored `.env`. Never commit a key.
- **You render B's determinism, you don't compute it:** the "4 min from your usual coffee spot" number, the match ordering, the taste scores, every negotiation verdict — all deterministic in B's code. You display them; you never recompute or fake them client-side.
- **Bird words ride alongside plain meaning (CLAUDE.md §9):** subtitle bird words where needed (perches / flock / flyway / banded / pre-flight / landing); theme adds delight via language + motion, never at the cost of clarity.

*(B's constraints — LLM-reasons/rules-are-deterministic, RLS security, read-only Composio scopes, rate-limiting, the timeboxed Composio spike with hand-written-OAuth fallback — are in `docs/IMPLEMENTATION-PERSON-B.md`. You rely on them but don't build them.)*

---

## 9. Definition of Done + Demo Checklist (your surface)

**Definition of done (Person A):**
- All frozen tokens in `tailwind.config.ts` (§3); `/tokens` verifies every swatch; no baby-blue body text anywhere.
- The three mascot SVGs recolored (zero teal in body/wing roles), keyframes supplied, `<Mascot>` component wired into loading/onboarding/empty/milestone states, reduced-motion honored. Mascot absent from all decision surfaces.
- The IG-shaped shell + five-tab nav is responsive at 375/768/1280, no horizontal body scroll.
- Feed, Stories (+ landing motion), Profile (+ banded badge + pre-flight checklist), Map (+ positive stickers), Discovery all render on both `fixture` and `live`.
- Onboarding flow (offer → Spotify → Takeout → done) completes on both `fixture` and `live`, skips degrade gracefully, and parsed results render clean (no mascot over money/dates); the A13 landing plan renders `ItineraryResponse`.
- Realtime DMs deliver live between two browsers with optimistic send + reconcile; runs against B's participant-locked RLS.
- Connection hero: match card → "Message now" → live DM works end-to-end against the frozen `Match` shape.
- Every surface has a skeleton loading state and a chick-fronted empty state.
- `LandInTray` + `<Mascot>` exported and stable for B; tokens consumed by B's hero screen.
- Preview deploy green on Vercel.

**Demo checklist (drive the real flow):**
0. Onboard — upload the sample offer (parsed clean), connect-or-skip Spotify (taste chips), finish on a chick milestone, land in the shell; optionally open the **landing** first-week plan.
1. Land on the Flyway — taste-ranked events with reason chips, Q&A threads below.
2. Open Stories — save a listing, watch it **land** into the perches tray.
3. Open Profile — banded badge visible; toggle a **pre-flight** checklist item, reload, it persisted.
4. Open Map — baby-blue theme; a life-map pin popup shows "N min from your usual coffee spot"; place a positive sticker (only positive categories offered), reload, it's there.
5. Open Discovery — a ranked, banded, same-company/same-week match card.
6. **Flagship:** tap **"Message now"** → a live DM opens → type a message → the second browser (seeded recipient) receives it live.
7. Toggle OS reduce-motion — the chick freezes to a static pose; no motion-sickness loops.

---

## 10. Integration Checkpoints With Person B

From contract §9. What must be agreed/merged, and when:

- **Foundation merge (end of Day-1, hard gate to diverge):** §6 items 1–6 on `main` — app boots, tokens present, `.env.example` complete, one migration applied, preview live. You lead the scaffold, tokens, and Vercel repo connect; you hold Supabase/Mapbox creds in `.env`.
- **Seam checkpoint — `Match` stub (mid-sprint):** B publishes a typed stub `GET /api/matches` returning the frozen `Match` shape (§4.2) from seed **early**, so you build A7 discovery + A10 "Message now" against real JSON before B's ranking is final. You confirm your card renders every field of the shape.
- **Seam checkpoint — DM RLS (before ANY live DM demo — hard gate):** B confirms participant-locked RLS on `messages`/`conversations` is deployed. You wire the subscription only against RLS-protected tables. **No live DM demo without this.** Until confirmed, exercise DMs on fixtures.
- **API stubs first:** every §4 route ships as a typed stub returning the frozen shape before real logic lands — so you never block. You consume stubs via `lib/data/source.ts`.
- **Shared-export handshake:** you notify B when `<Mascot>` and `LandInTray` are stable + how to import them; B integrates them into the negotiation screen. Any change to their prop API after B adopts is coordinated.
- **Contract amendments:** any change to a §2 table name/shape, a §3 token name/hex, or a §4/§5 API shape is a PR into `FOUNDATION-CONTRACT.md` reviewed by both — never a silent code change.
- **Merge cadence:** rebase `person-a` on `main` frequently; merge each completed vertical (with its fixtures) behind the stable contract; keep the preview deploy green.
- **Pre-demo (joint):** rehearse the exact flow on the presentation hardware/network; poke the Supabase project so it isn't idle-paused; exercise both heroes live end-to-end.

---

## 11. Bird-Word Glossary (contract §10)

Theme rides alongside plain meaning — always subtitle where clarity needs it.

| Bird word | Plain meaning |
|---|---|
| **perches** | Sublets / short-term listings that fit a ~10-week internship — the Stories shortlist tray (A5). |
| **flock** | Your people — interns at your company / in your city, moving the same time, similar taste — peer discovery + DMs (A7/A8/A10). |
| **flyway** | The taste-matched events feed — the migratory route of things to do, ranked to your taste (A4). |
| **banded** | Verified — a bird is "banded" when tagged/identified; here it's the trust badge on a confirmed intern, seeded for the demo (A6 badge, flag from B3). |
| **pre-flight** | The pre-move checklist — everything to handle before you leave the nest (A6). |
| **landing** | The first-week itinerary — the plan for the days right after you arrive (rendered by A, generated by B8). |
