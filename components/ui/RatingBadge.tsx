import { Star } from "lucide-react";
import type { ReviewSummary } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * RatingBadge - compact Airbnb-style rating (star + avg + count).
 * Shows nothing if there are zero reviews (caller decides fallback).
 */
export function RatingBadge({
  summary,
  className,
  emptyLabel,
}: {
  summary: ReviewSummary;
  className?: string;
  emptyLabel?: string;
}) {
  if (summary.count === 0) {
    if (!emptyLabel) return null;
    return (
      <span className={cn("inline-flex items-center gap-1 text-caption text-ink-soft", className)}>
        <Star className="h-3 w-3" strokeWidth={1.5} aria-hidden /> {emptyLabel}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption font-semibold text-ink-strong whitespace-nowrap",
        className,
      )}
      aria-label={`${summary.avgRating.toFixed(1)} out of 5 across ${summary.count} review${summary.count === 1 ? "" : "s"}`}
    >
      <Star className="h-3.5 w-3.5 text-accent-beak" fill="currentColor" strokeWidth={0} aria-hidden />
      {summary.avgRating.toFixed(1)}
      <span className="text-ink-soft font-normal">({summary.count})</span>
    </span>
  );
}
