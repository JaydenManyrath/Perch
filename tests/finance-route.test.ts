import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const internId = "11111111-1111-5111-8111-111111111111";

function chain(result: unknown, throws = false) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.ilike = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => {
    if (throws) throw new Error("database unavailable");
    return Promise.resolve(result);
  });
  return q;
}

function db(user: unknown, col: unknown, colThrows = false) {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") return chain({ data: user, error: null });
      if (table === "cost_of_living") {
        if (col && typeof col === "object" && "data" in col) return chain(col, colThrows);
        return chain({ data: col, error: null }, colThrows);
      }
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

  it("lets onboarding preview query params override persisted values", async () => {
    createServerSupabase.mockResolvedValue(
      db({ city: "Austin", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 }, { city: "Seattle", index: 152, median_rent: 2100 }),
    );
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance?salary=200000&city=Seattle&stipend=4500&bonus=12000"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.salary).toBe(200000);
    expect(body.city).toBe("Seattle");
    expect(body.relocationStipend).toBe(4500);
    expect(body.signingBonus).toBe(12000);
  });

  it("lets onboarding preview clear persisted salary and benefits", async () => {
    createServerSupabase.mockResolvedValue(
      db({ city: "Seattle", offer_salary: 60000, relocation_stipend: 5000, signing_bonus: 10000 }, { city: "National", index: 100, median_rent: 1450 }),
    );
    const { GET } = await import("@/app/api/finance/route");
    const res = await GET(new NextRequest("http://localhost/api/finance?salary=0&city=National&stipend=0&bonus=0"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.salary).toBeNull();
    expect(body.takeHome).toBe(0);
    expect(body.city).toBe("National");
    expect(body.relocationStipend).toBe(0);
    expect(body.signingBonus).toBe(0);
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

  it("uses the canonical lookup fallback for database errors, thrown failures, malformed rows, and empty cities", async () => {
    const { GET } = await import("@/app/api/finance/route");
    const cases = [
      {
        user: { city: "Seattle, WA", offer_salary: 100000 },
        col: { data: null, error: new Error("nope") },
        throws: false,
        expectedCity: "Seattle",
        expectedIndex: 152,
      },
      {
        user: { city: "Seattle", offer_salary: 100000 },
        col: null,
        throws: true,
        expectedCity: "Seattle",
        expectedIndex: 152,
      },
      {
        user: { city: "Seattle", offer_salary: 100000 },
        col: { city: "Seattle", index: "NaN", median_rent: -1 },
        throws: false,
        expectedCity: "Seattle",
        expectedIndex: 152,
      },
      {
        user: { city: "", offer_salary: 100000 },
        col: null,
        throws: false,
        expectedCity: "National",
        expectedIndex: 100,
      },
    ];

    for (const c of cases) {
      createServerSupabase.mockResolvedValueOnce(db(c.user, c.col, c.throws));
      const res = await GET(new NextRequest("http://localhost/api/finance"));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.city).toBe(c.expectedCity);
      expect(body.costOfLivingIndex).toBe(c.expectedIndex);
    }
  });
});
