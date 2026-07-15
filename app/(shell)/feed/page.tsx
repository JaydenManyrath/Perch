import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The Flyway — taste-ranked events feed. Phase 3 fills in the content.
 * Phase-2 stub: title + chick-fronted empty state so the surface is walkable.
 */
export default function FeedPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Flyway</h1>
        <p className="text-caption text-ink-soft">
          Events and Q&amp;A, ranked to your taste.
        </p>
      </header>
      <EmptyState
        title="Your feed will land here"
        body="Ranked events and past-intern notes appear once you're connected."
        variant="idle"
      />
    </div>
  );
}
