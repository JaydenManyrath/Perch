"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button - themed on the Perch palette (contract §3).
 * Default (primary) uses sky.400 on white text; secondary uses white on sky.300 border.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-body font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-sky-400 text-white hover:bg-sky-500 shadow-card",
        secondary:
          "bg-white text-ink-strong border border-sky-300 hover:bg-sky-100 shadow-card",
        ghost: "bg-transparent text-ink-strong hover:bg-sky-100",
        accent:
          "bg-accent-beak text-white hover:bg-accent-beakDeep shadow-card",
        subtle: "bg-sky-100 text-ink-strong hover:bg-sky-200",
      },
      size: {
        sm: "h-9 px-3 text-caption",
        md: "h-11 px-4",
        lg: "h-12 px-6 text-body",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
