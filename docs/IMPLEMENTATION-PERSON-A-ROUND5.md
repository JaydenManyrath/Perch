# Perch Round 5 - Implementation Plan: PERSON A (onboarding growth: recommended friends + optional avatars)

Mission: make onboarding grow the graph and stop assuming a profile picture. A new
"find your flock" step recommends interns to befriend the moment they join, and profile
pictures become genuinely optional everywhere: a skippable upload plus a shared
initials-fallback avatar so a null `avatar_url` never renders as a broken image or an
empty circle.

Branch: `round5-person-a` (cut from `main`). Boundary: you own onboarding STEP additions
and the avatar render sweep. You must NOT modify `app/onboarding/_steps/OfferStep.tsx`
internals (Person C owns it this round) and you must NOT touch nav labels or page
headers (Person D owns those). Live storage plumbing stays owned by Round 4 RA46; you
build the optional-UX layer that degrades cleanly without it.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 15 (scope, frozen
interfaces, overlap rules); section 4 (matches + friends API shapes); docs/PROGRESS.md;
the shipped code (app/onboarding/page.tsx + _steps/*, lib/data/source.ts getMatches /
requestFriend, components/discovery/MatchCard.tsx, lib/fixtures/*).

Working agreements (14.6): plain ASCII; fixture-first (every new surface works with zero
live keys); update README + PROGRESS on merge; no new schema, no contract.ts shape changes.

## 1. Scope - what Person A owns in Round 5

- RA51 "Find your flock" onboarding step. A new step (after the existing integration
  steps, before Done) listing 3-6 recommended interns: same company first, then same
  city with overlapping move-in windows. Source: `getMatches()` from lib/data/source.ts
  (reuses GET /api/matches live, matches fixture otherwise) - do NOT build a new API.
  Each card: avatar (fallback-safe), name, company, city, move-in overlap line, and an
  "Add friend" button wired to `requestFriend()` with optimistic pending state. The step
  is skippable ("I'll find my flock later") and never blocks completion.
- RA52 Optional profile picture step. A small avatar picker inside onboarding: pick an
  image (local object-URL preview in fixture mode; call the storage helper only when
  Supabase is configured) or skip with one tap. Copy makes clear it is optional. No
  validation anywhere may require an avatar.
- RA53 Shared initials-fallback Avatar component. One component (e.g.
  components/ui/InitialsAvatar.tsx or extend the existing avatar usage) that renders the
  user's initials on a token-palette background when `avatarUrl` is null/empty, sized by
  prop. Sweep EVERY avatar render site to use it: match cards, DM list + thread, friends
  list + requests, event comments, map comment sheets, reviews, profiles, notes strip.
  Acceptance: seeding a user with `avatar_url = null` produces zero broken images across
  the app.

### NOT yours
- Person C: OfferStep internals + the parse pipeline. Person D: nav labels, page
  headers, the branch motif. Person B: anything server/cron. Round 4 A: middleware,
  login, live storage buckets. If the flock step needs a matches tweak, consume the
  existing shape - do not change the API.

## 2. Repo additions
```
app/onboarding/_steps/FlockStep.tsx      # RA51
app/onboarding/_steps/AvatarStep.tsx     # RA52
components/ui/InitialsAvatar.tsx         # RA53 (shared fallback)
app/onboarding/page.tsx                  # step wiring (order + skip)
tests/onboarding-flock.test.tsx          # step render + skip + request wiring
tests/initials-avatar.test.tsx           # null-url fallback across sizes
```

## 3. Build phases (commit after each)
- Phase R5A-1 (RA53 first): InitialsAvatar + the render-site sweep. Acceptance: grep
  shows no bare `<img src={...avatar...}>` left that can receive null; tests cover the
  null path.
- Phase R5A-2 (RA51): FlockStep on fixtures, then verify live-mode call path.
  Acceptance: step renders recommendations, Add friend shows pending, skip completes
  onboarding.
- Phase R5A-3 (RA52): AvatarStep + optional guarantee. Acceptance: completing onboarding
  with no avatar leaves a working app with initials everywhere.

## 4. Definition of done + demo
Done when onboarding contains the flock + avatar steps (both skippable), no surface
anywhere requires or breaks on a missing avatar, tests green, typecheck/lint clean,
PROGRESS + README updated on merge. Demo: fresh onboarding run - skip the avatar, add
two recommended friends, land in the app with initials avatars rendering.

## 5. Integration checkpoints
- With D: after D's rename merge, re-run your tests (labels may appear in copy asserts).
- With C: rebase if onboarding page wiring conflicts (you both edit page.tsx step order
  only if C adds none - C should not; flag if it happens).
- With B: none.
