"use client";

import Image from "next/image";
import type { PerchCard as PerchCardType } from "@/lib/types/contract";
import { Chip } from "@/components/ui/Chip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { MapPin, CalendarDays, DollarSign, BedDouble } from "lucide-react";
import { formatMonthDay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * PerchCard - a single Tinder-style card in the swipe deck.
 * Decision surface (money, dates, safety) - no mascot; the chick lives in the
 * empty state when the deck runs out.
 */
export function PerchCard({
  perch,
  onOpen,
  className,
}: {
  perch: PerchCardType;
  onOpen?: () => void;
  className?: string;
}) {
  const photo = perch.photos[0];
  const bodyContent = (
    <div className={cn(
      "w-full h-full rounded-3xl bg-white shadow-pop border border-sky-200 overflow-hidden flex flex-col",
      className,
    )}>
      <div className="relative aspect-[4/3] w-full bg-sky-100 shrink-0">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center gap-1 bg-sky-100 text-ink-strong"
            aria-label={`No photo for ${perch.title}`}
          >
            <BedDouble className="h-8 w-8" aria-hidden strokeWidth={1.75} />
            <span className="text-caption font-semibold">Photo unavailable</span>
          </div>
        )}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <StatusBadge status={perch.status} />
          <RatingBadge summary={perch.reviewSummary} />
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-h3 text-ink-strong leading-tight truncate">{perch.title}</h3>
          <span className="text-h3 text-ink-strong font-bold whitespace-nowrap">
            ${perch.price.toLocaleString()}
            <span className="text-caption text-ink-soft font-normal">/mo</span>
          </span>
        </div>

        <p className="text-caption text-ink-soft flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {perch.address}
        </p>

        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Chip tone="muted">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {formatMonthDay(perch.lease_start)} - {formatMonthDay(perch.lease_end)}
          </Chip>
          <Chip tone="muted">{perch.lease_type.replace("_", "-")}</Chip>
          {perch.sourced ? (
            <Chip tone="muted">via {perch.sourceName}</Chip>
          ) : (
            <Chip tone="accent">Posted by host</Chip>
          )}
        </div>

        {perch.host ? (
          <div className="mt-auto pt-2 flex items-center gap-2 text-caption text-ink-soft">
            <span>Host:</span>
            <Link
              href={`/profile/${perch.host.id}`}
              className="text-ink-strong font-semibold hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {perch.host.name}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className="block w-full h-full text-left">
        {bodyContent}
      </button>
    );
  }
  return bodyContent;
}

/** Compact list variant (used in Saved tray). */
export function PerchListItem({ perch, onOpen }: { perch: PerchCardType; onOpen?: () => void }) {
  const photo = perch.photos[0];
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl bg-white border border-sky-100 shadow-card p-3">
      <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-sky-100 shrink-0">
        {photo ? (
          <Image src={photo} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-sky-100 text-ink-strong"
            aria-label={`No photo for ${perch.title}`}
          >
            <BedDouble className="h-5 w-5" aria-hidden strokeWidth={1.75} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-ink-strong truncate">{perch.title}</span>
          <span className="text-body font-bold text-ink-strong whitespace-nowrap">
            ${perch.price.toLocaleString()}
            <span className="text-caption text-ink-soft font-normal">/mo</span>
          </span>
        </div>
        <p className="text-caption text-ink-soft flex items-center gap-1 truncate">
          <DollarSign className="h-3 w-3 shrink-0" aria-hidden /> {perch.address}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <StatusBadge status={perch.status} />
          <RatingBadge summary={perch.reviewSummary} />
        </div>
      </div>
    </div>
  );
  return onOpen ? (
    <button type="button" onClick={onOpen} className="block w-full text-left">
      {inner}
    </button>
  ) : (
    inner
  );
}
