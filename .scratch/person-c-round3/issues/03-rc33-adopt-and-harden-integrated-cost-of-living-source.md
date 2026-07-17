# Reduced RC33 - Adopt and harden the integrated cost-of-living source

**What to build:** Adopt Person B's existing cost-of-living lookup as the sole canonical source and harden its city canonicalization, deterministic fallback behavior, dataset provenance, public contract, and finance integration without adding another provider or persistence path.

**Blocked by:** C0 - Reconcile Round 3 Person C seams.

**Status:** implemented

## Acceptance criteria

- [x] Person C hardens the existing canonical lookup; no competing lookup module, route, migration, table, or persistence path is created.
- [x] Known demo cities resolve consistently across capitalization, surrounding whitespace, harmless trailing punctuation, and common city-plus-state formatting.
- [x] Canonicalization is conservative and does not fuzzy-match an unknown city to an unrelated known city.
- [x] Lookup precedence is a valid canonical persisted row, then the bundled known-city dataset, then the national fallback.
- [x] A missing row, explicit database error, thrown database failure, or invalid persisted numeric value follows the same deterministic fallback path.
- [x] Every returned result has a non-empty canonical city, a finite positive index where 100 is the national average, and a finite non-negative median rent.
- [x] Bundled values have maintainer-visible provenance, curation basis, and an as-of statement without changing the public `{ city, index, medianRent }` consumer contract.
- [x] Unknown and empty cities resolve deterministically to the national fallback and never crash the finance route.
- [x] A valid persisted row remains authoritative over the bundled fallback for the same canonical city.
- [x] No optional external cost-of-living provider is added; one requires a separately demonstrated requirement and decision.

## Focused tests

- [x] Exercise canonical names, case and whitespace variants, a common city/state form, and trailing punctuation.
- [x] Exercise empty and unknown city inputs.
- [x] Exercise valid persisted-row precedence over the bundled known-city value.
- [x] Exercise a missing row, returned database error, thrown database failure, and malformed persisted numeric data.
- [x] Verify the bundled known-city result and national fallback are stable across repeated calls.
- [x] Verify the canonical lookup preserves its public city, index, and median-rent contract.

## Final integration behavior

- [x] Person B's existing finance route consumes the canonical lookup and passes its canonical city, index, and median rent into the deterministic finance model.
- [x] The finance route falls back nationally without creating a second lookup path, while Person B retains ownership of persistence, arithmetic, negotiation-budget behavior, and the response contract.
- [x] The focused cost-of-living, finance-route, and finance-model tests plus repository typecheck pass without adding a regression to the integrated Person A/B baseline.

## Implementation notes

- Hardened the existing `lib/finance/colLookup.ts` seam only.
- No external provider, API key path, migration, route, table, or duplicate module was added.
- Focused coverage lives in `tests/cost-of-living.test.ts`.
