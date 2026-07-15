import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The standard shadcn/ui class-name helper.
 * cn("px-2", condition && "bg-sky-100") returns a de-duplicated Tailwind class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO date as "Mon, Jun 8". */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** Format an ISO date as "Jun 8" (no weekday). */
export function formatMonthDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Format an ISO date as "the week of Jun 8". */
export function formatMoveWeek(iso: string): string {
  return `the week of ${formatMonthDay(iso)}`;
}

/** Format an ISO datetime as "8:00 PM · Jun 8". */
export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${time} · ${formatMonthDay(iso)}`;
}
