import { cn } from "@/lib/utils";

/**
 * Skeleton - animated shimmer placeholder. Every A-owned surface has a skeleton
 * matching its final layout (A11 polish pass, Phase 3).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("ap-skeleton rounded-lg", className)}
      {...props}
    />
  );
}
