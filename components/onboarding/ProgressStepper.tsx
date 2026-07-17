import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * ProgressStepper (RA37) - step dots + labels for the onboarding flow.
 * No percent bar - the dots do the work, so the UI never quantifies the
 * user's own progress with a number that can imply "you're only X% done".
 * Baby-blue-and-white: sky.400 for done, sky.300 outline for current,
 * sky.200 for upcoming.
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
  const steps = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step}
    >
      <ol className="flex items-center gap-2" aria-hidden>
        {steps.map((n, i) => {
          const done = n < step;
          const current = n === step;
          const isLast = i === steps.length - 1;
          return (
            <li key={n} className="flex-1 flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-caption font-bold shrink-0 transition-colors",
                  done && "bg-sky-500 text-white",
                  current && "bg-white text-ink-strong ring-2 ring-sky-500",
                  !done && !current && "bg-sky-100 text-ink-strong ring-1 ring-sky-200",
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden strokeWidth={3} /> : n}
              </span>
              {!isLast ? (
                <span
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-colors",
                    n < step ? "bg-sky-400" : "bg-sky-200",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
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
                  "font-semibold",
                  current && "text-ink-strong",
                  done && "text-ink-strong",
                  !current && !done && "text-ink-strong",
                )}
              >
                {l}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
