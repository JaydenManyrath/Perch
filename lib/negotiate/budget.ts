import type { ScoutListing, ScoutConstraints, ScoutResult } from "./types";
import { annualTakeHome, recommendedMonthlyBudget } from "@/lib/finance/model";

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

const FLAG_TOLERANCE = 1.1; // within 10% over budget = flag, not fail

/**
 * Deterministic affordable monthly rent (contract section 13.5): the budget scout uses
 * the real finance model - progressive-bracket take-home, never raw salary - and a
 * cost-of-living-adjusted rent ceiling. When a salary is present:
 *   monthlyTakeHome = annualTakeHome(salary) / 12   (federal brackets + FICA + state)
 *   affordable      = min(monthlyBudget, recommendedMonthlyBudget(monthlyTakeHome, COL))
 * With no parsed salary, the stated monthlyBudget is used directly.
 */
export function affordableRent(constraints: ScoutConstraints): number {
  const { monthlyBudget, salary } = constraints;
  if (salary == null || salary <= 0) return monthlyBudget;
  const monthlyTakeHome = annualTakeHome(salary) / 12;
  const colIndex = constraints.costOfLivingIndex ?? 100;
  return Math.min(monthlyBudget, recommendedMonthlyBudget(monthlyTakeHome, colIndex));
}

/** Budget scout — pure arithmetic; the model never decides this verdict. */
export function budgetScout(
  listing: ScoutListing,
  constraints: ScoutConstraints,
): ScoutResult {
  const affordable = affordableRent(constraints);
  const price = listing.price;

  let verdict: ScoutResult["verdict"];
  if (price <= affordable) verdict = "pass";
  else if (price <= affordable * FLAG_TOLERANCE) verdict = "flag";
  else verdict = "fail";

  return {
    check: "budget",
    verdict,
    value: `${usd(price)} / ${usd(affordable)} budget`,
  };
}
