import { Suspense } from "react";
import { EventCard } from "@/components/feed/EventCard";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFeed } from "@/lib/data/server-source";

/**
 * The Flyway - RA11: events-only. Past-intern notes moved to the map (RA12).
 * Feed renders events with venue + image + Going Y/N + comment thread.
 */
async function FeedStream() {
  const feed = await getFeed();
  if (feed.items.length === 0) {
    return (
      <EmptyState
        title="Your feed will land here"
        body="Ranked events show up once your taste profile is in."
      />
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {feed.items.map((item, i) => (
        <li key={item.event.id}>
          <EventCard item={item} topPick={i === 0} />
        </li>
      ))}
    </ul>
  );
}

export default function FeedPage() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Flyway</h1>
        <p className="text-caption text-ink-soft">
          Events ranked to your taste. Tap Comments to talk about one; tap Going to join.
        </p>
      </header>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedStream />
      </Suspense>
    </div>
  );
}
