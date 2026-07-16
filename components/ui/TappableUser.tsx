import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * TappableUser (RA6) - wraps any user avatar/name so it routes to /profile/[id].
 * Use as an inline replacement for a name/avatar span.
 * Stops event propagation so it doesn't fight parent click handlers.
 */
export function TappableUser({
  id,
  className,
  children,
  ariaLabel,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={`/profile/${id}`}
      onClick={(e) => e.stopPropagation()}
      aria-label={ariaLabel}
      className={cn("hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded", className)}
    >
      {children}
    </Link>
  );
}
