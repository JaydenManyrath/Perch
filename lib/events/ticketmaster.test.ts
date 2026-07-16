import { describe, it, expect } from "vitest";
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

describe("dedupeEvents", () => {
  it("collapses duplicate external ids", () => {
    const a = normalizeTmEvent(TM_EVENT)!;
    expect(dedupeEvents([a, { ...a }])).toHaveLength(1);
  });
});

describe("fallbackEvents", () => {
  it("maps the seeded fixture onto the extended shape", () => {
    const fb = fallbackEvents();
    expect(fb.length).toBeGreaterThan(0);
    expect(fb.every((e) => e.source === "seeded" && typeof e.external_id === "string")).toBe(true);
  });
});

describe("fetchNearbyEvents", () => {
  it("returns the seeded fallback (never throws) when no key is set", async () => {
    const prev = process.env.TICKETMASTER_API_KEY;
    delete process.env.TICKETMASTER_API_KEY;
    expect(isTicketmasterEnabled()).toBe(false);
    const { events, source } = await fetchNearbyEvents({ lat: 47.6, lng: -122.3 });
    expect(source).toBe("fallback");
    expect(events.length).toBeGreaterThan(0);
    if (prev) process.env.TICKETMASTER_API_KEY = prev;
  });
});
