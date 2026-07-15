import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Discovery — peer discovery ("find your flock"). Phase 6 fills in the
 * match card + "Message now" → live DM flagship beat.
 */
export default function DiscoveryPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Discovery</h1>
        <p className="text-caption text-ink-soft">
          Find your flock — other interns at your company / in your city.
        </p>
      </header>
      <EmptyState
        title="Landing your flock"
        body="The connection hero lands in Phase 6."
        variant="hop"
      />
    </div>
  );
}
