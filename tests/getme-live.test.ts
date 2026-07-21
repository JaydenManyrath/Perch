import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LiveDataContext } from "@/lib/data/source";

/**
 * getMe is live-aware: in live mode it resolves the signed-in user's OWN row
 * (session -> select own `users` row, normalized so a minted account with sparse
 * offer fields still resolves to THEIR identity) and only falls back to the seeded
 * persona when there is no session, the row is unusable, or anything errors.
 * Fixture mode is unchanged: always the seeded persona, live client never touched.
 */

const MINTED_ID = "11111111-2222-4333-8444-555555555555";

const mintedRow = {
  id: MINTED_ID,
  name: "Dana Whitfield",
  company: "Acme",
  role: "Data Intern",
  city: "Austin",
  move_in_date: "2026-06-15",
  taste_profile: null,
  verified: false,
  avatar_url: null,
  created_at: "2026-07-19T00:00:00Z",
  user_type: "intern",
};

function stubLiveEnv() {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "live");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test-key");
}

/** Fresh module graph so lib/env re-reads the (possibly stubbed) env. */
async function importSource() {
  vi.resetModules();
  const source = await import("@/lib/data/source");
  const fixtures = await import("@/lib/fixtures");
  return { source, fixtures };
}

type UsersResult = { data: unknown; error: { message: string } | null };

function mockContext(opts: {
  userId?: string | null;
  usersResult?: UsersResult;
  selectThrows?: boolean;
  onTouch?: () => void;
}): LiveDataContext {
  const supabase = {
    auth: {
      getUser: async () => {
        opts.onTouch?.();
        return {
          data: { user: opts.userId ? { id: opts.userId } : null },
          error: null,
        };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            opts.onTouch?.();
            if (opts.selectThrows) throw new Error("network down");
            return opts.usersResult ?? { data: null, error: null };
          },
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { supabase, fetch: globalThis.fetch };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getMe (live mode)", () => {
  it("returns the signed-in user's own row, not the seeded persona", async () => {
    stubLiveEnv();
    const { source } = await importSource();
    const me = await source.getMe(
      mockContext({ userId: MINTED_ID, usersResult: { data: mintedRow, error: null } }),
    );
    expect(me.id).toBe(MINTED_ID);
    expect(me.name).toBe("Dana Whitfield");
    expect(me.company).toBe("Acme");
    expect(me.name).not.toBe("Alex Chen");
  });

  it("normalizes a minted row with NULL optional fields instead of bouncing to the persona", async () => {
    stubLiveEnv();
    const { source } = await importSource();
    // The account route inserts NULL for any field the offer letter lacked.
    const sparse = {
      ...mintedRow,
      company: null,
      role: null,
      city: null,
      move_in_date: null,
      verified: null,
      created_at: null,
    };
    const me = await source.getMe(
      mockContext({ userId: MINTED_ID, usersResult: { data: sparse, error: null } }),
    );
    expect(me.id).toBe(MINTED_ID);
    expect(me.name).toBe("Dana Whitfield");
    expect(me.company).toBe("");
    expect(me.city).toBe("");
    expect(me.verified).toBe(false);
    expect(me.avatar_url).toBeNull();
  });

  it("falls back to the fixture persona when nobody is signed in", async () => {
    stubLiveEnv();
    const { source, fixtures } = await importSource();
    const me = await source.getMe(mockContext({ userId: null }));
    expect(me).toBe(fixtures.meFixture);
    expect(me.name).toBe("Alex Chen");
  });

  it("falls back to the fixture persona when the users read errors", async () => {
    stubLiveEnv();
    const { source, fixtures } = await importSource();
    const me = await source.getMe(
      mockContext({
        userId: MINTED_ID,
        usersResult: { data: null, error: { message: "permission denied" } },
      }),
    );
    expect(me).toBe(fixtures.meFixture);
  });

  it("falls back to the fixture persona when the client throws", async () => {
    stubLiveEnv();
    const { source, fixtures } = await importSource();
    const me = await source.getMe(mockContext({ userId: MINTED_ID, selectThrows: true }));
    expect(me).toBe(fixtures.meFixture);
  });

  it("getUserById normalizes sparse minted rows too, so others can view them", async () => {
    stubLiveEnv();
    const { source } = await importSource();
    const sparse = { ...mintedRow, city: null, move_in_date: null };
    const user = await source.getUserById(
      MINTED_ID,
      mockContext({ userId: MINTED_ID, usersResult: { data: sparse, error: null } }),
    );
    expect(user?.name).toBe("Dana Whitfield");
    expect(user?.city).toBe("");
  });
});

describe("getMe (fixture mode)", () => {
  it("returns the seeded persona and never consults a live client", async () => {
    const { source, fixtures } = await importSource(); // default env: fixture mode
    let touched = false;
    const me = await source.getMe(
      mockContext({
        userId: MINTED_ID,
        usersResult: { data: mintedRow, error: null },
        onTouch: () => {
          touched = true;
        },
      }),
    );
    expect(me).toBe(fixtures.meFixture);
    expect(me.name).toBe("Alex Chen");
    expect(touched).toBe(false);
  });
});
