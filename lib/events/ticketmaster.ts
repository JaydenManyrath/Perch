import { eventsFixture } from "@/lib/fixtures/events";

/**
 * Ticketmaster Discovery API integration (RC3). Server-side, keyed, READ-ONLY,
 * rate-limited at the route. Fetches nearby events and normalizes them onto Person B's
 * `events` columns (contract 11.6: external_id, url, venue, image_url, price_range).
 * When there is no key or the call fails/quota-limits, a deterministic SEEDED FALLBACK
 * is returned so the feed never breaks. The normalize step is pure and unit-tested.
 */

const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

/**
 * Insert shape for B's `events` table. Dedupe key: `id` is DERIVED deterministically
 * from (source, external_id) - see deterministicEventId - so upserts conflict on the
 * PRIMARY KEY. (The migration-0006 unique index on (source, external_id) is PARTIAL
 * (`where external_id is not null`) and PostgREST's on_conflict cannot target a partial
 * index, which made every live upsert fail. The PK route needs no DDL and stays
 * idempotent everywhere.)
 */
export type EventUpsert = {
  id: string;
  external_id: string;
  source: string; // 'ticketmaster' | 'seeded'
  title: string;
  category: string;
  lat: number;
  lng: number;
  datetime: string; // ISO
  url: string | null;
  venue: string | null;
  image_url: string | null;
  price_range: string | null;
};

export function isTicketmasterEnabled(): boolean {
  return !!process.env.TICKETMASTER_API_KEY;
}

/**
 * Deterministic uuid for an external event: sha1(source:external_id) formatted as a
 * uuid. Same input -> same id on every run and every machine, so re-ingesting is a
 * pure no-op update and never duplicates a row.
 */
export function deterministicEventId(source: string, externalId: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("crypto") as typeof import("crypto");
  const hex = createHash("sha1").update(`${source}:${externalId}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ---- Minimal shape of a Ticketmaster Discovery event (only fields we read) ----
type TmImage = { url?: string; width?: number; ratio?: string; fallback?: boolean };
type TmVenue = { name?: string; location?: { latitude?: string; longitude?: string } };
type TmEvent = {
  id: string;
  name: string;
  url?: string;
  images?: TmImage[];
  dates?: { start?: { dateTime?: string; localDate?: string } };
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  priceRanges?: { min?: number; max?: number; currency?: string }[];
  _embedded?: { venues?: TmVenue[] };
};

function formatTmDate(date: Date): string {
  // Discovery API 400s on fractional seconds - strip WHATEVER milliseconds are
  // present (a bare `.replace(".000Z", ...)` misses real timestamps, which was why
  // every ingest silently fell back to seeded events).
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function parseTime(datetime: string): number | null {
  const ms = Date.parse(datetime);
  return Number.isFinite(ms) ? ms : null;
}

function compareEvents(a: EventUpsert, b: EventUpsert): number {
  const at = parseTime(a.datetime) ?? Number.POSITIVE_INFINITY;
  const bt = parseTime(b.datetime) ?? Number.POSITIVE_INFINITY;
  if (at !== bt) return at - bt;
  return a.external_id.localeCompare(b.external_id);
}

function upcomingSorted(rows: EventUpsert[], now: Date): EventUpsert[] {
  const nowMs = now.getTime();
  return rows
    .filter((row) => {
      const ms = parseTime(row.datetime);
      return ms != null && ms >= nowMs;
    })
    .sort(compareEvents);
}

function dateInFallbackWindow(original: string, now: Date, index: number): string {
  const base = new Date(now);
  base.setUTCDate(base.getUTCDate() + index * 7);

  const originalDate = new Date(original);
  if (Number.isFinite(originalDate.getTime())) {
    base.setUTCHours(
      originalDate.getUTCHours(),
      originalDate.getUTCMinutes(),
      originalDate.getUTCSeconds(),
      originalDate.getUTCMilliseconds(),
    );
    if (base.getTime() < now.getTime()) base.setUTCDate(base.getUTCDate() + 1);
  }

  return formatTmDate(base);
}

function pickImage(images: TmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  const usable = images.filter((i) => i.url && !i.fallback);
  // Person A has a placeholder for null images; avoid inventing a poor source image.
  const wide = usable.filter((i) => i.ratio === "16_9");
  if (wide.length === 0) return null;
  return wide.reduce((best, i) => ((i.width ?? 0) > (best.width ?? 0) ? i : best), wide[0]).url ?? null;
}

function priceRange(pr: TmEvent["priceRanges"]): string | null {
  const p = pr?.[0];
  if (!p || (p.min == null && p.max == null)) return null;
  const cur = p.currency === "USD" || !p.currency ? "$" : `${p.currency} `;
  if (p.min != null && p.max != null && p.min !== p.max) return `${cur}${Math.round(p.min)}-${cur}${Math.round(p.max)}`;
  const v = p.min ?? p.max!;
  return `${cur}${Math.round(v)}`;
}

/** Pure: map a Ticketmaster event to an `events` upsert row, or null if unusable. */
export function normalizeTmEvent(ev: TmEvent): EventUpsert | null {
  const venue = ev._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  if (!ev.id || !ev.name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const start = ev.dates?.start;
  const datetime = start?.dateTime ?? (start?.localDate ? `${start.localDate}T00:00:00Z` : null);
  if (!datetime) return null;

  const cls = ev.classifications?.[0];
  const category = (cls?.genre?.name ?? cls?.segment?.name ?? "event").toLowerCase();

  return {
    id: deterministicEventId("ticketmaster", ev.id),
    external_id: ev.id,
    source: "ticketmaster",
    title: ev.name,
    category,
    lat,
    lng,
    datetime,
    url: ev.url ?? null,
    venue: venue?.name ?? null,
    image_url: pickImage(ev.images),
    price_range: priceRange(ev.priceRanges),
  };
}

/** Deterministic seeded fallback mapped onto the extended events shape. */
export function fallbackEvents(now: Date = new Date()): EventUpsert[] {
  const rows = [...eventsFixture].sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime)).map((e, index) => {
    return {
      id: deterministicEventId("seeded", e.id),
      external_id: e.id,
      source: "seeded",
      title: e.title,
      category: e.category,
      lat: e.lat,
      lng: e.lng,
      datetime: dateInFallbackWindow(e.datetime, now, index),
      url: e.url ?? null,
      venue: e.venue ?? null,
      image_url: e.image_url ?? null,
      price_range: e.price_range ?? null,
    };
  });
  return upcomingSorted(dedupeEvents(rows), now);
}

/** De-dupe a batch on external_id (Ticketmaster can repeat), stable by input order. */
export function dedupeEvents(rows: EventUpsert[]): EventUpsert[] {
  const seen = new Set<string>();
  const out: EventUpsert[] = [];
  for (const r of rows) {
    if (seen.has(r.external_id)) continue;
    seen.add(r.external_id);
    out.push(r);
  }
  return out;
}

/**
 * Fetch nearby events live (or fall back to seed). Never throws - a failure returns the
 * seeded fallback so the feed always has content.
 */
export async function fetchNearbyEvents(opts: {
  lat: number;
  lng: number;
  radiusMiles?: number;
  size?: number;
  now?: Date;
}): Promise<{ events: EventUpsert[]; source: "ticketmaster" | "fallback" }> {
  const key = process.env.TICKETMASTER_API_KEY;
  const now = opts.now ?? new Date();
  const fallback = () => ({ events: dedupeEvents(fallbackEvents(now)), source: "fallback" as const });
  if (!key) return fallback();

  try {
    const end = new Date(now);
    end.setUTCDate(end.getUTCDate() + 90);
    const params = new URLSearchParams({
      apikey: key,
      latlong: `${opts.lat},${opts.lng}`,
      radius: String(opts.radiusMiles ?? 25),
      unit: "miles",
      size: String(opts.size ?? 40),
      startDateTime: formatTmDate(now),
      endDateTime: formatTmDate(end),
      sort: "date,asc",
    });
    const res = await fetch(`${DISCOVERY_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
      // Discovery data is not sensitive; a short cache is fine.
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`ticketmaster ${res.status}`);
    const data = (await res.json()) as { _embedded?: { events?: TmEvent[] } };
    const raw = data._embedded?.events ?? [];
    const normalized = upcomingSorted(
      raw.map(normalizeTmEvent).filter((e): e is EventUpsert => !!e),
      now,
    );
    if (normalized.length === 0) return fallback();
    return { events: dedupeEvents(normalized), source: "ticketmaster" };
  } catch (err) {
    console.warn("ticketmaster fetch failed, using seeded fallback:", err);
    return fallback();
  }
}
