import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const internId = "11111111-1111-5111-8111-111111111111";

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.ilike = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  return q;
}

function db(user: unknown, col: unknown) {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") return chain({ data: user, error: null });
      if (table === "cost_of_living") return chain({ data: col, error: null });
      return chain({ data: null, error: null });
    }),
  };
}

describe("GET /api/finance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance"));
    expect(res.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns a deterministic, coherent breakdown from persisted offer + COL", async () => {
    createServerSupabase.mockResolvedValue(
      db(
        { city: "Seattle", offer_salary: 60000, relocation_stipend: 5000, signing_bonus: 10000 },
        { city: "Seattle", index: 152, median_rent: 2100 },
      ),
    );
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.salary).toBe(60000);
    expect(body.takeHome).toBe(47194);
    expect(body.takeHome).toBeLessThan(body.salary);
    expect(body.costOfLivingIndex).toBe(152);
    expect(body.relocationStipend).toBe(5000);
    expect(body.signingBonus).toBe(10000);
    expect(body.city).toBe("Seattle");
    expect(body.monthlyBudget).toBeGreaterThan(0);
    expect(body.upfrontCashNeeded).toBeGreaterThan(2100);
  });

  it("lets query params override persisted values", async () => {
    createServerSupabase.mockResolvedValue(
      db({ city: "Austin", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 }, { city: "Austin", index: 103, median_rent: 1650 }),
    );
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance?salary=200000"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.salary).toBe(200000);
  });

  it("falls back to the national index when the city is unknown", async () => {
    createServerSupabase.mockResolvedValue(db({ city: "Nowhere", offer_salary: 100000 }, null));
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.costOfLivingIndex).toBe(100);
    expect(body.city).toBe("National");
  });
});
