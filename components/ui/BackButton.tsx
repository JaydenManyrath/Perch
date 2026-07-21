"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Back affordance for every pushed (non-tab) page. Uses real browser history when
 * there is any (so it returns to wherever the user actually came from) and falls
 * back to a sensible parent route on a cold deep link.
 */
export function BackButton({
  fallbackHref = "/feed",
  label = "Back",
  className,
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-2xl px-2.5 py-1.5 -ml-2.5",
        "text-caption font-semibold text-ink-soft transition-colors",
        "hover:bg-sky-100 hover:text-ink-strong",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden strokeWidth={2.5} />
      {label}
    </button>
  );
}
