import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetBuckets } from "@/lib/llm/ratelimit";
import type { NegotiateStreamEvent } from "@/lib/types/contract";

const getCallerId = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ getCallerId, createServerSupabase }));

const callerId = "11111111-1111-5111-8111-111111111111";

function request(monthlyBudget: number) {
  return new Request("http://localhost/api/negotiate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({
      listingIds: ["listing-1"],
      constraints: {
        monthlyBudget,
        moveIn: "2026-06-08",
        moveOut: "2026-08-14",
      },
    }),
  });
}

function db(user: unknown, col: unknown, listingPrice = 1800) {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: user, error: null })),
            })),
          })),
        };
      }
      if (table === "cost_of_living") {
        return {
          select: vi.fn(() => ({
            ilike: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: col, error: null })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          in: vi.fn(async () => ({
            data: [
              {
                id: "listing-1",
                title: "Capitol Hill studio",
                price: listingPrice,
                lat: 47.615,
                lng: -122.34,
                lease_start: "2026-06-01",
                lease_end: "2026-08-31",
                safety_flags: { scamSignals: [], notes: [] },
              },
            ],
            error: null,
          })),
        })),
      };
    }),
  };
}

async function events(res: Response): Promise<NegotiateStreamEvent[]> {
  const text = await res.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as NegotiateStreamEvent);
}

function budgetVerdict(events: NegotiateStreamEvent[]) {
  return events.find(
    (e): e is Extract<NegotiateStreamEvent, { type: "scout_verdict" }> =>
      e.type === "scout_verdict" && e.check === "budget",
  )!;
}

describe("POST /api/negotiate canonical affordability", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    __resetBuckets();
    process.env.RATE_LIMIT_MAX = "50";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.LLM_DISABLED = "1";
    getCallerId.mockResolvedValue(callerId);
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.LLM_DISABLED;
  });

  it("uses persisted salary and cost-of-living instead of a conflicting raw monthly budget", async () => {
    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "Seattle", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 },
        { city: "Seattle", index: 152, median_rent: 2100 },
      ),
    );
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(request(10_000));
    const verdict = budgetVerdict(await events(res));

    expect(res.status).toBe(200);
    expect(verdict.verdict).toBe("fail");
    expect(verdict.value).toContain("$1,573");
  });

  it("lets canonical salary changes affect the streamed deterministic verdict", async () => {
    const { POST } = await import("@/app/api/negotiate/route");

    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "Seattle", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 },
        { city: "Seattle", index: 152, median_rent: 2100 },
      ),
    );
    const lower = budgetVerdict(await events(await POST(request(10_000))));

    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "Seattle", offer_salary: 120000, relocation_stipend: 0, signing_bonus: 0 },
        { city: "Seattle", index: 152, median_rent: 2100 },
      ),
    );
    const higher = budgetVerdict(await events(await POST(request(10_000))));

    expect(lower.verdict).toBe("fail");
    expect(higher.verdict).toBe("pass");
  });

  it("lets canonical cost-of-living changes affect the streamed deterministic verdict", async () => {
    const { POST } = await import("@/app/api/negotiate/route");

    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "National", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 },
        { city: "National", index: 100, median_rent: 1450 },
        1700,
      ),
    );
    const national = budgetVerdict(await events(await POST(request(10_000))));

    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "Seattle", offer_salary: 60000, relocation_stipend: 0, signing_bonus: 0 },
        { city: "Seattle", index: 152, median_rent: 2100 },
        1700,
      ),
    );
    const seattle = budgetVerdict(await events(await POST(request(10_000))));

    expect(national.verdict).toBe("fail");
    expect(seattle.verdict).toBe("flag");
  });

  it("keeps the explicit no-salary fallback deterministic", async () => {
    createServerSupabase.mockResolvedValueOnce(
      db(
        { city: "Seattle", offer_salary: null, relocation_stipend: 0, signing_bonus: 0 },
        { city: "Seattle", index: 152, median_rent: 2100 },
      ),
    );
    const { POST } = await import("@/app/api/negotiate/route");
    const verdict = budgetVerdict(await events(await POST(request(2_000))));

    expect(verdict.verdict).toBe("pass");
    expect(verdict.value).toContain("$2,000");
  });
});
