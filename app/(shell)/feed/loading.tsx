import { FeedSkeleton } from "@/components/feed/FeedSkeleton";

export default function FeedLoading() {
  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <h1 className="text-h1 text-ink-strong">Flyway</h1>
        <p className="text-caption text-ink-soft">Events and Q&amp;A, ranked to your taste.</p>
      </header>
      <FeedSkeleton />
    </div>
  );
}
