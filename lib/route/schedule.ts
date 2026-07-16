import { buildCommuteItineraryDay } from "@/lib/itinerary/plan";
import type { CommuteScheduleInput, ItineraryDay, RoutePoi } from "@/lib/types/contract";

type RoutePoiPlace = RoutePoi["place"];

export class CommuteScheduleInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommuteScheduleInputError";
  }
}

export function parseCommuteScheduleInput(body: unknown): CommuteScheduleInput {
  if (!body || typeof body !== "object") {
    throw new CommuteScheduleInputError("body_required");
  }

  const input = body as Partial<CommuteScheduleInput>;
  if (typeof input.apartmentId !== "string" || input.apartmentId.trim().length === 0) {
    throw new CommuteScheduleInputError("invalid_apartment_id");
  }
  if (!Array.isArray(input.selectedPlaces)) {
    throw new CommuteScheduleInputError("invalid_selected_places");
  }

  const selectedPlaces = input.selectedPlaces.map((place) => {
    const valid = validateCommuteSchedulePlace(place);
    if (!valid) throw new CommuteScheduleInputError("invalid_selected_place");
    return valid;
  });

  return { apartmentId: input.apartmentId.trim(), selectedPlaces };
}

export function buildCommuteSchedule(input: CommuteScheduleInput): ItineraryDay {
  return buildCommuteItineraryDay(input);
}

export function validateCommuteSchedulePlace(value: unknown): RoutePoiPlace | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Partial<RoutePoiPlace>;
  if (typeof p.id !== "string" || p.id.trim().length === 0) return null;
  if (typeof p.label !== "string" || p.label.trim().length === 0) return null;
  if (typeof p.kind !== "string" || p.kind.trim().length === 0) return null;
  if (!validLatitude(p.lat) || !validLongitude(p.lng)) return null;
  return {
    id: p.id.trim(),
    label: p.label.trim(),
    kind: p.kind.trim(),
    lat: p.lat,
    lng: p.lng,
  };
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validLatitude(value: unknown): value is number {
  return finiteNumber(value) && value >= -90 && value <= 90;
}

function validLongitude(value: unknown): value is number {
  return finiteNumber(value) && value >= -180 && value <= 180;
}
