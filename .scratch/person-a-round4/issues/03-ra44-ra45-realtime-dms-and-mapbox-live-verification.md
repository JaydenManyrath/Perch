# 03 - RA44-RA45 Realtime DMs and Mapbox live verification

**What to build:** Let two authenticated people exchange a DM that appears immediately in both sessions, and render the real Mapbox experience when its public token is configured while retaining both existing fallbacks.

**Blocked by:** 01 - RA41-RA42 SSR session and auth flow.

**Person B dependencies:** RB41 and RB42 must provide the hosted conversations, messages, and seeded users; RB44 must prove live message isolation; and RB45 must support the authenticated message path. Mapbox public-token configuration remains Person A-owned.

**Person A boundary:** Consume Person B's hosted Realtime and guarded message seams. Do not create the project, seed the two users, alter message RLS, push migrations, or use service-role credentials.

**Status:** ready-for-agent

- [ ] Two different seeded users can open the same conversation in separate browser sessions and receive a newly sent message without refreshing.
- [ ] Optimistic sending reconciles with the Realtime event without duplicate messages, lost messages, or unstable ordering.
- [ ] Realtime subscription setup and teardown are scoped to the authenticated conversation and remain a safe no-op when the browser Supabase client is unavailable.
- [ ] The map renders real Mapbox tiles and the existing interactive marker experience when the configured public token is present.
- [ ] The existing map placeholder remains usable when the token is absent or Mapbox cannot load.
- [ ] Client configuration exposes only the intentionally public Mapbox and Supabase values; no server secret is added to the browser bundle.
- [ ] Hosted verification records the two-user DM result and the real Mapbox marker interaction that remained open after Round 3.

