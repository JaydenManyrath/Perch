# 05 - Generate a stateless commute schedule

**What to build:** Turn an apartment selection and fully described favorite route places into a deterministic commute-anchored day without storing a commute plan or rebuilding Person C's route.

**Blocked by:** 04 - Return deterministic POIs along a commute route.

**Status:** done

- [x] Shared contract types include the frozen `CommuteScheduleInput` and `CommuteScheduleResponse` shapes and reuse the existing `ItineraryDay` type.
- [x] `POST /api/route/schedule` requires authentication, uses the shared rate limiter, and returns exactly `{ day: ItineraryDay }`.
- [x] The endpoint accepts `selectedPlaces` as complete RoutePoi place objects, not a replacement list of place IDs.
- [x] Every selected place is validated server-side for a non-empty ID, label, and kind plus finite latitude and longitude.
- [x] A missing apartment ID, malformed selected place, or non-array selection returns a client error without generating a partial schedule.
- [x] The existing deterministic itinerary engine is extended or reused so identical inputs produce identical dates, items, coordinates, and ordering.
- [x] The generated day meaningfully incorporates the validated selections rather than ignoring them.
- [x] The endpoint performs no Mapbox call, office geocoding, route construction, or external POI search.
- [x] No commute-plan table, persistence write, or undocumented save endpoint is added.
