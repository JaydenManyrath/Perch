import type { EventRow, ListingDetail, ListingRow, Place } from "@/lib/types/contract";
import { formatEventTime } from "@/lib/utils";

export function placeKindLabel(kind: Place["kind"]): string {
  return kind.replace("_", " ");
}

export function placeTimeContext(place: Place): string {
  if (typeof place.nearestListingMinutes === "number") {
    return `${place.nearestListingMinutes} min from your usual coffee spot`;
  }
  return "Time from your usual coffee spot unavailable";
}

export function listingFurnishedLabel(detail: Pick<ListingDetail, "furnished"> | null): string {
  if (!detail || detail.furnished === null) return "Furnished state unavailable";
  return detail.furnished ? "Furnished" : "Unfurnished";
}

export function listingAvailabilityLabel(listing: Pick<ListingRow, "status">): string {
  const status = listing.status ?? "available";
  return status[0].toUpperCase() + status.slice(1);
}

export function listingPros(detail: Pick<ListingDetail, "pros"> | null): string[] {
  return detail?.pros?.filter(Boolean) ?? [];
}

export function listingDetailHref(listingId: string): string {
  return `/listings/${encodeURIComponent(listingId)}`;
}

export function eventVenueLine(event: EventRow): string {
  return event.venue ? `${event.venue} - ${formatEventTime(event.datetime)}` : formatEventTime(event.datetime);
}

export function eventAttendanceLabel(internsGoing: number | null | undefined): string {
  if (typeof internsGoing !== "number" || internsGoing <= 0) return "Attendance unavailable";
  return `${internsGoing} intern${internsGoing === 1 ? "" : "s"} going`;
}
