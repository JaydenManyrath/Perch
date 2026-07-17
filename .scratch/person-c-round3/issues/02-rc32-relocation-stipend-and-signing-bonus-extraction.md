# RC32 - Relocation stipend and signing-bonus extraction

**What to build:** Extend deterministic offer parsing so relocation stipends and signing bonuses are returned through the public `OfferParse` contract with exact labeled extraction, confidence, and distinct absent-versus-ambiguous review behavior.

**Blocked by:** C0 - Reconcile Round 3 Person C seams.

**Status:** ready-for-agent

## Acceptance criteria

- [x] `OfferParse.relocationStipend` and `OfferParse.signingBonus` are required properties with `number | null` values.
- [x] Both benefit fields participate in the public confidence and review contract, and existing public-contract consumers continue to typecheck.
- [x] A valid benefit-specific label with one unambiguous amount is extracted exactly and receives confidence.
- [x] A readable offer that does not mention a benefit returns `null` with confidence `0` and does not place that benefit in `needsReview`.
- [x] A benefit that is mentioned without a trustworthy single amount returns `null` or deliberately low confidence and is placed in `needsReview`; the parser favors `null` whenever choosing a number would require a guess.
- [x] Salary, generic compensation, equity, reimbursements, and unrelated monetary amounts cannot populate either benefit field.
- [x] An offer containing salary, relocation stipend, and signing bonus assigns all three amounts to their correct meanings.
- [x] The parser never invents a number and remains deterministic for identical text.
- [x] Existing employer, role, salary, city, start-date, and end-date behavior remains compatible.

## Focused tests

- [x] Call `parseOfferText` with realistic, clearly labeled relocation-stipend and signing-bonus prose and assert exact numeric results and confidence.
- [x] Cover salary-only offers and unrelated monetary amounts as negative cases.
- [x] Cover absent benefits separately from benefits that are mentioned but ambiguous.
- [x] Cover qualified, ranged, or missing benefit amounts that would require guessing.
- [x] Cover salary and both benefits appearing in the same offer.
- [x] Assert the complete public `OfferParse` shape, confidence entries, `needsReview` membership, determinism, and existing field behavior.

## Final integration behavior

- [x] The existing offer parsing route returns the public parser result unchanged.
- [x] Existing onboarding and finance consumers accept the expanded contract without client-side text parsing; Person B's deterministic finance model retains ownership of zero-default and arithmetic behavior.
- [x] The focused `parseOfferText` and offer-confidence tests plus repository typecheck pass. The pre-existing malformed real-PDF fixture failure is reported separately and is not attributed to this ticket.
