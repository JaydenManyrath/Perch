"use client";

import { useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { MapCanvas } from "./MapCanvas";
import { PlaceStickerSheet } from "./PlaceStickerSheet";
import { Chip } from "@/components/ui/Chip";
import { STICKER_ORDER } from "./sticker-catalog";
import type { Place, StickerRow, StickerCategory } from "@/lib/types/contract";
import { insertSticker } from "@/lib/data/source";
import { cn } from "@/lib/utils";

/**
 * MapPage — the interactive map surface. Decision-adjacent, so no mascot on
 * the map itself. Chick only appears in the empty-state or celebratory
 * placement toast.
 */
export function MapPage({ places, initialStickers }: { places: Place[]; initialStickers: StickerRow[] }) {
  const [stickers, setStickers] = useState<StickerRow[]>(initialStickers);
  const [placementMode, setPlacementMode] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handlePicked(loc: { lat: number; lng: number }) {
    setPicked(loc);
    setSheetOpen(true);
    setPlacementMode(false);
  }

  async function handleSubmit({ category, note }: { category: StickerCategory; note: string }) {
    if (!picked) return;
    const row = await insertSticker({ ...picked, category, note });
    setStickers((prev) => [row, ...prev]);
    setPicked(null);
  }

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-3">
        <h1 className="text-h1 text-ink-strong">Map</h1>
        <p className="text-caption text-ink-soft">
          Your recurring places (life-map) and community vibe stickers — positive only.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setPlacementMode((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 font-semibold text-caption shadow-card transition-colors",
            placementMode
              ? "bg-sky-500 text-white"
              : "bg-white border border-sky-300 text-ink-strong hover:bg-sky-100"
          )}
          aria-pressed={placementMode}
        >
          {placementMode ? <X className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          {placementMode ? "Cancel placement" : "Leave a sticker"}
        </button>
        <span className="text-caption text-ink-soft">
          {placementMode ? "Tap the map to pick a spot." : `${stickers.length} sticker${stickers.length === 1 ? "" : "s"} nearby`}
        </span>
      </div>

      <div className="rounded-2xl overflow-hidden border border-sky-200 shadow-card h-[62dvh] md:h-[70dvh] relative">
        <MapCanvas
          places={places}
          stickers={stickers}
          placementMode={placementMode}
          onPickLocation={handlePicked}
        />
      </div>

      <section className="mt-6">
        <h2 className="text-h2 text-ink-strong mb-2">Sticker categories</h2>
        <p className="text-caption text-ink-soft mb-2">
          POSITIVE only — no avoid/unsafe categories exist in the UI.
        </p>
        <div className="flex flex-wrap gap-2">
          {STICKER_ORDER.map((m) => (
            <Chip key={m.category}>
              <span aria-hidden>{m.emoji}</span> {m.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-h2 text-ink-strong mb-2">Your life-map</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {places.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-2xl bg-white border border-sky-100 p-3 shadow-card"
            >
              <MapPin className="h-5 w-5 text-sky-400 mt-0.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-ink-strong truncate">{p.label}</span>
                  {typeof p.nearestListingMinutes === "number" ? (
                    <span className="text-caption font-semibold text-accent-beakDeep whitespace-nowrap">
                      {p.nearestListingMinutes} min away
                    </span>
                  ) : null}
                </div>
                <p className="text-caption text-ink-soft capitalize">
                  {p.kind} · seen {p.frequency}×
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <PlaceStickerSheet
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o);
          if (!o) setPicked(null);
        }}
        location={picked}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
