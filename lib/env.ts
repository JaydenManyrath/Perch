/**
 * Env accessor. Client-visible keys are NEXT_PUBLIC_*. Never read a secret here.
 *
 * Rule (CLAUDE.md §8.4): only the Supabase anon key + Mapbox token are client-visible.
 * Never NEXT_PUBLIC_ a service-role, OpenAI, or Composio key.
 *
 * Degrades gracefully: reads env with safe fallbacks so a missing key never crashes.
 * The data-source switch decides whether to *use* live services (see lib/data/source.ts).
 */

export const env = {
  dataSource: (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "fixture") as "fixture" | "live",
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  mapbox: {
    token: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
  },
};

export function hasSupabase(): boolean {
  return !!(env.supabase.url && env.supabase.anonKey);
}

export function hasMapbox(): boolean {
  return !!env.mapbox.token;
}
