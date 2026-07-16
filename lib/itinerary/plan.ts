import type { CommuteScheduleInput, ItineraryDay, ItineraryItem, Place } from "@/lib/types/contract";

/**
 * Deterministic first-week itinerary scaffold (B8). The DAY STRUCTURE, dates, and
 * time slots are fixed in code; the LLM (in the route) may only rewrite the per-item
 * `note` prose. With the LLM disabled, these deterministic notes stand on their own.
 */

const MS_PER_DAY = 86_400_000;
const COMMUTE_BASE_DATE = Date.UTC(2026, 5, 8);

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

export function buildCommuteItineraryDay(input: CommuteScheduleInput): ItineraryDay {
  const items: ItineraryItem[] = [
    {
      time: "08:00",
      title: "Leave your selected apartment",
      kind: "settle",
      note: `Start from apartment ${input.apartmentId}; keep the morning commute simple before adding stops.`,
    },
    ...input.selectedPlaces.map((place, index) => ({
      time: timeForCommuteStop(index),
      title: `Commute stop: ${place.label}`,
      kind: itineraryKindForCommutePlace(place.kind),
      lat: place.lat,
      lng: place.lng,
      note: `${place.label} is built into the commute as a ${place.kind} stop, using the place selected from the route results.`,
    })),
    {
      time: timeForCommuteStop(input.selectedPlaces.length),
      title: "Arrive near the office",
      kind: "errand",
      note:
        input.selectedPlaces.length > 0
          ? "The day keeps your selected route stops in order before work."
          : "No route stops selected, so the schedule stays direct and commute-focused.",
    },
  ];

  return {
    date: stableCommuteDate(input.apartmentId),
    dayLabel: "Commute day",
    items,
  };
}

function stableCommuteDate(apartmentId: string): string {
  const offsetDays = hashString(apartmentId) % 21;
  return new Date(COMMUTE_BASE_DATE + offsetDays * MS_PER_DAY).toISOString().slice(0, 10);
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function timeForCommuteStop(index: number): string {
  const minutes = 8 * 60 + 30 + index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function itineraryKindForCommutePlace(kind: string): ItineraryItem["kind"] {
  if (kind === "grocery" || kind === "transit" || kind === "work") return "errand";
  return "explore";
}
