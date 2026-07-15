import type { ItineraryDay, ItineraryItem, Place } from "@/lib/contract";

/**
 * Deterministic first-week itinerary scaffold (B8). The DAY STRUCTURE, dates, and
 * time slots are fixed in code; the LLM (in the route) may only rewrite the per-item
 * `note` prose. With the LLM disabled, these deterministic notes stand on their own.
 */

const MS_PER_DAY = 86_400_000;

type Slot = { time: string; title: string; kind: ItineraryItem["kind"]; note: string };

function daySlots(dayIndex: number, city: string, coffee?: Place): Slot[] {
  if (dayIndex === 0) {
    return [
      { time: "10:00", title: "Pick up your keys & drop your bags", kind: "settle", note: `Land softly in ${city} — no plans, just get your bearings.` },
      { time: "13:00", title: "Grocery run for the essentials", kind: "errand", note: "Coffee, snacks, and whatever makes a place feel like yours." },
      { time: "18:00", title: "Short walk around the block", kind: "explore", note: "Notice the nearest bus stop and a place to grab dinner." },
    ];
  }
  if (dayIndex === 1) {
    return [
      { time: "09:00", title: coffee ? `Coffee at ${coffee.label}` : "Find your morning coffee spot", kind: "explore", note: coffee ? "A familiar-feeling start to the day." : "Scout a spot you could make a routine." },
      { time: "12:30", title: "Walk your commute to the office", kind: "errand", note: "Time it once now so day one isn't a scramble." },
      { time: "19:00", title: "Intern meetup nearby", kind: "social", note: "Say yes to the first hangout — that's how the flock forms." },
    ];
  }
  return [
    { time: "09:30", title: "Explore a new neighborhood", kind: "explore", note: `Pick a part of ${city} you haven't seen yet.` },
    { time: "18:30", title: "Dinner with someone new", kind: "social", note: "Bring an intern you met this week." },
  ];
}

export function buildItinerary(opts: {
  moveInDate: string; // ISO date
  city: string;
  days: number;
  places?: Place[];
}): ItineraryDay[] {
  const { moveInDate, city, days, places = [] } = opts;
  const coffee = places.find((p) => p.kind === "coffee");
  const start = Date.parse(`${moveInDate}T00:00:00Z`);

  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const date = new Date(start + i * MS_PER_DAY).toISOString().slice(0, 10);
    const label =
      i === 0 ? "Day 1 — Landing" : `Day ${i + 1} — ${i === 1 ? "Settling in" : "Exploring"}`;
    const items: ItineraryItem[] = daySlots(i, city, coffee).map((s) => ({
      time: s.time,
      title: s.title,
      kind: s.kind,
      note: s.note,
      ...(s.kind === "explore" && coffee && s.title.includes(coffee.label)
        ? { lat: coffee.lat, lng: coffee.lng }
        : {}),
    }));
    return { date, dayLabel: label, items };
  });
}
