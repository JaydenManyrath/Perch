# 01 - RA41-RA42 SSR session and auth flow

**What to build:** Give people a real Supabase login session that stays current across navigation, protects the signed-in app, supports sign-out, and exposes the authenticated user to client surfaces without breaking fixture mode.

**Blocked by:** None - can start immediately.

**Person B dependencies:** RB41 must provide the migrated hosted project, RB42 must provide the seeded demo users and frozen password scheme, and RB45 must complete the joint cookie-to-`auth.uid()` handshake for guarded routes. These dependencies gate hosted acceptance, not fixture-safe implementation.

**Person A boundary:** Consume the hosted project URL, anon key, and seeded users supplied by Person B. Do not create or link a Supabase project, push migrations, seed users, handle a service-role key, or change server-owned authorization.

**Status:** ready-for-agent

- [ ] SSR request handling refreshes the Supabase session, returns refreshed cookies, and excludes static assets and framework image assets from unnecessary matching.
- [ ] Missing Supabase configuration makes session refresh a safe no-op so fixture mode continues to work.
- [ ] A seeded demo user can sign in, retain the session across protected-page navigation, and reach the signed-in app.
- [ ] An authenticated user is redirected away from the login screen, while an anonymous user is redirected away from protected app surfaces.
- [ ] Sign-out clears the session and returns the user to the login screen.
- [ ] Client surfaces can read the current authenticated user id and user type without relying on a hard-coded fixture identity.
- [ ] After RB45 is available, a guarded route recognizes the refreshed session as the same `auth.uid()` and returns 401 for an anonymous request.

