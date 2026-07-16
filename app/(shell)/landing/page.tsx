import { getItinerary } from "@/lib/data/source";
import { ItineraryDayCard } from "@/components/landing/ItineraryDayCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarCheck } from "lucide-react";
import { Chip } from "@/components/ui/Chip";

export default async function LandingPage() {
  const itinerary = await getItinerary(7);

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8">
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-h1 text-ink-strong">Landing</h1>
          {itinerary.calendarSynced ? (
            <Chip tone="accent">
              <CalendarCheck className="h-3 w-3" aria-hidden /> Synced to calendar
            </Chip>
          ) : null}
        </div>
        <p className="text-caption text-ink-soft">
          Your first week - a plausible plan for after you arrive.
        </p>
      </header>

      {itinerary.landingWeek.length === 0 ? (
        <EmptyState
          title="No plan yet"
          body="Finish onboarding - your landing week appears here."
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {itinerary.landingWeek.map((d) => (
            <li key={d.date}>
              <ItineraryDayCard day={d} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
