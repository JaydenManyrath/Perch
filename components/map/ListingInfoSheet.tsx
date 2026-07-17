"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BedDouble, Bath, Ruler, MapPin, ArrowRight, Route, MessageCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import type { ListingRow, ListingDetail } from "@/lib/types/contract";
import { getListingDetail, conversationIdFor } from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";

/**
 * ListingInfoSheet (RA38) - opens when a listing marker is tapped.
 * Compact info card: price, address, bed/bath, lease dates, and a
 * primary action to make it the commute anchor. Deep-link to the full
 * detail is available via "Open full details".
 */
export function ListingInfoSheet({
  listing,
  isCommuteAnchor,
  onOpenChange,
  onUseAsCommuteAnchor,
}: {
  listing: ListingRow | null;
  isCommuteAnchor: boolean;
  onOpenChange: (open: boolean) => void;
  onUseAsCommuteAnchor: (id: string) => void;
}) {
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUrl = listing?.photos[0] ?? null;

  useEffect(() => {
    if (!listing) {
      setDetail(null);
      setPhotoFailed(false);
      return;
    }
    setPhotoFailed(false);
    let cancelled = false;
    setLoading(true);
    getListingDetail(listing.id)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listing]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [listing?.id, photoUrl]);

  return (
    <Sheet open={listing !== null} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        {listing ? (
          <>
            <SheetHeader>
              <SheetTitle>{listing.title}</SheetTitle>
              <SheetDescription className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden />
                {listing.address}
              </SheetDescription>
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
                <div className="absolute top-2 right-2 rounded-full bg-white/95 px-2 py-1 text-caption font-bold text-ink-strong shadow-card">
                  ${listing.price.toLocaleString()}/mo
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl border border-sky-200 bg-sky-50 p-4"
                aria-label={`No photo for ${listing.title}`}
              >
                <p className="text-h3 text-ink-strong font-bold">
                  ${listing.price.toLocaleString()}
                  <span className="text-caption text-ink-soft font-normal"> /mo</span>
                </p>
                <p className="mt-1 text-caption font-semibold text-ink-strong">
                  Photo unavailable
                </p>
              </div>
            )}

            {loading ? (
              <p className="mt-3 text-caption text-ink-soft">Loading details...</p>
            ) : detail ? (
              <>
                {detail.bedrooms != null || detail.bathrooms != null || detail.sqft != null ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.bedrooms != null ? (
                      <Chip tone="muted">
                        <BedDouble className="h-3 w-3" aria-hidden />
                        {detail.bedrooms} bd
                      </Chip>
                    ) : null}
                    {detail.bathrooms != null ? (
                      <Chip tone="muted">
                        <Bath className="h-3 w-3" aria-hidden />
                        {detail.bathrooms} ba
                      </Chip>
                    ) : null}
                    {detail.sqft != null ? (
                      <Chip tone="muted">
                        <Ruler className="h-3 w-3" aria-hidden />
                        {detail.sqft} sqft
                      </Chip>
                    ) : null}
                    {detail.furnished === true ? (
                      <Chip tone="accent">Furnished</Chip>
                    ) : detail.furnished === false ? (
                      <Chip tone="muted">Unfurnished</Chip>
                    ) : null}
                    {detail.utilitiesIncluded ? (
                      <Chip tone="accent">Utilities included</Chip>
                    ) : null}
                  </div>
                ) : null}

                {detail.host ? (
                  <Link
                    href={`/profile/${detail.host.id}`}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 hover:bg-sky-100 transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      {detail.host.avatarUrl ? (
                        <AvatarImage src={detail.host.avatarUrl} alt="" />
                      ) : null}
                      <AvatarFallback>{detail.host.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-caption font-semibold text-ink-strong truncate">
                        Hosted by {detail.host.name}
                      </p>
                      {detail.reviewSummary && detail.reviewSummary.count > 0 ? (
                        <p className="text-caption text-ink-soft">
                          {detail.reviewSummary.avgRating.toFixed(1)} stars -{" "}
                          {detail.reviewSummary.count} review
                          {detail.reviewSummary.count === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                ) : null}
              </>
            ) : null}

            <p className="mt-3 text-caption text-ink-soft">
              Lease {formatDate(listing.lease_start)} - {formatDate(listing.lease_end)}
              {" - "}
              {listing.lease_type.replace("_", " ")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              {detail?.host ? (
                <MessageHostLink hostId={detail.host.id} />
              ) : null}
              <Button
                variant={isCommuteAnchor ? "secondary" : "primary"}
                onClick={() => onUseAsCommuteAnchor(listing.id)}
                disabled={isCommuteAnchor}
              >
                <Route className="h-4 w-4" aria-hidden />
                {isCommuteAnchor ? "Commute anchor" : "Set as commute anchor"}
              </Button>
              <Link
                href="/discovery"
                className="inline-flex items-center gap-1 rounded-2xl bg-sky-500 text-white text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                Open full details <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MessageHostLink({ hostId }: { hostId: string }) {
  if (hostId === ME_ID) return null;
  const cid = conversationIdFor(ME_ID, hostId);
  return (
    <Link
      href={`/dms/${cid}`}
      className="inline-flex items-center gap-1 rounded-2xl bg-white border border-sky-300 text-ink-strong text-caption font-semibold px-3 py-2 shadow-card hover:bg-sky-100"
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      Message host
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
