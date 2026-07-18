import { hasSupabase } from "@/lib/env";
import { ME_ID, meFixture } from "@/lib/fixtures/users";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/session";
import type { UserType } from "@/lib/types/contract";

export type InitialSession = {
  currentUser: CurrentUser | null;
  mode: "fixture" | "live";
};

function asUserType(value: unknown): UserType | null {
  return value === "intern" || value === "subletter" ? value : null;
}

/**
 * Seed the client auth context from the request's refreshed SSR cookies. Fixture
 * mode intentionally keeps the established demo identity without creating a
 * Supabase client or requiring any environment variables.
 */
export async function getInitialSession(): Promise<InitialSession> {
  if (!hasSupabase()) {
    return {
      currentUser: { id: ME_ID, userType: asUserType(meFixture.user_type) },
      mode: "fixture",
    };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { currentUser: null, mode: "live" };

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  return {
    currentUser: { id: user.id, userType: asUserType(profile?.user_type) },
    mode: "live",
  };
}
