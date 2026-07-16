"use client";

import Image from "next/image";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { formatEventTime } from "@/lib/utils";
import { MapPin, ArrowRight } from "lucide-react";
import type { EventRow } from "@/lib/types/contract";

/**
 * EventPreviewSheet (RA7) - opens when an event pin is tapped on the map.
 * A compact preview + a Link to the full card on /feed.
 */
export function EventPreviewSheet({
  event,
  open,
  onOpenChange,
}: {
  event: EventRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                <span>
                  {event.venue ? `${event.venue} - ` : ""}
                  {formatEventTime(event.datetime)}
                </span>
              </SheetDescription>
            </SheetHeader>
            {event.image_url ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sky-100">
                <Image
                  src={event.image_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Chip>{event.category}</Chip>
              {event.price_range ? <Chip tone="muted">{event.price_range}</Chip> : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              {event.url ? (
                <a
                  href={event.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 rounded-2xl bg-white border border-sky-300 text-ink-strong text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-100"
                >
                  Tickets
                </a>
              ) : null}
              <Link
                href="/feed"
                className="inline-flex items-center gap-1 rounded-2xl bg-sky-400 text-white text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-500"
              >
                Open in Flyway <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
