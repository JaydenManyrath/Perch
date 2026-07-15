import Link from "next/link";
import { Mascot } from "@/components/mascot/Mascot";
import { cn } from "@/lib/utils";

/**
 * BrandMark — small Perch wordmark + tiny chick. Used in SideRail (desktop)
 * and the top of the mobile shell.
 */
export function BrandMark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <Link
      href="/feed"
      className={cn(
        "inline-flex items-center gap-2 text-ink-strong hover:opacity-80 transition-opacity",
        className
      )}
    >
      <Mascot variant="idle" size={size} />
      <span className="text-h2 font-bold tracking-tight">Perch</span>
    </Link>
  );
}
