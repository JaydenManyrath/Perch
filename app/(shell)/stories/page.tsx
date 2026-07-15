import { PerchTray } from "@/components/stories/PerchTray";
import { getListings } from "@/lib/data/source";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Image from "next/image";
import { Chip } from "@/components/ui/Chip";
import { formatMonthDay } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function StoriesPage() {
  const listings = await getListings();

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Perches</h1>
        <p className="text-caption text-ink-soft">
          Sublets that fit a ~10-week internship. Tap a bubble to open.
        </p>
      </header>

      <div className="mt-4">
        {listings.length === 0 ? (
          <EmptyState
            title="Save a perch"
            body="Any place you like lands into this tray."
          />
        ) : (
          <PerchTray initial={listings} />
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-h2 text-ink-strong mb-2">All perches</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {listings.map((l) => (
            <li key={l.id}>
              <Card>
                {l.photos[0] ? (
                  <div className="relative aspect-video w-full rounded-t-2xl overflow-hidden bg-sky-100">
                    <Image
                      src={l.photos[0]}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader>
                  <CardTitle>{l.title}</CardTitle>
                  <CardDescription>{l.address}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-body">
                    <span className="font-semibold text-ink-strong">
                      ${l.price.toLocaleString()}/mo
                    </span>
                    <Chip tone="muted">
                      {formatMonthDay(l.lease_start)} – {formatMonthDay(l.lease_end)}
                    </Chip>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
