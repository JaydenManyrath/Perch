import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createAdminClient = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const internId = "11111111-1111-5111-8111-111111111111";

class Query {
  calls: { method: string; args: unknown[] }[] = [];

  constructor(private result: unknown = { error: null }) {}

  update(...args: unknown[]) { this.calls.push({ method: "update", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return Promise.resolve(this.result); }
}

describe("PATCH /api/onboarding/offer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: internId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { PATCH } = await import("@/app/api/onboarding/offer/route");

    const res = await PATCH(new NextRequest("http://localhost/api/onboarding/offer", { method: "PATCH" }));

    expect(res.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("persists corrected finance fields to the caller row", async () => {
    const query = new Query();
    createAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        expect(table).toBe("users");
        return query;
      }),
    });
    const { PATCH } = await import("@/app/api/onboarding/offer/route");

    const res = await PATCH(
      new NextRequest("http://localhost/api/onboarding/offer", {
        method: "PATCH",
        body: JSON.stringify({
          city: " Seattle, WA ",
          salary: 60000.4,
          relocationStipend: 5000,
          signingBonus: 10000,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(query.calls).toContainEqual({
      method: "update",
      args: [{
        city: "Seattle, WA",
        offer_salary: 60000,
        relocation_stipend: 5000,
        signing_bonus: 10000,
      }],
    });
    expect(query.calls).toContainEqual({ method: "eq", args: ["id", internId] });
  });

  it("stores absent benefits as null so finance reads normalize them to zero", async () => {
    const query = new Query();
    createAdminClient.mockReturnValue({ from: vi.fn(() => query) });
    const { PATCH } = await import("@/app/api/onboarding/offer/route");

    const res = await PATCH(
      new NextRequest("http://localhost/api/onboarding/offer", {
        method: "PATCH",
        body: JSON.stringify({ city: "Austin", salary: 90000, relocationStipend: "", signingBonus: null }),
      }),
    );

    expect(res.status).toBe(200);
    expect(query.calls[0]).toEqual({
      method: "update",
      args: [{
        city: "Austin",
        offer_salary: 90000,
        relocation_stipend: null,
        signing_bonus: null,
      }],
    });
  });
});
