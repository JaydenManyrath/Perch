"use client";

import { MapPin } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import type { Place } from "@/lib/types/contract";
import { placeKindLabel, placeTimeContext } from "./marker-sheet-content";

export function PlaceInfoSheet({
  place,
  onOpenChange,
}: {
  place: Place | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={place !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {place ? (
          <>
            <SheetHeader>
              <SheetTitle>{place.label}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {placeTimeContext(place)}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-wrap gap-2">
              <Chip>{placeKindLabel(place.kind)}</Chip>
              <Chip tone="muted">Seen {place.frequency} time{place.frequency === 1 ? "" : "s"}</Chip>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
