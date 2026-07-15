import type { ScoutListing, ScoutConstraints, ScoutResult } from "./types";

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

const FLAT_WITHHOLDING = 0.25; // demo assumption
const RENT_SHARE_OF_TAKEHOME = 0.3; // 30% rule
const FLAG_TOLERANCE = 1.1; // within 10% over budget = flag, not fail

/**
 * Deterministic affordable monthly rent (plan §6.1):
 *   monthlyTakeHome = (salary / 12) * (1 - 0.25)
 *   affordable      = min(monthlyBudget, 0.30 * monthlyTakeHome)
 * If there's no parsed salary, the stated monthlyBudget is used directly.
 */
export function affordableRent(constraints: ScoutConstraints): number {
  const { monthlyBudget, salary } = constraints;
  if (salary == null || salary <= 0) return monthlyBudget;
  const monthlyTakeHome = (salary / 12) * (1 - FLAT_WITHHOLDING);
  return Math.min(monthlyBudget, RENT_SHARE_OF_TAKEHOME * monthlyTakeHome);
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
