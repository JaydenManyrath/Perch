"use client";

import { useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { PerchDeck } from "./PerchDeck";
import { PerchListItem } from "./PerchCard";
import { PerchDetailSheet } from "./PerchDetailSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { LandInTray } from "@/components/motion/LandInTray";
import { recordSwipe } from "@/lib/data/source";
import { cn } from "@/lib/utils";
import type { PerchCard, SwipeDirection } from "@/lib/types/contract";

/**
 * StoriesClient - RA1 swipe deck + RA2 saved tray, joined by a tab strip.
 * A right-swipe lands the card into the saved tab using LandInTray (contract 3
 * shared motion primitive).
 */
export function StoriesClient({
  initialDeck,
  initialSaved,
  initialTab,
}: {
  initialDeck: PerchCard[];
  initialSaved: PerchCard[];
  initialTab: "deck" | "saved";
}) {
  const [tab, setTab] = useState<"deck" | "saved">(initialTab);
  const [deck, setDeck] = useState<PerchCard[]>(initialDeck);
  const [saved, setSaved] = useState<PerchCard[]>(initialSaved);
  const [openId, setOpenId] = useState<string | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  async function onSwiped(direction: SwipeDirection, listing: PerchCard) {
    setDeck((prev) => prev.filter((c) => c.id !== listing.id));
    if (direction === "right") {
      // Optimistic add to saved with a landing beat.
      setSaved((prev) => (prev.some((p) => p.id === listing.id) ? prev : [listing, ...prev]));
      setLandingId(listing.id);
      if (!reduce) window.setTimeout(() => setLandingId(null), 700);
      else setLandingId(null);
    } else {
      setSaved((prev) => prev.filter((c) => c.id !== listing.id));
    }
    // Persist through the data-source layer (live -> API, fixture -> memory).
    await recordSwipe({ listingId: listing.id, direction });
  }

  function removeTakenListing(listingId: string) {
    setDeck((prev) => prev.filter((c) => c.id !== listingId));
    setSaved((prev) => prev.filter((c) => c.id !== listingId));
    setOpenId((current) => (current === listingId ? null : current));
  }

  const openListing =
    (deck.find((d) => d.id === openId) as PerchCard | undefined) ??
    (saved.find((s) => s.id === openId) as PerchCard | undefined) ??
    null;

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div role="tablist" aria-label="Perches view" className="flex items-center gap-2 border-b border-sky-200">
        <TabButton active={tab === "deck"} onClick={() => setTab("deck")} label={`Deck`}>
          Deck
          <span className="ml-2 text-caption text-ink-soft font-normal">{deck.length}</span>
        </TabButton>
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")} label={`Saved (${saved.length})`}>
          <Heart className="h-3.5 w-3.5" aria-hidden />
          Saved
          <span className="ml-1 text-caption text-ink-soft font-normal">{saved.length}</span>
        </TabButton>
      </div>

      {tab === "deck" ? (
        <PerchDeck initial={deck} onSwiped={onSwiped} onListingTaken={removeTakenListing} />
      ) : saved.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No saved perches yet"
            body="Right-swipe on a card in the deck to save it."
            variant="idle"
          />
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {saved.map((p) => {
            const isLanding = p.id === landingId;
            const item = <PerchListItem perch={p} onOpen={() => setOpenId(p.id)} />;
            return (
              <li key={p.id}>
                {isLanding ? (
                  <LandInTray keyId={`land-${p.id}`}>{item}</LandInTray>
                ) : (
                  item
                )}
              </li>
            );
          })}
        </ul>
      )}

      <PerchDetailSheet
        perch={openListing}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        onListingBooked={removeTakenListing}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-2 text-caption font-semibold border-b-2 -mb-px",
        active
          ? "border-sky-500 text-ink-strong"
          : "border-transparent text-ink-soft hover:text-ink-strong",
      )}
    >
      {children}
    </button>
  );
}
