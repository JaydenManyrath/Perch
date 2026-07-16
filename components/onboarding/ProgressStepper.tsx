import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * ProgressStepper - a horizontal 1-of-N indicator for the onboarding flow.
 * Uses sky.400 for the completed run and sky.200 for the upcoming.
 */
export function ProgressStepper({
  step,
  total,
  labels,
}: {
  step: number; // 1-based
  total: number;
  labels?: string[];
}) {
  const pct = Math.round(((step - 1) / (total - 1)) * 100);
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step}>
      <div className="relative h-1.5 rounded-full bg-sky-200 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-sky-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {labels ? (
        <ul className="mt-2 flex justify-between text-caption">
          {labels.map((l, i) => {
            const idx = i + 1;
            const done = idx < step;
            const current = idx === step;
            return (
              <li
                key={l}
                className={cn(
                  "flex items-center gap-1 font-semibold",
                  current && "text-ink-strong",
                  done && "text-func-pass",
                  !current && !done && "text-ink-muted"
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden strokeWidth={3} /> : null}
                {l}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
