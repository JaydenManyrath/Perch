# Perch - Person A (Experience & Social Shell) - local dev

Local-dev and demo guide for the `person-a` branch. Product context is in
[`../CLAUDE.md`](../CLAUDE.md), the shared frozen seams are in
[`FOUNDATION-CONTRACT.md`](FOUNDATION-CONTRACT.md), and the work-package plan is
in [`IMPLEMENTATION-PERSON-A.md`](IMPLEMENTATION-PERSON-A.md).

## Run it

```bash
npm install
cp .env.local.example .env.local   # fill in Mapbox token if you have one
npm run dev
```

Open http://localhost:3000 (or whatever port Next picks).

## Verify

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run build       # next build
npm run test        # vitest - the reconcile-logic tests (Phase 4)
```

## Demo walkthrough (matches Phase 8 DoD in `IMPLEMENTATION-PERSON-A.md` §9)

1. **`/onboarding`** - Offer → Spotify → Takeout → Done. Chick lives in the
   waiting/celebration beats; parsed money/dates render clean.
2. **`/feed`** - the Flyway. Taste-ranked events with LLM `reason` chips, Q&A
   notes interleaved every 3rd item.
3. **`/stories`** - perches tray. Tap the `+` bubble to land a demo perch with
   the shared `LandInTray` motion primitive.
4. **`/profile/me`** - banded badge + toggleable pre-flight checklist (optimistic
   toggle with revert-on-error).
5. **`/map`** - Mapbox with a runtime baby-blue theme applied, life-map pins
   with the deterministic "N min from your usual coffee spot" chip, and
   **positive-only** community stickers (six categories, no avoid path exists).
6. **`/discovery`** - ranked match cards. Tap **Message now** → creates-or-opens
   a conversation → lands you in the composer-focused DM thread.
7. **`/dms/:conversationId`** - the live DM thread with optimistic send +
   reconcile. Under fixture mode the echo is simulated so the reconcile path
   still exercises.
8. **`/landing`** - first-week itinerary.

Dev pages: `/tokens` (every §3 swatch) and `/mascot-demo` (both variants; toggle
OS reduced-motion to see the still-pose fallback).

## Data source switch

`lib/data/source.ts` reads `NEXT_PUBLIC_DATA_SOURCE`:

- `fixture` (default) - rich local fixtures in `lib/fixtures/*` matching the
  frozen contract shapes exactly. Zero live keys needed.
- `live` - Person B's API routes + Supabase browser client. When a required env
  var (Supabase URL/anon, Mapbox token) is missing, the layer degrades back to
  the fixture - nothing crashes.

## To flip fully to `live`

The frontend is complete against fixtures. To wire live data:

1. **Supabase project + RLS deployed** (B1/B2/B3). Set
   `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
   The participant-locked RLS on `messages`/`conversations` is a **hard gate**
   before any real DM demo (contract §5).
2. **Person-B API routes shipped** (B4-B12) - `/api/feed`, `/api/matches`,
   `/api/itinerary`, `/api/map/places`, `/api/parse/offer`, `/api/parse/takeout`,
   `/api/composio/spotify/*`. Each returns the frozen shape defined in
   `lib/types/contract.ts` verbatim; drift is a contract violation.
3. **Mapbox token** - already set. Leave as-is.

Then set `NEXT_PUBLIC_DATA_SOURCE=live` and reload. No component code changes.

## Shared exports (stable for Person B)

- **`<Mascot variant="idle" | "hop">`** - `components/mascot/Mascot.tsx`.
  Person B drops this into the negotiation "working" state.
- **`<LandInTray>` + `landInTrayVariants` + `useLandInTray()`** -
  `components/motion/LandInTray.tsx`. Person B uses this on the negotiation
  results screen when each per-listing verdict "lands".
- **Design tokens** - every §3 name+hex lives in `tailwind.config.ts`. Person B
  writes classes like `bg-sky-200 text-ink-strong text-func-pass` and they
  render.

Any change to any of the three above requires a contract amendment (edit
[`FOUNDATION-CONTRACT.md`](FOUNDATION-CONTRACT.md) first, both reviewers).

## Layout

```
app/
  (shell)/                     # authenticated shell (SideRail + BottomNav)
    feed/         page.tsx     # A4 - Flyway
    stories/      page.tsx     # A5 - perches tray + LandInTray
    map/          page.tsx     # A9 - Mapbox + positive stickers
    dms/          page.tsx     # A8 - conversation list
    dms/[conversationId]/page.tsx  # A8 - live thread
    profile/[id]/ page.tsx     # A6 - banded + pre-flight
    discovery/    page.tsx     # A7+A10 - match cards → Message now
    landing/      page.tsx     # A13 - first-week itinerary
    layout.tsx                 # A3 - IG-shaped nav chrome
    <route>/loading.tsx        # matching-shape skeleton per surface
  onboarding/                  # A12 - chick-guided pre-shell flow
    page.tsx                   # step router
    _steps/{Offer,Spotify,Takeout,Done}Step.tsx
  tokens/       page.tsx       # dev - swatches for every §3 token
  mascot-demo/  page.tsx       # dev - both mascot variants + reduced-motion note
  error.tsx                    # global error boundary (friendly chick landing)

components/
  ui/                          # Button, Card, Avatar, Badge, BandedBadge,
                               #   Chip, Sheet, Checkbox, Skeleton, EmptyState
  mascot/Mascot.tsx            # A2 - shared with B
  motion/LandInTray.tsx        # A5 - shared with B
  shell/{BottomNav,SideRail,TopBar,BrandMark,nav-items}.tsx
  feed/ stories/ profile/ discovery/ dms/ map/ onboarding/ landing/

lib/
  supabase/{client,server}.ts
  data/source.ts               # fixture|live switch
  fixtures/*                   # frozen-shape seed data
  hooks/
    reconcile.{ts,test.ts}     # TDD'd optimistic-send + Realtime reconcile
    useRealtimeMessages.ts     # subscribes + sends + reconciles
    useConversation.ts         # createOrOpen under participant RLS
  types/contract.ts            # verbatim FROZEN types from §4/§5/§4.6
  env.ts utils.ts

styles/mascot-keyframes.css    # motion loops gated on prefers-reduced-motion
public/mascot/*.svg            # recolored SVGs (baby-blue per §3)
```

## Security

- Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MAPBOX_TOKEN` are ever
  client-visible. **Never** `NEXT_PUBLIC_` a service-role, OpenAI, or Composio
  key - those live server-side and belong to Person B (B12).
- `.env.local` is gitignored; `.env.local.example` is committed as the setup
  template.
- Stickers are **positive-only**, enforced in the UI at
  `components/map/sticker-catalog.ts` (built from `POSITIVE_STICKER_CATEGORIES`
  in the contract) and backstopped by Person B's DB `CHECK` constraint on
  `stickers.category`.
