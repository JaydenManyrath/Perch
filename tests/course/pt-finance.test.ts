/**
 * CS 7314 - PT/BBT on the finance readout and its inputs: salary as written in the
 * offer letter, salary -> take-home bands, cost-of-living index, and the negotiate
 * route's constraint inputs (stated budget, stay dates). Rows map to
 * docs/testing/pt/partitions.md. Expected values are hand-computed from the
 * documented 2025 single-filer constants in lib/finance/model.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { annualTakeHome, recommendedMonthlyBudget, upfrontCash, buildFinanceBreakdown } from "@/lib/finance/model";
import { parseOfferText } from "@/lib/parsers/offerLetter";
import { __resetBuckets } from "@/lib/llm/ratelimit";
import type { NegotiateStreamEvent } from "@/lib/types/contract";

describe("PT-F1 take-home by salary band (single filer)", () => {
  // salary, expected take-home, derivation (fed + FICA 7.65% (SS capped) + 5% state)
  const cases: [string, number, number][] = [
    ["PF-01 salary negative (invalid)", -1, 0],
    ["PF-02 salary zero (invalid)", 0, 0],
    ["PF-03 below standard deduction: 10,000 - 765 - 500", 10_000, 8_735],
    ["PF-04 at standard deduction edge: 14,600 - 1,116.90 - 730", 14_600, 12_753],
    ["PF-05 one dollar into 10% band", 14_601, 12_754],
    ["PF-06 12% band: 30,000 - 1,616 - 2,295 - 1,500", 30_000, 24_589],
    ["PF-07 24% band: 145,000 - 24,338.5 - 11,092.5 - 7,250", 145_000, 102_319],
    ["PF-08 above SS wage base: 200,000 - 37,538.5 - 13,353.2 - 10,000", 200_000, 139_108],
  ];
  for (const [name, salary, expected] of cases) {
    it(name, () => expect(annualTakeHome(salary)).toBe(expected));
  }
});

describe("PT-F2 COL-adjusted rent ceiling by cost-of-living class (monthly take-home 5,000)", () => {
  const cases: [string, number, number][] = [
    ["PF-09 COL below average (80)", 80, 1_200],
    ["PF-10 COL average (100)", 100, 1_500],
    ["PF-11 COL high, below cap (133)", 133, 1_995],
    ["PF-12 COL very high, capped at 40% (152)", 152, 2_000],
    ["PF-13 COL zero (invalid) -> national", 0, 1_500],
    ["PF-14 COL negative (invalid) -> national", -10, 1_500],
    ["PF-15 COL NaN (invalid) -> national", Number.NaN, 1_500],
  ];
  for (const [name, col, expected] of cases) {
    it(name, () => expect(recommendedMonthlyBudget(5_000, col)).toBe(expected));
  }
  it("PF-16 zero take-home -> zero ceiling", () => expect(recommendedMonthlyBudget(0, 100)).toBe(0));
  it("PF-17 upfront cash = 2x rent + COL-scaled 1,200 moving", () => expect(upfrontCash(2_000, 150)).toBe(5_800));
  it("PF-18 negative rent clamps to the moving estimate only", () => expect(upfrontCash(-500, 100)).toBe(1_200));
  it("PF-19 negative stipend/bonus clamp to zero in the breakdown", () => {
    const b = buildFinanceBreakdown({ salary: 60_000, city: "X", costOfLivingIndex: 100, medianRent: 1_000, relocationStipend: -5, signingBonus: -1 });
    expect([b.relocationStipend, b.signingBonus]).toEqual([0, 0]);
  });
});

describe("PT-F3 salary as written in the offer letter (pay-period dimension)", () => {
  const letter = (comp: string) =>
    `Dear Alex Chen,\nWe are pleased to offer you the role of Software Engineer Intern at Stripe in Seattle.\n${comp}\nStart date: June 8, 2026\nEnd date: August 14, 2026\n`;

  it("PF-20 labelled annual salary", () => expect(parseOfferText(letter("Base salary: $145,000")).salary).toBe(145_000));
  it("PF-21 '$X per year' form", () => expect(parseOfferText(letter("You will be paid $120,000 per year.")).salary).toBe(120_000));
  it("PF-22 no compensation stated -> null, never invented", () => {
    const p = parseOfferText(letter(""));
    expect(p.salary).toBeNull();
    expect(p.needsReview).toContain("salary");
  });
  it("PF-23 hourly rate is annualized (x2,080 h) and flagged, not read as $45/yr", () => {
    const p = parseOfferText(letter("Compensation: $45.00 per hour"));
    expect(p.salary).toBe(93_600);
    expect(p.needsReview).toContain("salary");
  });
  it("PF-24 '$52/hr' short form is annualized and flagged", () => {
    const p = parseOfferText(letter("Salary: $52/hr, paid biweekly"));
    expect(p.salary).toBe(108_160);
    expect(p.needsReview).toContain("salary");
  });
  it("PF-25 monthly pay is annualized (x12) and flagged", () => {
    const p = parseOfferText(letter("Salary: $8,000 per month"));
    expect(p.salary).toBe(96_000);
    expect(p.needsReview).toContain("salary");
  });
  it("PF-26 weekly pay is annualized (x52) and flagged", () => {
    const p = parseOfferText(letter("Compensation: $1,800 per week"));
    expect(p.salary).toBe(93_600);
    expect(p.needsReview).toContain("salary");
  });
  it("PF-27 salary with cents keeps the dollars", () =>
    expect(parseOfferText(letter("Annual salary: $95,000.50")).salary).toBe(95_000));
});

// ---- negotiate route: constraint inputs (stated budget x parsed salary, stay dates) ----

const getCallerId = vi.fn();
const createServerSupabase = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ getCallerId, createServerSupabase }));

function negotiateDb(salary: number | null, price: number) {
  return {
    from: vi.fn((table: string) => {
      if (table === "users") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { city: "National", offer_salary: salary, relocation_stipend: 0, signing_bonus: 0 }, error: null }) }) }) };
      }
      if (table === "cost_of_living") {
        return { select: () => ({ ilike: () => ({ maybeSingle: async () => ({ data: { city: "National", index: 100, median_rent: 1450 }, error: null }) }) }) };
      }
      return {
        select: () => ({
          in: async () => ({
            data: [{ id: "l1", title: "t", price, lat: 47.6, lng: -122.3, lease_start: "2026-06-01", lease_end: "2026-08-31", safety_flags: { scamSignals: [], notes: [] } }],
            error: null,
          }),
        }),
      };
    }),
  };
}

function negotiateReq(constraints: Record<string, unknown>) {
  return new Request("http://localhost/api/negotiate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.7" },
    body: JSON.stringify({ listingIds: ["l1"], constraints }),
  });
}

async function verdicts(res: Response) {
  const lines = (await res.text()).trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as NegotiateStreamEvent);
  return Object.fromEntries(
    lines.filter((e): e is Extract<NegotiateStreamEvent, { type: "scout_verdict" }> => e.type === "scout_verdict").map((e) => [e.check, e.verdict]),
  );
}

describe("PT-N negotiate route constraint inputs", () => {
  beforeEach(() => {
    vi.resetModules();
    __resetBuckets();
    process.env.RATE_LIMIT_MAX = "100";
    process.env.LLM_DISABLED = "1";
    getCallerId.mockResolvedValue("11111111-1111-4111-8111-111111111111");
  });
  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.LLM_DISABLED;
  });

  it("PN-01 stated budget lower than the salary ceiling is honored (min of the two)", async () => {
    // 145k at COL 100 -> ceiling 2,558/mo; the intern says they only want to spend 1,000.
    createServerSupabase.mockResolvedValueOnce(negotiateDb(145_000, 1_500));
    const { POST } = await import("@/app/api/negotiate/route");
    const v = await verdicts(await POST(negotiateReq({ monthlyBudget: 1_000, moveIn: "2026-06-08", moveOut: "2026-08-14" })));
    expect(v.budget).toBe("fail");
  });

  it("PN-02 stated budget higher than the salary ceiling is capped by the ceiling", async () => {
    createServerSupabase.mockResolvedValueOnce(negotiateDb(145_000, 3_000));
    const { POST } = await import("@/app/api/negotiate/route");
    const v = await verdicts(await POST(negotiateReq({ monthlyBudget: 10_000, moveIn: "2026-06-08", moveOut: "2026-08-14" })));
    expect(v.budget).toBe("fail");
  });

  it("PN-03 malformed stay date is rejected with 400", async () => {
    createServerSupabase.mockResolvedValueOnce(negotiateDb(null, 1_500));
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(negotiateReq({ monthlyBudget: 2_000, moveIn: "June 8", moveOut: "2026-08-14" }));
    expect(res.status).toBe(400);
  });

  it("PN-04 inverted stay (moveOut before moveIn) is rejected with 400", async () => {
    createServerSupabase.mockResolvedValueOnce(negotiateDb(null, 1_500));
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(negotiateReq({ monthlyBudget: 2_000, moveIn: "2026-08-14", moveOut: "2026-06-08" }));
    expect(res.status).toBe(400);
  });

  it("PN-05 zero budget (invalid) is rejected with 400", async () => {
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(negotiateReq({ monthlyBudget: 0, moveIn: "2026-06-08", moveOut: "2026-08-14" }));
    expect(res.status).toBe(400);
  });

  it("PN-06 one-day stay (moveIn == moveOut, boundary) is accepted", async () => {
    createServerSupabase.mockResolvedValueOnce(negotiateDb(null, 1_500));
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(negotiateReq({ monthlyBudget: 2_000, moveIn: "2026-07-01", moveOut: "2026-07-01" }));
    expect(res.status).toBe(200);
    expect((await verdicts(res)).lease_fit).toBe("pass");
  });
});
