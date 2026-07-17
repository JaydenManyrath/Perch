# RC34 - Close external place details as not needed

**What to decide:** Determine whether Sprint 3 needs a new external place-details integration for rich map-marker sheets.

**Blocked by:** C0 - Reconcile Round 3 Person C seams.

**Status:** closed - no build needed

## Decision

- [x] Existing place, listing, event, comment, and sticker payloads contain the data required by the accepted sheet designs.
- [x] Existing detail and feed routes provide the listing and event navigation paths.
- [x] No Person A or Person B requirement demonstrates a need for external Mapbox place details.
- [x] No route, provider, key, migration, or speculative abstraction is added.

## Verification boundary

RC34 closes only the proposed external place-details integration. The separate RA38 browser gate still requires a valid `NEXT_PUBLIC_MAPBOX_TOKEN` to click and verify every rich marker sheet in a real Mapbox canvas.
