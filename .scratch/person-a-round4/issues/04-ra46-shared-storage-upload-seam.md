# 04 - RA46 shared Storage upload seam plus listing and avatar UI

**What to build:** Give authenticated users one shared, fixture-safe upload experience that stores listing photos and profile avatars in Supabase Storage and renders the resulting public or signed URLs in the existing UI.

**Blocked by:** 01 - RA41-RA42 SSR session and auth flow.

**Person B dependencies:** RB41 must provide the hosted project, RB42 must provide appropriate seeded intern and subletter accounts, and RB46 must provide the hosted buckets and owner-write policies.

**Person A boundary:** Consume the buckets and access behavior Person B provides. Do not create buckets, alter Storage policies, push storage migrations, seed users, or handle a service-role key.

**Status:** ready-for-agent

- [ ] Listing-photo and profile-avatar flows use one shared client upload seam with consistent progress, success, and failure behavior.
- [ ] A signed-in subletter can upload a listing photo and see the stored image in the listing experience.
- [ ] A signed-in user can upload an avatar and see the stored image in the profile experience.
- [ ] Stored objects are addressed through the public or signed URL behavior established by Person B's bucket policy, without browser-side elevated credentials.
- [ ] Missing Storage configuration or an upload failure leaves the listing and profile experiences usable through their existing fixture or placeholder behavior.
- [ ] Tests cover successful URL propagation and graceful upload failure for both consumers.
- [ ] Hosted verification confirms owner-authorized uploads succeed and does not modify or independently test-fix Person B's policies.

