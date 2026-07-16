import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const url = process.env.AUTH_TEST_SUPABASE_URL;
const anonKey = process.env.AUTH_TEST_SUPABASE_ANON_KEY;
const suite = process.env.RUN_AUTH_TESTS && url && anonKey ? describe : describe.skip;

suite("seeded Supabase authentication (requires local Supabase)", () => {
  it("creates a session for the seeded banded intern and reads its RLS-scoped profile", async () => {
    const client = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({
      email: "intern0@perch.demo",
      password: "perch-demo-intern0@perch.demo",
    });

    expect(signInError).toBeNull();
    expect(signedIn.session?.user.email).toBe("intern0@perch.demo");

    const { data: profile, error: profileError } = await client
      .from("users")
      .select("id, verified, user_type")
      .eq("id", signedIn.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile).toMatchObject({
      id: signedIn.user!.id,
      verified: true,
      user_type: "intern",
    });

    await client.auth.signOut();
  });
});
