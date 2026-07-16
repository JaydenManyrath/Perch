"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stars - read-only star rating renderer.
 * value is 0..5 (may be fractional); shows full/half via a two-layer clip.
 */
export function Stars({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const pct = (clamped / 5) * 100;
  return (
    <span
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
      className={cn("relative inline-flex", className)}
    >
      <span className="inline-flex text-ink-muted">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} width={size} height={size} strokeWidth={1.5} />
        ))}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden text-accent-beak"
        style={{ width: `${pct}%` }}
      >
        <span className="inline-flex">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} width={size} height={size} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
      </span>
    </span>
  );
}

/** Interactive star input - 1..5. */
export function StarsInput({
  value,
  onChange,
  size = 22,
  className,
}: {
  value: 1 | 2 | 3 | 4 | 5 | 0;
  onChange: (next: 1 | 2 | 3 | 4 | 5) => void;
  size?: number;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Rating" className={cn("inline-flex gap-1", className)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n as 1 | 2 | 3 | 4 | 5)}
            className="p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <Star
              width={size}
              height={size}
              strokeWidth={1.5}
              fill={filled ? "currentColor" : "none"}
              className={filled ? "text-accent-beak" : "text-ink-muted"}
            />
          </button>
        );
      })}
    </div>
  );
}
