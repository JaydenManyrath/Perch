import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Landing — first-week itinerary screen. Phase 7 fills in the day cards
 * from ItineraryResponse (Person B generates the plan; A13 renders).
 */
export default function LandingPage() {
  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">Landing</h1>
        <p className="text-caption text-ink-soft">
          Your first week — the plan for after you arrive.
        </p>
      </header>
      <EmptyState
        title="Coming in Phase 7"
        body="Day-by-day plan renders from ItineraryResponse."
        variant="idle"
      />
    </div>
  );
}
