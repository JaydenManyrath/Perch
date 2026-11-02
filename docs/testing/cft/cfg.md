# Control flow graphs (CFT/WBT)

Owner: Koen. Tests: `tests/course/cft-branches.test.ts`,
`tests/course/cft-source-fallback.test.ts`. Criterion: branch (decision) coverage of
each graph, measured with `@vitest/coverage-v8`. Nodes are numbered decisions;
each test case names the edge it forces.

## CFG-1 `planFreshness` (lib/sourcing/freshness.ts)

```
for each row:
  D1 status == available?      no -> next row                  CF-01
  D2 expires_at present?       no -> next row                  CF-02
  D3 expires_at parses?        no -> next row                  CF-03
  D4 now > expires?            yes -> expire, next row         CF-04, CF-05 (now == expires)
  D5 !sourced and within 2d?   yes -> ping                     CF-06; no: CF-07 (sourced), CF-08 (outside)
```

## CFG-2 `runFreshnessPass`

read error -> throw (CF-09); nothing to expire -> no update (CF-10); update error ->
throw (CF-11); expire available rows only (CF-12).

## CFG-3 `cron/expire-listings` route

rate limited -> 429 (CF-16); not authorized -> 403 (CF-13); pass ok -> 200 (CF-14);
pass throws -> 500 (CF-15). Baseline coverage of this route was 0%.

## CFG-4 `transitionBooking`

`switch(action)` with an actor guard and a status guard per arm. The baseline covered
the main arms; CF-17 (default arm), CF-18 (decline by non-owner), CF-19 (cancel by
non-owner), CF-20 (cancel from a terminal status) close the remaining edges.

## CFG-5 `performTransition` (lib/bookings.ts)

```
N1 fetch booking            -> not found: throw 404               CF-21
N2 resolve role: owner | booker | roommate | invitee | other      CF-22 (roommate), CF-23 (invitee)
N3 transitionBooking        (CFG-4)
N4 update where status = old -> error: throw                      CF-24
                              -> no row: 409 concurrent           (C02 in FSM suite)
N5 setListingTaken?          -> write error: throw                CF-25
N6 releaseListing and old == booked?  no: no listing write        CF-26
                                       yes: listing available     CF-27
```

## CFG-6 booking mutations in `lib/data/source.ts` (fixture | live fallback)

```
N1 live mode with keys?        no  -> N5 fixture mutation         CF-30
N2 fetch                        throws -> N5                      CF-32
N3 response ok?                 5xx -> N5                         CF-33
                                4xx -> N5 (round 1)               CF-35, CF-36, CF-37, CF-38
N4 usable body?                 no  -> N5                         CF-34
                                yes -> return live value          CF-31
```

The 4xx edge is the finding: a deliberate refusal from the server (409 listing
already held, 403 own listing, 409 illegal transition) took the same edge as an
outage, so the client fabricated a local "requested" booking or flipped a fixture
row. The fix (D13) adds a separate 4xx edge that throws `LiveRejectedError`; outages,
401 and 429 keep the documented degrade-to-fixture edge (CF-32, CF-33, CF-34, CF-39).

## Coverage effect (branch %, target modules)

| Module | Baseline | Baseline + course suites |
| --- | --- | --- |
| cron/expire-listings route | 0% | 87.5% |
| lib/bookings.ts | 76.1% | 85.6% |
| lib/data/source.ts | 66.7% | 74.0% |
| lib/negotiate/lease.ts | 81.3% | 100% |
| lib/negotiate/safety.ts | 62.5% | 88.9% |
| lib/sourcing/freshness.ts | 90.9% | 94.7% |
| Target set total | 76.7% | 83.3% |

Round 1: 37 CFT cases, 33 pass, 4 fail (all D13). Round 2: 37 pass.
