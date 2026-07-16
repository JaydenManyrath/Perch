# Perch - FOUNDATION CONTRACT

> **The single anti-drift artifact.** Both people on the Perch build implement against THIS document. If code and this doc disagree, either fix the code or amend this doc in a PR that both people review - never let them silently diverge. Data model (§2), design token names+hex (§3), and API shapes (§4-§5) are the frozen seams. Change them only by editing this file first.
>
> **Round 2 (2026-07-16):** the v1 app is built and merged to `main`. New feature seams (auto-sourced sublets + freshness, swipe perches, subletter posting, Airbnb-style reviews, Ticketmaster events + intern attendance, offer-parser hardening, map icons, tappable profiles) are specified in **§11**. Round-2 per-person plans: `docs/IMPLEMENTATION-PERSON-A-ROUND2.md` and `docs/IMPLEMENTATION-PERSON-B-ROUND2.md`. Working agreements in §11.10.

Perch is an Instagram-shaped social app that helps interns land in a new city - find other interns (flock) and short-term sublets (perches), warm up to the place before arrival. Full product context lives in `CLAUDE.md`. This is a **demo build in dev/test mode** (no production auth/verification/review flows). Stack is **LOCKED**: Next.js + TypeScript, Tailwind, shadcn/ui, Framer Motion, Supabase (DB/Auth/Realtime/Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, Vercel.

---

## 1. Purpose, How To Use This Doc, Branches & Ownership

### How to use this doc
1. Read your per-person plan (`docs/IMPLEMENTATION-PERSON-A.md` / `docs/IMPLEMENTATION-PERSON-B.md`) for the HOW; read THIS for the WHAT-WE-SHARE.
2. Before you build any seam that the other person touches - a table, a token, an API route, the DM channel - the shape here is authoritative. Do not invent a shape; if one is missing, add it here in a reviewed PR.
3. Two long-lived feature branches: **`person-a`** and **`person-b`**. The Day-0/Day-1 shared foundation (§6) is built collaboratively and merged to `main` FIRST, before the branches diverge.
4. Every feature is owned by exactly ONE person, with two deliberate exceptions: the **connection hero** is JOINT (§7), and the **shared foundation** (§6) is built together up front.

### The split (horizontal-ish)
- **Person A - Experience & Social Shell** (branch `person-a`): the design system, mascot, app shell, every consumer-facing surface, realtime DM UI, map/sticker UI. A *authors* the design tokens and shared UI primitives the whole team uses.
- **Person B - Intelligence, Data & Hero** (branch `person-b`): all Supabase schema + RLS + auth + seed data, parsers, integrations, the matching/ranking engines, and the streaming negotiation hero end-to-end. B *owns every API route and every table*.

### Ownership table (compact)

| Area | Person A (Experience & Social Shell) | Person B (Intelligence, Data & Hero) |
|---|---|---|
| Design system | **A1** tokens, shadcn, typography, primitives (authors tokens) | consumes tokens |
| Mascot | **A2** recolor + keyframes + Mascot component | consumes Mascot in hero screen |
| App shell / nav | **A3** IG-shaped nav (Feed/Stories/Map/DMs/Profile) | - |
| Onboarding flow | **A12** guided upload/connect UI (offer letter, Spotify, Takeout) | **B5** Composio + **B6** parsers + **B3** auth (routes in §4.6) |
| Feed (Flyway) | **A4** events feed UI + notes/Q&A UI | ranking via `GET /api/feed`, events+notes data |
| Stories (perches) | **A5** listing-shortlist tray + "lands into tray" motion | listings data |
| Profile | **A6** profile + banded badge + pre-flight checklist UI | users + checklist_items data, banded flag logic (**B3**) |
| Peer discovery (flock) | **A7** browse + match-card surface | `GET /api/matches` (**B11**) |
| Realtime DMs | **A8** messaging UI + Realtime subscription + optimistic send | messages/conversations schema + RLS (**B1/B2**) |
| Map + stickers | **A9** Mapbox render + baby-blue style + pins + sticker UI (positive only) | `GET /api/map/places` (**B9**), stickers schema+RLS |
| **Connection hero (front)** | **A10** discovery card → "message now" → live DM | - |
| Seed-consuming polish | **A11** skeletons/empty/loading everywhere | - |
| Supabase schema | - | **B1** all §2 tables + indexes + Storage + migrations |
| RLS (security-critical) | - | **B2** per-table policies |
| Auth (dev) | - | **B3** session + banded/verified flag (seeded) |
| Seed data | - | **B4** idempotent seed script |
| Integrations | - | **B5** Composio Spotify → taste_profile |
| Parsers | - | **B6** offer-letter PDF + Maps Takeout JSON |
| Matching engine | - | **B7** `GET /api/feed` + `GET /api/matches` |
| Itinerary (landing) | **A13** landing/itinerary screen renders | **B8** `GET /api/itinerary` |
| Life-map pipeline | renders | **B9** `GET /api/map/places` + distance math |
| **Negotiation hero (LIVE)** | provides tokens + motion primitive to B | **B10** `POST /api/negotiate` streaming, END-TO-END incl. its results screen |
| **Connection hero (back)** | consumes | **B11** matching engine behind `GET /api/matches` |
| Secrets + rate-limiting | holds creds in `.env` | **B12** secret mgmt + rate-limit every LLM/API route |
| Shared deps A→B | design tokens (names+hex), Mascot, card-lands-into-tray motion primitive | - |

---

## 2. Data Model - Authoritative Schema (Section 5)

This reproduces `CLAUDE.md` §5 as the **single source of truth**. **Person B owns creating EVERY table, every index, every Storage bucket, and every RLS policy** (B1/B2). Person A consumes these tables through the Supabase client and through B's API routes. Types are Postgres types; adjust nullability during migration but keep names stable.

### `users`
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK (= `auth.users.id`) | identity; FK target for everything |
| `name` | `text` | Profile (A6), match card (A7) |
| `company` | `text` | match `company`, discovery filter (A7/B11) |
| `role` | `text` | Profile, match reasons |
| `city` | `text` | discovery scoping |
| `move_in_date` | `date` | drives `moveWeek` in matches; lease-fit in negotiate |
| `taste_profile` | `jsonb` | Spotify-derived (B5); powers feed + match `tasteScore` |
| `verified` | `boolean` default `false` | **banded** badge (A6); set by B3 (seeded) |
| `avatar_url` | `text` null | Storage ref; Profile + match card |
| `created_at` | `timestamptz` default `now()` | |

`taste_profile` shape (written by B5, read by B7): `{ topArtists: string[], topGenres: string[], topTracks: string[], energy?: number }`.

### `listings` (sublets / perches)
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | Stories tray (A5), negotiate scout |
| `address` | `text` | |
| `lat` | `double precision` | Map (A9), routine-fit distance |
| `lng` | `double precision` | |
| `price` | `integer` (USD/mo) | **deterministic budget math** in negotiate (B10) |
| `lease_start` | `date` | lease-fit date logic (B10) |
| `lease_end` | `date` | lease-fit date logic (B10) |
| `lease_type` | `text` (`'sublet'`\|`'short_term'`\|`'standard'`) | lease-fit |
| `source` | `text` | provenance |
| `photos` | `text[]` | Supabase Storage refs (bucket `listing-photos`) |
| `safety_flags` | `jsonb` | **deterministic safety rules** in negotiate; `{ scamSignals: string[], notes: string[] }` |
| `created_by` | `uuid` FK→users | ownership for RLS |
| `created_at` | `timestamptz` default `now()` | |

### `stickers` (community map - POSITIVE/VIBE only)
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `lat` | `double precision` | Map layer (A9) |
| `lng` | `double precision` | |
| `category` | `text` | **enum: `'good_coffee'`,`'safe_feeling'`,`'interns_hang'`,`'good_vibe'`,`'great_food'`,`'green_space'`** - no `avoid`/`unsafe` values ever |
| `note` | `text` | short positive note |
| `created_by` | `uuid` FK→users | RLS |
| `created_at` | `timestamptz` default `now()` | |

> **Product rule (enforced in schema + UI):** positive/vibe stickers ONLY. A DB `CHECK` constraint restricts `category` to the positive enum above so no "avoid/unsafe" sticker can ever be written. Person A's sticker UI exposes only positive categories.

### `conversations`
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | DM thread; created by connection hero |
| `participant_ids` | `uuid[]` (length 2 for demo) | **RLS keys on this** |
| `last_message_at` | `timestamptz` | DM list sort (A8) |
| `created_at` | `timestamptz` default `now()` | |

### `messages` *(Supabase Realtime subscribes here)*
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `conversation_id` | `uuid` FK→conversations | Realtime channel key (A8) |
| `sender_id` | `uuid` FK→users | |
| `recipient_id` | `uuid` FK→users | |
| `body` | `text` | |
| `created_at` | `timestamptz` default `now()` | order + optimistic reconcile |

### `events` *(seeded for demo)*
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `title` | `text` | Feed (A4) |
| `category` | `text` | genre/vibe tag → taste match (B7) |
| `lat` | `double precision` | Map + feed |
| `lng` | `double precision` | |
| `datetime` | `timestamptz` | Feed sort |
| `source` | `text` | |

### `notes` (past-intern Q&A)
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `city` | `text` | area scoping |
| `area` | `text` null | neighborhood |
| `topic` | `text` | thread grouping (A4) |
| `body` | `text` | |
| `created_by` | `uuid` FK→users | |
| `created_at` | `timestamptz` default `now()` | |

### `checklist_items` (pre-flight)
| Column | Type | Notes / feeds |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK→users | RLS: owner only |
| `label` | `text` | Profile checklist (A6) |
| `due_offset` | `integer` (days before move_in) | ordering |
| `done` | `boolean` default `false` | toggle (A6) |

### RLS - highest-risk correctness work (Person B, B2)
RLS is **mandatory** and must land **before any real DM demo**. Every table gets least-privilege policies. Explicit requirement:

- **`messages` and `conversations` are LOCKED TO PARTICIPANTS.** A row in `conversations` is readable/writable only if `auth.uid() = ANY(participant_ids)`. A row in `messages` is readable/writable only if `auth.uid()` is a participant of its `conversation_id` (join through `conversations`). No user can ever read another pair's DMs. This is the single most security-critical policy in the app.
- `stickers` / `notes` / `listings`: readable by any authenticated user (public social surface); writable only where `created_by = auth.uid()`; `stickers.category` additionally constrained to the positive enum.
- `events`: read-only to clients (seeded/server-written).
- `checklist_items`: fully scoped to `user_id = auth.uid()` (read + write).
- `users`: profile fields readable by authenticated users; a user may update only their own row.

---

## 3. Design Tokens (concrete hex - Person A authors into Tailwind, everyone consumes)

Derived from `CLAUDE.md` §9 and the mascot README recolor table. **These names are the contract** - both people reference the same Tailwind token names; the hex is authored once by Person A into `tailwind.config.ts` and consumed everywhere (including B's negotiation hero screen).

### Core token table

| Token name | Hex | Usage |
|---|---|---|
| `sky.50` | `#F2F9FE` | app page background (near-white baby-blue tint) |
| `sky.100` | `#DCEFFB` | baby-blue **surfaces**: cards, sheets, chips, sticker bg (chick `soft2` glow) |
| `sky.200` | `#BFE3F7` | primary baby-blue fill; mascot body (`chick.body`); selected states |
| `sky.300` | `#9CC5DD` | baby-blue borders / dividers on white |
| `sky.400` | `#7FB2DB` | interactive baby-blue: buttons, links-as-fill; mascot wing (`chick.wing`) |
| `sky.500` | `#5E9BCB` | pressed/hover deeper baby-blue |
| `white` | `#FFFFFF` | base surface, card fills, text-on-blue |
| `ink.strong` | `#2C4A63` | **body text + headings** (deep blue - the accessible text color) |
| `ink.soft` | `#5E7E97` | secondary/caption text; mascot under-shadow (`ink.soft`) |
| `ink.muted` | `#8AA2B5` | disabled text, placeholder |
| `accent.beak` | `#F6A22C` | warm accent: "top pick", highlights, celebratory beats (chick beak/feet - kept) |
| `accent.beakDeep` | `#E5851C` | accent pressed / darker warm edge |
| `accent.beakLight` | `#E9A24C` | soft warm tint |
| `func.pass` | `#16A34A` | **UNMUTED** green = passes / safe / verified verdict |
| `func.flag` | `#D97706` | **UNMUTED** amber = caution / lease-fit warning |
| `func.scam` | `#DC2626` | **UNMUTED** red = scam / hard-fail / safety flag |
| `func.passBg` | `#DCFCE7` | pale green verdict pill background |
| `func.flagBg` | `#FEF3C7` | pale amber verdict pill background |
| `func.scamBg` | `#FEE2E2` | pale red verdict pill background |

> **WCAG rule (do not violate):** NEVER render body text in baby-blue (`sky.*`) on white - it fails contrast. Body text is always `ink.strong` (#2C4A63) on white/`sky.50`, `ink.soft` for secondary. Baby-blue is for **surfaces, fills, and large shapes**, not for reading text. Functional colors (`func.pass/flag/scam`) stay **unmuted** - never pastel-ify a warning; the pale `*Bg` tokens are backgrounds only, paired with the strong foreground for the label text.

### Chick recolor mapping (teal → baby blue; keep the orange)
Person A applies this across all three SVGs in `assets/mascot/` (`plush-chick-idle.svg`, `plush-chick-hop.svg`, `plush-chick-static-fur.svg`). Same fills across all three.

| Original (teal) | Role | → New (token) |
|---|---|---|
| `#AEE4DE` | body fill | `#BFE3F7` (`sky.200` / `chick.body`) |
| `#8FC7E8` | wings / top tuft | `#7FB2DB` (`sky.400` / `chick.wing`) |
| `#9AD0EF` | center tuft | `#8FC7E8` |
| `#CDEBE6` | body glow (soft2) | `#DCEFFB` (`sky.100`) |
| `#5FA79B` | under-shadow | `#5E7E97` (`ink.soft`) |
| `#7FB9C9` | belly seam | keep or `#9CC5DD` (`sky.300`) |
| `#F6A22C` / `#E5851C` / `#E9A24C` | beak + feet | **KEEP** (`accent.beak*` - already warm accent) |
| `#2B333B` | eyes | `#2C4A63` (`ink.strong`) or keep near-black |
| `#2C4A63` | shadow | keep (already deep blue) |

### Mascot animation contract (A2)
The animated SVGs (`idle`, `hop`) reference `@keyframes` that are **not in the file** - Person A supplies them in app CSS / the Mascot component: `apBreathe`, `apWingSwaySlow`, `apBlink`, `apHop`, `apFlap`, `apShadow` (starter definitions in `assets/mascot/README.md`). `static-fur` keeps the `feTurbulence` filter and is **static only** (large hero/splash) - never looped. All loops gate behind `@media (prefers-reduced-motion: no-preference)` and fall back to the static pose. The Mascot component exposes `variant="idle" | "hop"` and appears ONLY in personality moments (loading, onboarding, empty states, milestones) - absent from decision surfaces (listings, money, safety, map decisions).

---

## 4. API Contract (Person B exposes → Person A consumes)

All routes are Next.js API routes under `/api`. All are **rate-limited** and hold secrets server-side (B12). Auth: the Supabase session cookie identifies the caller; routes read `auth.uid()` server-side - request bodies never carry the caller's own id as trust. Types below are the frozen shapes.

### 4.1 `GET /api/feed` - taste-ranked events for the Flyway
**Purpose:** rank seeded `events` against the caller's `taste_profile` (deterministic scoring; LLM only for the human `reason`).

Request: `GET /api/feed?limit=20&city=Seattle` (query only; caller identified by session).

```ts
type FeedResponse = {
  items: FeedItem[];
};
type FeedItem = {
  event: {
    id: string;
    title: string;
    category: string;
    lat: number;
    lng: number;
    datetime: string;   // ISO 8601
    source: string;
  };
  tasteScore: number;   // 0..1, deterministic
  reason: string;       // short human-readable, LLM-generated ("Matches your indie + live-show taste")
};
```

### 4.2 `GET /api/matches` - ranked flock (connection-hero back half, B11)
**Purpose:** cohort/taste match for peer discovery. Returns ranked people. This is the JOINT seam consumed by A7 + the connection hero (A10).

Request: `GET /api/matches?limit=20` (caller from session).

```ts
type MatchesResponse = {
  matches: Match[];
};
// EXACT match object shape - frozen:
type Match = {
  user: {
    id: string;
    name: string;
    role: string;
    city: string;
    avatarUrl: string | null;
  };
  company: string;       // e.g. "Stripe"
  moveWeek: string;      // ISO date of the Monday of their move week, e.g. "2026-06-08"
  banded: boolean;       // verified/banded flag (from users.verified)
  tasteScore: number;    // 0..1, deterministic
  reasons: string[];     // human-readable reason chips, e.g. ["Same company", "Moving the same week", "Shared taste: indie, techno"]
};
```

### 4.3 `POST /api/negotiate` - HERO, streaming housing negotiation (B10, single-owner)
**Purpose:** for a set of listings, per-listing "scouts" evaluate **budget (deterministic math)**, **safety flags (deterministic rules)**, **lease-fit (date logic)**, **routine-fit (distance)**; OpenAI via Vercel AI SDK **streams the reasoning/explanation prose**, while **deterministic code owns every pass/fail verdict**. Person B owns this end-to-end including its own results screen (uses A's tokens + card-lands-into-tray motion primitive).

Request:
```ts
type NegotiateRequest = {
  listingIds: string[];   // listings to evaluate
  constraints: {
    monthlyBudget: number;      // USD, deterministic budget check
    moveIn: string;             // ISO date
    moveOut: string;            // ISO date
    routineAnchors?: {          // for routine-fit distance
      label: string;            // "usual coffee spot"
      lat: number;
      lng: number;
    }[];
  };
};
```

Response: a **streamed** sequence (Vercel AI SDK data stream / SSE-style). Each chunk is one JSON event. Consumer (Person B's own results screen) renders per-listing verdicts as they arrive.

```ts
// Streamed event union - one JSON object per chunk:
type NegotiateStreamEvent =
  | { type: "listing_start"; listingId: string; title: string }
  | { type: "scout_verdict";            // DETERMINISTIC verdict, emitted per check
      listingId: string;
      check: "budget" | "safety" | "lease_fit" | "routine_fit";
      verdict: "pass" | "flag" | "fail";     // maps to func.pass / func.flag / func.scam
      value: string;                          // deterministic fact, e.g. "$1,850 / $2,000 budget" or "4 min from your usual coffee spot"
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

> **Architectural principle (tell the judges):** the LLM reasons/explains (`explanation_delta`); every `verdict`, every number, every pass/fail is deterministic code - never the model. Budget = arithmetic. Safety = rule table over `listings.safety_flags`. Lease-fit = date comparison. Routine-fit = the deterministic distance computation (shared with B9).

### 4.4 `GET /api/itinerary` - first-week plan (landing, B8)
**Purpose:** OpenAI-generated first-week plan; optional Google Calendar sync via Composio.

Request: `GET /api/itinerary?days=7` (caller from session; uses their move_in_date, city, taste, map places).

```ts
type ItineraryResponse = {
  landingWeek: ItineraryDay[];
  calendarSynced: boolean;    // true if pushed to Google Calendar via Composio
};
type ItineraryDay = {
  date: string;               // ISO date
  dayLabel: string;           // "Day 1 - Landing"
  items: {
    time: string;             // "09:00"
    title: string;            // "Coffee at your usual-style spot"
    kind: "settle" | "explore" | "social" | "errand";
    lat?: number;
    lng?: number;
    note: string;             // LLM prose
  }[];
};
```

### 4.5 `GET /api/map/places` - life-map places (B9)
**Purpose:** Takeout-derived recurring places for Person A to render on Mapbox; owns the deterministic "4 min from your usual coffee spot" distance beat.

Request: `GET /api/map/places` (caller from session; pre-loaded sample Takeout backs the demo so it never breaks live).

```ts
type MapPlacesResponse = {
  places: Place[];
};
type Place = {
  id: string;
  label: string;            // "Your usual coffee spot"
  kind: "coffee" | "gym" | "grocery" | "transit" | "show" | "work" | "other";
  lat: number;
  lng: number;
  frequency: number;        // deterministic recurrence count from Takeout
  nearestListingMinutes?: number;  // deterministic "4 min from…" computation (shared with negotiate routine-fit)
};
```

### 4.6 Onboarding data routes (Person B builds routes; Person A's onboarding UI **A12** consumes)
The guided onboarding flow is a **consumer surface owned by Person A (A12)**; the parsing/connect logic behind it is **Person B (B6 parsers, B5 Composio, B3 auth)**. Same A-UI / B-logic split as every other feature. All routes are rate-limited (B12), store uploads to the private Storage buckets (`offer-letters`, `takeout`), and write results to `users` (`taste_profile`, etc.).

**`POST /api/parse/offer`** - multipart PDF upload → structured offer. Deterministic extraction; the LLM may only normalize ambiguous fields, never invent a number.
```ts
type OfferParse = {
  employer: string;
  role: string | null;
  salary: number | null;      // annual USD; null if not confidently extracted
  startDate: string | null;   // ISO
  endDate: string | null;     // ISO (estimated from a ~10-week internship if only start is present)
  city: string | null;
};
```

**`POST /api/parse/takeout`** - multipart/JSON Google Maps Takeout upload → recurring places (same `Place` shape as §4.5; `frequency` populated, `nearestListingMinutes` omitted here).
```ts
type TakeoutParse = { places: Place[] };   // Place per §4.5
```

**`POST /api/composio/spotify/connect`** - begin the read-only Spotify connect (Composio-hosted OAuth). A12 opens/redirects to `redirectUrl`.
```ts
type SpotifyConnectResponse = { redirectUrl: string };
```

**`GET /api/composio/spotify/status`** - poll connection + resulting taste after redirect.
```ts
type SpotifyStatusResponse = {
  connected: boolean;
  taste: TasteProfile | null;   // = users.taste_profile shape (§2): { topArtists, topGenres, topTracks, energy? }
};
```

---

## 5. Realtime DM Contract

**Split:** Person B owns `messages` + `conversations` **schema + RLS** (B1/B2). Person A owns the **subscription + messaging UI + optimistic send** (A8). Both implement to the shapes in §2.

### Channel convention (Person A subscribes)
One Supabase Realtime channel **per conversation**, keyed on `conversation_id`, listening to Postgres `INSERT` on `messages`:

```ts
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
    (payload) => appendMessage(payload.new as MessageRow)
  )
  .subscribe();
```

```ts
type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;   // ISO 8601
};
type ConversationRow = {
  id: string;
  participant_ids: string[];   // [uidA, uidB]
  last_message_at: string;
  created_at: string;
};
```

### Flow (matches `CLAUDE.md` §6)
1. Person A inserts a row into `messages` (optimistic append to UI immediately with a temp id).
2. RLS (B) confirms the sender is a participant; Postgres records the insert.
3. Supabase Realtime pushes the canonical row over the channel to the other participant.
4. On receiving the echo, A reconciles the optimistic row (swap temp id → real `id`, `created_at`).

**Security gate:** the participant-locked RLS on `messages`/`conversations` (§2, B2) MUST be in place before any real DM demo - without it, the subscription filter is not a security boundary. RLS is the boundary; the channel filter is only a convenience.

---

## 6. Day-0 / Day-1 Shared Foundation Sprint (build together, merge to `main` first)

Built collaboratively and merged to `main` **before** `person-a` and `person-b` diverge. Ordered:

| # | Item | Leads | Both must have when done |
|---|---|---|---|
| 1 | Create Supabase project (URL, anon key, service-role key) | **Person B** | both hold creds in gitignored `.env` |
| 2 | Next.js + TS + Tailwind + shadcn scaffold | **Person A** | app boots; shadcn init committed |
| 3 | Secret-management convention + `.env.example` | **Person B** | `.env` gitignored; `.env.example` lists every key (Supabase, OpenAI, Mapbox, Composio); no secret ever committed |
| 4 | Design tokens locked into `tailwind.config.ts` (§3 names+hex) | **Person A** authors, **Person B** consumes | token names frozen; B can reference `sky.*`, `ink.*`, `accent.*`, `func.*` |
| 5 | Section 5 data model committed here as single source of truth (§2) | **both** review | schema shapes agreed; B implements migrations on `person-b` |
| 6 | Vercel deploy wiring | **Person A** connects repo, **Person B** sets server env vars | preview URL per branch; server env vars present on Vercel |

Only after items 1-6 are merged to `main` do the two branches diverge. Anything that changes a §2 table name, a §3 token name, or a §4/§5 shape after this point is a **contract amendment** - PR into this file, both review.

---

## 7. The Two Live Heroes

### Hero 1 - Streaming Housing NEGOTIATION (single-owner: Person B, END-TO-END)
Wholly Person B, including its own results screen. `POST /api/negotiate` (§4.3) streams per-listing verdicts. Deterministic code owns every pass/fail (budget math, safety rules, lease-fit dates, routine-fit distance); OpenAI streams only the explanation prose. B's results screen consumes Person A's **design tokens** (§3) and the shared **card-lands-into-tray motion primitive** (A provides). This hero is deliberately **single-owner** so the flagship stays self-contained - Person A does not build any part of the negotiation screen; A's only contribution is the reusable tokens + motion primitive.

### Hero 2 - Intern CONNECTION (JOINT: A UI + DM × B matching) - the one deliberate seam
The ONE feature both docs must describe, both halves and the exact handoff.

- **Person B (back half, B11):** the matching engine behind `GET /api/matches` (§4.2), returning ranked `Match` objects `{ user, company, moveWeek, banded, tasteScore, reasons[] }`.
- **Person A (front half, A7 + A10):** the discovery browse surface + match card, then the flagship beat: **"message now" → opens a live DM.**

**The exact handoff seam (implement to this, both sides):**
1. A7 discovery calls `GET /api/matches` → renders match cards (name, company, moveWeek, banded badge, taste reasons).
2. On a card, A10 shows **"Message now"** (the visible flagship beat: *"Jordan K. - same company, same week, banded - message now"*).
3. On tap, A **creates-or-opens a conversation**: look up an existing `conversations` row whose `participant_ids` = `{ me, match.user.id }`; if none, INSERT one (participant-locked by RLS). Get its `id`.
4. A navigates to the DM view for that `conversation.id` and **subscribes to the Realtime channel** (§5).
5. First message send is optimistic (§5 flow); the recipient's screen updates live over Realtime.

Contract points both must honor: the match object shape (§4.2) is frozen; `conversations.participant_ids` is a 2-element `uuid[]`; conversation creation is client-side via the Supabase client under participant RLS (no separate API route); the DM channel + optimistic reconcile follow §5.

---

## 8. Ownership Boundary Rules + Per-Feature Owner Map

### Boundary rules
- The **negotiation hero screen is single-owner (Person B, end-to-end)** to keep the flagship self-contained.
- The **connection hero is the ONE deliberately joint seam** (A UI+DM × B matching); §7 defines the exact handoff both implement to.
- **Every other feature is owned by exactly ONE person.** No shared editing of a surface outside the joint seam and the shared foundation (§6).
- **Positive-only stickers** (schema `CHECK` + UI). No avoid/unsafe labels, ever.
- **Least-privilege, read-only external scopes** (Spotify top artists/tracks; IG Business read-only if used). No write/publish/control scopes.
- **RLS before any real DM demo.**
- Person B owns **all** schema, RLS, auth, seed, parsers, integrations, matching, and API routes. Person A owns **all** consumer UI, the design system, mascot, and the Realtime DM client.

### §4 (CLAUDE.md core features) → owner

| CLAUDE.md §4 feature | Owner |
|---|---|
| Onboarding (offer letter, Spotify, Maps Takeout) | **A12** guided-flow UI / **B** parsers (B6) + Composio (B5) + auth (B3); routes §4.6 |
| Live housing negotiation (HERO) | **B** (B10, end-to-end) |
| Taste-matched events feed (Flyway) | **JOINT split by layer:** UI **A** (A4), ranking **B** (`/api/feed`, B7) |
| Sublet/listing shortlist (perches) | **A** UI (A5) / **B** listings data (B1/B4) |
| Life-map | **A** render (A9) / **B** places pipeline (B9) |
| Community map stickers | **A** UI (A9) / **B** schema+RLS (B1/B2) - positive only |
| First-week itinerary (landing) | **B** `/api/itinerary` (B8) / **A13** landing screen renders |
| Peer connection (find your flock) - CONNECTION HERO | **JOINT** (A7/A10 × B11) - see §7 |
| Past-intern notes / Q&A | **A** UI (A4) / **B** notes data (B1/B4) |
| Verified badge (banded) | **A** badge UI (A6) / **B** flag logic (B3) |
| Pre-move checklist (pre-flight) | **A** UI (A6) / **B** checklist_items data (B1) |

### §8 (CLAUDE.md non-framework work-items) → owner

| CLAUDE.md §8 work-item | Owner |
|---|---|
| Offer-letter PDF parsing | **B** (B6) |
| Google Maps Takeout parsing (recurring places, pre-loaded sample) | **B** (B6/B9) |
| Supabase RLS policies (security-critical) | **B** (B2) |
| Secret management + rate-limit LLM endpoints | **B** (B12) |
| Seed data (interns, listings, stickers, messages…) | **B** (B4) |
| Demo rehearsal (actual hardware/network) | **both** (joint dry-run) |
| Cold-start → density-first seeding | **B** (B4 seed) |
| Verification (banded) - seeded for demo | **B** (B3) |
| Safety stickers → positive-only decision | **A** UI enforces / **B** schema `CHECK` enforces |

---

## 9. Integration Checkpoints + Merge Cadence

- **Foundation merge (end of Day-1):** §6 items 1-6 merged to `main`. Gate: app boots on the scaffold, tokens present, `.env.example` complete, one migration applied, preview deploy live. Branches diverge only after this.
- **Contract amendments:** any change to a §2 table name/shape, a §3 token name/hex, or a §4/§5 API shape is a PR into THIS file reviewed by both - never a silent code change. Code that drifts from this doc is a bug.
- **Seam checkpoint - matches shape (mid-sprint):** B publishes a stub `GET /api/matches` returning the frozen `Match` shape (§4.2) with seed data early, so A7/A10 can build the discovery card + "message now" against real JSON before B's ranking is final.
- **Seam checkpoint - DM RLS (before any live DM demo):** B confirms participant-locked RLS on `messages`/`conversations` is deployed; A wires the subscription only against RLS-protected tables. Hard gate: no live DM demo without this.
- **API stubs first:** every §4 route ships as a typed stub returning the frozen shape (from seed) before its real logic lands, so A never blocks on B's intelligence work.
- **Regular cadence:** rebase feature branches on `main` frequently; merge each completed vertical (with its migration/seed) to `main` behind the stable contract; keep preview deploys green.
- **Pre-demo:** joint rehearsal on the actual presentation hardware/network; poke the Supabase project so it isn't idle-paused; both heroes exercised live end-to-end.

---

## 10. Bird-Word Glossary

Theme rides alongside plain meaning - bird words never cost clarity; subtitle where needed.

| Bird word | Plain meaning |
|---|---|
| **perches** | Sublets / short-term listings that fit a ~10-week internship (the Stories shortlist tray). |
| **flock** | Your people - other interns at your company / in your city, moving the same time, similar taste (peer discovery + DMs). |
| **flyway** | The taste-matched events feed - the migratory route of things to do, ranked to your taste. |
| **banded** | Verified - a bird is "banded" when tagged/identified; here it's the trust badge on a confirmed intern (seeded for the demo). |
| **pre-flight** | The pre-move checklist - everything to handle before you leave the nest. |
| **landing** | The first-week itinerary - the plan for the days right after you arrive. |

---

## 11. Round 2 - Feature Additions (2026-07-16)

The v1 app shipped and merged to `main`. Round 2 extends it. Same split and same rules: Person B owns every table, RLS policy, API route, background job, and third-party integration; Person A owns every consumer-facing surface. New frozen types are added to `lib/types/contract.ts` in the same PR that changes this section. Read this section for the WHAT-WE-SHARE of round 2; read the per-person round-2 plans for the HOW.

### 11.1 New user type: interns vs subletters
- `users` gains: `user_type text not null default 'intern' check (user_type in ('intern','subletter'))`.
- Interns browse, swipe, and review. Subletters post listings and answer "still available?" pings. A user is one or the other for the demo.
- B: migration + RLS so a subletter may `insert`/`update` only their own `listings`; only an intern (`user_type='intern'`) may write a `review`. A: a "post a sublease" surface for subletter accounts; render `user_type` where relevant.

### 11.2 Listings: auto-sourcing + freshness
Auto-source sublets in the area instead of manual entry. Design in `docs/SOURCING-PROPOSAL.md` (B owns).
- `listings` gains:
  - `status text not null default 'available' check (status in ('available','pending','taken','stale'))`
  - `expires_at timestamptz` (sourced listings expire after N days without a confirm)
  - `last_confirmed_at timestamptz`
  - `sourced boolean not null default false` (true = auto-sourced, false = subletter-posted)
  - `source_name text` (adapter name, e.g. `seed-adapter`, or `subletter`)
  - `source_url text`
  - `external_id text` (adapter-native id for de-dupe; `unique (source_name, external_id)`)
- B owns: the sourcing pipeline (adapter interface + a seed/mock adapter for the demo), the freshness state machine, the expiry job, and the "still available?" ping dispatch. A owns: status badges (available / pending / taken / stale) and the subletter confirm/relist UI.

### 11.3 Perches become a swipe deck (Tinder-style)
The perches surface changes from a saved-shortlist tray to a swipe deck of fresh listings; swipe right to save/interested, left to pass; tap to see full details.
- API:
  - `GET /api/perches` -> a ranked deck of FRESH listings (`status='available'`, not expired, excluding already-swiped), each enriched with a review summary and host. Returns `PerchDeckResponse` (§11.8).
  - `POST /api/perches/swipe { listingId, direction }` -> records a swipe; `right` = interested/saved. Idempotent per `(user, listing)`.
  - `GET /api/perches/saved` -> the user's right-swiped listings (the shortlist tray that remains, now populated by right-swipes).
- New table `listing_swipes`: `id`, `user_id` fk users, `listing_id` fk listings, `direction text check (direction in ('left','right'))`, `created_at`; `unique (user_id, listing_id)`. RLS: fully scoped to `user_id = auth.uid()`.
- A: the swipe deck UI (drag left/right + buttons, a detail sheet on tap) and the saved tray. B: the three routes + the swipe table.

### 11.4 Subletter posting
- `POST /api/listings` (subletter only) -> create a sublease. Body `PostListingInput` (§11.8). Server sets `sourced=false`, `source_name='subletter'`, `status='available'`, and an initial `expires_at`.
- `POST /api/listings/{id}/confirm` -> the subletter confirms still-available: sets `last_confirmed_at=now()`, `status='available'`, bumps `expires_at`. This is the ping response.
- A: the post-a-sublease form (subletter accounts only) and the confirm/relist affordance. B: the routes + validation + owner-only RLS.

### 11.5 Reviews (Airbnb-style)
- New table `reviews`: `id`, `subject_type text check (subject_type in ('listing','subletter'))`, `subject_id uuid`, `reviewer_id uuid fk users`, `rating int check (rating between 1 and 5)`, `body text`, `created_at`; `unique (subject_type, subject_id, reviewer_id)` (one review per subject per reviewer).
- RLS: any authenticated user reads; a reviewer writes/updates/deletes only their own (`reviewer_id = auth.uid()`); only interns may write.
- API:
  - `GET /api/reviews?subjectType=&subjectId=` -> `ReviewsResponse { reviews, summary: { avgRating, count } }` (§11.8).
  - `POST /api/reviews { subjectType, subjectId, rating, body }` -> creates or updates the caller's review for that subject.
- A: a review composer (star rating + text) and review lists on the perch detail sheet and on a subletter's profile; show `avgRating` + `count` as a rating badge.

### 11.6 Events: Ticketmaster nearby events + intern attendance count
- `events` gains: `external_id text` (Ticketmaster id; `unique (source, external_id)`), `url text`, `venue text`, `image_url text`, `price_range text`.
- New table `event_attendance`: `id`, `event_id uuid fk events`, `user_id uuid fk users`, `status text check (status in ('going','interested')) default 'going'`, `created_at`; `unique (event_id, user_id)`. RLS: any authed reads the aggregate count; a user writes only their own row.
- B: Ticketmaster Discovery API integration (server-side, keyed, rate-limited) that upserts nearby events into `events` (de-dupe on `external_id`), with a fallback to seeded events when no key/quota; plus attendance-count aggregation.
- API changes:
  - `GET /api/feed`: `FeedItem.event` gains nullable `venue`, `url`, `imageUrl`, `priceRange`; `FeedItem` gains `internsGoing: number` and `viewerGoing: boolean`.
  - `POST /api/events/{id}/attend { status }` (status `'going' | 'interested' | null`) -> toggles the caller's attendance; returns `AttendResponse { internsGoing, viewerGoing }`.
  - `GET /api/events/nearby?lat=&lng=&radius=` -> Ticketmaster-sourced events (the feed can call this internally).
- A: the event card shows venue + image + "N interns going" and a Going toggle (optimistic count update); map event pins (§11.7).

### 11.7 Map icons (Google-Maps style) + event pins
- No schema change. B ensures every mappable row exposes a `kind`/`category` the UI maps to an icon: places (`Place.kind`), stickers (`StickerCategory`), events (`events.category`), listings (a coarse `kind`).
- A: replace generic pins with a category icon marker set (Google-Maps-like) for places, stickers, events, and listings; add a legend; clustering optional. Event pins open the event card.

### 11.8 Tappable profiles
- New route `GET /api/users/{id}` -> `PublicProfile` (§11.8 types) with public fields only (no private data), `user_type`, `banded`, and a `reviewSummary` for subletters.
- A: any avatar or name anywhere (feed, discovery, DMs, reviews, a perch's host) is tappable and routes to `app/(shell)/profile/[id]`. A subletter's profile shows their listings + review summary; an intern's profile shows the existing profile.

### 11.9 Offer parser hardening (OCR + broader formats + manual correction)
The v1 parser is heuristic on one clean PDF format. Real letters vary; some are scanned images needing OCR.
- `OfferParse` gains: `confidence: Record<OfferField, number>` (0..1 per field) and `needsReview: OfferField[]` (fields below a confidence threshold). No number is ever invented; low-confidence fields come back flagged.
- B: broaden extraction beyond the one clean format; add OCR for scanned/image PDFs behind a server flag; return `confidence` + `needsReview` from `POST /api/parse/offer`.
- A: the onboarding OfferStep renders parsed fields, highlights `needsReview` ones, and lets the intern manually correct any field before continuing (the manual-correction fallback). Corrected values are what proceed.

### 11.10 Frozen round-2 types (added to `lib/types/contract.ts` in the same PR)
```ts
export type UserType = "intern" | "subletter";
export type ListingStatus = "available" | "pending" | "taken" | "stale";

// Reviews
export type ReviewSubject = "listing" | "subletter";
export type Review = {
  id: string;
  subjectType: ReviewSubject;
  subjectId: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string; // ISO
};
export type ReviewSummary = { avgRating: number; count: number };
export type ReviewsResponse = { reviews: Review[]; summary: ReviewSummary };

// Perches swipe deck
export type PerchCard = ListingRow & {
  status: ListingStatus;
  expiresAt: string | null;
  lastConfirmedAt: string | null;
  sourced: boolean;
  sourceName: string;
  reviewSummary: ReviewSummary;
  host: { id: string; name: string; avatarUrl: string | null } | null;
};
export type PerchDeckResponse = { deck: PerchCard[] };
export type SwipeDirection = "left" | "right";
export type SwipeInput = { listingId: string; direction: SwipeDirection };

// Subletter posting
export type PostListingInput = {
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;          // USD/mo
  leaseStart: string;     // ISO date
  leaseEnd: string;       // ISO date
  leaseType: "sublet" | "short_term" | "standard";
  photos: string[];
  safetyNotes?: string[];
};

// Events + attendance
export type AttendanceStatus = "going" | "interested";
export type AttendResponse = { internsGoing: number; viewerGoing: boolean };
// FeedItem.event additions (nullable): venue, url, imageUrl, priceRange
// FeedItem additions: internsGoing: number; viewerGoing: boolean

// Offer parser
export type OfferField = "employer" | "role" | "salary" | "startDate" | "endDate" | "city";
// OfferParse additions: confidence: Record<OfferField, number>; needsReview: OfferField[];

// Tappable profile
export type PublicProfile = {
  user: { id: string; name: string; role: string; city: string; company: string; avatarUrl: string | null };
  userType: UserType;
  banded: boolean;
  reviewSummary?: ReviewSummary; // present for subletters
};
```

### 11.11 Ownership map (round 2)
| Feature | Person A (consumer UI) | Person B (data / API / integration) |
|---|---|---|
| Auto-sourced sublets + freshness | status badges, subletter confirm/relist UI | sourcing pipeline + adapter, freshness job, ping dispatch (SOURCING-PROPOSAL.md) |
| Perches swipe deck (Tinder-style) | swipe deck UI (drag + buttons + detail sheet), saved tray | `GET /api/perches`, `POST /api/perches/swipe`, `GET /api/perches/saved`, `listing_swipes` |
| Subletter posting | post-a-sublease form (subletter accounts) | `POST /api/listings`, `POST /api/listings/{id}/confirm`, `user_type`, validation |
| Reviews (Airbnb-style) | review composer + lists + rating badges | `reviews` table + RLS + `GET`/`POST /api/reviews` |
| Ticketmaster events | event card (venue/image), map event pins | Ticketmaster integration, `events` upsert, `GET /api/events/nearby` |
| Event attendance count | Going toggle + "N interns going" | `event_attendance` table + counts + `POST /api/events/{id}/attend` |
| Offer parser hardening | manual-correction UI in OfferStep | OCR + broader formats + `confidence`/`needsReview` |
| Map icons (Google-Maps style) | icon marker set + legend + clustering | expose `kind`/`category` per mappable row |
| Tappable profiles | make names/avatars tap to profile; subletter profile view | `GET /api/users/{id}` public profile |

### 11.12 Working agreements (round 2)
- Plain ASCII everywhere: docs and user-facing strings use no emojis and no em-dashes or en-dashes (use `-`, `:`, or reword). In prose use `-`; use `->` only inside code/spec.
- Every merge to `main` updates `README.md` (status + feature list) and `docs/PROGRESS.md` (mark the item done, dated).
- Contract-first: a new cross-person seam is added HERE before code, and `lib/types/contract.ts` mirrors it in the same PR. No silent drift.
- Freshness and trust: never surface a `taken`/`stale`/expired listing in the perches deck; expiry + confirm pings keep the deck honest.
- Reviews and sourcing carry real trust weight: seed reviews are clearly demo content, sourced listings are marked `sourced=true`, and no "avoid/unsafe" framing leaks into any surface (stickers stay positive-only).
