# 04 - Return deterministic POIs along a commute route

**What to build:** Let an authenticated Intern submit commute geometry and receive their relevant places plus Person C candidates that actually lie near the route, without Person B performing geocoding, route construction, or external POI search.

**Blocked by:** None - can start immediately against the frozen Person C server-module seam.

**Status:** done

- [x] Shared contract types include the frozen GeoJSON line, route input and response, route-POI search input, RoutePoi, and `RoutePoisResponse` shapes used by Persons A, B, and C.
- [x] `POST /api/route/pois` requires authentication, uses the shared rate limiter, and returns exactly `{ pois: RoutePoi[] }`.
- [x] The route validates a LineString with usable finite coordinate pairs and validates the requested kinds before doing any work.
- [x] The route obtains the authenticated Intern's Round 1 places and calls Person C's server-only `searchRoutePoiCandidates` seam using only geometry and kinds.
- [x] Tests replace the Person C seam with a fake provider and prove that Person B does not call Mapbox, geocode an office, or construct a route.
- [x] Candidate places and Round 1 places are merged and deduplicated by stable identity before distance filtering.
- [x] Point-to-polyline distance is deterministic, includes points inside the configured route corridor, excludes points outside it, and handles a multi-segment line rather than only its endpoints.
- [x] Every returned POI includes its validated place object and deterministic `distanceFromRouteMeters` value.
- [x] Equal-distance output uses a stable tie-break so repeated requests with identical inputs return identical ordering.
- [x] Invalid geometry, coordinates, or kinds return a client error and never invoke the Person C candidate function.
