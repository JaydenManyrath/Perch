import { Mascot } from "@/components/mascot/Mascot";
import { cn } from "@/lib/utils";

/**
 * EmptyState - chick-fronted empty state (A11).
 * Placement rule: this is a personality moment, so the chick lives here.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
  variant = "idle",
  size = 120,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: "idle" | "hop";
  size?: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-3 py-10 px-6",
        className
      )}
    >
      <Mascot variant={variant} size={size} />
      <div className="max-w-xs">
        <h3 className="text-h3 text-ink-strong">{title}</h3>
        {body ? <p className="mt-1 text-body text-ink-soft">{body}</p> : null}
      </div>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
