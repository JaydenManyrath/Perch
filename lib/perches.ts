import type {
  ListingDetail,
  ListingResponse,
  ListingStatus,
  PerchCard,
  PostListingInput,
  ReviewSummary,
  SwipeDirection,
} from "@/lib/types/contract";
import { summarizeRatings } from "@/lib/reviews/aggregate";

export class PerchInputError extends Error {}
export class PerchForbiddenError extends Error {}
export class PerchNotFoundError extends Error {}

export const LISTING_FRESHNESS_DAYS = 7;

export const LISTING_SELECT = `
  id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,
  created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id,
  users:created_by(id,name,avatar_url,user_type)
`;

export type PerchListingRecord = {
  id: string;
  title: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  lease_start: string | null;
  lease_end: string | null;
  lease_type: "sublet" | "short_term" | "standard" | null;
  source: string | null;
  photos: string[];
  safety_flags: { scamSignals: string[]; notes: string[] };
  created_by: string | null;
  created_at: string;
  status: ListingStatus;
  expires_at: string;
  last_confirmed_at: string | null;
  sourced: boolean;
  source_name: string;
  source_url: string | null;
  external_id: string | null;
  users?: { id: string; name: string; avatar_url: string | null; user_type: string | null } | null;
};

// Round 3 (section 13.2) - comprehensive listing detail columns.
export const LISTING_DETAIL_SELECT = `
  id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,
  created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id,
  furnished,pros,bedrooms,bathrooms,sqft,amenities,utilities_included,
  users:created_by(id,name,avatar_url,user_type)
`;

export type DetailListingRecord = PerchListingRecord & {
  furnished: boolean | null;
  pros: string[] | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  sqft: number | null;
  amenities: string[] | null;
  utilities_included: boolean | null;
};

export type ReviewRow = { subject_id: string; rating: number };

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseSwipeInput(input: unknown): { listingId: string; direction: SwipeDirection } {
  const body = input as { listingId?: unknown; direction?: unknown };
  if (typeof body?.listingId !== "string" || !uuidRe.test(body.listingId)) {
    throw new PerchInputError("listingId must be a valid listing id");
  }
  if (body.direction !== "left" && body.direction !== "right") {
    throw new PerchInputError("direction must be left or right");
  }
  return { listingId: body.listingId, direction: body.direction };
}

function assertNoExtraKeys(input: Record<string, unknown>, allowed: string[]) {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(input).filter((key) => !allowedSet.has(key));
  if (extra.length > 0) {
    throw new PerchInputError(`unexpected listing fields: ${extra.sort().join(", ")}`);
  }
}

function parseRequiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new PerchInputError(`${key} is required`);
  }
  return value.trim();
}

function parseIsoDate(input: Record<string, unknown>, key: string): string {
  const value = parseRequiredString(input, key);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())) {
    throw new PerchInputError(`${key} must be an ISO date`);
  }
  return value;
}

export function parseListingId(input: unknown): string {
  if (typeof input !== "string" || !uuidRe.test(input)) {
    throw new PerchInputError("listing id must be valid");
  }
  return input;
}

export function parsePostListingInput(input: unknown): PostListingInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new PerchInputError("listing body is required");
  }
  const body = input as Record<string, unknown>;
  assertNoExtraKeys(body, [
    "title", "address", "lat", "lng", "price", "leaseStart", "leaseEnd", "leaseType", "photos", "safetyNotes",
    "furnished", "pros", "bedrooms", "bathrooms", "sqft", "amenities", "utilitiesIncluded",
  ]);

  const title = parseRequiredString(body, "title");
  const address = parseRequiredString(body, "address");
  const lat = body.lat;
  const lng = body.lng;
  const price = body.price;
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new PerchInputError("lat must be a valid latitude");
  }
  if (typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new PerchInputError("lng must be a valid longitude");
  }
  if (typeof price !== "number" || !Number.isInteger(price) || price <= 0) {
    throw new PerchInputError("price must be a positive integer");
  }

  const leaseStart = parseIsoDate(body, "leaseStart");
  const leaseEnd = parseIsoDate(body, "leaseEnd");
  if (new Date(`${leaseEnd}T00:00:00.000Z`).getTime() <= new Date(`${leaseStart}T00:00:00.000Z`).getTime()) {
    throw new PerchInputError("leaseEnd must be after leaseStart");
  }

  if (body.leaseType !== "sublet" && body.leaseType !== "short_term" && body.leaseType !== "standard") {
    throw new PerchInputError("leaseType is invalid");
  }
  if (!Array.isArray(body.photos) || !body.photos.every((photo) => typeof photo === "string")) {
    throw new PerchInputError("photos must be an array of strings");
  }
  if (body.safetyNotes !== undefined && (!Array.isArray(body.safetyNotes) || !body.safetyNotes.every((note) => typeof note === "string"))) {
    throw new PerchInputError("safetyNotes must be an array of strings");
  }

  const detail = parseListingDetailFields(body);

  return {
    title,
    address,
    lat,
    lng,
    price,
    leaseStart,
    leaseEnd,
    leaseType: body.leaseType,
    photos: body.photos,
    safetyNotes: body.safetyNotes,
    ...detail,
  };
}

function parseStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
  if (input[key] === undefined) return undefined;
  const value = input[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new PerchInputError(`${key} must be an array of strings`);
  }
  return value.map((item) => (item as string).trim()).filter((item) => item.length > 0);
}

function parseOptionalBool(input: Record<string, unknown>, key: string): boolean | null | undefined {
  if (input[key] === undefined) return undefined;
  if (input[key] === null) return null;
  if (typeof input[key] !== "boolean") throw new PerchInputError(`${key} must be a boolean`);
  return input[key] as boolean;
}

function parseOptionalNumber(
  input: Record<string, unknown>,
  key: string,
  opts: { integer?: boolean; min?: number; max?: number } = {},
): number | null | undefined {
  if (input[key] === undefined) return undefined;
  const value = input[key];
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new PerchInputError(`${key} must be a number`);
  }
  if (opts.integer && !Number.isInteger(value)) throw new PerchInputError(`${key} must be an integer`);
  if (opts.min !== undefined && value < opts.min) throw new PerchInputError(`${key} must be >= ${opts.min}`);
  if (opts.max !== undefined && value > opts.max) throw new PerchInputError(`${key} must be <= ${opts.max}`);
  return value;
}

/** Parse the optional round-3 comprehensive detail fields on a listing post. */
export function parseListingDetailFields(body: Record<string, unknown>): {
  furnished?: boolean | null;
  pros?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  amenities?: string[];
  utilitiesIncluded?: boolean | null;
} {
  return {
    furnished: parseOptionalBool(body, "furnished"),
    pros: parseStringArray(body, "pros"),
    bedrooms: parseOptionalNumber(body, "bedrooms", { integer: true, min: 0, max: 20 }),
    bathrooms: parseOptionalNumber(body, "bathrooms", { min: 0, max: 20 }),
    sqft: parseOptionalNumber(body, "sqft", { integer: true, min: 1, max: 100_000 }),
    amenities: parseStringArray(body, "amenities"),
    utilitiesIncluded: parseOptionalBool(body, "utilitiesIncluded"),
  };
}

export function freshnessExpiry(now = new Date()): string {
  return new Date(now.getTime() + LISTING_FRESHNESS_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function listingInsertPayload(input: PostListingInput, callerId: string, now = new Date()) {
  return {
    title: input.title,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    price: input.price,
    lease_start: input.leaseStart,
    lease_end: input.leaseEnd,
    lease_type: input.leaseType,
    photos: input.photos,
    safety_flags: { scamSignals: [], notes: input.safetyNotes ?? [] },
    created_by: callerId,
    sourced: false,
    source: null,
    source_name: "subletter",
    source_url: null,
    external_id: null,
    status: "available" as const,
    expires_at: freshnessExpiry(now),
    last_confirmed_at: null,
    // Round 3 comprehensive detail (nullable / default-empty when omitted).
    furnished: input.furnished ?? null,
    pros: input.pros ?? [],
    bedrooms: input.bedrooms ?? null,
    bathrooms: input.bathrooms ?? null,
    sqft: input.sqft ?? null,
    amenities: input.amenities ?? [],
    utilities_included: input.utilitiesIncluded ?? null,
  };
}

export function listingResponse(row: PerchListingRecord, reviews: ReviewRow[] = []): ListingResponse {
  return { listing: toPerchCard(row, reviews) };
}

export function isCompleteFreshListing(row: PerchListingRecord, now = new Date()): boolean {
  return (
    row.status === "available" &&
    new Date(row.expires_at).getTime() > now.getTime() &&
    typeof row.address === "string" &&
    row.address.trim().length > 0 &&
    typeof row.lat === "number" &&
    typeof row.lng === "number" &&
    typeof row.lease_start === "string" &&
    typeof row.lease_end === "string" &&
    typeof row.lease_type === "string"
  );
}

export function rankDeckRows(rows: PerchListingRecord[]): PerchListingRecord[] {
  return [...rows].sort((a, b) => {
    const byExpiry = new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
    if (byExpiry !== 0) return byExpiry;
    const byConfirmed =
      new Date(b.last_confirmed_at ?? b.created_at).getTime() -
      new Date(a.last_confirmed_at ?? a.created_at).getTime();
    if (byConfirmed !== 0) return byConfirmed;
    return a.id.localeCompare(b.id);
  });
}

export function summarizeReviews(rows: ReviewRow[], listingId: string): ReviewSummary {
  const ratings = rows.filter((row) => row.subject_id === listingId).map((row) => row.rating);
  return summarizeRatings(ratings);
}

export function toPerchCard(row: PerchListingRecord, reviews: ReviewRow[]): PerchCard {
  const host =
    row.sourced || !row.users || row.users.user_type !== "subletter"
      ? null
      : { id: row.users.id, name: row.users.name, avatarUrl: row.users.avatar_url };

  return {
    id: row.id,
    title: row.title,
    address: row.address ?? "",
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    price: row.price,
    lease_start: row.lease_start ?? "",
    lease_end: row.lease_end ?? "",
    lease_type: row.lease_type ?? "sublet",
    photos: row.photos,
    safety_flags: row.safety_flags,
    created_at: row.created_at,
    status: row.status,
    sourced: row.sourced,
    kind: "listing",
    expiresAt: row.expires_at,
    lastConfirmedAt: row.last_confirmed_at,
    sourceName: row.source_name,
    reviewSummary: summarizeReviews(reviews, row.id),
    host,
  };
}

export function buildDeckCards(rows: PerchListingRecord[], reviews: ReviewRow[], now = new Date()): PerchCard[] {
  return rankDeckRows(rows.filter((row) => isCompleteFreshListing(row, now))).map((row) =>
    toPerchCard(row, reviews),
  );
}

/** Map a full listing row to the comprehensive ListingDetail (section 13.9). */
export function toListingDetail(row: DetailListingRecord, reviews: ReviewRow[]): ListingDetail {
  const host =
    row.sourced || !row.users || row.users.user_type !== "subletter"
      ? null
      : { id: row.users.id, name: row.users.name, avatarUrl: row.users.avatar_url };
  const bathrooms = row.bathrooms == null ? null : Number(row.bathrooms);

  return {
    id: row.id,
    title: row.title,
    address: row.address ?? "",
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    price: row.price,
    leaseStart: row.lease_start ?? "",
    leaseEnd: row.lease_end ?? "",
    leaseType: row.lease_type ?? "sublet",
    furnished: row.furnished ?? null,
    pros: row.pros ?? [],
    bedrooms: row.bedrooms ?? null,
    bathrooms: Number.isFinite(bathrooms as number) ? bathrooms : null,
    sqft: row.sqft ?? null,
    amenities: row.amenities ?? [],
    utilitiesIncluded: row.utilities_included ?? null,
    photos: row.photos,
    status: row.status,
    host,
    reviewSummary: summarizeReviews(reviews, row.id),
  };
}
