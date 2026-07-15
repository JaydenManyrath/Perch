import { describe, it, expect } from "vitest";
import {
  recurringPlaces,
  withNearestListingMinutes,
  type Visit,
} from "@/lib/places/recurring";

function repeat(v: Visit, n: number): Visit[] {
  return Array.from({ length: n }, () => v);
}

describe("recurringPlaces", () => {
  it("keeps only places visited at least the threshold number of times", () => {
    const visits: Visit[] = [
      ...repeat({ lat: 47.61, lng: -122.33, kind: "coffee", label: "Your usual coffee spot" }, 5),
      ...repeat({ lat: 47.65, lng: -122.35, kind: "gym" }, 4),
      { lat: 47.70, lng: -122.40, kind: "other" }, // 1 visit → dropped
    ];
    const places = recurringPlaces(visits);
    expect(places).toHaveLength(2);
    expect(places[0].frequency).toBe(5); // sorted by frequency desc
    expect(places[0].kind).toBe("coffee");
    expect(places[0].label).toBe("Your usual coffee spot");
  });

  it("clusters nearby visits into one place", () => {
    const visits: Visit[] = [
      { lat: 47.6100, lng: -122.3300, kind: "coffee" },
      { lat: 47.6101, lng: -122.3301, kind: "coffee" },
      { lat: 47.6102, lng: -122.3299, kind: "coffee" },
    ];
    const places = recurringPlaces(visits);
    expect(places).toHaveLength(1);
    expect(places[0].frequency).toBe(3);
  });

  it("assigns stable ids (re-parsing yields identical output)", () => {
    const visits = repeat({ lat: 47.61, lng: -122.33, kind: "coffee" }, 3);
    expect(recurringPlaces(visits)).toEqual(recurringPlaces(visits));
  });
});

describe("withNearestListingMinutes", () => {
  it("attaches deterministic walking minutes to the nearest listing", () => {
    const places = recurringPlaces(repeat({ lat: 47.61, lng: -122.33, kind: "coffee" }, 3));
    const enriched = withNearestListingMinutes(places, [
      { lat: 47.611, lng: -122.331 },
      { lat: 47.90, lng: -122.90 },
    ]);
    expect(enriched[0].nearestListingMinutes).toBeGreaterThanOrEqual(0);
    expect(enriched[0].nearestListingMinutes).toBeLessThan(20);
  });
  it("leaves the field undefined when there are no listings", () => {
    const places = recurringPlaces(repeat({ lat: 47.61, lng: -122.33, kind: "coffee" }, 3));
    expect(withNearestListingMinutes(places, [])[0].nearestListingMinutes).toBeUndefined();
  });
});
