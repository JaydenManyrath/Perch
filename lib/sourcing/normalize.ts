import type { RawListing, SourcedListingInsert } from "./types";

/**
 * Normalize a RawListing into a `listings` insert on Person B's schema (contract 11.2).
 * Deterministic: no LLM. Applies the safety-flag heuristics, sets sourced=true and the
 * freshness fields. A row missing coordinates or a positive price is rejected (returns
 * null) so ingest can skip it rather than crash.
 */

const MS_PER_DAY = 86_400_000;
export const FRESH_DAYS = 7; // demo freshness window (SOURCING-PROPOSAL.md)

// Seattle city center: fallback coords when an adapter row carries none and no
// geocoder is wired (demo adapters supply coords directly).
const CITY_FALLBACK: Record<string, { lat: number; lng: number }> = {
  seattle: { lat: 47.6062, lng: -122.3321 },
};

// Deterministic scam/advisory heuristics over the listing's free text. Mirrors the
// negotiate safety scout's philosophy: explicit scam signals only, positive framing,
// never any "avoid area" inference.
const SCAM_PATTERNS: [string, RegExp][] = [
  ["asks to wire the deposit", /\bwire\b|western union|money ?gram/i],
  ["off-platform payment", /cash ?app|zelle|venmo only|money order|cashier'?s? check|gift ?card/i],
  ["no viewing before payment", /no (viewing|showing|tour)|pay (first|before)|sight[- ]?unseen/i],
  ["landlord abroad / cannot meet", /out of (the )?country|abroad|missionary|deployed overseas/i],
];
const NOTE_PATTERNS: [string, RegExp][] = [
  ["walk-up (no elevator)", /walk[- ]?up|no elevator|\d(rd|th|nd|st) floor/i],
  ["no in-unit laundry", /no (in[- ]?unit )?laundry|laundromat/i],
  ["utilities not included", /utilities not included|\+ utilities/i],
];

export function safetyFlagsFromText(text: string | undefined): {
  scamSignals: string[];
  notes: string[];
} {
  const hay = text ?? "";
  const scamSignals: string[] = [];
  const notes: string[] = [];
  for (const [label, re] of SCAM_PATTERNS) if (re.test(hay)) scamSignals.push(label);
  for (const [label, re] of NOTE_PATTERNS) if (re.test(hay)) notes.push(label);
  return { scamSignals, notes };
}

export function normalizeListing(
  raw: RawListing,
  sourceName: string,
  opts: { city?: string; now?: number } = {},
): SourcedListingInsert | null {
  if (!raw.externalId || !Number.isFinite(raw.price) || raw.price <= 0) return null;

  const coords =
    raw.lat != null && raw.lng != null
      ? { lat: raw.lat, lng: raw.lng }
      : CITY_FALLBACK[(opts.city ?? "seattle").toLowerCase()];
  if (!coords) return null; // no coords and no fallback -> skip, do not crash

  const now = opts.now ?? Date.now();
  const expiresAt = new Date(now + FRESH_DAYS * MS_PER_DAY).toISOString();

  return {
    title: raw.title,
    address: raw.address,
    lat: coords.lat,
    lng: coords.lng,
    price: Math.round(raw.price),
    lease_start: raw.leaseStart ?? null,
    lease_end: raw.leaseEnd ?? null,
    lease_type: raw.leaseType ?? "sublet",
    photos: raw.photos ?? [],
    safety_flags: safetyFlagsFromText(raw.rawText),
    created_by: null,
    sourced: true,
    source_name: sourceName,
    source_url: raw.sourceUrl ?? null,
    external_id: raw.externalId,
    status: "available",
    expires_at: expiresAt,
  };
}
