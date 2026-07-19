# 05 - RA47 hosted integration acceptance, Vercel deploy, docs, and smoke test

**What to build:** Publish a Vercel preview of the existing Perch experience against the hosted backend, prove the complete signed-in demo path works there, and record accurate deployment and fallback evidence for the team.

**Blocked by:** 01 - RA41-RA42 SSR session and auth flow; 02 - RA43 fixture-to-live data boundary audit; 03 - RA44-RA45 Realtime DMs and Mapbox live verification; 04 - RA46 shared Storage upload seam plus listing and avatar UI.

**Person B dependencies:** RB41-RB47 must be available: hosted provisioning and migrations, idempotent seed users and data, server-only environment configuration, live RLS evidence, authenticated guarded routes, Storage buckets and policies, and verified kill switches and rate limits. RB45 is the joint session handshake and RB46 is the joint upload handshake.

**Person A boundary:** Own the repository-to-Vercel connection, preview deployment, public environment values, browser acceptance, and client-facing documentation. Person B must enter or otherwise manage server-secret values; Person A must not receive or handle the service-role key, create projects, push migrations, seed users, alter Storage policies, or weaken live authorization.

**Status:** ready-for-agent

- [ ] The repository is connected to Vercel and produces a working preview URL for the Round 4 branch.
- [ ] Public live-data, Supabase, and Mapbox values are configured for the preview; Person B confirms server-only values are present without exposing their values to Person A or the client bundle.
- [ ] The deployed preview passes login, protected navigation, sign-out, feed, map, booking, and live-data fallback checks.
- [ ] Two seeded users complete the deployed Realtime DM flow without duplicate optimistic messages.
- [ ] Listing-photo and avatar uploads round-trip through hosted Storage and render from the deployed preview.
- [ ] The joint session check proves guarded routes resolve the logged-in caller, and Person B's RLS evidence proves the second user remains isolated.
- [ ] The deployed app remains usable when optional live integrations are disabled or unavailable, consistent with Person B's RB47 evidence and the fixture fallback contract.
- [ ] The README and progress tracker record the preview, completed checks, unresolved checks, and Round 4 ownership boundaries in plain ASCII without claiming unperformed verification.
- [ ] No product feature, contract-shape change, migration, seed path, Storage-policy change, or service-role handling is added by Person A.

