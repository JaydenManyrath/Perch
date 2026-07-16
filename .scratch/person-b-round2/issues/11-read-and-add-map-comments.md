# 11 - Read and add Map Comments inside a viewport

**What to build:** Let an Intern read located Map Comments inside the visible map bounds and add a new comment at an exact coordinate without inventing a city label.

**Blocked by:** 03 - Lock the comments and Friendship schema boundary.

**Status:** done

- [x] Shared Person A contract types add nullable coordinates to legacy note rows and add the exact MapComment and `MapCommentsResponse` shapes.
- [x] `GET /api/map/comments` requires authentication, is rate-limited, and validates `bbox` as four finite values in `minLng,minLat,maxLng,maxLat` order.
- [x] Invalid coordinate ranges, reversed bounds, missing values, and non-numeric values return a client error.
- [x] The database query returns only notes with both coordinates inside the requested viewport and does not fetch all comments for application-side filtering.
- [x] The response is exactly `{ comments: MapComment[] }`, joins the public author projection, and uses stable ordering.
- [x] Legacy notes with no coordinates are excluded from Map Comment results and retain their existing city values.
- [x] `POST /api/map/comments` is rate-limited, Intern-only, validates latitude, longitude, topic, and body, and ignores or rejects any supplied author or city field.
- [x] A successful POST stores `created_by = auth.uid()`, stores `city = null`, stores a complete coordinate pair, and returns 201 with the frozen MapComment shape.
- [x] A Subletter, a caller forging another author, and a caller attempting a half-coordinate write are denied.
- [x] Idempotent seed data includes located comments inside and outside a test viewport plus unchanged legacy city notes.
