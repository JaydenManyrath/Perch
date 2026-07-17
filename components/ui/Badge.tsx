import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-semibold border",
  {
    variants: {
      variant: {
        default: "bg-sky-100 text-ink-strong border-sky-200",
        outline: "bg-white text-ink-strong border-sky-300",
        pass: "bg-func-passBg text-ink-strong border-func-pass",
        flag: "bg-func-flagBg text-ink-strong border-func-flag",
        scam: "bg-func-scamBg text-ink-strong border-func-scam",
        accent: "bg-accent-beak/10 text-accent-beakDeep border-accent-beak/30",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
