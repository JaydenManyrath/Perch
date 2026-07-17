import { describe, expect, it } from "vitest";
import {
  eventAttendanceLabel,
  eventVenueLine,
  listingAvailabilityLabel,
  listingDetailHref,
  listingFurnishedLabel,
  listingPros,
  placeKindLabel,
  placeTimeContext,
} from "@/components/map/marker-sheet-content";
import type { EventRow, ListingDetail, ListingRow, Place } from "@/lib/types/contract";

describe("map marker sheet payloads", () => {
  it("builds place sheet context from kind and usual-coffee time", () => {
    const place: Place = {
      id: "p1",
      label: "Analog Coffee",
      kind: "coffee",
      lat: 47.61,
      lng: -122.32,
      frequency: 8,
      nearestListingMinutes: 6,
    };

    expect(placeKindLabel(place.kind)).toBe("coffee");
    expect(placeTimeContext(place)).toBe("6 min from your usual coffee spot");
  });

  it("keeps place sheets useful when time context is missing", () => {
    const place: Place = {
      id: "p1",
      label: "Analog Coffee",
      kind: "coffee",
      lat: 47.61,
      lng: -122.32,
      frequency: 8,
    };

    expect(placeTimeContext(place)).toBe("Time from your usual coffee spot unavailable");
  });

  it("builds listing marker summary fields and a listing-specific detail path", () => {
    const listing: Pick<ListingRow, "id" | "status"> = { id: "L1", status: "pending" };
    const detail: Pick<ListingDetail, "furnished" | "pros"> = {
      furnished: true,
      pros: ["Walk to five coffee shops", "Quiet block"],
    };

    expect(listingAvailabilityLabel(listing)).toBe("Pending");
    expect(listingFurnishedLabel(detail)).toBe("Furnished");
    expect(listingPros(detail)).toEqual(["Walk to five coffee shops", "Quiet block"]);
    expect(listingDetailHref(listing.id)).toBe("/listings/L1");
  });

  it("degrades listing optional fields without blocking the sheet", () => {
    expect(listingAvailabilityLabel({ status: undefined })).toBe("Available");
    expect(listingFurnishedLabel(null)).toBe("Furnished state unavailable");
    expect(listingPros(null)).toEqual([]);
  });

  it("builds event date, venue, attendance, and external-link context", () => {
    const event: EventRow = {
      id: "E1",
      title: "Rooftop show",
      category: "music",
      lat: 47.62,
      lng: -122.33,
      datetime: "2026-07-20T20:00:00Z",
      source: "ticketmaster",
      venue: "Neumos",
      url: "https://example.com/tickets",
    };

    expect(eventVenueLine(event)).toContain("Neumos - ");
    expect(eventVenueLine(event)).toContain("Jul 20");
    expect(eventAttendanceLabel(3)).toBe("3 interns going");
    expect(event.url).toBe("https://example.com/tickets");
  });

  it("keeps event sheets readable when optional venue and attendance are absent", () => {
    const event: EventRow = {
      id: "E1",
      title: "Rooftop show",
      category: "music",
      lat: 47.62,
      lng: -122.33,
      datetime: "2026-07-20T20:00:00Z",
      source: "ticketmaster",
      venue: null,
      url: null,
    };

    expect(eventVenueLine(event)).toContain("Jul 20");
    expect(eventVenueLine(event)).not.toContain("null");
    expect(eventAttendanceLabel(null)).toBe("Attendance unavailable");
  });
});
