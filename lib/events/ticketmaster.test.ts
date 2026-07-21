import { afterEach, describe, it, expect, vi } from "vitest";
import {
  normalizeTmEvent,
  fallbackEvents,
  dedupeEvents,
  fetchNearbyEvents,
  isTicketmasterEnabled,
} from "./ticketmaster";

// A realistic (trimmed) Ticketmaster Discovery event object.
const TM_EVENT = {
  id: "vvG1zZ9abcd",
  name: "Peggy Gou at WaMu Theater",
  url: "https://www.ticketmaster.com/event/vvG1zZ9abcd",
  images: [
    { url: "https://img/small.jpg", width: 305, ratio: "16_9" },
    { url: "https://img/large.jpg", width: 2048, ratio: "16_9" },
    { url: "https://img/square.jpg", width: 1080, ratio: "1_1" },
  ],
  dates: { start: { dateTime: "2026-06-28T22:00:00Z", localDate: "2026-06-28" } },
  classifications: [{ segment: { name: "Music" }, genre: { name: "Dance/Electronic" } }],
  priceRanges: [{ min: 45, max: 89.5, currency: "USD" }],
  _embedded: { venues: [{ name: "WaMu Theater", location: { latitude: "47.5952", longitude: "-122.3316" } }] },
};

const FIXED_NOW = new Date("2026-07-17T12:00:00Z");

type TmEventFixture = Omit<typeof TM_EVENT, "dates" | "images"> & {
  dates?: { start?: { dateTime?: string; localDate?: string } };
  images?: Array<{ url?: string; width?: number; ratio?: string; fallback?: boolean }>;
};

function tmEvent(overrides: Partial<TmEventFixture> & { id: string; name?: string; dateTime?: string }) {
  const { dateTime, dates, ...rest } = overrides;
  return {
    ...TM_EVENT,
    ...rest,
    id: overrides.id,
    name: overrides.name ?? `Event ${overrides.id}`,
    dates: dates ?? { start: { dateTime: dateTime ?? "2026-07-18T20:00:00Z" } },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

async function withTicketmasterKey<T>(key: string | null, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.TICKETMASTER_API_KEY;
  if (key == null) delete process.env.TICKETMASTER_API_KEY;
  else process.env.TICKETMASTER_API_KEY = key;
  try {
    return await fn();
  } finally {
    if (prev) process.env.TICKETMASTER_API_KEY = prev;
    else delete process.env.TICKETMASTER_API_KEY;
  }
}

describe("normalizeTmEvent", () => {
  const row = normalizeTmEvent(TM_EVENT)!;

  it("maps onto B's events columns", () => {
    expect(row).toMatchObject({
      external_id: "vvG1zZ9abcd",
      source: "ticketmaster",
      title: "Peggy Gou at WaMu Theater",
      category: "dance/electronic",
      venue: "WaMu Theater",
      url: "https://www.ticketmaster.com/event/vvG1zZ9abcd",
    });
    expect(row.lat).toBeCloseTo(47.5952, 4);
    expect(row.lng).toBeCloseTo(-122.3316, 4);
    expect(row.datetime).toBe("2026-06-28T22:00:00Z");
  });

  it("picks the widest 16:9 image", () => {
    expect(row.image_url).toBe("https://img/large.jpg");
  });

  it("formats a price range", () => {
    expect(row.price_range).toBe("$45-$90");
  });

  it("returns null when the venue has no coordinates", () => {
    expect(normalizeTmEvent({ ...TM_EVENT, _embedded: { venues: [{ name: "x" }] } })).toBeNull();
  });

  it("falls back to localDate when no dateTime", () => {
    const r = normalizeTmEvent({ ...TM_EVENT, dates: { start: { localDate: "2026-07-01" } } })!;
    expect(r.datetime).toBe("2026-07-01T00:00:00Z");
  });
});

describe("pickImage precedence (via normalizeTmEvent)", () => {
  type TestImage = { url?: string; width?: number; ratio?: string; fallback?: boolean };
  function imageFor(images: TestImage[] | undefined): string | null {
    return normalizeTmEvent({ ...TM_EVENT, images })!.image_url;
  }

  it("prefers the largest non-fallback 16_9 image even when a larger other-ratio image exists", () => {
    expect(
      imageFor([
        { url: "https://img/huge-square.jpg", width: 3000, ratio: "1_1" },
        { url: "https://img/wide-small.jpg", width: 640, ratio: "16_9" },
        { url: "https://img/wide-big.jpg", width: 1024, ratio: "16_9" },
        { url: "https://img/wide-fallback.jpg", width: 2048, ratio: "16_9", fallback: true },
      ]),
    ).toBe("https://img/wide-big.jpg");
  });

  it("falls back to the largest non-fallback image of any ratio when no non-fallback 16_9 exists", () => {
    expect(
      imageFor([
        { url: "https://img/wide-fallback.jpg", width: 2048, ratio: "16_9", fallback: true },
        { url: "https://img/photo.jpg", width: 640, ratio: "3_2" },
        { url: "https://img/square.jpg", width: 1080, ratio: "1_1" },
      ]),
    ).toBe("https://img/square.jpg");
  });

  it("uses the largest fallback image as a last resort instead of returning null", () => {
    expect(
      imageFor([
        { url: "https://img/fb-small.jpg", width: 1024, ratio: "16_9", fallback: true },
        { url: "https://img/fb-big.jpg", width: 2048, ratio: "3_2", fallback: true },
      ]),
    ).toBe("https://img/fb-big.jpg");
  });

  it("keeps the first of equal-width candidates, so the pick is deterministic", () => {
    expect(
      imageFor([
        { url: "https://img/first.jpg", width: 1024, ratio: "16_9" },
        { url: "https://img/second.jpg", width: 1024, ratio: "16_9" },
      ]),
    ).toBe("https://img/first.jpg");
  });

  it("returns null only when there are no images or no image has a url", () => {
    expect(imageFor(undefined)).toBeNull();
    expect(imageFor([])).toBeNull();
    expect(imageFor([{ url: "", width: 1920, ratio: "16_9" }, { width: 640, ratio: "1_1" }])).toBeNull();
  });
});

describe("dedupeEvents", () => {
  it("collapses duplicate external ids", () => {
    const a = normalizeTmEvent(TM_EVENT)!;
    expect(dedupeEvents([a, { ...a }])).toHaveLength(1);
  });
});

describe("fallbackEvents", () => {
  it("maps the seeded fixture onto the extended shape", () => {
    const fb = fallbackEvents(FIXED_NOW);
    expect(fb.length).toBeGreaterThan(0);
    expect(fb.every((e) => e.source === "seeded" && typeof e.external_id === "string")).toBe(true);
  });

  it("keeps seeded fallback events upcoming, sorted, deterministic, and with documented image nulls", () => {
    const first = fallbackEvents(FIXED_NOW);
    const second = fallbackEvents(FIXED_NOW);
    expect(first.length).toBeGreaterThan(0);
    expect(first.map((e) => e.datetime)).toEqual([...first.map((e) => e.datetime)].sort());
    expect(first.map((e) => e.datetime)).toEqual(second.map((e) => e.datetime));
    expect(first.every((e) => Date.parse(e.datetime) >= FIXED_NOW.getTime())).toBe(true);
    expect(first.every((e) => e.image_url === null || e.image_url.startsWith("https://"))).toBe(true);
  });

  it("keeps seeded fallback events inside the same bounded future window", () => {
    const laterClock = new Date("2027-02-01T12:00:00Z");
    const endWindow = laterClock.getTime() + 90 * 24 * 60 * 60 * 1000;
    const fb = fallbackEvents(laterClock);

    expect(fb.length).toBeGreaterThan(0);
    expect(fb.every((e) => Date.parse(e.datetime) >= laterClock.getTime())).toBe(true);
    expect(fb.every((e) => Date.parse(e.datetime) <= endWindow)).toBe(true);
  });
});

describe("fetchNearbyEvents", () => {
  it("returns the seeded fallback (never throws) when no key is set", async () => {
    await withTicketmasterKey(null, async () => {
      expect(isTicketmasterEnabled()).toBe(false);
      const { events, source } = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });
      expect(source).toBe("fallback");
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => Date.parse(e.datetime) >= FIXED_NOW.getTime())).toBe(true);
    });
  });

  it("requests an injected upcoming window and returns deduped provider results in ascending order", async () => {
    await withTicketmasterKey("tm-key", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: {
            events: [
              tmEvent({ id: "late", dateTime: "2026-07-25T20:00:00Z" }),
              tmEvent({ id: "past", dateTime: "2026-07-17T11:59:59Z" }),
              tmEvent({ id: "now", dateTime: "2026-07-17T12:00:00Z" }),
              tmEvent({ id: "late", name: "Duplicate late", dateTime: "2026-07-24T20:00:00Z" }),
              tmEvent({ id: "invalid", dates: { start: {} } }),
            ],
          },
        }),
      } as Response);

      const { events, source } = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });

      expect(source).toBe("ticketmaster");
      expect(events.map((e) => e.external_id)).toEqual(["now", "late"]);
      expect(events.map((e) => e.datetime)).toEqual(["2026-07-17T12:00:00Z", "2026-07-24T20:00:00Z"]);
      const requested = new URL(fetchMock.mock.calls[0][0] as string);
      expect(requested.searchParams.get("startDateTime")).toBe("2026-07-17T12:00:00Z");
      expect(requested.searchParams.get("endDateTime")).toBe("2026-10-15T12:00:00Z");
      expect(requested.searchParams.get("sort")).toBe("date,asc");
    });
  });

  it("uses external id as a deterministic tie-breaker for matching datetimes", async () => {
    await withTicketmasterKey("tm-key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: {
            events: [
              tmEvent({ id: "tie-b", dateTime: "2026-07-20T20:00:00Z" }),
              tmEvent({ id: "tie-a", dateTime: "2026-07-20T20:00:00Z" }),
            ],
          },
        }),
      } as Response);

      const { events } = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });

      expect(events.map((e) => e.external_id)).toEqual(["tie-a", "tie-b"]);
    });
  });

  it("applies the image precedence end to end and nulls image_url only when no image has a url", async () => {
    await withTicketmasterKey("tm-key", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => ({
          _embedded: {
            events: [
              tmEvent({
                id: "image",
                images: [
                  { url: "https://img/tablet.jpg", width: 2048, ratio: "16_9", fallback: true },
                  { url: "https://img/square.jpg", width: 3000, ratio: "1_1" },
                  { url: "https://img/small.jpg", width: 640, ratio: "16_9" },
                  { url: "https://img/best.jpg", width: 1920, ratio: "16_9", fallback: false },
                ],
              }),
              tmEvent({
                id: "fallback-image",
                dateTime: "2026-07-19T20:00:00Z",
                images: [
                  { url: "", width: 1920, ratio: "16_9" },
                  { url: "https://img/fallback.jpg", width: 1920, ratio: "16_9", fallback: true },
                ],
              }),
              tmEvent({
                id: "no-image",
                dateTime: "2026-07-20T20:00:00Z",
                images: [
                  { url: "", width: 1920, ratio: "16_9" },
                  { width: 640, ratio: "1_1" },
                ],
              }),
            ],
          },
        }),
      } as Response);

      const { events } = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });

      expect(events.find((e) => e.external_id === "image")?.image_url).toBe("https://img/best.jpg");
      expect(events.find((e) => e.external_id === "fallback-image")?.image_url).toBe("https://img/fallback.jpg");
      expect(events.find((e) => e.external_id === "no-image")?.image_url).toBeNull();
    });
  });

  it("uses the same fixed-clock fallback for provider errors and empty usable responses", async () => {
    await withTicketmasterKey("tm-key", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 429 } as Response).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ _embedded: { events: [tmEvent({ id: "past", dateTime: "2026-07-01T12:00:00Z" })] } }),
      } as Response);

      const errorResult = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });
      const emptyResult = await fetchNearbyEvents({ lat: 47.6, lng: -122.3, now: FIXED_NOW });

      expect(errorResult.source).toBe("fallback");
      expect(emptyResult.source).toBe("fallback");
      expect(errorResult.events.map((e) => e.datetime)).toEqual(emptyResult.events.map((e) => e.datetime));
      expect(errorResult.events.every((e) => Date.parse(e.datetime) >= FIXED_NOW.getTime())).toBe(true);
    });
  });
});
