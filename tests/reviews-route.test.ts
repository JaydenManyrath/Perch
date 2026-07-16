import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const listingId = "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa";
const internId = "11111111-1111-5111-8111-111111111111";
const otherInternId = "22222222-2222-5222-8222-222222222222";

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.in = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result));
  return q;
}

function db(overrides: Record<string, unknown> = {}) {
  const reviewRows = [
    {
      id: "r-1",
      subject_type: "listing",
      subject_id: listingId,
      reviewer_id: internId,
      rating: 5,
      body: "Demo review: close to work.",
      created_at: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "r-2",
      subject_type: "listing",
      subject_id: listingId,
      reviewer_id: otherInternId,
      rating: 4,
      body: "Demo review: quiet block.",
      created_at: "2026-07-01T00:00:00.000Z",
    },
  ];

  const base = {
    upsert: vi.fn(() => Promise.resolve({ error: null })),
    from: vi.fn((table: string) => {
      if (table === "listings") return chain({ data: { id: listingId }, error: null });
      if (table === "users") {
        const users = [
          { id: internId, name: "Ada K.", avatar_url: null, user_type: "intern" },
          { id: otherInternId, name: "Ben L.", avatar_url: "/ben.png", user_type: "intern" },
        ];
        const q = chain({ data: users, error: null });
        q.maybeSingle = vi.fn(() => Promise.resolve({ data: users[0], error: null }));
        return q;
      }
      if (table === "reviews") {
        const q = chain({ data: reviewRows, error: null });
        q.upsert = base.upsert;
        return q;
      }
      return chain({ data: null, error: null });
    }),
  };
  return { ...base, ...overrides };
}

describe("/api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
    createServerSupabase.mockResolvedValue(db());
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { GET } = await import("@/app/api/reviews/route");

    const response = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=listing&subjectId=${listingId}`));

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("GET returns exactly reviews and summary in stable review order", async () => {
    const { GET } = await import("@/app/api/reviews/route");

    const response = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=listing&subjectId=${listingId}`));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["reviews", "summary"]);
    expect(body.summary).toEqual({ avgRating: 4.5, count: 2 });
    expect(body.reviews.map((review: { id: string }) => review.id)).toEqual(["r-1", "r-2"]);
  });

  it("POST upserts the caller review and returns the complete recomputed response", async () => {
    const fakeDb = db();
    createServerSupabase.mockResolvedValue(fakeDb);
    const { POST } = await import("@/app/api/reviews/route");

    const response = await POST(
      new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          subjectType: "listing",
          subjectId: listingId,
          reviewer_id: otherInternId,
          rating: 4,
          body: "Updated from caller only.",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fakeDb.upsert).toHaveBeenCalledWith(
      {
        subject_type: "listing",
        subject_id: listingId,
        reviewer_id: internId,
        rating: 4,
        body: "Updated from caller only.",
      },
      { onConflict: "subject_type,subject_id,reviewer_id" },
    );
    expect(body.reviews).toHaveLength(2);
    expect(body.summary).toEqual({ avgRating: 4.5, count: 2 });
  });

  it("rejects invalid subjects, invalid ratings, and subletter callers", async () => {
    const { GET, POST } = await import("@/app/api/reviews/route");

    const invalidSubject = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=intern&subjectId=${listingId}`));
    expect(invalidSubject.status).toBe(400);

    const invalidRating = await POST(
      new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        body: JSON.stringify({ subjectType: "listing", subjectId: listingId, rating: 0, body: "" }),
      }),
    );
    expect(invalidRating.status).toBe(400);

    createServerSupabase.mockResolvedValueOnce(
      db({
        from: vi.fn((table: string) => {
          if (table === "users") return chain({ data: { id: internId, user_type: "subletter" }, error: null });
          return db().from(table);
        }),
      }),
    );
    const subletter = await POST(
      new NextRequest("http://localhost/api/reviews", {
        method: "POST",
        body: JSON.stringify({ subjectType: "listing", subjectId: listingId, rating: 5, body: "" }),
      }),
    );
    expect(subletter.status).toBe(403);
  });

  it("rejects missing listing subjects and missing subletter user subjects", async () => {
    const { GET } = await import("@/app/api/reviews/route");

    createServerSupabase.mockResolvedValueOnce(
      db({
        from: vi.fn((table: string) => {
          if (table === "listings") return chain({ data: null, error: null });
          return db().from(table);
        }),
      }),
    );
    const missingListing = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=listing&subjectId=${listingId}`));
    expect(missingListing.status).toBe(400);

    createServerSupabase.mockResolvedValueOnce(
      db({
        from: vi.fn((table: string) => {
          if (table === "users") return chain({ data: null, error: null });
          return db().from(table);
        }),
      }),
    );
    const missingUser = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=subletter&subjectId=${otherInternId}`));
    expect(missingUser.status).toBe(400);
  });

  it("rejects an intern falsely declared as a subletter review subject", async () => {
    const { GET } = await import("@/app/api/reviews/route");
    createServerSupabase.mockResolvedValueOnce(
      db({
        from: vi.fn((table: string) => {
          if (table === "users") return chain({ data: null, error: null });
          return db().from(table);
        }),
      }),
    );

    const response = await GET(new NextRequest(`http://localhost/api/reviews?subjectType=subletter&subjectId=${internId}`));

    expect(response.status).toBe(400);
  });
});
