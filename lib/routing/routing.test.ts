import { describe, it, expect } from "vitest";
import { straightLineRoute, isMapboxEnabled } from "./mapbox";
import { seededCompanyCoords, geocodeEmployer } from "./geocode";
import { pointToSegmentMeters, distanceToPolylineMeters, seededPoisAlongRoute } from "./pois";
import type { GeoJSONLineString } from "@/lib/types/contract";

describe("straightLineRoute (fallback)", () => {
  const office = { lat: 47.6205, lng: -122.3382 };
  const apt = { lat: 47.6191, lng: -122.3270 };
  const r = straightLineRoute(office, apt);

  it("returns a 2-point LineString office -> apartment", () => {
    expect(r.geometry.type).toBe("LineString");
    expect(r.geometry.coordinates).toHaveLength(2);
    expect(r.geometry.coordinates[0]).toEqual([office.lng, office.lat]);
  });
  it("has a positive deterministic distance + duration", () => {
    expect(r.distanceMeters).toBeGreaterThan(0);
    expect(r.durationSeconds).toBeGreaterThan(0);
    expect(straightLineRoute(office, apt)).toEqual(r);
  });
});

describe("geocode (seeded fallback)", () => {
  it("resolves known companies to seeded office coords", () => {
    expect(seededCompanyCoords("Stripe")).toMatchObject({ lat: 47.6205, lng: -122.3382 });
    expect(seededCompanyCoords("stripe inc")).not.toBeNull();
  });
  it("returns null for an unknown employer", () => {
    expect(seededCompanyCoords("Totally Unknown Co")).toBeNull();
  });
  it("geocodeEmployer falls back to seeded then city, never throws", async () => {
    const known = await geocodeEmployer("Stripe");
    expect(known.source).toBe("seeded");
    const unknown = await geocodeEmployer("Totally Unknown Co");
    expect(unknown.source).toBe("city");
    expect(unknown.coords).toMatchObject({ lat: 47.6062, lng: -122.3321 });
  });
});

describe("point-to-polyline distance", () => {
  it("is ~0 for a point on the segment", () => {
    const d = pointToSegmentMeters({ lat: 47.61, lng: -122.33 }, [-122.34, 47.61], [-122.32, 47.61]);
    expect(d).toBeLessThan(5);
  });
  it("grows as the point moves off the line", () => {
    const near = distanceToPolylineMeters({ lat: 47.6105, lng: -122.33 }, [[-122.34, 47.61], [-122.32, 47.61]]);
    const far = distanceToPolylineMeters({ lat: 47.63, lng: -122.33 }, [[-122.34, 47.61], [-122.32, 47.61]]);
    expect(far).toBeGreaterThan(near);
  });
});

describe("seededPoisAlongRoute", () => {
  // A route running east-west through Capitol Hill near the seeded coffee POIs.
  const geometry: GeoJSONLineString = {
    type: "LineString",
    coordinates: [
      [-122.3300, 47.6150],
      [-122.3210, 47.6185],
    ],
  };
  it("returns coffee candidates within the corridor, sorted by distance", () => {
    const pois = seededPoisAlongRoute(geometry, ["coffee"]);
    expect(pois.length).toBeGreaterThan(0);
    expect(pois.every((p) => p.place.kind === "coffee")).toBe(true);
    const dists = pois.map((p) => p.distanceFromRouteMeters);
    expect([...dists]).toEqual([...dists].sort((a, b) => a - b));
  });
  it("filters by requested kind", () => {
    const gyms = seededPoisAlongRoute(geometry, ["gym"]);
    expect(gyms.every((p) => p.place.kind === "gym")).toBe(true);
  });
  it("is deterministic", () => {
    expect(seededPoisAlongRoute(geometry, ["coffee", "gym"])).toEqual(
      seededPoisAlongRoute(geometry, ["coffee", "gym"]),
    );
  });
});

describe("isMapboxEnabled", () => {
  it("reflects token presence", () => {
    const prev = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const prev2 = process.env.MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.MAPBOX_TOKEN;
    expect(isMapboxEnabled()).toBe(false);
    if (prev) process.env.NEXT_PUBLIC_MAPBOX_TOKEN = prev;
    if (prev2) process.env.MAPBOX_TOKEN = prev2;
  });
});
