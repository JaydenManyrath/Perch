import type { SourcedListingInsert } from "./types";

/**
 * De-dupe normalized listings (RC1). Two deterministic layers:
 *  1. Exact: unique on (source_name, external_id) - the DB also enforces this, but we
 *     collapse in-batch first so a single ingest never sends conflicting rows.
 *  2. Fuzzy: same rounded coordinates (4dp, ~11m) AND price within 5% is treated as the
 *     same unit cross-posted; the first occurrence wins (stable by input order).
 * Deterministic and order-stable so re-running ingest yields the same result.
 */

const PRICE_TOLERANCE = 0.05;

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function dedupe(rows: SourcedListingInsert[]): SourcedListingInsert[] {
  const seenExact = new Set<string>();
  const kept: SourcedListingInsert[] = [];

  for (const row of rows) {
    const exactKey = `${row.source_name}::${row.external_id}`;
    if (seenExact.has(exactKey)) continue;

    // Fuzzy: does an already-kept row sit at the same spot within price tolerance?
    const dup = kept.find((k) => {
      if (coordKey(k.lat, k.lng) !== coordKey(row.lat, row.lng)) return false;
      const hi = Math.max(k.price, row.price);
      const lo = Math.min(k.price, row.price);
      return hi === 0 ? true : (hi - lo) / hi <= PRICE_TOLERANCE;
    });
    if (dup) continue;

    seenExact.add(exactKey);
    kept.push(row);
  }
  return kept;
}
