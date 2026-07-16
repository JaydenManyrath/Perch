import { describe, expect, it, vi } from "vitest";
import {
  buildRoutePois,
  distancePointToLineStringMeters,
  parseRoutePoisInput,
  RoutePoiInputError,
} from "@/lib/route/pois";
import type { GeoJSONLineString, RoutePoi } from "@/lib/types/contract";

const geometry: GeoJSONLineString = {
  type: "LineString",
  coordinates: [
    [-122.34, 47.6],
    [-122.34, 47.61],
    [-122.33, 47.61],
  ],
};

describe("route POI input validation", () => {
  it("accepts a usable LineString and allowed kinds", () => {
    expect(parseRoutePoisInput({ geometry, kinds: ["coffee", "gym", "coffee"] })).toEqual({
      geometry,
      kinds: ["coffee", "gym"],
    });
  });

  it("rejects invalid geometry before candidate search", async () => {
    const searchCandidates = vi.fn();
    expect(() => parseRoutePoisInput({ geometry: { type: "Point", coordinates: [0, 0] }, kinds: ["coffee"] }))
      .toThrow(RoutePoiInputError);
    expect(searchCandidates).not.toHaveBeenCalled();
  });

  it("rejects non-finite coordinates and unknown kinds", () => {
    expect(() =>
      parseRoutePoisInput({ geometry: { type: "LineString", coordinates: [[0, 0], [Number.NaN, 1]] }, kinds: ["coffee"] }),
    ).toThrow("invalid_coordinates");
    expect(() => parseRoutePoisInput({ geometry, kinds: ["grocery"] })).toThrow("invalid_kinds");
  });

  it("rejects longitude and latitude outside GeoJSON coordinate ranges", () => {
    expect(() =>
      parseRoutePoisInput({
        geometry: { type: "LineString", coordinates: [[-181, 47.6], [-122.34, 47.61]] },
        kinds: ["coffee"],
      }),
    ).toThrow("invalid_coordinates");
    expect(() =>
      parseRoutePoisInput({
        geometry: { type: "LineString", coordinates: [[-122.34, 91], [-122.34, 47.61]] },
        kinds: ["coffee"],
      }),
    ).toThrow("invalid_coordinates");
  });
});

describe("route POI deterministic filtering", () => {
  it("uses only the supplied geometry and kinds for Person C candidate search", async () => {
    const searchCandidates = vi.fn(async () => []);

    await buildRoutePois({
      geometry,
      kinds: ["coffee"],
      userPlaces: [],
      searchCandidates,
    });

    expect(searchCandidates).toHaveBeenCalledTimes(1);
    expect(searchCandidates).toHaveBeenCalledWith({ geometry, kinds: ["coffee"] });
  });

  it("keeps POIs inside the route corridor and excludes POIs outside it", async () => {
    const pois = await buildRoutePois({
      geometry,
      kinds: ["coffee"],
      userPlaces: [{ id: "near", label: "Near coffee", kind: "coffee", lat: 47.605, lng: -122.3405 }],
      searchCandidates: async () => [
        { id: "far", label: "Far coffee", kind: "coffee", lat: 47.605, lng: -122.33 },
      ],
      corridorMeters: 100,
    });

    expect(pois.map((poi) => poi.place.id)).toEqual(["near"]);
    expect(pois[0].distanceFromRouteMeters).toBeGreaterThanOrEqual(0);
    expect(pois[0].distanceFromRouteMeters).toBeLessThanOrEqual(100);
  });

  it("handles a multi-segment line rather than only endpoints", () => {
    const middleSegmentDistance = distancePointToLineStringMeters({ lat: 47.61, lng: -122.335 }, geometry);
    expect(middleSegmentDistance).toBeLessThan(1);
  });

  it("merges user places and candidates, dedupes by stable identity, and filters by requested kinds", async () => {
    const duplicate = { id: "same", label: "Same Coffee", kind: "coffee", lat: 47.605, lng: -122.34 };
    const pois = await buildRoutePois({
      geometry,
      kinds: ["coffee"],
      userPlaces: [
        duplicate,
        { id: "gym-1", label: "Route Gym", kind: "gym", lat: 47.605, lng: -122.34 },
      ],
      searchCandidates: async () => [
        duplicate,
        { id: "coffee-2", label: "Second Coffee", kind: "coffee", lat: 47.606, lng: -122.34 },
      ],
    });

    expect(pois.map((poi) => poi.place.id).sort()).toEqual(["coffee-2", "same"]);
  });

  it("returns validated places with deterministic distance and stable equal-distance ordering", async () => {
    const places: RoutePoi["place"][] = [
      { id: "z", label: "Zed Gym", kind: "gym", lat: 47.605, lng: -122.34 },
      { id: "a", label: "Alpha Gym", kind: "gym", lat: 47.605, lng: -122.34 },
    ];

    const first = await buildRoutePois({ geometry, kinds: ["gym"], userPlaces: places, searchCandidates: async () => [] });
    const second = await buildRoutePois({ geometry, kinds: ["gym"], userPlaces: places, searchCandidates: async () => [] });

    expect(first).toEqual(second);
    expect(first.map((poi) => poi.place.id)).toEqual(["a", "z"]);
    expect(first.every((poi) => Number.isInteger(poi.distanceFromRouteMeters))).toBe(true);
  });

  it("drops provider places whose coordinates are outside valid longitude or latitude ranges", async () => {
    const pois = await buildRoutePois({
      geometry,
      kinds: ["coffee"],
      userPlaces: [
        { id: "bad-lng", label: "Bad longitude", kind: "coffee", lat: 47.605, lng: -181 },
      ],
      searchCandidates: async () => [
        { id: "bad-lat", label: "Bad latitude", kind: "coffee", lat: 91, lng: -122.34 },
      ],
    });

    expect(pois).toEqual([]);
  });
});
