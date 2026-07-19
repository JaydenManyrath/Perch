# 02 - RA43 fixture-to-live data boundary audit

**What to build:** Make every existing consumer surface use live data when live mode is configured while preserving the complete fixture experience whenever configuration is missing or a live request fails.

**Blocked by:** 01 - RA41-RA42 SSR session and auth flow.

**Person B dependencies:** RB41 must provide the hosted schema, RB42 must provide representative live data, and RB45 must provide authenticated server routes with the frozen response shapes. Person B remains responsible for server implementation and live authorization.

**Person A boundary:** Audit and consume the existing live seams only. Do not create the hosted project, push or alter migrations, seed users, bypass guarded routes, or use service-role credentials in the browser.

**Status:** needs-info

- [x] Every data-source getter is accounted for and uses its real route or Supabase source when live mode is selected.
- [x] Every getter returns its established fixture result when live configuration is missing, a request fails, or a live response cannot be used, without leaving a broken screen.
- [x] Live requests that depend on user identity use the authenticated session from ticket 01 instead of a hard-coded fixture user.
- [x] Existing frozen contract shapes remain unchanged across live and fixture results.
- [x] A development-only mode indicator makes the active live or fixture source visible without appearing in production.
- [x] Automated coverage exercises representative live success, missing-configuration, and forced-error fallback paths.
- [ ] A hosted pass records which consumer surfaces were exercised after RB41, RB42, and RB45 become available.

## Comments

### 2026-07-18 - implementation and non-hosted verification

- Getter inventory is enforced by `DATA_SOURCE_GETTER_AUDIT` and its automated test.
- Live route results are shape-checked before use. Missing configuration, thrown requests, unusable JSON, and Supabase query errors restore the fixture result.
- Server-rendered consumers use the cookie-bound Supabase client and forward the request cookie to existing authenticated API routes. Client identity comes from ticket 01's current-user context.
- Fixture smoke: `/feed`, `/map`, `/stories`, `/dms`, `/profile/me`, `/friends`, `/post`, `/landing`, and `/discovery` each returned HTTP 200 with no `.env.local`.
- Automated evidence: 350 tests passed with the one opt-in hosted auth test skipped; typecheck, lint, and production build passed. The existing dynamic OCR dependency warning remains.

Hosted status: NOT RUN. This checkout has no `.env.local`, and Person B's Round 4 handoff records that no hosted Supabase credentials were provided. No hosted consumer surface is claimed as exercised. Once RB41, RB42, and RB45 are hosted, exercise and record: feed, discovery, perches/saved perches, map places/listings/events/stickers/comments, profile/checklist, friends/requests/notes, bookings, finance, itinerary, listing detail/posting, and DMs under two authenticated users.
