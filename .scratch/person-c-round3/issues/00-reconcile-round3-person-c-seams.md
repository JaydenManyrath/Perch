# C0 - Reconcile Round 3 Person C seams

**What to resolve:** Reconcile the original Person C plan with the integrated Person A and Person B implementation before Sprint 3 implementation tickets are specified.

**Blocked by:** None - can start immediately.

**Status:** resolved

## Answer

1. Person B owns the `cost_of_living` table, migrations, persistence, deterministic finance model, and `/api/finance`.
2. Person C adopts and hardens Person B's existing cost-of-living lookup. Person C will not create a competing lookup module.
3. RC33 is reduced to canonicalization, deterministic fallback behavior, dataset provenance, contract verification, and any missing tests.
4. An optional external cost-of-living provider is deferred unless a demonstrated requirement appears.
5. `OfferParse.relocationStipend` and `OfferParse.signingBonus` are required nullable properties.
6. A valid labeled amount is extracted exactly and gets confidence.
7. A benefit not mentioned in an offer returns `null` with confidence `0` but is not placed in `needsReview`.
8. A mentioned but ambiguous benefit returns `null` or a low-confidence result and is placed in `needsReview`.
9. The parser never invents a number and must not confuse salary with a relocation stipend or signing bonus.
10. RC34 is not needed: Person A's RA38 works with existing payloads, and no external place-detail requirement has been demonstrated.

## Comments

- Resolved after reading the Round 3 contract and plans plus the integrated Person A and Person B implementation.
- The approved public test seams are the Ticketmaster integration with an injected clock, `parseOfferText` returning the public `OfferParse` contract, and the canonical cost-of-living lookup consumed by the finance route/model.
