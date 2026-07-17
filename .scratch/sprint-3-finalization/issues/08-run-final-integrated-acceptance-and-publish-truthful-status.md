# 08 - Run final integrated acceptance and publish truthful status

**What to build:** Sprint 3 finishes with a repeatable integrated acceptance run and documentation that records verified behavior rather than planned or branch-local status.

**Blocked by:** 01 - Restore event images across fixture and live feeds; 02 - Complete roommate invite acceptance; 03 - Remove booked listings from active discovery; 04 - Unify onboarding and listing finance; 05 - Use canonical affordability in negotiation; 06 - Complete rich sheets for every map marker; 07 - Restore Round 3 UI working-agreement compliance.

**Status:** partial - Mapbox browser verification remains open

- [x] Focused events, parser, finance, booking, feed, listing, and map-payload tests pass.
- [x] The full test suite, typecheck, lint, and production build pass, with actual totals recorded.
- [x] Local database reset, RLS tests, and seed pass when local Supabase is available.
- [ ] Real-browser acceptance covers event images, comprehensive listing detail, booking request/approval/confirmation, roommate acceptance/grouping, finance, grouped checklist, percentage-free onboarding, and every rich map-marker sheet.
- [x] README and PROGRESS describe the verified Sprint 3 result and no longer repeat stale planned or branch-local claims.
- [x] C0 and RC31 through RC34 records are tracked and their statuses match the implemented, verified result.
- [x] The final acceptance report records any environment-dependent verification, including the Mapbox configuration used for marker flows.

Verification evidence and the remaining Mapbox gate are recorded in `docs/SPRINT-3-ACCEPTANCE.md`.
