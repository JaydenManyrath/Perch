import type { FinanceBreakdown, OfferParse } from "@/lib/types/contract";

/**
 * Round 3 (section 13.5) - deterministic finance model (fixture).
 * Person B ships the canonical `lib/finance/model.ts`; this mirror is used
 * in fixture mode so the UI has real numbers to render without a live route.
 * Fully deterministic - no model decides money.
 */

const COST_OF_LIVING_INDEX: Record<string, { index: number; medianRent: number }> = {
  seattle: { index: 148, medianRent: 2050 },
  "san francisco": { index: 187, medianRent: 3100 },
  "new york": { index: 172, medianRent: 3400 },
  boston: { index: 149, medianRent: 2800 },
  chicago: { index: 121, medianRent: 1900 },
  austin: { index: 118, medianRent: 1750 },
  "los angeles": { index: 156, medianRent: 2650 },
  denver: { index: 128, medianRent: 1850 },
  atlanta: { index: 108, medianRent: 1550 },
  "washington dc": { index: 145, medianRent: 2350 },
  default: { index: 110, medianRent: 1650 },
};

function colFor(city: string | null): { index: number; medianRent: number } {
  const key = (city ?? "").trim().toLowerCase();
  return COST_OF_LIVING_INDEX[key] ?? COST_OF_LIVING_INDEX.default;
}

/**
 * A simple bracketed federal-only tax model for a single filer.
 * NOT tax advice - it's a demo. Documented brackets so a reader can audit.
 */
function federalIncomeTax(annualSalary: number): number {
  const brackets: [number, number][] = [
    [11_600, 0.10],
    [47_150, 0.12],
    [100_525, 0.22],
    [191_950, 0.24],
    [243_725, 0.32],
    [609_350, 0.35],
    [Infinity, 0.37],
  ];
  let tax = 0;
  let prev = 0;
  for (const [ceiling, rate] of brackets) {
    if (annualSalary <= ceiling) {
      tax += (annualSalary - prev) * rate;
      break;
    }
    tax += (ceiling - prev) * rate;
    prev = ceiling;
  }
  return tax;
}

/** FICA (Social Security + Medicare). Simplified: 7.65% on the whole. */
function fica(annualSalary: number): number {
  return annualSalary * 0.0765;
}

/** State income tax by city (rough demo values). WA + TX are 0. */
function stateTax(city: string | null, annualSalary: number): number {
  const key = (city ?? "").trim().toLowerCase();
  const rate: Record<string, number> = {
    seattle: 0,
    austin: 0,
    "san francisco": 0.093,
    "los angeles": 0.093,
    "new york": 0.0685,
    chicago: 0.0495,
    boston: 0.05,
    denver: 0.044,
    atlanta: 0.0575,
    "washington dc": 0.0895,
  };
  return annualSalary * (rate[key] ?? 0.04);
}

/**
 * Build a FinanceBreakdown from an OfferParse (+ known relocation/bonus fields).
 * Deterministic - same input, same numbers.
 */
export function buildFinanceBreakdown(offer: OfferParse): FinanceBreakdown {
  const city = offer.city ?? "Seattle";
  const salary = offer.salary ?? 0;
  const col = colFor(city);

  const takeHomeAnnual =
    salary > 0
      ? Math.max(
          0,
          salary - federalIncomeTax(salary) - fica(salary) - stateTax(city, salary),
        )
      : 0;
  const monthlyTakeHome = Math.round(takeHomeAnnual / 12);

  const relocationStipend = offer.relocationStipend ?? 0;
  const signingBonus = offer.signingBonus ?? 0;

  // Deposit (~1 month) + first month + moving estimate. Demo values.
  const deposit = col.medianRent;
  const firstMonth = col.medianRent;
  const movingEstimate = 1200;
  const upfrontCashNeeded = Math.max(
    0,
    deposit + firstMonth + movingEstimate - (relocationStipend + signingBonus),
  );

  // Rent-ceiling rule of thumb: 30% of monthly take-home, adjusted DOWN when COL is high
  // (higher COL means more of your budget goes to non-rent essentials).
  const baseCeiling = monthlyTakeHome * 0.3;
  const colAdjustment = 110 / col.index; // higher index -> smaller budget
  const monthlyBudget = Math.round(baseCeiling * colAdjustment);

  return {
    salary: offer.salary ?? null,
    takeHome: Math.round(takeHomeAnnual),
    monthlyTakeHome,
    relocationStipend,
    signingBonus,
    upfrontCashNeeded,
    costOfLivingIndex: col.index,
    monthlyBudget,
    city,
  };
}
