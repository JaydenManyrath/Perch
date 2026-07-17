"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EventComments } from "./EventComments";
import { formatEventTime } from "@/lib/utils";
import { MapPin, Sparkles, Check, X, Users, MessageCircle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { attendEvent } from "@/lib/data/source";
import type { FeedItem, AttendResponse } from "@/lib/types/contract";

/**
 * EventCard (round 2) - a Flyway feed row.
 * RA8/RA14: venue + Going Y/N poll + "N interns going" count.
 * RA15: event image_url with graceful fallback.
 * RA13: event comments composer + list.
 * Decision surface (money-adjacent, plan choices), so no mascot in the card.
 */
export function EventCard({
  item: initialItem,
  topPick = false,
}: {
  item: FeedItem;
  topPick?: boolean;
}) {
  const [item, setItem] = useState<FeedItem>(initialItem);
  const [busy, setBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const pct = Math.round(item.tasteScore * 100);
  const goingCount = item.internsGoing ?? 0;
  const viewerGoing = !!item.viewerGoing;

  async function toggle(newValue: boolean) {
    if (busy) return;
    setBusy(true);
    // Optimistic: update local UI immediately.
    setItem((prev) => ({
      ...prev,
      viewerGoing: newValue,
      internsGoing: Math.max(0, (prev.internsGoing ?? 0) + ((newValue ? 1 : 0) - (prev.viewerGoing ? 1 : 0))),
    }));
    try {
      const r: AttendResponse = await attendEvent(item.event.id, { going: newValue });
      setItem((prev) => ({ ...prev, viewerGoing: r.viewerGoing, internsGoing: r.going }));
    } finally {
      setBusy(false);
    }
  }

  const imageUrl = item.event.imageUrl ?? null;

  return (
    <Card className={cn("overflow-hidden", topPick ? "ring-2 ring-accent-beak/50" : "")}>
      {/* Section 13.1 - upcoming events, image rendered prominently (16:9), with
          a friendly placeholder when the source didn't provide one. */}
      {imageUrl ? (
        <div className="relative aspect-video w-full bg-sky-100">
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="relative aspect-video w-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center"
          aria-label={`No image for ${item.event.title}`}
        >
          <div className="flex flex-col items-center text-ink-soft">
            <CalendarDays className="h-10 w-10" aria-hidden strokeWidth={1.5} />
            <span className="mt-1 text-caption font-semibold">
              {item.event.category}
            </span>
          </div>
        </div>
      )}

      <CardContent className="p-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-h3 text-ink-strong truncate">{item.event.title}</h3>
            <p className="mt-0.5 text-caption text-ink-soft flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {item.event.venue ? `${item.event.venue} - ` : ""}
                {formatEventTime(item.event.datetime)}
              </span>
            </p>
          </div>
          {topPick ? (
            <Chip tone="accent" className="shrink-0">
              <Sparkles className="h-3 w-3" aria-hidden /> Top pick
            </Chip>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <Chip>{item.event.category}</Chip>
          {item.event.priceRange ? <Chip tone="muted">{item.event.priceRange}</Chip> : null}
          <span className="text-caption text-ink-soft">match {pct}%</span>
          <div className="h-1.5 flex-1 min-w-24 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
        </div>

        <p className="mt-3 text-body text-ink-strong">{item.reason}</p>

        {/* Going Y/N poll + count (RA14) */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1 text-caption text-ink-soft">
            <Users className="h-3.5 w-3.5" aria-hidden />
            <span className="font-semibold text-ink-strong">{goingCount}</span>
            {goingCount === 1 ? "intern" : "interns"} going
          </span>
          <div
            role="radiogroup"
            aria-label="Going to this event?"
            className="inline-flex rounded-full border border-sky-300 overflow-hidden shadow-card"
          >
            <PollButton
              active={viewerGoing}
              onClick={() => toggle(true)}
              disabled={busy}
              tone="yes"
              label="Yes"
            >
              <Check className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} /> Going
            </PollButton>
            <PollButton
              active={item.viewerGoing === false}
              onClick={() => toggle(false)}
              disabled={busy}
              tone="no"
              label="Not going"
            >
              <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} /> Not going
            </PollButton>
          </div>
        </div>

        {/* Comment toggle */}
        <button
          type="button"
          onClick={() => setCommentsOpen((o) => !o)}
          className="mt-3 inline-flex items-center gap-1 text-caption font-semibold text-sky-500 hover:text-sky-600"
          aria-expanded={commentsOpen}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden />
          {commentsOpen ? "Hide comments" : "Comments"}
        </button>

        {commentsOpen ? (
          <EventComments eventId={item.event.id} className="mt-3" />
        ) : null}

        {item.event.url ? (
          <p className="mt-3 text-caption">
            <a
              href={item.event.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sky-500 hover:text-sky-600 font-semibold"
            >
              Tickets & details
            </a>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PollButton({
  active,
  onClick,
  disabled,
  tone,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone: "yes" | "no";
  label: string;
  children: React.ReactNode;
}) {
  const activeCls =
    tone === "yes"
      ? "bg-func-pass text-white"
      : "bg-ink-muted text-white";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 px-3 py-1.5 text-caption font-semibold transition-colors",
        active ? activeCls : "bg-white text-ink-strong hover:bg-sky-100",
        "disabled:opacity-50",
      )}
    >
      {children}
    </button>
  );
}
