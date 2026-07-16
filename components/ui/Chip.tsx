import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip - small info pill for taste reasons / genres / kinds.
 * Sky-100 fill, ink.strong text (per WCAG rule - never baby-blue text on white).
 */
export function Chip({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "accent" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold",
        tone === "default" && "bg-sky-100 text-ink-strong",
        tone === "accent" && "bg-accent-beak/15 text-accent-beakDeep",
        tone === "muted" && "bg-sky-50 text-ink-soft border border-sky-200",
        className
      )}
      {...props}
    />
  );
}
