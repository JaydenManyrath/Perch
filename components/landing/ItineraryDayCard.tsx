import Link from "next/link";
import { MapPin, Coffee, PartyPopper, Package, Compass, Home } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import type { ItineraryDay, ItineraryItem } from "@/lib/types/contract";
import { formatShortDate } from "@/lib/utils";

const KIND_ICON = {
  settle: Home,
  explore: Compass,
  social: PartyPopper,
  errand: Package,
} as const;

/**
 * ItineraryDayCard - one day's plan. Decision content: no mascot. Each item
 * is time + title + note + optional map link.
 */
export function ItineraryDayCard({ day }: { day: ItineraryDay }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{day.dayLabel}</CardTitle>
        <CardDescription>{formatShortDate(day.date)}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {day.items.map((it, i) => (
            <li key={i} className="flex items-start gap-3">
              <ItemIcon kind={it.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-caption text-ink-soft font-semibold whitespace-nowrap">
                    {it.time}
                  </span>
                  <span className="text-body text-ink-strong font-semibold">
                    {it.title}
                  </span>
                  <Chip tone="muted" className="capitalize">
                    {it.kind}
                  </Chip>
                </div>
                <p className="mt-1 text-body text-ink-soft">{it.note}</p>
                {typeof it.lat === "number" && typeof it.lng === "number" ? (
                  <Link
                    href={`https://www.google.com/maps?q=${it.lat},${it.lng}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-flex items-center gap-1 text-caption text-sky-500 hover:text-sky-600 font-semibold"
                  >
                    <MapPin className="h-3 w-3" aria-hidden /> Open in maps
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ItemIcon({ kind }: { kind: ItineraryItem["kind"] }) {
  const Icon = KIND_ICON[kind] ?? Coffee;
  return (
    <span className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-sky-500" aria-hidden />
    </span>
  );
}
