"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PerchCard, ListingDetail } from "@/lib/types/contract";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import {
  MapPin,
  CalendarDays,
  DollarSign,
  Route as RouteIcon,
  BedDouble,
  Bath,
  Ruler,
  Check,
  Zap,
} from "lucide-react";
import { formatMonthDay } from "@/lib/utils";
import { ReviewsPanel } from "@/components/reviews/ReviewsPanel";
import { BookingBar } from "@/components/booking/BookingBar";
import { getListingDetail, getFinance } from "@/lib/data/source";
import { AffordabilityLine } from "@/components/finance/AffordabilityLine";
import type { FinanceBreakdown } from "@/lib/types/contract";

/**
 * PerchDetailSheet - bottom-sheet detail for a perch. Decision surface -
 * no mascot. Round 3 (section 13.2): rich ListingDetail with furnished line,
 * Pros bullets, bed/bath/sqft, amenities, utilities. Includes the
 * request-to-book bar (13.4) and the affordability line (13.5).
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
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [finance, setFinance] = useState<FinanceBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = perch?.photos[0] ?? null;

  // Fetch the rich detail (and finance for affordability) when the sheet opens.
  useEffect(() => {
    if (!open || !perch) {
      setDetail(null);
      setPhotoFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([getListingDetail(perch.id), getFinance()])
      .then(([d, f]) => {
        if (cancelled) return;
        setDetail(d);
        setFinance(f);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, perch]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [perch?.id, photoUrl]);

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

          {photoUrl && !photoFailed ? (
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sky-100">
              <Image
                src={photoUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-cover"
                onError={() => setPhotoFailed(true)}
              />
            </div>
          ) : (
            <div
              className="flex aspect-video w-full items-center justify-center rounded-2xl bg-sky-100 text-ink-strong"
              aria-label={`No photo for ${perch.title}`}
            >
              <div className="flex flex-col items-center gap-1">
                <BedDouble className="h-8 w-8" aria-hidden strokeWidth={1.75} />
                <span className="text-caption font-semibold">Photo unavailable</span>
              </div>
            </div>
          )}

          {/* Furnished / Unfurnished line - clear, not buried (RA32). */}
          <FurnishedLine detail={detail} loading={loading} />

          <dl className="mt-3 grid grid-cols-2 gap-3 text-body">
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

          {/* Bed / Bath / Sqft (RA32) */}
          <SpecsRow detail={detail} />

          {/* Affordability line (RA35) */}
          {finance ? (
            <AffordabilityLine finance={finance} rent={perch.price} className="mt-3" />
          ) : null}

          {/* Pros (RA32) */}
          {detail && detail.pros.length > 0 ? (
            <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-3">
              <h4 className="text-caption text-ink-soft font-semibold">Pros</h4>
              <ul className="mt-1 flex flex-col gap-1">
                {detail.pros.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-body text-ink-strong">
                    <Check
                      className="h-4 w-4 text-func-pass mt-0.5 shrink-0"
                      aria-hidden
                      strokeWidth={2.5}
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Amenities (RA32) */}
          {detail && detail.amenities.length > 0 ? (
            <section className="mt-3">
              <h4 className="text-caption text-ink-soft font-semibold mb-1">Amenities</h4>
              <div className="flex flex-wrap gap-1.5">
                {detail.amenities.map((a) => (
                  <Chip key={a}>{a}</Chip>
                ))}
              </div>
            </section>
          ) : null}

          {/* Utilities (RA32) + lease + provenance + safety */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="muted">{perch.lease_type.replace("_", "-")}</Chip>
            {detail && detail.utilitiesIncluded !== null ? (
              <Chip tone={detail.utilitiesIncluded ? "default" : "muted"}>
                <Zap className="h-3 w-3" aria-hidden />
                {detail.utilitiesIncluded ? "Utilities included" : "Utilities extra"}
              </Chip>
            ) : null}
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

          {/* Host card */}
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

          {/* Booking bar (RA34) - request-to-book + status */}
          <BookingBar listing={perch} className="mt-4" />

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/map?apartmentId=${perch.id}`}
              className="inline-flex items-center gap-1 rounded-2xl bg-accent-beakDeep text-white text-caption font-semibold px-3 py-2 shadow-card hover:bg-accent-beak transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
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

function FurnishedLine({
  detail,
  loading,
}: {
  detail: ListingDetail | null;
  loading: boolean;
}) {
  if (loading || !detail) return null;
  if (detail.furnished === null) return null;
  return (
    <p
      className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-caption font-semibold ${
        detail.furnished
          ? "bg-func-passBg text-ink-strong border border-func-pass"
          : "bg-white text-ink-strong border border-sky-200"
      }`}
    >
      {detail.furnished ? (
        <>
          <Check className="h-3.5 w-3.5" aria-hidden strokeWidth={2.5} /> Furnished
        </>
      ) : (
        "Unfurnished"
      )}
    </p>
  );
}

function SpecsRow({ detail }: { detail: ListingDetail | null }) {
  if (!detail) return null;
  const specs: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (detail.bedrooms !== null) {
    specs.push({
      icon: <BedDouble className="h-4 w-4" aria-hidden />,
      label: detail.bedrooms === 0 ? "Studio" : `${detail.bedrooms} bed`,
      value: "",
    });
  }
  if (detail.bathrooms !== null) {
    specs.push({
      icon: <Bath className="h-4 w-4" aria-hidden />,
      label: `${detail.bathrooms} bath`,
      value: "",
    });
  }
  if (detail.sqft !== null) {
    specs.push({
      icon: <Ruler className="h-4 w-4" aria-hidden />,
      label: `${detail.sqft.toLocaleString()} sqft`,
      value: "",
    });
  }
  if (specs.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2 flex-wrap">
      {specs.map((s) => (
        <span
          key={s.label}
          className="inline-flex items-center gap-1 rounded-xl bg-sky-100 text-ink-strong text-caption font-semibold px-2.5 py-1"
        >
          <span className="text-ink-strong">{s.icon}</span>
          {s.label}
        </span>
      ))}
    </div>
  );
}
