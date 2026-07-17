# RC31 - Upcoming Ticketmaster events and usable images

**What to build:** Make the Ticketmaster integration return deterministic, soonest-first upcoming events with the best usable source image, while preserving a clock-relative seeded fallback when the provider is unavailable or has no usable results.

**Blocked by:** C0 - Reconcile Round 3 Person C seams.

**Status:** implemented

## Acceptance criteria

- [x] The integration uses an injected clock for its provider request window, source-side filtering, ordering, and fallback behavior.
- [x] Provider requests begin at the injected time, use a bounded future window, and request ascending date order.
- [x] Returned events have valid dates at or after the injected time and are ordered chronologically with deterministic tie behavior.
- [x] Past events are removed before they can reach persistence; the existing route guard remains defense in depth.
- [x] Image selection prefers the largest usable 16:9, non-placeholder source image.
- [x] An event with no usable provider image retains `image_url: null`, allowing the existing Person A placeholder to render without inventing an image URL.
- [x] A missing API key, provider error, quota failure, or response with no usable events returns a deterministic seeded fallback whose events are upcoming relative to the same injected clock.
- [x] Fallback events preserve usable fixture images when available and obey the same filtering and ordering contract as provider events.
- [x] Duplicate identifiers and invalid or missing dates cannot produce duplicate or unusable returned events.
- [x] Existing event payloads, Person B persistence and route behavior, and Person A feed-card consumption remain compatible.

## Focused tests

- [x] Exercise an event exactly at the injected time and an event immediately before it.
- [x] Exercise out-of-order, duplicate, invalid-date, and missing-date provider results.
- [x] Exercise usable and unusable image candidates, including a preferred large 16:9 image and a no-usable-image result.
- [x] Exercise missing-key, provider-error, and empty-usable-result fallback behavior with a fixed clock.
- [x] Verify repeated calls with the same inputs and clock produce the same event order and fallback dates.

## Final integration behavior

- [x] The nearby-events route receives only source-filtered upcoming events for upsert, while Person B's existing route and feed guards remain intact.
- [x] Person A receives a usable `image_url` when available and the existing `null` placeholder behavior otherwise.
- [x] The focused Ticketmaster suite and repository typecheck pass without adding a regression to the integrated Person A/B baseline.
