"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { PerchCard } from "./PerchCard";
import { PerchSwipeCard } from "./PerchSwipeCard";
import { PerchDetailSheet } from "./PerchDetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { PerchCard as PerchCardType, SwipeDirection } from "@/lib/types/contract";

/**
 * PerchDeck - Tinder-style swipe deck for perches (RA1).
 *
 * Each card is its own PerchSwipeCard with local motion values, so a card
 * that flies off does NOT bleed its transforms into the next card (no after-
 * image on X/Save clicks). Buttons dispatch a `command` prop that the top
 * card watches; the drag path uses the same finish behavior for consistency.
 */
export function PerchDeck({
  initial,
  onSwiped,
  onListingTaken,
}: {
  initial: PerchCardType[];
  onSwiped: (direction: SwipeDirection, listing: PerchCardType) => void;
  onListingTaken?: (listingId: string) => void;
}) {
  const [deck, setDeck] = useState<PerchCardType[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastSwipe, setLastSwipe] = useState<
    { id: string; direction: SwipeDirection; at: number } | null
  >(null);
  const [command, setCommand] = useState<{ id: string; direction: SwipeDirection } | null>(null);
  const [dragProgress, setDragProgress] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    setDeck(initial);
    setDragProgress(0);
    setCommand(null);
  }, [initial]);

  const top = deck[0];
  const openListing = openId ? deck.find((d) => d.id === openId) ?? null : null;

  const handleSwiped = useCallback(
    (direction: SwipeDirection, listing: PerchCardType) => {
      onSwiped(direction, listing);
      setLastSwipe({ id: listing.id, direction, at: Date.now() });
      setDeck((prev) => prev.filter((c) => c.id !== listing.id));
      setCommand(null);
      setDragProgress(0);
    },
    [onSwiped],
  );

  const handleListingBooked = useCallback(
    (listingId: string) => {
      setDeck((prev) => prev.filter((c) => c.id !== listingId));
      setOpenId((current) => (current === listingId ? null : current));
      onListingTaken?.(listingId);
    },
    [onListingTaken],
  );

  const initiateButtonSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!top || command) return;
      if (reduce) {
        handleSwiped(direction, top);
        return;
      }
      setCommand({ id: top.id, direction });
    },
    [top, command, reduce, handleSwiped],
  );

  if (!top) {
    return (
      <div className="mt-6">
        <EmptyState
          title="You've seen every fresh perch"
          body="New sublets keep coming in. Check back later or open your saved list."
          variant="idle"
        />
      </div>
    );
  }

  const savedOpacity = Math.max(0, dragProgress);
  const passOpacity = Math.max(0, -dragProgress);

  return (
    <div className="mt-4 flex flex-col items-center gap-4 select-none">
      <div className="relative w-full max-w-[420px] aspect-[4/5]">
        {/* Peek cards behind the top. */}
        {deck.slice(1, 4).map((c, i) => (
          <div
            key={c.id}
            className="absolute inset-0"
            style={{
              transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.03})`,
              zIndex: 10 - (i + 1),
              opacity: 0.75 - i * 0.2,
              transition: "transform 300ms ease, opacity 300ms ease",
            }}
          >
            <PerchCard perch={c} />
          </div>
        ))}

        {/* Interactive top card with its own motion values. */}
        <div className="absolute inset-0 z-20">
          <PerchSwipeCard
            key={top.id}
            perch={top}
            active
            commandSwipe={command?.id === top.id ? command.direction : null}
            onSwiped={(dir) => handleSwiped(dir, top)}
            onDragProgress={setDragProgress}
            onOpen={() => setOpenId(top.id)}
          />
        </div>

        {/* PASS / SAVE hints driven by the top card's drag progress. */}
        <motion.div
          className="pointer-events-none absolute top-6 left-6 rotate-[-12deg] px-3 py-1 rounded-lg border-2 border-func-scam text-func-scam text-h3 font-black bg-white/85 z-30"
          style={{ opacity: passOpacity }}
          aria-hidden
        >
          PASS
        </motion.div>
        <motion.div
          className="pointer-events-none absolute top-6 right-6 rotate-[12deg] px-3 py-1 rounded-lg border-2 border-func-pass text-func-pass text-h3 font-black bg-white/85 z-30"
          style={{ opacity: savedOpacity }}
          aria-hidden
        >
          SAVE
        </motion.div>
      </div>

      <div className="flex items-center gap-6 mt-2">
        <DeckButton
          onClick={() => initiateButtonSwipe("left")}
          label="Pass"
          tone="pass"
          disabled={!top || command !== null}
        >
          <X className="h-6 w-6" strokeWidth={3} aria-hidden />
        </DeckButton>
        <DeckButton
          onClick={() => setOpenId(top.id)}
          label="Details"
          tone="details"
          disabled={!top || command !== null}
        >
          <span className="text-caption font-bold">DETAILS</span>
        </DeckButton>
        <DeckButton
          onClick={() => initiateButtonSwipe("right")}
          label="Save"
          tone="save"
          disabled={!top || command !== null}
        >
          <Heart className="h-6 w-6" fill="currentColor" strokeWidth={0} aria-hidden />
        </DeckButton>
      </div>

      {lastSwipe ? (
        <p role="status" className="text-caption text-ink-soft">
          {lastSwipe.direction === "right" ? "Saved" : "Passed"}
        </p>
      ) : null}

      <PerchDetailSheet
        perch={openListing}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onListingBooked={handleListingBooked}
      />
    </div>
  );
}

function DeckButton({
  onClick,
  label,
  tone,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  tone: "pass" | "save" | "details";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "h-14 w-14 rounded-full flex items-center justify-center shadow-card border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-40";
  const style =
    tone === "pass"
      ? "bg-white text-func-scam border-func-scamBg hover:bg-func-scamBg"
      : tone === "save"
      ? "bg-white text-func-pass border-func-passBg hover:bg-func-passBg"
      : "bg-white text-ink-strong border-sky-300 hover:bg-sky-100 h-11 w-auto px-3";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, style)}
    >
      {children}
    </button>
  );
}
