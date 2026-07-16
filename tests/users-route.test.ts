import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const subletterId = "33333333-3333-5333-8333-333333333333";
const internId = "11111111-1111-5111-8111-111111111111";
const viewerId = "22222222-2222-5222-8222-222222222222";

const subletter = {
  id: subletterId,
  name: "Sam Subletter",
  role: "Lease holder",
  city: "Seattle",
  company: "Sublet Co",
  avatar_url: "/sam.jpg",
  user_type: "subletter",
  verified: true,
  taste_profile: { private: true },
  move_in_date: "2026-06-01",
};

const intern = {
  id: internId,
  name: "Ivy Intern",
  role: "SWE Intern",
  city: "Seattle",
  company: "Figma",
  avatar_url: null,
  user_type: "intern",
  verified: false,
  taste_profile: { private: true },
  move_in_date: "2026-06-01",
};

const freshListing = listing({
  id: "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa",
  title: "Fresh room",
  status: "available",
  expires_at: "2026-07-30T00:00:00.000Z",
});
const pendingListing = listing({
  id: "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb",
  title: "Pending room",
  status: "pending",
  expires_at: "2026-07-30T00:00:00.000Z",
});
const expiredListing = listing({
  id: "cccccccc-cccc-5ccc-8ccc-cccccccccccc",
  title: "Expired room",
  status: "available",
  expires_at: "2026-07-01T00:00:00.000Z",
});
const takenListing = listing({
  id: "dddddddd-dddd-5ddd-8ddd-dddddddddddd",
  title: "Taken room",
  status: "taken",
  expires_at: "2026-07-30T00:00:00.000Z",
});
const staleListing = listing({
  id: "eeeeeeee-eeee-5eee-8eee-eeeeeeeeeeee",
  title: "Stale room",
  status: "stale",
  expires_at: "2026-07-30T00:00:00.000Z",
});
const subletterListings = [freshListing, pendingListing, expiredListing, takenListing, staleListing];

function listing(overrides: Record<string, unknown>) {
  return {
    id: "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa",
    title: "Room",
    address: "10 Pine St, Seattle, WA",
    lat: 47.61,
    lng: -122.32,
    price: 1800,
    lease_start: "2026-06-01",
    lease_end: "2026-08-15",
    lease_type: "sublet",
    source: "legacy-source",
    photos: ["/listing/demo.jpg"],
    safety_flags: { scamSignals: [], notes: [] },
    created_by: subletterId,
    created_at: "2026-07-16T00:00:00.000Z",
    status: "available",
    expires_at: "2026-07-30T00:00:00.000Z",
    last_confirmed_at: null,
    sourced: false,
    source_name: "subletter",
    source_url: null,
    external_id: null,
    users: { id: subletterId, name: "Sam Subletter", avatar_url: "/sam.jpg", user_type: "subletter" },
    ...overrides,
  };
}

class Query {
  calls: { method: string; args: unknown[] }[] = [];

  constructor(private result: unknown) {}

  select(...args: unknown[]) { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return this; }
  gt(...args: unknown[]) { this.calls.push({ method: "gt", args }); return this; }
  in(...args: unknown[]) { this.calls.push({ method: "in", args }); return this; }
  order(...args: unknown[]) { this.calls.push({ method: "order", args }); return this; }
  maybeSingle() { this.calls.push({ method: "maybeSingle", args: [] }); return Promise.resolve(this.result); }
  then(resolve: (value: unknown) => void) { return Promise.resolve(this.result).then(resolve); }
}

function db(tables: Record<string, Query[]>) {
  const used: Record<string, Query[]> = {};
  return {
    used,
    client: {
      from(name: string) {
        const query = tables[name]?.shift();
        if (!query) throw new Error(`unexpected table ${name}`);
        used[name] ??= [];
        used[name].push(query);
        return query;
      },
    },
  };
}

function req() {
  return new Request("http://localhost/api/users/profile", { headers: { "x-forwarded-for": "127.0.0.1" } });
}

describe("/api/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId: viewerId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/users/[id]/route");

    const response = await GET(req(), { params: { id: subletterId } });

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns not found for an unknown profile id", async () => {
    createServerSupabase.mockResolvedValue(
      db({ users: [new Query({ data: null, error: null })] }).client,
    );
    const { GET } = await import("@/app/api/users/[id]/route");

    const response = await GET(req(), { params: { id: subletterId } });

    expect(response.status).toBe(404);
  });

  it("omits subletter-only sections for intern profiles and exposes only public user fields", async () => {
    createServerSupabase.mockResolvedValue(
      db({ users: [new Query({ data: intern, error: null })] }).client,
    );
    const { GET } = await import("@/app/api/users/[id]/route");

    const response = await GET(req(), { params: { id: internId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      user: {
        id: internId,
        name: "Ivy Intern",
        role: "SWE Intern",
        city: "Seattle",
        company: "Figma",
        avatarUrl: null,
      },
      userType: "intern",
      banded: false,
    });
  });

  it("shows only fresh available Subletter listings to other viewers", async () => {
    const fakeDb = db({
      users: [new Query({ data: subletter, error: null })],
      reviews: [
        new Query({ data: [{ subject_id: subletterId, rating: 5 }, { subject_id: subletterId, rating: 4 }], error: null }),
        new Query({ data: [{ subject_id: freshListing.id, rating: 5 }], error: null }),
      ],
      listings: [new Query({ data: [freshListing], error: null })],
    });
    createServerSupabase.mockResolvedValue(fakeDb.client);
    const { GET } = await import("@/app/api/users/[id]/route");

    const response = await GET(req(), { params: { id: subletterId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviewSummary).toEqual({ avgRating: 4.5, count: 2 });
    expect(body.listings).toHaveLength(1);
    expect(body.listings[0]).toMatchObject({
      id: freshListing.id,
      kind: "listing",
      status: "available",
      expiresAt: freshListing.expires_at,
      host: { id: subletterId, name: "Sam Subletter", avatarUrl: "/sam.jpg" },
    });
    expect(body.listings[0]).not.toHaveProperty("created_by");
    expect(body.listings[0]).not.toHaveProperty("source");
    expect(body.user).not.toHaveProperty("taste_profile");
    expect(body.user).not.toHaveProperty("move_in_date");
    expect(fakeDb.used.listings[0].calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "eq", args: ["status", "available"] }),
        expect.objectContaining({ method: "gt", args: ["expires_at", expect.any(String)] }),
      ]),
    );
  });

  it("shows every Subletter listing to the profile owner", async () => {
    guard.mockResolvedValueOnce({ callerId: subletterId, headers: { "X-RateLimit-Limit": "20" } });
    const fakeDb = db({
      users: [new Query({ data: subletter, error: null })],
      reviews: [
        new Query({ data: [{ subject_id: subletterId, rating: 5 }], error: null }),
        new Query({ data: [], error: null }),
      ],
      listings: [new Query({ data: subletterListings, error: null })],
    });
    createServerSupabase.mockResolvedValue(fakeDb.client);
    const { GET } = await import("@/app/api/users/[id]/route");

    const response = await GET(req(), { params: { id: subletterId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.listings.map((card: { id: string }) => card.id)).toEqual(
      subletterListings.map((row) => row.id),
    );
    expect(body.listings.map((card: { status: string }) => card.status)).toEqual([
      "available",
      "pending",
      "available",
      "taken",
      "stale",
    ]);
    expect(fakeDb.used.listings[0].calls).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "eq", args: ["status", "available"] }),
        expect.objectContaining({ method: "gt", args: ["expires_at", expect.any(String)] }),
      ]),
    );
  });
});
