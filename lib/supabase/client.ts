"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { env, hasSupabase } from "@/lib/env";

/**
 * Browser Supabase client. Only ever uses NEXT_PUBLIC_ (anon) keys.
 * Returns null when Supabase is not configured - callers must handle this
 * (the DM UI falls back to fixture behavior when null).
 */
let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  if (!hasSupabase()) {
    cached = null;
    return null;
  }
  cached = createBrowserClient(env.supabase.url, env.supabase.anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return cached;
}
