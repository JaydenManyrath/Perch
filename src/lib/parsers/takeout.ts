import type { Place } from "@/lib/contract";
import { recurringPlaces, type Visit } from "@/lib/places/recurring";

/**
 * Google Maps Takeout parsing (B6). DETERMINISTIC: normalize the export into raw
 * visits, then delegate to the shared `recurringPlaces` clustering (B9). Supports the
 * Semantic Location History `timelineObjects[].placeVisit` shape and a simple
 * `{ visits: [...] }` shape (used by our demo fixture).
 */

const E7 = 1e7;

const KIND_KEYWORDS: [Place["kind"], RegExp][] = [
  ["coffee", /coffee|café|cafe|espresso|roaster|starbucks|blue bottle|philz/i],
  ["gym", /gym|fitness|yoga|crossfit|climbing|pilates/i],
  ["grocery", /grocery|market|trader joe|whole foods|safeway|qfc|costco/i],
  ["transit", /station|transit|light rail|metro|bart|subway|bus (?:stop|station)/i],
  ["show", /theater|theatre|venue|hall|arena|club|live music|amphitheat/i],
  ["work", /office|hq|headquarters|campus|tower|building/i],
];

function inferKind(name?: string, category?: string): Place["kind"] {
  const hay = `${name ?? ""} ${category ?? ""}`;
  for (const [kind, re] of KIND_KEYWORDS) if (re.test(hay)) return kind;
  return "other";
}

type RawTimeline = {
  timelineObjects?: {
    placeVisit?: {
      location?: {
        latitudeE7?: number;
        longitudeE7?: number;
        name?: string;
        address?: string;
      };
    };
  }[];
};
type RawSimple = {
  visits?: { lat: number; lng: number; name?: string; category?: string }[];
};

/** Normalize any supported Takeout shape into raw visits. */
export function toVisits(json: unknown): Visit[] {
  const data = json as RawTimeline & RawSimple;
  const visits: Visit[] = [];

  if (Array.isArray(data.timelineObjects)) {
    for (const obj of data.timelineObjects) {
      const loc = obj.placeVisit?.location;
      if (loc?.latitudeE7 == null || loc.longitudeE7 == null) continue;
      visits.push({
        lat: loc.latitudeE7 / E7,
        lng: loc.longitudeE7 / E7,
        label: loc.name,
        kind: inferKind(loc.name, loc.address),
      });
    }
  }

  if (Array.isArray(data.visits)) {
    for (const v of data.visits) {
      if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
      visits.push({
        lat: v.lat,
        lng: v.lng,
        label: v.name,
        kind: inferKind(v.name, v.category),
      });
    }
  }

  return visits;
}

/** Parse a Takeout export into recurring places (frequency populated). */
export function parseTakeout(json: unknown): Place[] {
  return recurringPlaces(toVisits(json));
}
