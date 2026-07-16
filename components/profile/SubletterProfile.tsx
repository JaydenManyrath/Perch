import Link from "next/link";
import Image from "next/image";
import type { PublicProfile, ListingRow } from "@/lib/types/contract";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { BandedBadge } from "@/components/ui/BandedBadge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReviewsPanel } from "@/components/reviews/ReviewsPanel";
import { MapPin } from "lucide-react";
import { formatMonthDay } from "@/lib/utils";

/**
 * SubletterProfile (RA6) - subletter view of /profile/[id]. Shows their
 * listings (with StatusBadge) + review summary + a ReviewsPanel with the
 * subject being the SUBLETTER (not any single listing).
 * Decision surface: no mascot.
 */
export function SubletterProfile({ profile, headerAction }: { profile: PublicProfile; headerAction?: React.ReactNode }) {
  const listings = profile.listings ?? [];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row items-start gap-4 sm:items-center">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 shrink-0">
          {profile.user.avatarUrl ? <AvatarImage src={profile.user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-h1">{profile.user.name[0]}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h1 text-ink-strong">{profile.user.name}</h1>
            {profile.banded ? <BandedBadge /> : null}
          </div>
          <p className="mt-1 text-body text-ink-soft">
            Sublet host in {profile.user.city}
          </p>
          {profile.reviewSummary ? (
            <div className="mt-2">
              <RatingBadge summary={profile.reviewSummary} emptyLabel="No reviews yet" />
            </div>
          ) : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Listings</CardTitle>
          <CardDescription>
            Places {profile.user.name.split(" ")[0]} is currently subletting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <p className="text-caption text-ink-soft">No listings from this host right now.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listings.map((l) => (
                <li key={l.id}>
                  <ListingTile listing={l} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ReviewsPanel
        subjectType="subletter"
        subjectId={profile.user.id}
        subjectLabel={profile.user.name}
      />
    </div>
  );
}

function ListingTile({ listing }: { listing: ListingRow }) {
  const photo = listing.photos[0];
  return (
    <Link
      href={`/stories?tab=deck#${listing.id}`}
      className="block rounded-2xl overflow-hidden border border-sky-100 bg-white shadow-card hover:shadow-pop transition-shadow"
    >
      <div className="relative aspect-video w-full bg-sky-100">
        {photo ? (
          <Image src={photo} alt="" fill sizes="(max-width: 640px) 100vw, 320px" className="object-cover" />
        ) : null}
        <div className="absolute top-2 left-2">
          <StatusBadge status={listing.status ?? "available"} />
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-ink-strong truncate">{listing.title}</span>
          <span className="text-body font-bold text-ink-strong whitespace-nowrap">
            ${listing.price.toLocaleString()}
            <span className="text-caption text-ink-soft font-normal">/mo</span>
          </span>
        </div>
        <p className="text-caption text-ink-soft flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden /> {listing.address}
        </p>
        <p className="mt-1 text-caption text-ink-soft">
          {formatMonthDay(listing.lease_start)} - {formatMonthDay(listing.lease_end)}
        </p>
      </div>
    </Link>
  );
}
