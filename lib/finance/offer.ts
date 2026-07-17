import { buildFinanceBreakdown } from "@/lib/finance/model";
import { costOfLivingFor, type CostOfLiving } from "@/lib/finance/colLookup";
import type { FinanceBreakdown, OfferParse } from "@/lib/types/contract";

export function offerFinanceInput(
  offer: OfferParse,
  costOfLiving: CostOfLiving = costOfLivingFor(offer.city),
) {
  return {
    salary: offer.salary,
    city: costOfLiving.city,
    costOfLivingIndex: costOfLiving.index,
    medianRent: costOfLiving.medianRent,
    relocationStipend: offer.relocationStipend,
    signingBonus: offer.signingBonus,
  };
}

export function buildFinanceBreakdownFromOffer(
  offer: OfferParse,
  costOfLiving?: CostOfLiving,
): FinanceBreakdown {
  return buildFinanceBreakdown(offerFinanceInput(offer, costOfLiving));
}
