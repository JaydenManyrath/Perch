import { buildFinanceBreakdownFromOffer } from "@/lib/finance/offer";
import type { FinanceBreakdown, OfferParse } from "@/lib/types/contract";

/**
 * Fixture-mode finance uses the same canonical deterministic model as live routes.
 * This wrapper keeps fixture callers stable without carrying competing arithmetic.
 */
export function buildFinanceBreakdown(offer: OfferParse): FinanceBreakdown {
  return buildFinanceBreakdownFromOffer(offer);
}
