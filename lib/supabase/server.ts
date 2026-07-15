import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, hasSupabase } from "@/lib/env";

/**
 * MERGED Supabase server helpers.
 *
 * - `getSupabaseServer()` (Person A): a plain anon-key client for server code
 *   that doesn't need a session (RLS still applies via anon). Returns null when
 *   Supabase isn't configured (fixture-safe).
 * - `createServerSupabase()` (Person B): a session-bound SSR client that reads
 *   Supabase auth cookies so `auth.uid()` resolves to the calling user — API
 *   routes use this to identify the caller (contract §4).
 * - `getCallerId()` (Person B): resolves the authenticated user id from the
 *   request, or null.
 *
 * `cookies()` in Next 14 is synchronous; `await` on a non-Promise returns the
 * value directly, so the same source works on Next 14 and Next 15.
 */

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Person A — plain anon client (fixture-safe).
export function getSupabaseServer(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Person B — session-bound SSR client using request cookies.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — safe to ignore (middleware refreshes).
          }
        },
      },
    },
  );
}

// Person B — resolve the authenticated caller's user id from the session.
export async function getCallerId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
