"use client";

import { useEffect, useState } from "react";
import type { FinanceBreakdown, OfferParse } from "@/lib/types/contract";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { DollarSign, TrendingUp, Home, Gift, MapPin } from "lucide-react";
import { financeFromOffer, getFinance, getFinanceForOffer } from "@/lib/data/source";

/**
 * FinanceBreakdownCard (RA35) - the deterministic money picture:
 * take-home vs salary, cost-of-living, upfront cash, relocation stipend +
 * signing bonus. Info-first grid; no mascot on money surfaces.
 *
 * Two ways to use it:
 *   - <FinanceBreakdownCard offer={...}> when you already have an OfferParse
 *     (e.g., mid-onboarding) - previews through the same finance route in live mode.
 *   - <FinanceBreakdownCard /> without an offer - fetches GET /api/finance.
 */
export function FinanceBreakdownCard({
  offer,
  className,
  compact = false,
}: {
  offer?: OfferParse;
  className?: string;
  compact?: boolean;
}) {
  const [finance, setFinance] = useState<FinanceBreakdown | null>(
    offer ? financeFromOffer(offer) : null,
  );
  const [loading, setLoading] = useState(!offer);

  useEffect(() => {
    if (offer) {
      let cancelled = false;
      setFinance(financeFromOffer(offer));
      setLoading(false);
      getFinanceForOffer(offer).then((f) => {
        if (!cancelled) setFinance(f);
      });
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    setLoading(true);
    getFinance()
      .then((f) => {
        if (!cancelled) setFinance(f);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offer]);

  if (loading || !finance) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-caption text-ink-soft">Loading finance breakdown...</p>
        </CardContent>
      </Card>
    );
  }

  const grossMonthly = finance.salary ? Math.round(finance.salary / 12) : 0;
  const upfrontCovered = finance.relocationStipend + finance.signingBonus;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Money in {finance.city}</CardTitle>
        <CardDescription>
          Deterministic take-home + cost-of-living adjustment. Not tax advice.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Take-home vs salary */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden />}
            label="Annual salary"
            value={
              finance.salary
                ? `$${finance.salary.toLocaleString()}`
                : "-"
            }
            sub={grossMonthly ? `~$${grossMonthly.toLocaleString()}/mo gross` : undefined}
          />
          <StatBox
            icon={<DollarSign className="h-3.5 w-3.5" aria-hidden />}
            label="Take-home"
            value={`$${finance.takeHome.toLocaleString()}`}
            sub={`~$${finance.monthlyTakeHome.toLocaleString()}/mo after tax`}
            highlight
          />
        </div>

        {/* Rent budget + COL */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatBox
            icon={<Home className="h-3.5 w-3.5" aria-hidden />}
            label="Monthly rent ceiling"
            value={`$${finance.monthlyBudget.toLocaleString()}`}
            sub="COL-adjusted, 30% of take-home"
          />
          <StatBox
            icon={<MapPin className="h-3.5 w-3.5" aria-hidden />}
            label={`${finance.city} cost of living`}
            value={`${finance.costOfLivingIndex}`}
            sub={
              finance.costOfLivingIndex > 130
                ? "high (>130)"
                : finance.costOfLivingIndex > 110
                ? "above average"
                : "near average"
            }
          />
        </div>

        {/* Upfront cash + stipend + bonus */}
        <div className="mt-3 rounded-2xl border border-sky-200 bg-sky-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-caption text-ink-soft font-semibold">
              Upfront cash needed
            </span>
            <span className="text-h3 text-ink-strong font-bold">
              ${finance.upfrontCashNeeded.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-caption text-ink-soft">
            Deposit + first month + moving estimate. Employer covers
            ${upfrontCovered.toLocaleString()} up front (stipend + bonus).
          </p>
          {!compact ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {finance.relocationStipend > 0 ? (
                <Chip tone="accent">
                  <Gift className="h-3 w-3" aria-hidden />
                  Relocation stipend ${finance.relocationStipend.toLocaleString()}
                </Chip>
              ) : (
                <Chip tone="muted">No relocation stipend</Chip>
              )}
              {finance.signingBonus > 0 ? (
                <Chip tone="accent">
                  <Gift className="h-3 w-3" aria-hidden />
                  Signing bonus ${finance.signingBonus.toLocaleString()}
                </Chip>
              ) : (
                <Chip tone="muted">No signing bonus</Chip>
              )}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight ? "bg-sky-100 border border-sky-200" : "bg-sky-50"
      }`}
    >
      <p className="text-caption text-ink-soft flex items-center gap-1">
        <span className="text-sky-500">{icon}</span>
        {label}
      </p>
      <p className="mt-0.5 text-h3 text-ink-strong font-bold">{value}</p>
      {sub ? <p className="text-caption text-ink-soft">{sub}</p> : null}
    </div>
  );
}
