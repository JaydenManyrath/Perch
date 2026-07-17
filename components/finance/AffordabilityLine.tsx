import type { FinanceBreakdown } from "@/lib/types/contract";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

/**
 * AffordabilityLine (RA35) - compact "this rent vs your COL-adjusted budget"
 * line for a perch. Green if under the budget, amber if over.
 * Decision surface - no mascot.
 */
export function AffordabilityLine({
  finance,
  rent,
  className,
}: {
  finance: FinanceBreakdown;
  rent: number;
  className?: string;
}) {
  if (!finance.monthlyBudget || !rent) return null;
  const over = rent > finance.monthlyBudget;
  const pct = Math.round((rent / finance.monthlyTakeHome) * 100);
  return (
    <div
      className={cn(
        "rounded-2xl border p-3 flex items-start gap-2",
        over
          ? "bg-func-flagBg border-func-flag text-ink-strong"
          : "bg-func-passBg border-func-pass text-ink-strong",
        className,
      )}
    >
      {over ? (
        <AlertCircle
          className="h-4 w-4 shrink-0 mt-0.5"
          aria-hidden
          strokeWidth={2.5}
        />
      ) : (
        <Check
          className="h-4 w-4 shrink-0 mt-0.5"
          aria-hidden
          strokeWidth={2.5}
        />
      )}
      <div className="min-w-0 text-caption">
        <p className="font-semibold">
          {over ? "Over your COL-adjusted budget" : "Fits your budget"}
          {" - "}
          <span className="font-normal text-ink-strong">
            ${rent.toLocaleString()}/mo vs ${finance.monthlyBudget.toLocaleString()}/mo ceiling
          </span>
        </p>
        <p className="mt-0.5 text-ink-soft font-normal">
          That's {pct}% of your monthly take-home in {finance.city}.
        </p>
      </div>
    </div>
  );
}
