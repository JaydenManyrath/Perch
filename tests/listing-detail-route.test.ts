import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const internId = "11111111-1111-5111-8111-111111111111";
const listingId = "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb";
const subletterId = "33333333-3333-5333-8333-333333333333";

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result));
  return q;
}

const listingRow = {
  id: listingId,
  title: "Sunny studio",
  address: "100 Demo St",
  lat: 47.61,
  lng: -122.34,
  price: 1800,
  lease_start: "2026-06-01",
  lease_end: "2026-08-31",
  lease_type: "sublet",
  source: null,
  photos: [],
  safety_flags: { scamSignals: [], notes: [] },
  created_by: subletterId,
  created_at: "2026-07-01T00:00:00.000Z",
  status: "available",
  expires_at: "2026-07-30T00:00:00.000Z",
  last_confirmed_at: null,
  sourced: false,
  source_name: "subletter",
  source_url: null,
  external_id: null,
  furnished: true,
  pros: ["Bright", "Near transit"],
  bedrooms: 1,
  bathrooms: "1.5",
  sqft: 520,
  amenities: ["wifi", "gym"],
  utilities_included: true,
  users: { id: subletterId, name: "Maya S.", avatar_url: null, user_type: "subletter" },
};

function db(listing: unknown, reviews: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === "listings") return chain({ data: listing, error: null });
      if (table === "reviews") return chain({ data: reviews, error: null });
      return chain({ data: null, error: null });
    }),
  };
}

describe("GET /api/listings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/listings/[id]/route");
    const res = await GET(new NextRequest(`http://localhost/api/listings/${listingId}`), { params: { id: listingId } });
    expect(res.status).toBe(401);
  });

  it("returns a comprehensive ListingDetail with host and review summary", async () => {
    createServerSupabase.mockResolvedValue(
      db(listingRow, [
        { subject_id: listingId, rating: 5 },
        { subject_id: listingId, rating: 4 },
      ]),
    );
    const { GET } = await import("@/app/api/listings/[id]/route");
    const res = await GET(new NextRequest(`http://localhost/api/listings/${listingId}`), { params: { id: listingId } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      id: listingId,
      furnished: true,
      pros: ["Bright", "Near transit"],
      bedrooms: 1,
      bathrooms: 1.5,
      sqft: 520,
      amenities: ["wifi", "gym"],
      utilitiesIncluded: true,
      leaseStart: "2026-06-01",
      status: "available",
      host: { id: subletterId, name: "Maya S.", avatarUrl: null },
      reviewSummary: { avgRating: 4.5, count: 2 },
    });
  });

  it("404s when the listing is missing", async () => {
    createServerSupabase.mockResolvedValue(db(null, []));
    const { GET } = await import("@/app/api/listings/[id]/route");
    const res = await GET(new NextRequest(`http://localhost/api/listings/${listingId}`), { params: { id: listingId } });
    expect(res.status).toBe(404);
  });

  it("400s on an invalid listing id", async () => {
    createServerSupabase.mockResolvedValue(db(listingRow, []));
    const { GET } = await import("@/app/api/listings/[id]/route");
    const res = await GET(new NextRequest("http://localhost/api/listings/not-a-uuid"), { params: { id: "not-a-uuid" } });
    expect(res.status).toBe(400);
  });
});
