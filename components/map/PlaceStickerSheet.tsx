"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { STICKER_ORDER } from "./sticker-catalog";
import type { StickerCategory } from "@/lib/types/contract";
import { cn } from "@/lib/utils";

/**
 * PlaceStickerSheet - pick a POSITIVE category + write a short note.
 *
 * POSITIVE-ONLY (contract §2, §8). The picker is built from STICKER_ORDER
 * (six categories), which comes from POSITIVE_STICKER_CATEGORIES in
 * lib/types/contract.ts. There is NO code path in the UI to reach a
 * negative/avoid category.
 */
export function PlaceStickerSheet({
  open,
  onOpenChange,
  location,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: { lat: number; lng: number } | null;
  onSubmit: (input: { category: StickerCategory; note: string }) => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<StickerCategory | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!selected) return;
    setSaving(true);
    try {
      await onSubmit({ category: selected, note: note.trim() });
      setSelected(null);
      setNote("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Leave a sticker</SheetTitle>
          <SheetDescription>
            {location
              ? `Position saved. Add a friendly tag for other interns.`
              : "Tap the map to choose a spot."}
          </SheetDescription>
        </SheetHeader>

        <fieldset>
          <legend className="sr-only">Positive vibe category</legend>
          <ul className="grid grid-cols-2 gap-2">
            {STICKER_ORDER.map((meta) => {
              const active = selected === meta.category;
              return (
                <li key={meta.category}>
                  <button
                    type="button"
                    onClick={() => setSelected(meta.category)}
                    className={cn(
                      "w-full text-left flex items-start gap-3 rounded-2xl border p-3 transition-colors",
                      active
                        ? "bg-sky-100 border-sky-400 ring-2 ring-sky-400"
                        : "bg-white border-sky-200 hover:bg-sky-50"
                    )}
                    aria-pressed={active}
                  >
                    <span aria-hidden className="text-2xl">
                      {meta.emoji}
                    </span>
                    <span>
                      <span className="block text-body font-semibold text-ink-strong">
                        {meta.label}
                      </span>
                      <span className="block text-caption text-ink-soft">
                        {meta.hint}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <label className="block mt-4">
          <span className="text-caption text-ink-soft">
            Note (optional, kept short and positive)
          </span>
          <input
            type="text"
            value={note}
            maxLength={140}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500"
            placeholder="e.g., 'best oat latte in the neighborhood'"
          />
        </label>

        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!selected || !location || saving}>
            {saving ? "Placing..." : "Leave sticker"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
