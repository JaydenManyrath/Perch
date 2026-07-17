# Perch Round 4 - Implementation Plan: PERSON A (client, auth session, deploy)

Mission: take the fixture-first client to a real, logged-in, deployed app. Own the SSR auth
session (middleware), the login/logout/protected-route flow, the fixture-to-live flip on every
consumer surface, live Realtime DMs, the Mapbox + Storage upload client paths, and the Vercel
deploy. Person B provides the hosted database, seeded users, and server routes; you make the
browser use them without ever breaking a screen.

Branch: round4-person-a (restart from main). Boundary with B: you own everything the browser
and the Next middleware touch; B owns the hosted DB, migrations, seed, server env, and RLS.
When you need a seeded user or a server shape, B provides it - do not seed or migrate yourself.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 14 (env contract, the
fixture-to-live boundary, the session seam, the ownership map); docs/IMPLEMENTATION-PERSON-B-ROUND4.md
(what B hands you); docs/SECRETS.md; docs/PROGRESS.md (RA41..RA47); the shipped code you extend
(lib/data/source.ts, lib/supabase/{client,server}.ts, lib/env.ts, app/login/page.tsx, the shell).

Working agreements (14.6): plain ASCII; update README + PROGRESS every merge; NEVER put a secret
behind NEXT_PUBLIC_; the graceful fixture fallback is non-negotiable (a missing key must never
break a screen).

## 1. Scope - what Person A owns in Round 4

- RA41 SSR session middleware. Add `middleware.ts` at the repo root using
  `@supabase/ssr` `createServerClient` to refresh the auth session on every request and write
  refreshed cookies back on the response. A `matcher` excludes static assets, images, and
  `_next`. Without this, live sessions go stale on navigation and `getCallerId()` (B) sees no
  user. Fixture-safe: no-op when Supabase env is absent.
- RA42 Auth flow hardening. `/login` persists a real session (already uses
  `signInWithPassword` on the seeded demo accounts). Add: a sign-out action (clears the session,
  redirects to `/login`); redirect unauthenticated users off protected shell routes to `/login`
  (and authed users off `/login` to `/feed`); a small client hook/context exposing the current
  user id + userType from the live session. Keep the demo-account picker.
- RA43 Fixture-to-live flip. Walk every getter in `lib/data/source.ts`: confirm that with
  `NEXT_PUBLIC_DATA_SOURCE=live` it hits the real route/Supabase, and on any error or missing
  config falls back to the fixture (contract 14.2). Surface `currentMode()` in a dev-only badge.
  Remove any lingering fixture-only assumptions (hard-coded ME_ID where the live session id
  should be used).
- RA44 Realtime DMs live. Verify the `messages` subscription in the DM UI works against the
  hosted project (a message inserted by one user appears live for the other), reusing the
  existing optimistic reconcile. Graceful no-op when `getSupabaseBrowser()` is null.
- RA45 Mapbox live token. Wire `NEXT_PUBLIC_MAPBOX_TOKEN` so the map renders real tiles; keep
  the existing placeholder/fallback when the token is absent. No secret exposure (this token is
  PUBLIC by design).
- RA46 Storage upload UI. Listing photos (subletter post form) and profile avatar upload to the
  Supabase Storage bucket B provisions; render via public/signed URLs. Fixture fallback keeps the
  form working with no bucket.
- RA47 Vercel deploy. Connect the repo to Vercel (per-branch preview URLs), coordinate with B on
  the env vars (B supplies the server-secret values; you own the repo-to-Vercel connection and the
  PUBLIC vars). Smoke the deployed preview: login, feed, map, a booking, a DM.

### NOT yours
- Person B: creating/linking the Supabase project, pushing migrations, seeding, the server env
  secret values, Storage bucket policies, and the live RLS verification. You CONSUME the seeded
  users and the project URL + anon key; you never run the service-role key in the browser.

## 2. Repo additions
```
middleware.ts                         # RA41 SSR session refresh (+ matcher)
lib/auth/session.ts (or a hook)       # RA42 current-user context from the live session
components/auth/SignOutButton.tsx     # RA42
app/login/page.tsx                    # RA42 extend (sign-out + redirects live)
lib/data/source.ts                    # RA43 audit every getter for the live path + fallback
components/post/PostListingForm.tsx   # RA46 photo upload to Storage
components/profile/*                   # RA46 avatar upload
```
No new secrets. Keep .env.example unchanged (B owns it); only ever read NEXT_PUBLIC_ values client-side.

## 3. Build phases (commit after each; update PROGRESS + README each merge)
- Phase R4A-1 Middleware + auth flow (RA41/RA42): add middleware, sign-out, redirects, the
  current-user hook. Acceptance: after B seeds, logging in as intern0 sets a session that
  survives navigation; sign-out clears it; protected routes bounce anonymous users.
- Phase R4A-2 Live flip (RA43/RA44/RA45): audit every source getter for live + fallback; verify
  Realtime DMs and the Mapbox token live. Acceptance: with DATA_SOURCE=live every surface loads
  from Supabase and degrades to fixture on a forced error; a DM appears live across two sessions.
- Phase R4A-3 Storage + deploy (RA46/RA47): wire photo/avatar upload; connect Vercel; smoke the
  preview URL. Acceptance: a subletter uploads a photo that renders from Storage; the deployed
  preview passes login + feed + map + booking + DM.

## 4. Definition of done + demo checklist
Done when: middleware keeps a live session fresh across navigation; login/logout + protected
routes work against the hosted project; every consumer surface reads live with a graceful
fixture fallback; Realtime DMs are live; the map renders with the real token; photo/avatar
upload round-trips through Storage; a Vercel preview URL runs the full flow. README + PROGRESS
updated. Demo: sign in as two different seeded users in two browsers, send a DM live, request a
booking, and open the deployed preview URL.

## 5. Integration checkpoints
- With B (FIRST): you cannot test live login until B has linked + migrated + seeded the hosted
  project and handed you the URL + anon key. Block RA42's live acceptance on that.
- With B (session): confirm `getCallerId()` sees your session (a guarded route returns your data,
  not a 401) once middleware is in - this is the A/B handshake.
- With B (deploy): B provides the server-secret env values for Vercel; you own the connection and
  the PUBLIC vars. Every merge to main: update README + PROGRESS.
