# Perch 🐣

The social network interns use to land in a new city — find your flock (roommates, friends, people to go out with) and short-term sublets, get oriented before you arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

> **Demo build in dev/test mode** — no production auth/verification. Full context in [`CLAUDE.md`](CLAUDE.md).

## The stack (locked)

Next.js + TypeScript · Tailwind + shadcn/ui · Framer Motion · **Supabase** (DB / Auth / Realtime / Storage) · OpenAI via **Vercel AI SDK** · **Composio** (Spotify + IG Business OAuth) · **Mapbox** · deployed on **Vercel**.

## How the work is split (2 people)

| Branch | Owner | Scope | Plan |
|---|---|---|---|
| [`person-a`](../../tree/person-a) | **Person A — Experience & Social Shell** | Design system + mascot, app shell, feed, stories, profile, peer discovery, **realtime DMs (live)**, map + sticker UI | `docs/IMPLEMENTATION-PERSON-A.md` |
| [`person-b`](../../tree/person-b) | **Person B — Intelligence, Data & Hero** | Supabase schema + RLS + auth, seed data, onboarding integrations + parsers, matching engine, **streaming negotiation hero (live)** | `docs/IMPLEMENTATION-PERSON-B.md` |

Both build against the shared interface in [`docs/FOUNDATION-CONTRACT.md`](docs/FOUNDATION-CONTRACT.md). Two heroes are genuinely live: the **streaming housing negotiation** (Person B) and the **intern-connection** beat (joint: A's discovery + DMs × B's matching engine).

## Start here

1. Read [`CLAUDE.md`](CLAUDE.md) — full architecture reference.
2. Read [`docs/FOUNDATION-CONTRACT.md`](docs/FOUNDATION-CONTRACT.md) — the data model, design tokens, API shapes, and Day-1 shared sprint you both build against.
3. Check out your branch and follow your `docs/IMPLEMENTATION-PERSON-*.md`.

Mascot assets live in [`assets/mascot/`](assets/mascot/).
