import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bath, BedDouble, Check, MapPin, Ruler, Zap } from "lucide-react";
import { getListingDetail } from "@/lib/data/source";
import { Chip } from "@/components/ui/Chip";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { ReviewsPanel } from "@/components/reviews/ReviewsPanel";
import { formatMonthDay } from "@/lib/utils";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const detail = await getListingDetail(params.id);
  if (!detail) notFound();

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <Link href="/map" className="text-caption font-semibold text-sky-600 hover:text-sky-700">
            Back to map
          </Link>
          <h1 className="mt-1 text-h1 text-ink-strong">{detail.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-caption text-ink-soft">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {detail.address}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={detail.status} />
          <RatingBadge summary={detail.reviewSummary} emptyLabel="No reviews yet" />
        </div>
      </header>

      {detail.photos[0] ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-sky-100">
          <Image
            src={detail.photos[0]}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="object-cover"
          />
        </div>
      ) : null}

      <section className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-card">
          <p className="text-caption text-ink-soft">Price</p>
          <p className="mt-1 text-h2 text-ink-strong">${detail.price.toLocaleString()}/mo</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-card">
          <p className="text-caption text-ink-soft">Lease</p>
          <p className="mt-1 text-body font-semibold text-ink-strong">
            {formatMonthDay(detail.leaseStart)} - {formatMonthDay(detail.leaseEnd)}
          </p>
        </div>
      </section>

      <section className="mt-4 flex flex-wrap gap-2">
        {detail.bedrooms !== null ? (
          <Chip tone="muted">
            <BedDouble className="h-3 w-3" aria-hidden />
            {detail.bedrooms === 0 ? "Studio" : `${detail.bedrooms} bd`}
          </Chip>
        ) : null}
        {detail.bathrooms !== null ? (
          <Chip tone="muted">
            <Bath className="h-3 w-3" aria-hidden />
            {detail.bathrooms} ba
          </Chip>
        ) : null}
        {detail.sqft !== null ? (
          <Chip tone="muted">
            <Ruler className="h-3 w-3" aria-hidden />
            {detail.sqft.toLocaleString()} sqft
          </Chip>
        ) : null}
        <Chip tone={detail.furnished ? "accent" : "muted"}>
          {detail.furnished === null ? "Furnished state unavailable" : detail.furnished ? "Furnished" : "Unfurnished"}
        </Chip>
        {detail.utilitiesIncluded !== null ? (
          <Chip tone={detail.utilitiesIncluded ? "accent" : "muted"}>
            <Zap className="h-3 w-3" aria-hidden />
            {detail.utilitiesIncluded ? "Utilities included" : "Utilities extra"}
          </Chip>
        ) : null}
      </section>

      {detail.pros.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-h2 text-ink-strong">Pros</h2>
          <ul className="mt-2 grid gap-2">
            {detail.pros.map((pro) => (
              <li key={pro} className="flex items-start gap-2 text-body text-ink-strong">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-func-pass" aria-hidden />
                {pro}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {detail.amenities.length > 0 ? (
        <section className="mt-5">
          <h2 className="text-h2 text-ink-strong">Amenities</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {detail.amenities.map((amenity) => (
              <Chip key={amenity}>{amenity}</Chip>
            ))}
          </div>
        </section>
      ) : null}

      {detail.host ? (
        <section className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-caption text-ink-soft">Host</p>
          <Link href={`/profile/${detail.host.id}`} className="text-body font-semibold text-ink-strong hover:underline">
            {detail.host.name}
          </Link>
        </section>
      ) : null}

      <ReviewsPanel
        subjectType="listing"
        subjectId={detail.id}
        subjectLabel={detail.title}
        className="mt-6"
      />
    </div>
  );
}
