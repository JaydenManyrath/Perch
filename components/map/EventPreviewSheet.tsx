"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { MapPin, ArrowRight, Users, Check, Sparkles } from "lucide-react";
import type { EventRow, FeedItem } from "@/lib/types/contract";
import { getFeed } from "@/lib/data/source";
import { eventAttendanceLabel, eventVenueLine } from "./marker-sheet-content";

/**
 * EventPreviewSheet (RA7 + RA38) - opens when an event pin is tapped on the map.
 * Round 3: enriched with tasteScore, internsGoing, and viewer-going flag,
 * looked up from the feed so the map pin previews the same info the feed card
 * would (without the user having to navigate away).
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
  const [feedItem, setFeedItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (!event) {
      setFeedItem(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const feed = await getFeed();
      if (cancelled) return;
      const match = feed.items.find((it) => it.event.id === event.id) ?? null;
      setFeedItem(match);
    })();
    return () => {
      cancelled = true;
    };
  }, [event]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {event ? (
          <>
            <SheetHeader>
              <SheetTitle>{event.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                <span>{eventVenueLine(event)}</span>
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
              {feedItem?.tasteScore != null ? (
                <Chip tone="accent">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Fits your taste
                </Chip>
              ) : null}
              {typeof feedItem?.internsGoing === "number" && feedItem.internsGoing > 0 ? (
                <Chip tone="muted">
                  <Users className="h-3 w-3" aria-hidden />
                  {eventAttendanceLabel(feedItem.internsGoing)}
                </Chip>
              ) : (
                <Chip tone="muted">{eventAttendanceLabel(null)}</Chip>
              )}
              {feedItem?.viewerGoing ? (
                <Chip tone="accent">
                  <Check className="h-3 w-3" aria-hidden strokeWidth={2.5} />
                  You're going
                </Chip>
              ) : null}
            </div>

            {feedItem?.reason ? (
              <p className="mt-3 text-caption text-ink-soft italic">
                &ldquo;{feedItem.reason}&rdquo;
              </p>
            ) : null}

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
