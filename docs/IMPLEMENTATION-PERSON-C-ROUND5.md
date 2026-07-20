# Perch Round 5 - Implementation Plan: PERSON C (OpenAI offer parsing, verified)

Mission: the offer-letter parser reads with OpenAI and trusts with deterministic code.
Today the pipeline is unpdf text extraction + tesseract OCR fallback + regex heuristics
with per-field confidence - solid on clean letters, brittle across real-world formats.
This round makes extraction LLM-first via the Vercel AI SDK with structured output while
preserving the house rule (CLAUDE.md sections 4 and 8): the model may READ, it may NEVER
invent a number. Then prove the whole route works on real-shaped PDFs, end to end.

Branch: `round5-person-c` (cut from `main`). Boundary: you own lib/parsers/*, the
/api/parse/offer route, and OfferStep.tsx INTERNALS (manual-correction wiring). You must
not add onboarding steps (A owns step additions) or touch labels/nav (D). The
`OfferParse` shape in lib/types/contract.ts is FROZEN - the LLM fills the same fields.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 15; the shipped code
(lib/parsers/offerLetter.ts + offer-confidence.test.ts, lib/parsers/ocr.ts,
app/api/parse/offer/route.ts, tests/onboarding-offer-route.test.ts, tests/parsers.test.ts,
app/onboarding/_steps/OfferStep.tsx); .env.example (OPENAI_API_KEY, OPENAI_MODEL,
LLM_DISABLED, LIVE_LLM); lib rate-limit guard usage on the route.

Working agreements (14.6): plain ASCII; deterministic-by-default (no key or
LLM_DISABLED=1 -> today's heuristic path, unchanged behavior); never spend tokens in the
default test run (mock the model; live calls only behind LIVE_LLM=1).

## 1. Scope - what Person C owns in Round 5

- RC51 LLM extraction layer. lib/parsers/offerLlm.ts: `generateObject` (Vercel AI SDK,
  model from OPENAI_MODEL, default gpt-4o-mini) over the ALREADY-extracted text (unpdf /
  OCR output - the LLM never sees raw PDF bytes). Zod schema mirrors OfferParse: salary,
  employer, startDate, endDate, city, relocationStipend, signingBonus + per-field
  confidence. Prompt forbids inference of absent values (null instead).
- RC52 Deterministic verification layer. Every value the model returns is verified
  against the source text before it is trusted: numbers must appear verbatim (modulo
  formatting: $ , decimals), dates must parse from a string present in the text
  (reuse parseDateToIso), employer/city must be substrings. A field that fails
  verification is nulled + flagged needsReview so the existing OfferStep
  manual-correction UI catches it. Pipeline order in the route: extract text ->
  heuristics -> if LLM enabled, LLM pass -> merge (verified LLM values may fill nulls or
  override low-confidence heuristics; verified-heuristic values never get overwritten by
  unverified LLM ones) -> respond. LLM_DISABLED=1 or no key -> pipeline is byte-identical
  to today.
- RC53 Real-PDF regression fixtures + end-to-end proof. Build 4-6 real-shaped offer PDFs
  (varied layouts: classic letter, table-styled comp, stipend+bonus letter, scanned
  image for the OCR path, one adversarial "salary mentioned twice" case), commit them
  under tests/fixtures/offers/. Route-level tests drive upload -> parse -> fields for
  each, with the model MOCKED in the default run; one opt-in live smoke behind
  LIVE_LLM=1. Confirm rate limiting still guards the route and OfferStep receives
  needsReview flags for the adversarial case.

### NOT yours
- New onboarding steps (A), nav/labels/motif (D), cron/events (B). Do not alter the
  OfferParse contract shape, the storage of parsed offers, or the finance model that
  consumes it.

## 2. Repo additions
```
lib/parsers/offerLlm.ts                  # RC51 generateObject wrapper + schema
lib/parsers/offerVerify.ts               # RC52 verbatim-verification layer
lib/parsers/offerVerify.test.ts          # verification: pass, reject, formatting cases
app/api/parse/offer/route.ts             # RC52 pipeline merge order
tests/fixtures/offers/*.pdf              # RC53 committed regression PDFs
tests/offer-llm-pipeline.test.ts         # RC53 route e2e with mocked model
app/onboarding/_steps/OfferStep.tsx      # only if flag wiring needs it (internals)
```

## 3. Build phases (commit after each)
- Phase R5C-1 (RC52 first - it gates everything): offerVerify + tests. Acceptance: an
  invented number is rejected; a verbatim one passes across $ / comma / decimal formats.
- Phase R5C-2 (RC51): offerLlm + route merge behind the kill switch. Acceptance: with
  the model mocked, verified fields merge by the stated precedence; LLM_DISABLED=1
  output is byte-identical to main's.
- Phase R5C-3 (RC53): fixtures + e2e + one live smoke. Acceptance: all fixture PDFs
  parse to expected fields in the default (mocked) run; the scanned PDF exercises OCR;
  the adversarial case lands in needsReview; LIVE_LLM=1 smoke passes once, documented.

## 4. Definition of done + demo
Done when the route is LLM-first with deterministic verification, byte-identical
fallback without a key, real-PDF fixtures green in CI without spending tokens, rate
limit intact, PROGRESS + README updated. Demo: upload a messy real-format offer -> fields
fill with confidence flags -> one absurd LLM value is shown rejected into "check this".

## 5. Integration checkpoints
- With A: A adds steps around OfferStep; if app/onboarding/page.tsx conflicts, A's step
  wiring wins - rebase yours.
- With B/D: none.
