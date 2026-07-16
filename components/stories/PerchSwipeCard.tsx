"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from "framer-motion";
import { PerchCard } from "./PerchCard";
import type { PerchCard as PerchCardType, SwipeDirection } from "@/lib/types/contract";

/**
 * PerchSwipeCard - a single Tinder-style card with its own motion values.
 *
 * Owning the motion value locally is why there's no after-image on button
 * press: when the card flies off and unmounts, its motion.div takes its
 * transforms with it. The NEXT card is a separate PerchSwipeCard instance
 * whose x starts at 0, so nothing snaps back to center.
 *
 * `active` controls interactivity - only the top card in the deck accepts
 * drag / dbl-click. `commandSwipe` is a parent-set direction (from the
 * X / Save buttons) that triggers the same fly-off the drag path uses.
 */
export function PerchSwipeCard({
  perch,
  active,
  commandSwipe,
  onSwiped,
  onDragProgress,
  onOpen,
}: {
  perch: PerchCardType;
  active: boolean;
  commandSwipe: SwipeDirection | null;
  onSwiped: (direction: SwipeDirection) => void;
  onDragProgress?: (progress: number) => void;
  onOpen?: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 260], [-15, 15]);
  const opacity = useTransform(x, [-360, -140, 140, 360], [0.35, 1, 1, 0.35]);
  const [gone, setGone] = useState(false);
  const onSwipedRef = useRef(onSwiped);
  const onDragProgressRef = useRef(onDragProgress);
  useEffect(() => {
    onSwipedRef.current = onSwiped;
  }, [onSwiped]);
  useEffect(() => {
    onDragProgressRef.current = onDragProgress;
  }, [onDragProgress]);

  // Report drag progress in [-1..1] for parent PASS/SAVE hint overlays.
  useEffect(() => {
    if (!active) return;
    const unsub = x.on("change", (v) => {
      const clamped = Math.max(-260, Math.min(260, v));
      onDragProgressRef.current?.(clamped / 260);
    });
    return unsub;
  }, [x, active]);

  // Fly off in response to a parent command (button click on X / Save).
  useEffect(() => {
    if (!commandSwipe || gone) return;
    setGone(true);
    const targetX = commandSwipe === "right" ? 700 : -700;
    animate(x, targetX, {
      duration: 0.32,
      ease: [0.32, 0.72, 0.2, 1],
    }).then(() => {
      onSwipedRef.current(commandSwipe);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandSwipe, gone]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (gone || !active) return;
    const dx = info.offset.x;
    const vx = info.velocity.x;
    const threshold = 110;
    const goingRight = dx > threshold || vx > 600;
    const goingLeft = dx < -threshold || vx < -600;
    if (goingRight || goingLeft) {
      setGone(true);
      const targetX = (typeof window !== "undefined" ? window.innerWidth : 800) + 120;
      const dir: SwipeDirection = goingRight ? "right" : "left";
      animate(x, goingRight ? targetX : -targetX, {
        duration: 0.32,
        ease: [0.32, 0.72, 0.2, 1],
      }).then(() => {
        onSwipedRef.current(dir);
      });
      return;
    }
    // Below threshold - spring back to center with a nice bounce.
    animate(x, 0, {
      type: "spring",
      stiffness: 380,
      damping: 30,
    });
    onDragProgressRef.current?.(0);
  }

  return (
    <motion.div
      className={
        active && !gone ? "cursor-grab active:cursor-grabbing" : "pointer-events-none"
      }
      style={{
        x,
        rotate,
        opacity,
        touchAction: "pan-y",
      }}
      drag={active && !gone ? "x" : false}
      dragElastic={1}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      whileTap={active && !gone ? { scale: 0.995 } : undefined}
    >
      <PerchCard perch={perch} onOpen={active && !gone ? onOpen : undefined} />
    </motion.div>
  );
}
