import { Suspense } from "react";
import { EventCard } from "@/components/feed/EventCard";
import { NoteThread } from "@/components/feed/NoteThread";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { getFeed, getNotes, getUserById } from "@/lib/data/source";

/** Small helper: interleave notes into the ranked feed (every 3rd item). */
function interleave<T, U>(items: T[], others: U[], stride: number): (T | U)[] {
  const out: (T | U)[] = [];
  let oi = 0;
  items.forEach((it, i) => {
    out.push(it);
    if ((i + 1) % stride === 0 && others[oi]) {
      out.push(others[oi]);
      oi += 1;
    }
  });
  while (oi < others.length) {
    out.push(others[oi]);
    oi += 1;
  }
  return out;
}

async function FeedStream() {
  const [feed, notes] = await Promise.all([getFeed(), getNotes()]);
  if (feed.items.length === 0) {
    return (
      <EmptyState
        title="Your feed will land here"
        body="Ranked events show up once your taste profile is in."
      />
    );
  }
  const authors = await Promise.all(notes.map((n) => getUserById(n.created_by)));
  const noteRows = notes.map((n, i) => ({ note: n, author: authors[i] ?? undefined }));

  const rows = interleave(
    feed.items.map((it, i) => ({ kind: "event" as const, item: it, topPick: i === 0 })),
    noteRows.map((nr) => ({ kind: "note" as const, ...nr })),
    3,
  );

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row, idx) => (
        <li key={idx}>
          {row.kind === "event" ? (
            <EventCard item={row.item} topPick={row.topPick} />
          ) : (
            <NoteThread note={row.note} author={row.author} />
          )}
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
          Events and Q&amp;A, ranked to your taste.
        </p>
      </header>
      <Suspense fallback={<FeedSkeleton />}>
        <FeedStream />
      </Suspense>
    </div>
  );
}
