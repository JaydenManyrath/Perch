import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const listingId = "11111111-1111-5111-8111-111111111111";
const swipedId = "22222222-2222-5222-8222-222222222222";

const listing = {
  id: listingId,
  title: "Fresh perch",
  address: "10 Demo St",
  lat: 47.61,
  lng: -122.33,
  price: 1800,
  lease_start: "2026-06-01",
  lease_end: "2026-08-15",
  lease_type: "sublet",
  source: "legacy",
  photos: [],
  safety_flags: { scamSignals: [], notes: [] },
  created_by: null,
  created_at: "2026-07-01T00:00:00.000Z",
  status: "available",
  // Relative so a "fresh" fixture never silently expires on a later run date.
  expires_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  last_confirmed_at: null,
  sourced: true,
  source_name: "seed-adapter",
  source_url: null,
  external_id: "seed-1",
  users: null,
};

class Query {
  calls: { method: string; args: unknown[] }[] = [];
  result: unknown;

  constructor(result: unknown) {
    this.result = result;
  }

  select(...args: unknown[]) { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return this; }
  gt(...args: unknown[]) { this.calls.push({ method: "gt", args }); return this; }
  not(...args: unknown[]) { this.calls.push({ method: "not", args }); return this; }
  neq(...args: unknown[]) { this.calls.push({ method: "neq", args }); return this; }
  order(...args: unknown[]) { this.calls.push({ method: "order", args }); return this; }
  limit(...args: unknown[]) { this.calls.push({ method: "limit", args }); return this; }
  in(...args: unknown[]) { this.calls.push({ method: "in", args }); return this; }
  single() { this.calls.push({ method: "single", args: [] }); return Promise.resolve(this.result); }
  maybeSingle() { this.calls.push({ method: "maybeSingle", args: [] }); return Promise.resolve(this.result); }
  insert(...args: unknown[]) { this.calls.push({ method: "insert", args }); return Promise.resolve(this.result); }
  then(resolve: (value: unknown) => void) { return Promise.resolve(this.result).then(resolve); }
}

function supabaseWith(tables: Record<string, Query[]>) {
  const used: Record<string, Query[]> = {};
  return {
    used,
    client: {
      from(name: string) {
        const query = tables[name].shift();
        if (!query) throw new Error(`unexpected table ${name}`);
        used[name] ??= [];
        used[name].push(query);
        return query;
      },
    },
  };
}

function request(body?: unknown) {
  return new Request("http://localhost/api/perches", {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  });
}

describe("perches routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("GET /api/perches requires the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/perches/route");

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("GET /api/perches excludes swiped listings and returns deck cards", async () => {
    const db = supabaseWith({
      listing_swipes: [new Query({ data: [{ listing_id: swipedId }], error: null })],
      listings: [new Query({ data: [listing], error: null })],
      reviews: [new Query({ data: [{ subject_id: listingId, rating: 5 }], error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { GET } = await import("@/app/api/perches/route");

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deck).toHaveLength(1);
    expect(body.deck[0]).toMatchObject({ id: listingId, sourceName: "seed-adapter" });
    expect(body.deck[0]).not.toHaveProperty("source");
    expect(body.deck[0]).not.toHaveProperty("created_by");
    expect(db.used.listings[0].calls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["status", "available"] },
        { method: "not", args: ["id", "in", `(${swipedId})`] },
      ]),
    );
  });

  it("POST /api/perches/swipe is Intern-only and idempotent", async () => {
    const existing = new Query({ data: { direction: "right" }, error: null });
    const insert = new Query({ data: null, error: null });
    const db = supabaseWith({
      users: [new Query({ data: { user_type: "intern" }, error: null })],
      listings: [new Query({ data: { id: listingId }, error: null })],
      listing_swipes: [existing, insert],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { POST } = await import("@/app/api/perches/swipe/route");

    const response = await POST(request({ listingId, direction: "left" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ listingId, direction: "right" });
    expect(insert.calls).not.toContainEqual(expect.objectContaining({ method: "insert" }));
  });

  it("GET /api/perches/saved returns right swipes without freshness filtering", async () => {
    const stale = { ...listing, status: "taken", expires_at: "2026-07-01T00:00:00.000Z" };
    const db = supabaseWith({
      listing_swipes: [new Query({ data: [{ listing_id: listingId, listings: stale }], error: null })],
      reviews: [new Query({ data: [], error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { GET } = await import("@/app/api/perches/saved/route");

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.saved).toHaveLength(1);
    expect(body.saved[0]).toMatchObject({ id: listingId, status: "taken" });
    expect(db.used.listing_swipes[0].calls).toEqual(
      expect.arrayContaining([{ method: "eq", args: ["direction", "right"] }]),
    );
  });
});
