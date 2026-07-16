"use client";

import Image from "next/image";
import Link from "next/link";
import type { PerchCard } from "@/lib/types/contract";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { MapPin, CalendarDays, DollarSign, Route as RouteIcon } from "lucide-react";
import { formatMonthDay } from "@/lib/utils";
import { ReviewsPanel } from "@/components/reviews/ReviewsPanel";

/**
 * PerchDetailSheet - bottom-sheet detail for a perch. Decision surface -
 * no mascot. Presents money/dates/status/host up front. Reviews are the
 * bottom section (RA5). A 'Plan the commute' button opens the map with
 * this perch selected (RA19).
 */
export function PerchDetailSheet({
  perch,
  open,
  onOpenChange,
}: {
  perch: PerchCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {perch ? (
        <SheetContent side="bottom">
          <SheetHeader>
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <SheetTitle>{perch.title}</SheetTitle>
                <SheetDescription className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {perch.address}
                </SheetDescription>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={perch.status} />
                <RatingBadge summary={perch.reviewSummary} emptyLabel="No reviews yet" />
              </div>
            </div>
          </SheetHeader>

          {perch.photos[0] ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sky-100">
              <Image
                src={perch.photos[0]}
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
                ${perch.price.toLocaleString()}
              </dd>
            </div>
            <div className="rounded-xl bg-sky-50 p-3">
              <dt className="text-caption text-ink-soft flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden /> lease
              </dt>
              <dd className="text-body text-ink-strong mt-0.5">
                {formatMonthDay(perch.lease_start)} - {formatMonthDay(perch.lease_end)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="muted">{perch.lease_type.replace("_", "-")}</Chip>
            {perch.sourced ? (
              <Chip tone="muted">via {perch.sourceName}</Chip>
            ) : (
              <Chip tone="accent">Posted by host</Chip>
            )}
            {perch.safety_flags.notes.map((n) => (
              <Chip key={n}>{n}</Chip>
            ))}
            {perch.safety_flags.scamSignals.length > 0 ? (
              <Badge variant="scam">
                {perch.safety_flags.scamSignals.length} scam signal
                {perch.safety_flags.scamSignals.length === 1 ? "" : "s"}
              </Badge>
            ) : (
              <Badge variant="pass">No flags</Badge>
            )}
          </div>

          {perch.host ? (
            <div className="mt-4 rounded-2xl border border-sky-200 p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-soft">Host</p>
                <Link
                  href={`/profile/${perch.host.id}`}
                  className="text-body text-ink-strong font-semibold hover:underline"
                >
                  {perch.host.name}
                </Link>
              </div>
              <Link
                href={`/profile/${perch.host.id}`}
                className="text-caption font-semibold text-sky-500 hover:text-sky-600"
              >
                View profile
              </Link>
            </div>
          ) : null}

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/map?apartmentId=${perch.id}`}
              className="inline-flex items-center gap-1 rounded-2xl bg-accent-beak text-white text-caption font-semibold px-3 py-2 shadow-card hover:bg-accent-beakDeep transition-colors"
            >
              <RouteIcon className="h-3.5 w-3.5" aria-hidden /> Plan the commute
            </Link>
          </div>

          <ReviewsPanel
            subjectType="listing"
            subjectId={perch.id}
            subjectLabel={perch.title}
            className="mt-6"
          />
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
