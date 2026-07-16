import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();
const createAdminClient = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const subletterId = "33333333-3333-5333-8333-333333333333";
const internId = "11111111-1111-5111-8111-111111111111";
const listingId = "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa";

const input = {
  title: "Capitol Hill summer room",
  address: "10 Pine St, Seattle, WA",
  lat: 47.61,
  lng: -122.32,
  price: 1800,
  leaseStart: "2026-06-01",
  leaseEnd: "2026-08-15",
  leaseType: "sublet",
  photos: ["/listing/demo.jpg"],
  safetyNotes: ["Demo note from the subletter."],
};

const listing = {
  id: listingId,
  title: "Authoritative DB title",
  address: input.address,
  lat: input.lat,
  lng: input.lng,
  price: input.price,
  lease_start: input.leaseStart,
  lease_end: input.leaseEnd,
  lease_type: input.leaseType,
  source: null,
  photos: input.photos,
  safety_flags: { scamSignals: [], notes: input.safetyNotes },
  created_by: subletterId,
  created_at: "2026-07-16T00:00:00.000Z",
  status: "available",
  expires_at: "2026-07-23T00:00:00.000Z",
  last_confirmed_at: null,
  sourced: false,
  source_name: "subletter",
  source_url: null,
  external_id: null,
  users: { id: subletterId, name: "Sam Subletter", avatar_url: "/sam.jpg", user_type: "subletter" },
};

class Query {
  calls: { method: string; args: unknown[] }[] = [];
  result: unknown;

  constructor(result: unknown) {
    this.result = result;
  }

  select(...args: unknown[]) { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return this; }
  insert(...args: unknown[]) { this.calls.push({ method: "insert", args }); return this; }
  update(...args: unknown[]) { this.calls.push({ method: "update", args }); return this; }
  single() { this.calls.push({ method: "single", args: [] }); return Promise.resolve(this.result); }
  maybeSingle() { this.calls.push({ method: "maybeSingle", args: [] }); return Promise.resolve(this.result); }
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

function request(body: unknown = input) {
  return new Request("http://localhost/api/listings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("/api/listings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId: subletterId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { POST } = await import("@/app/api/listings/route");

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("lets a subletter post a listing and returns the authoritative PerchCard", async () => {
    const fakeDb = db({
      users: [new Query({ data: { user_type: "subletter" }, error: null })],
    });
    const adminDb = db({ listings: [new Query({ data: listing, error: null })] });
    createServerSupabase.mockResolvedValue(fakeDb.client);
    createAdminClient.mockReturnValue(adminDb.client);
    const { POST } = await import("@/app/api/listings/route");

    const response = await POST(request({ ...input, title: "Untrusted request title" }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.listing).toMatchObject({
      id: listingId,
      title: "Authoritative DB title",
      status: "available",
      sourceName: "subletter",
      host: { id: subletterId, name: "Sam Subletter", avatarUrl: "/sam.jpg" },
    });
    expect(body.listing).not.toHaveProperty("created_by");
    expect(body.listing).not.toHaveProperty("source");
    expect(adminDb.used.listings[0].calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "insert",
          args: [
            expect.objectContaining({
              created_by: subletterId,
              sourced: false,
              source_name: "subletter",
              status: "available",
              last_confirmed_at: null,
            }),
          ],
        }),
      ]),
    );
  });

  it("rejects interns and protected request fields", async () => {
    createServerSupabase.mockResolvedValue(
      db({ users: [new Query({ data: { user_type: "intern" }, error: null })] }).client,
    );
    const { POST } = await import("@/app/api/listings/route");

    guard.mockResolvedValueOnce({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
    const intern = await POST(request());
    expect(intern.status).toBe(403);

    const forged = await POST(request({ ...input, created_by: internId, status: "taken" }));
    expect(forged.status).toBe(400);
  });
});

describe("/api/listings/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId: subletterId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("lets only the owning subletter confirm a subletter-posted listing", async () => {
    const sessionDb = db({
      users: [new Query({ data: { user_type: "subletter" }, error: null })],
      listings: [new Query({ data: { id: listingId, created_by: subletterId, sourced: false, source_name: "subletter" }, error: null })],
    });
    const adminDb = db({ listings: [new Query({ data: { ...listing, last_confirmed_at: "2026-07-16T12:00:00.000Z" }, error: null })] });
    createServerSupabase.mockResolvedValue(sessionDb.client);
    createAdminClient.mockReturnValue(adminDb.client);
    const { POST } = await import("@/app/api/listings/[id]/confirm/route");

    const response = await POST(request(), { params: { id: listingId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.listing).toMatchObject({ id: listingId, status: "available", sourceName: "subletter" });
    expect(adminDb.used.listings[0].calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "update",
          args: [expect.objectContaining({ status: "available", last_confirmed_at: expect.any(String), expires_at: expect.any(String) })],
        }),
      ]),
    );
  });

  it("rejects interns, non-owners, and owners of sourced rows", async () => {
    const { POST } = await import("@/app/api/listings/[id]/confirm/route");

    createServerSupabase.mockResolvedValueOnce(
      db({ users: [new Query({ data: { user_type: "intern" }, error: null })] }).client,
    );
    guard.mockResolvedValueOnce({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
    expect((await POST(request(), { params: { id: listingId } })).status).toBe(403);

    createServerSupabase.mockResolvedValueOnce(
      db({
        users: [new Query({ data: { user_type: "subletter" }, error: null })],
        listings: [new Query({ data: { id: listingId, created_by: "other", sourced: false, source_name: "subletter" }, error: null })],
      }).client,
    );
    expect((await POST(request(), { params: { id: listingId } })).status).toBe(403);

    createServerSupabase.mockResolvedValueOnce(
      db({
        users: [new Query({ data: { user_type: "subletter" }, error: null })],
        listings: [new Query({ data: { id: listingId, created_by: subletterId, sourced: true, source_name: "seed-adapter" }, error: null })],
      }).client,
    );
    expect((await POST(request(), { params: { id: listingId } })).status).toBe(403);
    expect(createAdminClient).not.toHaveBeenCalled();
  });
});
