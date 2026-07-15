import { EmptyState } from "@/components/ui/EmptyState";

/**
 * DMs — realtime messaging. Phase 4 fills in the conversation list + threads.
 */
export default function DMsPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">DMs</h1>
        <p className="text-caption text-ink-soft">
          Live messages with your flock.
        </p>
      </header>
      <EmptyState
        title="No conversations yet"
        body="Message someone from Discovery to start a thread."
        variant="idle"
      />
    </div>
  );
}
