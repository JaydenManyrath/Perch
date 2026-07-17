import { cn } from "@/lib/utils";
import type { ListingStatus } from "@/lib/types/contract";
import { CheckCircle2, Clock, Ban, MinusCircle } from "lucide-react";

/**
 * StatusBadge - freshness signal for a listing (Round 2 section 11.2).
 * Available -> func.pass; pending -> func.flag; taken/stale -> ink.muted.
 * Info-first (decision surface); no mascot.
 */
export function StatusBadge({
  status,
  className,
  showIcon = true,
}: {
  status: ListingStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      title={meta.hint}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold border whitespace-nowrap",
        meta.classes,
        className,
      )}
    >
      {showIcon ? <Icon aria-hidden className="h-3 w-3" strokeWidth={2.5} /> : null}
      {meta.label}
    </span>
  );
}

const STATUS_META: Record<ListingStatus, { label: string; hint: string; icon: typeof CheckCircle2; classes: string }> = {
  available: {
    label: "Available",
    hint: "Host has confirmed recently.",
    icon: CheckCircle2,
    classes: "bg-func-passBg text-ink-strong border-func-pass",
  },
  pending: {
    label: "Pending",
    hint: "Someone's already talking to the host.",
    icon: Clock,
    classes: "bg-func-flagBg text-ink-strong border-func-flag",
  },
  taken: {
    label: "Taken",
    hint: "This one's spoken for.",
    icon: Ban,
    classes: "bg-white text-ink-strong border-sky-200",
  },
  stale: {
    label: "Stale",
    hint: "Not confirmed for a while - might be gone.",
    icon: MinusCircle,
    classes: "bg-white text-ink-strong border-sky-200",
  },
};
