"use client";

import Image from "next/image";
import type { ListingRow } from "@/lib/types/contract";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { MapPin, CalendarDays, DollarSign } from "lucide-react";
import { formatMonthDay } from "@/lib/utils";

/**
 * PerchDetailSheet — bottom-sheet detail for a listing. Decision surface —
 * no mascot. Presents money/dates/safety info-first (CLAUDE.md §9).
 */
export function PerchDetailSheet({
  listing,
  open,
  onOpenChange,
}: {
  listing: ListingRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {listing ? (
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{listing.title}</SheetTitle>
            <SheetDescription className="flex items-center gap-1">
              <MapPin className="h-3 w-3" aria-hidden />
              {listing.address}
            </SheetDescription>
          </SheetHeader>
          {listing.photos[0] ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sky-100">
              <Image
                src={listing.photos[0]}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
              />
            </div>
          ) : null}
          <dl className="mt-4 grid grid-cols-2 gap-3 text-body">
            <div className="rounded-xl bg-sky-50 p-3">
              <dt className="text-caption text-ink-soft flex items-center gap-1">
                <DollarSign className="h-3 w-3" aria-hidden /> per month
              </dt>
              <dd className="text-h3 text-ink-strong mt-0.5">
                ${listing.price.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl bg-sky-50 p-3">
              <dt className="text-caption text-ink-soft flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden /> lease
              </dt>
              <dd className="text-body text-ink-strong mt-0.5">
                {formatMonthDay(listing.lease_start)} – {formatMonthDay(listing.lease_end)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="muted">{listing.lease_type.replace("_", "-")}</Chip>
            <Chip tone="muted">via {listing.source}</Chip>
            {listing.safety_flags.notes.map((n) => (
              <Chip key={n}>{n}</Chip>
            ))}
            {listing.safety_flags.scamSignals.length > 0 ? (
              <Badge variant="scam">
                {listing.safety_flags.scamSignals.length} scam signal
                {listing.safety_flags.scamSignals.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="pass">No flags</Badge>
            )}
          </div>

          <p className="mt-4 text-caption text-ink-soft">
            Deep verdicts come from the negotiation hero — this sheet just
            surfaces the raw facts.
          </p>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
