import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function configureLive(keys = true) {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "live");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", keys ? "https://project.supabase.co" : "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", keys ? "public-anon-key" : "");
}

describe("fixture-to-live data boundary", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("accounts for every exported getter with an explicit live seam", async () => {
    const source = await import("@/lib/data/source");
    const exportedGetters = Object.entries(source)
      .filter(([name, value]) => /^get[A-Z]/.test(name) && typeof value === "function")
      .map(([name]) => name)
      .sort();

    expect(Object.keys(source.DATA_SOURCE_GETTER_AUDIT).sort()).toEqual(exportedGetters);
  });

  it("uses a usable live route response", async () => {
    configureLive();
    const live = { items: [] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(live), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const source = await import("@/lib/data/source");

    await expect(source.getFeed()).resolves.toEqual(live);
    expect(source.currentMode()).toBe("live");
    expect(fetchMock).toHaveBeenCalledWith("/api/feed?limit=20", undefined);
  });

  it("uses the authenticated session identity for identity-scoped Supabase reads", async () => {
    configureLive();
    const liveChecklist = {
      id: "check-live",
      user_id: "auth-user",
      label: "Book a flight",
      due_offset: 14,
      done: false,
      category: "travel",
    };
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: [liveChecklist], error: null });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-user" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(query),
    };

    const source = await import("@/lib/data/source");
    const result = await source.getChecklist("fixture-user", {
      supabase: supabase as never,
      fetch: vi.fn() as never,
    });

    expect(result).toEqual([liveChecklist]);
    expect(query.eq).toHaveBeenCalledWith("user_id", "auth-user");
    expect(query.eq).not.toHaveBeenCalledWith("user_id", "fixture-user");
  });

  it("normalizes existing live route wrappers to the frozen consumer shapes", async () => {
    configureLive();
    const fixtures = await import("@/lib/fixtures");
    const saved = fixtures.savedPerchesFixture[0];
    const request = fixtures.friendRequestsFixture[0];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const body = url === "/api/perches/saved" ? { saved: [saved] } : { friends: [request] };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );

    const source = await import("@/lib/data/source");

    await expect(source.getSavedPerches()).resolves.toEqual([saved]);
    await expect(source.getFriendRequests()).resolves.toEqual({ requests: [request] });
  });

  it("falls back without calling live services when configuration is missing", async () => {
    configureLive(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const source = await import("@/lib/data/source");
    const fixtures = await import("@/lib/fixtures");

    await expect(source.getFeed()).resolves.toBe(fixtures.feedFixture);
    expect(source.currentMode()).toBe("fixture");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back when a live request throws", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("forced network failure")));

    const source = await import("@/lib/data/source");
    const fixtures = await import("@/lib/fixtures");

    await expect(source.getFeed()).resolves.toBe(fixtures.feedFixture);
  });

  it("restores the established fixture identity after an identity-scoped live error", async () => {
    configureLive();
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue({ data: null, error: new Error("forced query error") });
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "auth-user" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(query),
    };

    const source = await import("@/lib/data/source");
    const fixtures = await import("@/lib/fixtures");
    const result = await source.getChecklist("auth-user", {
      supabase: supabase as never,
      fetch: vi.fn() as never,
    });

    expect(result).toEqual(
      fixtures.checklistFixture.filter((item) => item.user_id === fixtures.meFixture.id),
    );
  });

  it("falls back when a successful response cannot satisfy the frozen shape", async () => {
    configureLive();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ wrong: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const source = await import("@/lib/data/source");
    const fixtures = await import("@/lib/fixtures");

    await expect(source.getFeed()).resolves.toBe(fixtures.feedFixture);
  });
});
