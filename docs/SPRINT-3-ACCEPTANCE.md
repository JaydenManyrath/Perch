# Sprint 3 Integrated Acceptance

Run date: 2026-07-17

Status: PARTIAL. The release candidate is automated-green and its fixture browser flows pass except for real Mapbox marker clicks. No `NEXT_PUBLIC_MAPBOX_TOKEN` was configured, so that environment-dependent browser gate remains open. Round 3 is not yet merged to `main` and must not be described as published.

## Repeat the automated run

```sh
npm run verify:sprint3
```

This runs the named Sprint 3 suite, the full Vitest suite, typecheck, lint, and the production build in that order.

For the local database path, start Supabase and run:

```sh
npm run db:reset
eval "$(npx supabase status -o env 2>/dev/null)"
RLS_TEST_DATABASE_URL="$DB_URL" npm run rls:test
NEXT_PUBLIC_SUPABASE_URL="$API_URL" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" npm run seed
```

The variables above are scoped to the command shell. Do not write or commit the generated local credentials.

## Automated evidence

| Gate | Result |
| --- | --- |
| Focused events, parser, finance, booking, feed, listing, and map-payload suites | PASS: 19 of 19 files; 155 of 155 tests |
| Full Vitest suite | PASS: 46 passed and 1 skipped file (47 total); 325 passed and 1 skipped test (326 total). The skipped live-auth test is environment-gated |
| TypeScript | PASS: `tsc --noEmit` |
| Lint | PASS: no ESLint warnings or errors |
| Production build | PASS: 17 static pages plus dynamic routes |
| Local database reset | PASS: migrations 0001 through 0012 applied |
| RLS harness | PASS: 28 adversarial tests |
| Seed | PASS: idempotent Round 3 seed completed |

The build still emits the existing webpack warning for the dynamic dependency in `lib/parsers/ocr.ts`. Vitest also emits Vite's CJS Node API deprecation warning. Neither warning failed its gate.

## Browser evidence

The app was driven in a real headed browser against `http://127.0.0.1:3100` in the default fixture mode.

| Flow | Result and evidence |
| --- | --- |
| Event images | PASS: `/feed` rendered source images prominently; no-image behavior remains covered by the focused tests |
| Comprehensive listing | PASS: `/stories` showed furnished state, pros, bed/bath/sqft, amenities, utilities, host/reviews, and canonical affordability |
| Booking | PASS after integration repair: request -> subletter approval -> booker confirmation closed the sheet, changed the deck from 5 to 4, and removed the booked listing immediately |
| Roommate grouping | PASS: the seeded visible saved listing showed an incoming pending invite; Accept moved Alex into the confirmed roommate group |
| Canonical finance | PASS: onboarding, landing, and listing surfaces showed the same $145,000 salary, $102,319 take-home, $3,411 Seattle ceiling, and $6,024 upfront cash result |
| Grouped checklist | PASS: `/profile/{me}` rendered Travel, Logistics, Packing, and Admin groups with 12 total items and per-group progress |
| Percentage-free onboarding | PASS: onboarding used four step dots and `check this` review labels; no confidence percentage was shown |
| Resilient listing media | PASS: the deliberately unavailable L7 fixture photo rendered an intentional `Photo unavailable` card state without an upstream image request |
| Map fallback | PASS: `/map` rendered the explicit no-token message and life-map place/time context |
| Rich Mapbox marker sheets | NOT VERIFIED: no `NEXT_PUBLIC_MAPBOX_TOKEN` was present, so place, listing, event, comment, and sticker marker clicks could not be exercised in a real Mapbox canvas |

The six map-payload tests pass for place, listing, and event detail helpers, including optional-field fallbacks. Comment and sticker sheets were present in the integrated code and retained their existing behavior, but they were not promoted to browser-verified status.

The acceptance run also exposed integration regressions against finalization tickets 02, 03, and 07. The roommate fixture now exposes a real incoming invite, booking confirmation again removes the taken listing from the active deck, and unavailable listing media uses the documented fallback. Those repairs are recorded in their prerequisite tickets rather than treated as new acceptance scope.

## C0 and RC status

| Record | Verified status |
| --- | --- |
| C0 | Resolved: integrated seams reconciled before RC implementation |
| RC31 | Verified: upcoming-only Ticketmaster events and usable images |
| RC32 | Verified: relocation stipend and signing bonus extraction with confidence/review behavior |
| RC33 | Verified: one canonical cost-of-living seam with deterministic fallback and provenance |
| RC34 | Verified no-build decision: existing payloads are sufficient; no external place-details integration was added |

## Remaining release gate

Configure a valid public Mapbox token, rebuild so the public variable is embedded, open `/map`, and click one marker of each supported kind: place, listing, event, comment, and sticker. Confirm each marker-specific sheet and the listing path to comprehensive detail. Then update this report, README, and PROGRESS from PARTIAL to PASS before merging or publishing Round 3.
