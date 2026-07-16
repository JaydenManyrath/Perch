# Secret Management Convention (Person B - B12)

> Owner: Person B. Establishes how every credential in Perch is stored, named, and
> kept out of git and out of the client bundle. Referenced by FOUNDATION-CONTRACT
> section 6 item 3 and CLAUDE.md sections 8.4 and 10b.

## Rules (non-negotiable)

1. **Real local values live in `.env.local`** (gitignored). The committed
   [`.env.example`](../.env.example) is the complete key-name source of truth;
   [`.env.local.example`](../.env.local.example) is a client-only quick start.
2. **Server-only secrets are never `NEXT_PUBLIC_`.** Anything with the `NEXT_PUBLIC_`
   prefix is inlined into the browser bundle at build time. Only two values are safe
   to expose: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon key
   is protected by RLS), and `NEXT_PUBLIC_MAPBOX_TOKEN`. The service-role key, OpenAI
   key, and Composio key are **server-only**.
3. **The service-role key bypasses RLS.** It is used only in `lib/supabase/admin.ts`,
   seed scripts, and server routes that legitimately need elevated access. It must
   never be imported into a client component.
4. **Rotate on leak.** A leaked OpenAI key costs real money - every LLM/external route
   is rate-limited (`lib/llm/ratelimit.ts`) so an exposed endpoint cannot be drained.
5. **Vercel:** set the server secrets as Vercel Environment Variables (Production +
   Preview). Person B owns ensuring the server env vars are present; Person A owns the
   repo-to-Vercel connection (FOUNDATION-CONTRACT section 6 item 6).

## Kill switches (deterministic fallbacks)

| Var | Effect when set to `1` |
|---|---|
| `LLM_DISABLED` | All routes skip OpenAI and return full deterministic data with `reason: null` / template prose. Proves the "LLM only narrates" principle. |
| `COMPOSIO_DISABLED` | Spotify connect uses the deterministic fallback taste profile instead of live Composio OAuth. |

## Verifying no secret leaks to the client

```bash
npm run build
# then grep the client chunks - must find nothing:
grep -REn "SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|COMPOSIO_API_KEY|SPOTIFY_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|TICKETMASTER_API_KEY" .next/static || echo "clean"
```
