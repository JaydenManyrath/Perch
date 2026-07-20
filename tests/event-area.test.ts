import { afterEach, describe, expect, it, vi } from "vitest";

const { mapboxToken } = vi.hoisted(() => ({ mapboxToken: vi.fn<() => string | undefined>() }));
vi.mock("@/lib/routing/mapbox", () => ({ mapboxToken }));

import { DEFAULT_AREA, knownCityArea, resolveEventArea } from "@/lib/events/area";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("knownCityArea", () => {
  it("matches a known city exactly, case-insensitive", () => {
    expect(knownCityArea("Seattle")?.name).toBe("Seattle");
    expect(knownCityArea("new york")?.name).toBe("New York");
  });

  it("matches 'City, ST' shapes by substring", () => {
    expect(knownCityArea("Seattle, WA")?.name).toBe("Seattle");
    expect(knownCityArea("Austin, TX")?.name).toBe("Austin");
  });

  it("returns null for unknown or empty cities", () => {
    expect(knownCityArea("Walla Walla")).toBeNull();
    expect(knownCityArea("")).toBeNull();
    expect(knownCityArea(null)).toBeNull();
  });
});

describe("resolveEventArea", () => {
  it("prefers the known-city table without touching the network", async () => {
    mapboxToken.mockReturnValue("pk.test");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const area = await resolveEventArea("Seattle");

    expect(area.name).toBe("Seattle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to the default area when unknown and no token", async () => {
    mapboxToken.mockReturnValue(undefined);

    const area = await resolveEventArea("Walla Walla");

    expect(area).toEqual(DEFAULT_AREA);
  });

  it("geocodes an unknown city via Mapbox when a token exists", async () => {
    mapboxToken.mockReturnValue("pk.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ features: [{ center: [-90.0715, 29.9511], text: "New Orleans" }] }),
      })),
    );

    const area = await resolveEventArea("New Orleans");

    expect(area.name).toBe("New Orleans");
    expect(area.lat).toBeCloseTo(29.9511);
    expect(area.lng).toBeCloseTo(-90.0715);
  });

  it("falls back to the default area when the geocode errors", async () => {
    mapboxToken.mockReturnValue("pk.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const area = await resolveEventArea("Nowhereville");

    expect(area).toEqual(DEFAULT_AREA);
  });
});
