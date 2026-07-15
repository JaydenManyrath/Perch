import { createClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client — uses the SERVICE-ROLE key, which BYPASSES RLS.
 *
 * SERVER-ONLY. Never import this into a client component. Used exclusively by:
 *  - the seed generator (scripts/seed.ts, B4)
 *  - server routes that legitimately need elevated writes (e.g. persisting a
 *    parsed offer / taste vector to the caller's own row after verifying the
 *    caller server-side).
 *
 * See docs/SECRETS.md. If this key ever reaches the client bundle it is a
 * security incident — rotate immediately.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (server-only).",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
