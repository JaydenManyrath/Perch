# Perch Round 5 - Implementation Plan: PERSON D (bird theme: renames + branch motif)

Mission: the interface starts speaking bird without losing a gram of clarity. Two moves:
rename the nav destinations that still wear generic names (DMs -> Chirps, Map ->
Migration, Profile -> Nest), and give the shell a drawn branch/tree motif - a quiet
hand-drawn branch the UI can "perch" things on - on emotional surfaces only. Section 9's
rule is the whole game: the theme adds delight via language + iconography; it NEVER
costs clarity, and decision surfaces stay clean.

Branch: `round5-person-d` (cut from `main`). Boundary: you own
components/shell/nav-items.ts, page headers/titles, the glossary (FOUNDATION-CONTRACT
section 10) + README strings, and the new motif asset + placements. You must NOT reword
onboarding copy (A owns it), touch the parser (C), or server/config (B). ROUTES ARE
FROZEN: /dms, /map, /profile/*, /feed, /stories keep their paths - labels only.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md sections 15 (esp. 15.5
naming contract) + 10 (glossary) + 3 (tokens); CLAUDE.md section 9 (design system - the
mascot filter lesson applies to the motif: no feTurbulence/feDisplacementMap, flat
vector only); components/shell/{nav-items.ts,BottomNav.tsx,SideRail.tsx};
app/(shell)/*/page.tsx headers; assets/mascot/README.md (style reference).

Working agreements (14.6): plain ASCII in docs and user-facing strings; reduced-motion
respected; tokens from tailwind.config only (no new hex).

## 1. Scope - what Person D owns in Round 5

- RD51 Nav renames. In nav-items.ts: label "DMs" -> "Chirps" (bird subtitle becomes the
  plain meaning: "DMs"), label "Map" -> "Migration" (subtitle "your city"), label
  "Profile" -> "Nest" (subtitle "you"). Flyway + Perches stay. Sweep page headers,
  titles, aria-labels, and empty-state copy that say "DMs"/"Map"/"Profile" on those
  surfaces so no screen contradicts its tab. Update any tests asserting the old labels.
  Deep links, hrefs, and route dirs are untouched.
- RD52 Branch/tree motif. A flat-vector drawn branch asset (inline SVG component,
  components/theme/BranchMotif.tsx; optional small leaf/twig variants) in token colors
  (baby-blue line work, warm accent buds used sparingly). Placements - emotional
  surfaces ONLY: the shell edge (a branch running along the SideRail on desktop),
  onboarding backdrop corners, empty states (the chick can sit on it where a mascot
  already appears), and the login/landing page. EXPLICITLY ABSENT from: listing cards +
  detail sheets, booking/finance surfaces, safety content, and the map canvas.
  Implementation rules from the mascot lesson (section 9): no SVG filters, cheap to
  render, decorative only (aria-hidden), never intercepts pointer events, respects
  prefers-reduced-motion if animated at all (a subtle sway is optional, off by default).
- RD53 Glossary + docs sweep. Update FOUNDATION-CONTRACT section 10 with Chirps /
  Migration / Nest, sweep README feature names, and check user-facing strings for
  plain-ASCII compliance while you are in there.

### NOT yours
- Onboarding copy or steps (A), parser + OfferStep (C), cron/vercel.json/workflow (B).
  Do not restyle decision surfaces "while you are in there" - motif placements are the
  frozen list above.

## 2. Repo additions
```
components/shell/nav-items.ts            # RD51 labels + subtitles
components/theme/BranchMotif.tsx         # RD52 inline SVG motif (+ variants)
app/(shell)/dms|map|profile pages        # RD51 headers/copy on those surfaces
app/onboarding/page.tsx                  # RD52 backdrop placement ONLY (no copy)
docs/FOUNDATION-CONTRACT.md section 10   # RD53 glossary
README.md                                # RD53 names
tests/nav-labels.test.tsx                # RD51 labels + subtitles + frozen hrefs
```

## 3. Build phases (commit after each)
- Phase R5D-1 (RD51): renames + header sweep + test updates. Acceptance: nav shows
  Chirps/Migration/Nest with plain-meaning subtitles; hrefs byte-identical; suite green.
- Phase R5D-2 (RD52): BranchMotif + placements. Acceptance: motif renders on shell edge,
  onboarding, empty states, login; zero presence on the frozen decision-surface list;
  aria-hidden; no pointer interception; lighthouse/perf unchanged (no filters).
- Phase R5D-3 (RD53): glossary + README + ASCII sweep. Acceptance: docs match the
  shipped labels.

## 4. Definition of done + demo
Done when the five tabs read Flyway / Perches / Migration / Chirps / Nest (subtitled),
the branch motif dresses the emotional surfaces and none of the decision ones, routes
and deep links are untouched, tests green, PROGRESS + README updated. Demo: walk the
five tabs, point at the branch running down the rail, open a listing sheet to show the
motif deliberately absent.

## 5. Integration checkpoints
- With A: A's flock/avatar steps land in onboarding - your backdrop must not collide
  with A's layout; coordinate on page.tsx if both touch it (A's wiring wins, rebase).
- With B/C: none.
