import { describe, it, expect } from "vitest";
import {
  haversineMeters,
  walkingMinutes,
  nearestAnchor,
} from "@/lib/places/distance";

describe("haversineMeters", () => {
  it("is zero for the same point", () => {
    expect(haversineMeters({ lat: 47.6, lng: -122.3 }, { lat: 47.6, lng: -122.3 })).toBe(0);
  });

  it("matches a known distance (~1.11 km per 0.01° latitude)", () => {
    const d = haversineMeters({ lat: 47.6, lng: -122.3 }, { lat: 47.61, lng: -122.3 });
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1120);
  });

  it("is symmetric", () => {
    const a = { lat: 40.7, lng: -74.0 };
    const b = { lat: 40.71, lng: -74.01 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("walkingMinutes", () => {
  it("is 0 for identical points", () => {
    expect(walkingMinutes({ lat: 1, lng: 1 }, { lat: 1, lng: 1 })).toBe(0);
  });
  it("is at least 1 for any real gap", () => {
    expect(walkingMinutes({ lat: 47.6, lng: -122.3 }, { lat: 47.6001, lng: -122.3 })).toBe(1);
  });
  it("is deterministic and monotonic with distance", () => {
    const near = walkingMinutes({ lat: 47.6, lng: -122.3 }, { lat: 47.602, lng: -122.3 });
    const far = walkingMinutes({ lat: 47.6, lng: -122.3 }, { lat: 47.62, lng: -122.3 });
    expect(far).toBeGreaterThan(near);
  });
});

describe("nearestAnchor", () => {
  const anchors = [
    { label: "usual coffee spot", lat: 47.61, lng: -122.33 },
    { label: "gym", lat: 47.65, lng: -122.35 },
  ];
  it("returns null with no anchors", () => {
    expect(nearestAnchor({ lat: 0, lng: 0 }, [])).toBeNull();
  });
  it("picks the closest anchor", () => {
    const res = nearestAnchor({ lat: 47.611, lng: -122.331 }, anchors);
    expect(res?.anchor.label).toBe("usual coffee spot");
    expect(res?.minutes).toBeGreaterThanOrEqual(0);
  });
  it("breaks ties by label for stability", () => {
    const tie = [
      { label: "zeta", lat: 10, lng: 10 },
      { label: "alpha", lat: 10, lng: 10 },
    ];
    expect(nearestAnchor({ lat: 10.5, lng: 10.5 }, tie)?.anchor.label).toBe("alpha");
  });
});
