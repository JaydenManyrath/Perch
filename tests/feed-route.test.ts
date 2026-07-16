import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

function request(url = "http://localhost/api/feed?limit=5") {
  return new NextRequest(url);
}

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.in = vi.fn(() => q);
  q.ilike = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.limit = vi.fn(async () => result);
  return q;
}

describe("GET /api/feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { GET } = await import("@/app/api/feed/route");

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns deterministic feed items with event fields, aggregate counts, and viewerGoing", async () => {
    const users = chain({
      data: { taste_profile: { topArtists: [], topGenres: ["indie"], topTracks: [] } },
      error: null,
    });
    const events = chain({
      data: [
        {
          id: "event-1",
          title: "Indie show",
          category: "indie",
          lat: 47.6,
          lng: -122.3,
          datetime: "2026-06-03T00:00:00Z",
          source: "ticketmaster",
          venue: "The Hall",
          url: "https://example.test/event",
          image_url: "https://example.test/image.jpg",
          price_range: "$20-$40",
        },
      ],
      error: null,
    });
    const attendance: Record<string, unknown> = {};
    attendance.select = vi.fn(() => attendance);
    attendance.in = vi.fn(() => attendance);
    attendance.eq = vi.fn(async () => ({ data: [{ event_id: "event-1" }], error: null }));
    const from = vi.fn((table: string) => ({ users, events, event_attendance: attendance })[table]);
    createServerSupabase.mockResolvedValue({
      from,
      rpc: vi.fn(async () => ({ data: 3, error: null })),
    });
    const { GET } = await import("@/app/api/feed/route");

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      event: {
        id: "event-1",
        venue: "The Hall",
        url: "https://example.test/event",
        imageUrl: "https://example.test/image.jpg",
        priceRange: "$20-$40",
      },
      internsGoing: 3,
      viewerGoing: true,
    });
  });
});
