import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client — uses the PUBLIC anon key. All access is RLS-gated
 * (B2). Person A's UI uses this for reads, realtime subscriptions, and the
 * participant-locked DM insert/select.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
