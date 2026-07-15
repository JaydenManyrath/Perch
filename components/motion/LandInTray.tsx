"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import * as React from "react";

/**
 * LandInTray — the signature "listing lands on a perch" motion primitive.
 *
 * Used by A5 (Stories/perches tray) when a shortlisted listing appears, and —
 * the reason this is a *primitive* — exported to Person B for the negotiation
 * results screen when a per-listing verdict "lands".
 *
 * Motion: arcs in from above, overshoots slightly, settles. Under
 * prefers-reduced-motion the element cross-fades in without motion.
 *
 * SHARED-EXPORT (contract §7): keep the API stable. `landInTrayVariants` is
 * re-exported so B can pass them into their own `motion.div`.
 */
export const landInTrayVariants: Variants = {
  initial: { y: -60, x: 6, rotate: -5, scale: 0.9, opacity: 0 },
  animate: { y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 },
};

/** Reduced-motion fallback — plain cross-fade, no motion. */
export const reducedFadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const landInTrayTransition = {
  duration: 0.55,
  // easeOutBack for a small landing overshoot (a bird overshooting the branch).
  ease: [0.34, 1.56, 0.64, 1] as const,
};

export function LandInTray({
  children,
  delay = 0,
  className,
  keyId,
}: {
  children: React.ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  className?: string;
  /** Optional key to force remount on change. */
  keyId?: string | number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={keyId}
      variants={reduce ? reducedFadeVariants : landInTrayVariants}
      initial="initial"
      animate="animate"
      transition={
        reduce
          ? { ease: "easeOut", duration: 0.25, delay }
          : { ...landInTrayTransition, delay }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Hook variant — returns props to spread onto a `<motion.div>` directly.
 * Callers use this when they need to control the wrapping element themselves.
 */
export function useLandInTray(delay = 0) {
  const reduce = useReducedMotion();
  return {
    variants: reduce ? reducedFadeVariants : landInTrayVariants,
    initial: "initial" as const,
    animate: "animate" as const,
    transition: reduce
      ? { ease: "easeOut" as const, duration: 0.25, delay }
      : { ...landInTrayTransition, delay },
  };
}
