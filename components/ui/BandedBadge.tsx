import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/**
 * BandedBadge - the trust "banded" (verified) badge (A6).
 * Bird metaphor: a bird is "banded" when tagged/identified. Here it's the
 * verified-intern indicator. Positive/pass color per contract §3.
 */
export function BandedBadge({
  size = "md",
  label = "Banded",
  showLabel = true,
  className,
  title,
}: {
  size?: "sm" | "md";
  label?: string;
  showLabel?: boolean;
  className?: string;
  title?: string;
}) {
  const sm = size === "sm";
  return (
    <span
      title={title ?? "Banded - verified intern"}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border",
        "bg-func-passBg text-func-pass border-func-passBg",
        sm ? "px-1.5 py-0.5 text-[0.7rem]" : "px-2 py-0.5 text-caption",
        "font-semibold whitespace-nowrap",
        className
      )}
    >
      <Check aria-hidden="true" className={sm ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={3} />
      {showLabel ? label : null}
    </span>
  );
}
