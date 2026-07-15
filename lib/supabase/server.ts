import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, hasSupabase } from "@/lib/env";

/**
 * Server Supabase client (anon key). Person A never uses the service-role key.
 * Returns null if Supabase isn't configured.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (!hasSupabase()) return null;
  return createClient(env.supabase.url, env.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
