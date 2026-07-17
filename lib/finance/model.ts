import type { FinanceBreakdown } from "@/lib/types/contract";

/**
 * Deterministic financial model (contract section 13.5). No model decides money:
 * every number here is pure arithmetic over documented constants, so the same inputs
 * always yield the same breakdown.
 *
 * Take-home is NOT a flat 0.75 of salary. It applies, for a single filer (annual USD):
 *   - the standard deduction, then progressive federal income tax brackets,
 *   - FICA: Social Security 6.2% up to the wage base + Medicare 1.45% on all wages,
 *   - a flat state-withholding estimate (states vary widely; this is a demo estimate).
 * These are approximate 2025 single-filer figures - realistic, not authoritative.
 */

export const STANDARD_DEDUCTION = 14_600;

// Progressive federal brackets (single filer, 2025-ish). `upTo` is the top of the band.
export const FEDERAL_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 11_600, rate: 0.1 },
  { upTo: 47_150, rate: 0.12 },
  { upTo: 100_525, rate: 0.22 },
  { upTo: 191_950, rate: 0.24 },
  { upTo: 243_725, rate: 0.32 },
  { upTo: 609_350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

export const SOCIAL_SECURITY_RATE = 0.062;
export const SOCIAL_SECURITY_WAGE_BASE = 168_600;
export const MEDICARE_RATE = 0.0145;

// Flat state-withholding estimate. Real rates range from 0 (e.g. WA/TX) to ~13%; this
// keeps the demo realistic and deterministic without a 50-state table.
export const STATE_FLAT_RATE = 0.05;

// Healthy rent share of take-home, and the reckless ceiling we never recommend past.
export const RENT_SHARE = 0.3;
export const RENT_SHARE_CAP = 0.4;

// Upfront move-in cash: a security deposit + first month of rent + a moving estimate.
export const MOVING_ESTIMATE_BASE = 1_200;

/** Progressive federal income tax on an already-deducted taxable amount. */
export function federalTax(taxableAnnual: number): number {
  if (taxableAnnual <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const band of FEDERAL_BRACKETS) {
    if (taxableAnnual <= lower) break;
    const taxedInBand = Math.min(taxableAnnual, band.upTo) - lower;
    tax += taxedInBand * band.rate;
    lower = band.upTo;
  }
  return tax;
}

/** FICA: Social Security (capped at the wage base) + Medicare (uncapped). */
export function ficaTax(grossAnnual: number): number {
  if (grossAnnual <= 0) return 0;
  const socialSecurity = Math.min(grossAnnual, SOCIAL_SECURITY_WAGE_BASE) * SOCIAL_SECURITY_RATE;
  const medicare = grossAnnual * MEDICARE_RATE;
  return socialSecurity + medicare;
}

/** Flat state-withholding estimate on gross wages. */
export function stateTax(grossAnnual: number): number {
  return grossAnnual > 0 ? grossAnnual * STATE_FLAT_RATE : 0;
}

/** Annual take-home after federal + FICA + estimated state withholding. */
export function annualTakeHome(salary: number): number {
  if (salary <= 0) return 0;
  const taxable = Math.max(0, salary - STANDARD_DEDUCTION);
  const takeHome = salary - federalTax(taxable) - ficaTax(salary) - stateTax(salary);
  return Math.max(0, Math.round(takeHome));
}

/**
 * COL-adjusted recommended monthly rent ceiling. The 30% rule sets the national base;
 * a market with a higher cost-of-living index runs proportionally more on housing, so we
 * scale the ceiling by index/100 but never recommend past the RENT_SHARE_CAP of take-home.
 */
export function recommendedMonthlyBudget(monthlyTakeHome: number, costOfLivingIndex: number): number {
  if (monthlyTakeHome <= 0) return 0;
  const colFactor = costOfLivingIndex > 0 ? costOfLivingIndex / 100 : 1;
  const colAdjusted = RENT_SHARE * monthlyTakeHome * colFactor;
  const capped = Math.min(RENT_SHARE_CAP * monthlyTakeHome, colAdjusted);
  return Math.round(capped);
}

/** Upfront move-in cash: deposit (one month) + first month + a COL-scaled moving estimate. */
export function upfrontCash(monthlyRent: number, costOfLivingIndex: number): number {
  const colFactor = costOfLivingIndex > 0 ? costOfLivingIndex / 100 : 1;
  const moving = Math.round(MOVING_ESTIMATE_BASE * colFactor);
  return Math.round(2 * Math.max(0, monthlyRent) + moving);
}

export type FinanceInput = {
  salary: number | null;
  city: string;
  costOfLivingIndex: number;
  medianRent: number;
  relocationStipend?: number | null;
  signingBonus?: number | null;
  /** Optional actual monthly rent (a chosen listing); defaults to the city median. */
  monthlyRent?: number | null;
};

/** Build the full, deterministic FinanceBreakdown for the money surfaces. */
export function buildFinanceBreakdown(input: FinanceInput): FinanceBreakdown {
  const salary = input.salary != null && input.salary > 0 ? Math.round(input.salary) : null;
  const takeHome = salary != null ? annualTakeHome(salary) : 0;
  const monthlyTakeHome = Math.round(takeHome / 12);
  const monthlyBudget = recommendedMonthlyBudget(monthlyTakeHome, input.costOfLivingIndex);
  const rentForUpfront = input.monthlyRent != null && input.monthlyRent > 0 ? input.monthlyRent : input.medianRent;

  return {
    salary,
    takeHome,
    monthlyTakeHome,
    relocationStipend: Math.max(0, Math.round(input.relocationStipend ?? 0)),
    signingBonus: Math.max(0, Math.round(input.signingBonus ?? 0)),
    upfrontCashNeeded: upfrontCash(rentForUpfront, input.costOfLivingIndex),
    costOfLivingIndex: input.costOfLivingIndex,
    monthlyBudget,
    city: input.city,
  };
}
