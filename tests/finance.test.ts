import { describe, it, expect } from "vitest";
import {
  annualTakeHome,
  federalTax,
  ficaTax,
  recommendedMonthlyBudget,
  upfrontCash,
  buildFinanceBreakdown,
} from "@/lib/finance/model";

describe("federalTax (progressive brackets)", () => {
  it("is zero at or below zero taxable income", () => {
    expect(federalTax(0)).toBe(0);
    expect(federalTax(-5000)).toBe(0);
  });
  it("taxes only the first bracket for low income", () => {
    // 10% of 10,000
    expect(federalTax(10_000)).toBeCloseTo(1000, 5);
  });
  it("crosses bracket boundaries correctly", () => {
    // 45,400 taxable = 10% of 11,600 + 12% of (45,400-11,600) = 1,160 + 4,056
    expect(federalTax(45_400)).toBeCloseTo(5216, 5);
  });
});

describe("ficaTax", () => {
  it("caps Social Security at the wage base and never caps Medicare", () => {
    // salary above wage base: SS on 168,600 + Medicare on 200,000
    const expected = 168_600 * 0.062 + 200_000 * 0.0145;
    expect(ficaTax(200_000)).toBeCloseTo(expected, 5);
  });
  it("is zero for zero income", () => {
    expect(ficaTax(0)).toBe(0);
  });
});

describe("annualTakeHome", () => {
  it("is well below salary (take-home != salary) and deterministic", () => {
    const t1 = annualTakeHome(60_000);
    const t2 = annualTakeHome(60_000);
    expect(t1).toBe(t2);
    expect(t1).toBeLessThan(60_000);
    expect(t1).toBeGreaterThan(0);
  });
  it("returns 0 for non-positive salary", () => {
    expect(annualTakeHome(0)).toBe(0);
    expect(annualTakeHome(-100)).toBe(0);
  });
  it("matches the documented 60k breakdown", () => {
    // 60,000 - 5,216 federal - 4,590 FICA - 3,000 state = 47,194
    expect(annualTakeHome(60_000)).toBe(47_194);
  });
});

describe("recommendedMonthlyBudget", () => {
  it("applies the 30% rule at national COL", () => {
    expect(recommendedMonthlyBudget(4000, 100)).toBe(1200);
  });
  it("never recommends past the 40% cap in expensive markets", () => {
    // COL 200 would push 0.30*200/100 = 0.60; capped at 0.40 of take-home.
    expect(recommendedMonthlyBudget(4000, 200)).toBe(1600);
  });
  it("is lower in cheaper markets", () => {
    expect(recommendedMonthlyBudget(4000, 80)).toBe(960);
  });
  it("is zero without take-home", () => {
    expect(recommendedMonthlyBudget(0, 150)).toBe(0);
  });
});

describe("upfrontCash", () => {
  it("is deposit + first month + a COL-scaled moving estimate", () => {
    // 2 * 2000 + round(1200 * 1.5) = 4000 + 1800
    expect(upfrontCash(2000, 150)).toBe(5800);
  });
});

describe("buildFinanceBreakdown", () => {
  it("assembles a coherent, deterministic breakdown", () => {
    const b = buildFinanceBreakdown({
      salary: 60_000,
      city: "Seattle",
      costOfLivingIndex: 152,
      medianRent: 2100,
      relocationStipend: 5000,
      signingBonus: 10_000,
    });
    expect(b.salary).toBe(60_000);
    expect(b.takeHome).toBe(47_194);
    expect(b.takeHome).toBeLessThan(60_000);
    expect(b.monthlyTakeHome).toBe(Math.round(47_194 / 12));
    expect(b.relocationStipend).toBe(5000);
    expect(b.signingBonus).toBe(10_000);
    expect(b.costOfLivingIndex).toBe(152);
    expect(b.city).toBe("Seattle");
    expect(b.monthlyBudget).toBeGreaterThan(0);
    expect(b.upfrontCashNeeded).toBeGreaterThan(2100);
  });
  it("handles a missing salary without throwing", () => {
    const b = buildFinanceBreakdown({
      salary: null,
      city: "Austin",
      costOfLivingIndex: 103,
      medianRent: 1650,
    });
    expect(b.salary).toBeNull();
    expect(b.takeHome).toBe(0);
    expect(b.monthlyBudget).toBe(0);
    expect(b.relocationStipend).toBe(0);
    expect(b.signingBonus).toBe(0);
  });
});
