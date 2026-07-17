import { describe, it, expect } from "vitest";
import { affordableRent, budgetScout } from "@/lib/negotiate/budget";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";

const listing = (price: number): ScoutListing => ({
  id: "l1",
  title: "Test",
  price,
  lat: 47.6,
  lng: -122.3,
  lease_start: "2026-06-01",
  lease_end: "2026-08-31",
  safety_flags: { scamSignals: [], notes: [] },
});

const base: ScoutConstraints = {
  monthlyBudget: 2000,
  moveIn: "2026-06-08",
  moveOut: "2026-08-14",
};

describe("affordableRent", () => {
  it("uses the stated budget when no salary is present", () => {
    expect(affordableRent(base)).toBe(2000);
  });
  it("caps at the COL-adjusted rent ceiling of real take-home when salary is lower-bound", () => {
    // salary 60k -> annual take-home 47,194 (federal brackets + FICA + 5% state) ->
    // monthly 3,932.83 -> 30% ceiling (national COL) = 1,180 < 2,000 budget.
    expect(affordableRent({ ...base, salary: 60_000 })).toBe(1180);
  });
  it("keeps the budget when the take-home ceiling is higher", () => {
    // salary 200k -> 30% of monthly take-home far exceeds the 2,000 stated budget.
    expect(affordableRent({ ...base, salary: 200_000 })).toBe(2000);
  });
  it("raises the ceiling in a higher cost-of-living market (still capped)", () => {
    // Same 60k, Seattle COL index 152 pushes the ceiling toward the 40% cap.
    const seattle = affordableRent({ ...base, salary: 60_000, costOfLivingIndex: 152 });
    const national = affordableRent({ ...base, salary: 60_000, costOfLivingIndex: 100 });
    expect(seattle).toBeGreaterThan(national);
  });
});

describe("budgetScout", () => {
  it("passes when price is at or under affordable", () => {
    const r = budgetScout(listing(1850), base);
    expect(r.verdict).toBe("pass");
    expect(r.check).toBe("budget");
    expect(r.value).toContain("$1,850");
    expect(r.value).toContain("$2,000");
  });
  it("flags when price is within 10% over budget", () => {
    expect(budgetScout(listing(2100), base).verdict).toBe("flag"); // 2000*1.1=2200
  });
  it("fails when price exceeds the 10% tolerance", () => {
    expect(budgetScout(listing(2500), base).verdict).toBe("fail");
  });
  it("is deterministic (same input → same verdict + value)", () => {
    const a = budgetScout(listing(1850), base);
    const b = budgetScout(listing(1850), base);
    expect(a).toEqual(b);
  });
});
