import { Mascot } from "@/components/mascot/Mascot";
import { BranchMotif } from "@/components/theme/BranchMotif";
import { cn } from "@/lib/utils";

/**
 * EmptyState - chick-fronted empty state (A11).
 * Placement rule: this is a personality moment, so the chick lives here.
 *
 * `perch` (RD52) opts this empty state into the branch motif - a twig for the
 * chick to sit on. Off by default so shared decision surfaces (booking, perches,
 * posting) that reuse EmptyState stay clean per the section 9 "absent from
 * decision surfaces" rule; enable it only on emotional surfaces (e.g. Chirps).
 */
export function EmptyState({
  title,
  body,
  action,
  className,
  variant = "idle",
  size = 120,
  perch = false,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "idle" | "hop";
  size?: number;
  perch?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-10 px-6",
        className
      )}
    >
      {perch ? (
        <div className="relative isolate" style={{ width: size }}>
          <BranchMotif
            variant="perch"
            className="absolute inset-x-0 bottom-0 -z-10 w-full opacity-70"
          />
          <Mascot variant={variant} size={size} />
        </div>
      ) : (
        <Mascot variant={variant} size={size} />
      )}
      <div className="max-w-xs">
        <h3 className="text-h3 text-ink-strong">{title}</h3>
        {body ? <p className="mt-1 text-body text-ink-soft">{body}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
