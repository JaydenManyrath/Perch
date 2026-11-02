# Partition tables (PT/BBT)

Owner: Koen. Tests: `tests/course/pt-verdict-rules.test.ts`,
`tests/course/pt-finance.test.ts`. Each input dimension is split into valid (V) and
invalid (X) equivalence classes; boundaries get a case on each side. Expected outputs
come from the specification (contract 13.5 and the scout thresholds) and were
computed by hand, not read back from the code.

## Budget scout: rent vs affordable rent (affordable = 2,000, flag tolerance 10%)

| Class | Range | Expected | Cases |
| --- | --- | --- | --- |
| V1 under budget | 0 <= price <= 2,000 | pass | PB-01, PB-02 (edge), PB-07 (0) |
| V2 slightly over | 2,000 < price <= 2,200 | flag | PB-03 (edge), PB-04 (edge) |
| V3 over | price > 2,200 | fail | PB-05 (edge), PB-06 |

## Salary feeding the affordable rent

| Class | Expected | Cases |
| --- | --- | --- |
| X absent / zero / negative | stated budget used | PB-08, PB-09, PB-10 |
| V salary ceiling above stated budget | stated budget (min) | PB-11, PN-01 (route), PN-02 (route) |
| V salary ceiling below stated budget | salary ceiling (615 at 30k) | PB-12 |

## Salary band -> annual take-home (federal brackets + FICA + 5% state)

| Class | Salary | Expected take-home | Case |
| --- | --- | --- | --- |
| X negative | -1 | 0 | PF-01 |
| X zero | 0 | 0 | PF-02 |
| V below standard deduction | 10,000 | 8,735 | PF-03 |
| V edge: at deduction | 14,600 | 12,753 | PF-04 |
| V edge: one dollar taxable | 14,601 | 12,754 | PF-05 |
| V 12% band | 30,000 | 24,589 | PF-06 |
| V 24% band | 145,000 | 102,319 | PF-07 |
| V above SS wage base | 200,000 | 139,108 | PF-08 |

## Cost-of-living index -> rent ceiling (monthly take-home 5,000)

| Class | Index | Expected | Case |
| --- | --- | --- | --- |
| V low | 80 | 1,200 | PF-09 |
| V average | 100 | 1,500 | PF-10 |
| V high, under 40% cap | 133 | 1,995 | PF-11 |
| V very high, capped | 152 | 2,000 | PF-12 |
| X zero / negative / NaN | 0, -10, NaN | 1,500 (national) | PF-13, PF-14, PF-15 |

Plus PF-16 to PF-19 for zero take-home, upfront cash and negative stipend/bonus.

## Pay period as written in the offer letter (salary is "annual USD")

| Class | Example text | Expected | Case | Round 1 |
| --- | --- | --- | --- | --- |
| V annual, labelled | "Base salary: $145,000" | 145,000 | PF-20 | pass |
| V annual, "per year" | "$120,000 per year" | 120,000 | PF-21 | pass |
| X missing | (none) | null, flagged | PF-22 | pass |
| V hourly | "$45.00 per hour", "$52/hr" | x 2,080, flagged | PF-23, PF-24 | **fail: 45, 52 (D09)** |
| V monthly | "$8,000 per month" | x 12, flagged | PF-25 | **fail: 8,000 (D09)** |
| V weekly | "$1,800 per week" | x 52, flagged | PF-26 | **fail: 1,800 (D09)** |
| V cents | "$95,000.50" | 95,000 | PF-27 | pass |

## Lease window vs stay (stay 2026-06-08 .. 2026-08-14; flag if total gap <= 7 days)

| Class | Expected | Cases | Round 1 |
| --- | --- | --- | --- |
| V covers fully (incl. exact edges) | pass | PL-01, PL-02 | pass |
| V starts late 1..7 / 8+ days | flag / fail | PL-03, PL-04, PL-05 | pass |
| V ends early 7 / 8 days | flag / fail | PL-06, PL-07 | pass |
| V both ends, total 7 / 8 | flag / fail | PL-08, PL-09 | pass |
| V disjoint | fail | PL-10 | pass |
| X lease date missing | fail, "Lease dates unknown" | PL-11, PL-12 | pass |
| X malformed lease or stay date | fail, no "NaN" in text | PL-13, PL-14 | **fail (D12)** |
| X inverted stay | not pass | PL-15 | **fail (D12)** |
| Route: malformed / inverted stay | 400 | PN-03, PN-04 | **fail (D11)** |
| Route: one-day stay (edge) | 200, pass | PN-06 | pass |
| Route: zero budget | 400 | PN-05 | pass |

## Commute (walking minutes to nearest anchor; pass <= 10, flag <= 20)

0, 10, 11, 20, 21, 60 minutes (PR-01..PR-06) plus no anchors and missing listing
coordinates (PR-07, PR-08). All pass.

## Safety flags and roll-up

Clean / note only / scam / scam + note / null / partial object (PS-01..PS-06) and the
fail > flag > pass roll-up (PA-01..PA-04). All pass.

## Totals

78 PT cases. Round 1: 68 pass, 10 fail (4 defects: D09, D10, D11, D12). Round 2: 78 pass.
