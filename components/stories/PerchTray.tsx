"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { LandInTray } from "@/components/motion/LandInTray";
import { PerchStory } from "./PerchStory";
import { PerchDetailSheet } from "./PerchDetailSheet";
import type { ListingRow } from "@/lib/types/contract";

/**
 * PerchTray — the story-shaped horizontal tray of saved sublets. Each bubble
 * uses <LandInTray> so listings arc in and settle like a bird landing on a
 * branch. The tray also has a "Save a perch" affordance that lands a new
 * listing to demo the motion in isolation.
 */
export function PerchTray({ initial }: { initial: ListingRow[] }) {
  const [listings, setListings] = useState<ListingRow[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);

  function landDemoListing() {
    // Cycle through the fixtures to demo the motion.
    const next = initial[listings.length % initial.length];
    if (!next) return;
    setListings((prev) => [
      { ...next, id: `${next.id}-demo-${Date.now()}` },
      ...prev,
    ]);
  }

  const openListing = listings.find((l) => l.id === openId) ?? null;

  return (
    <>
      <div className="overflow-x-auto -mx-4 px-4">
        <ul className="flex items-start gap-3 min-w-max pb-2">
          <li key="add">
            <button
              type="button"
              onClick={landDemoListing}
              aria-label="Save a new perch (demo the landing motion)"
              className="flex flex-col items-center gap-1.5 min-w-[76px] focus:outline-none"
            >
              <span className="h-16 w-16 rounded-full border-2 border-dashed border-sky-300 bg-white flex items-center justify-center text-sky-500 group-hover:bg-sky-100 hover:bg-sky-100 transition-colors">
                <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
              </span>
              <span className="text-[0.7rem] text-ink-soft font-semibold">
                Save one
              </span>
            </button>
          </li>
          {listings.map((l, i) => (
            <li key={l.id}>
              <LandInTray delay={Math.min(i, 6) * 0.06} keyId={l.id}>
                <PerchStory
                  listing={l}
                  onOpen={() => setOpenId(l.id)}
                  selected={openId === l.id}
                />
              </LandInTray>
            </li>
          ))}
        </ul>
      </div>

      <PerchDetailSheet
        listing={openListing}
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </>
  );
}
