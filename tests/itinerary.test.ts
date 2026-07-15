import { describe, it, expect } from "vitest";
import { buildItinerary } from "@/lib/itinerary/plan";
import { toTasteProfile } from "@/lib/composio/spotify";
import type { Place } from "@/lib/types/contract";

const coffee: Place = {
  id: "p1",
  label: "Victrola Coffee Roasters",
  kind: "coffee",
  lat: 47.615,
  lng: -122.34,
  frequency: 6,
};

describe("buildItinerary", () => {
  it("produces one day per requested day, dated from move-in", () => {
    const week = buildItinerary({ moveInDate: "2026-06-08", city: "Seattle", days: 7 });
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-06-08");
    expect(week[6].date).toBe("2026-06-14");
    expect(week[0].dayLabel).toBe("Day 1 — Landing");
  });

  it("weaves the usual coffee spot into day 2 with coordinates", () => {
    const week = buildItinerary({ moveInDate: "2026-06-08", city: "Seattle", days: 3, places: [coffee] });
    const coffeeItem = week[1].items.find((i) => i.title.includes("Victrola"));
    expect(coffeeItem).toBeDefined();
    expect(coffeeItem?.lat).toBeCloseTo(47.615, 3);
  });

  it("every item has a deterministic non-empty note (works with LLM disabled)", () => {
    const week = buildItinerary({ moveInDate: "2026-06-08", city: "Seattle", days: 5 });
    for (const day of week) {
      for (const item of day.items) {
        expect(item.note.length).toBeGreaterThan(0);
        expect(["settle", "explore", "social", "errand"]).toContain(item.kind);
      }
    }
  });

  it("is deterministic", () => {
    const a = buildItinerary({ moveInDate: "2026-06-08", city: "Seattle", days: 4, places: [coffee] });
    const b = buildItinerary({ moveInDate: "2026-06-08", city: "Seattle", days: 4, places: [coffee] });
    expect(a).toEqual(b);
  });
});

describe("toTasteProfile", () => {
  it("aggregates genres by frequency and caps list sizes", () => {
    const taste = toTasteProfile({
      artists: [
        { name: "Phoenix", genres: ["indie", "rock"] },
        { name: "Bonobo", genres: ["electronic", "indie"] },
      ],
      tracks: [{ name: "Lisztomania" }],
    });
    expect(taste.topArtists).toEqual(["Phoenix", "Bonobo"]);
    expect(taste.topGenres[0]).toBe("indie"); // appears twice → ranked first
    expect(taste.topTracks).toEqual(["Lisztomania"]);
  });
});
