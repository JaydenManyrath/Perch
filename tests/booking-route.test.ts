import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();
const createAdminClient = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const internId = "11111111-1111-5111-8111-111111111111";
const subletterId = "33333333-3333-5333-8333-333333333333";
const listingId = "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb";

function thenable(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.in = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.single = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
  return q;
}

const insertedBooking = {
  id: "bk-1",
  listing_id: listingId,
  booker_id: internId,
  roommate_ids: [],
  roommate_invites: [],
  status: "requested",
  created_at: "2026-07-16T00:00:00.000Z",
  decided_at: null,
};

function serverDb(opts: { userType?: string; listing?: unknown } = {}) {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") {
        const q = thenable({ data: [{ id: internId, name: "Ada K.", avatar_url: null }], error: null });
        q.maybeSingle = vi.fn(() => Promise.resolve({ data: { user_type: opts.userType ?? "intern" }, error: null }));
        return q;
      }
      if (table === "listings") {
        return thenable({
          data:
            opts.listing === undefined
              ? { id: listingId, status: "available", expires_at: "2026-12-01T00:00:00.000Z", created_by: subletterId }
              : opts.listing,
          error: null,
        });
      }
      return thenable({ data: null, error: null });
    }),
  };
}

function adminDb(existingHolds: unknown[] = []) {
  return {
    from: vi.fn((table: string) => {
      if (table === "bookings") {
        const q = thenable({ data: insertedBooking, error: null });
        q.insert = vi.fn(() => q);
        // The existing-hold check: select().eq().in() is awaited directly.
        q.in = vi.fn(() => thenable({ data: existingHolds, error: null }));
        return q;
      }
      return thenable({ data: null, error: null });
    }),
  };
}

describe("POST /api/listings/[id]/book", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("creates a requested booking for an intern on an available listing", async () => {
    createServerSupabase.mockResolvedValue(serverDb());
    createAdminClient.mockReturnValue(adminDb([]));
    const { POST } = await import("@/app/api/listings/[id]/book/route");

    const res = await POST(
      new NextRequest(`http://localhost/api/listings/${listingId}/book`, { method: "POST", body: JSON.stringify({}) }),
      { params: { id: listingId } },
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toMatchObject({ id: "bk-1", listingId, status: "requested", booker: { id: internId } });
  });

  it("403s when a subletter tries to book", async () => {
    createServerSupabase.mockResolvedValue(serverDb({ userType: "subletter" }));
    createAdminClient.mockReturnValue(adminDb([]));
    const { POST } = await import("@/app/api/listings/[id]/book/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/listings/${listingId}/book`, { method: "POST", body: JSON.stringify({}) }),
      { params: { id: listingId } },
    );
    expect(res.status).toBe(403);
  });

  it("409s when the listing already has a live hold", async () => {
    createServerSupabase.mockResolvedValue(serverDb());
    createAdminClient.mockReturnValue(adminDb([{ id: "other", status: "approved" }]));
    const { POST } = await import("@/app/api/listings/[id]/book/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/listings/${listingId}/book`, { method: "POST", body: JSON.stringify({}) }),
      { params: { id: listingId } },
    );
    expect(res.status).toBe(409);
  });

  it("409s when the listing is not available", async () => {
    createServerSupabase.mockResolvedValue(
      serverDb({ listing: { id: listingId, status: "taken", expires_at: "2026-12-01T00:00:00.000Z", created_by: subletterId } }),
    );
    createAdminClient.mockReturnValue(adminDb([]));
    const { POST } = await import("@/app/api/listings/[id]/book/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/listings/${listingId}/book`, { method: "POST", body: JSON.stringify({}) }),
      { params: { id: listingId } },
    );
    expect(res.status).toBe(409);
  });

  it("403s when the caller owns the listing", async () => {
    createServerSupabase.mockResolvedValue(
      serverDb({ listing: { id: listingId, status: "available", expires_at: "2026-12-01T00:00:00.000Z", created_by: internId } }),
    );
    createAdminClient.mockReturnValue(adminDb([]));
    const { POST } = await import("@/app/api/listings/[id]/book/route");
    const res = await POST(
      new NextRequest(`http://localhost/api/listings/${listingId}/book`, { method: "POST", body: JSON.stringify({}) }),
      { params: { id: listingId } },
    );
    expect(res.status).toBe(403);
  });
});
