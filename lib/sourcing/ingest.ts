import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceAdapter, SourcedListingInsert } from "./types";
import { normalizeListing } from "./normalize";
import { dedupe } from "./dedupe";
import { makeSeedAdapter } from "./adapters/seedAdapter";

/**
 * Ingest (RC1): run enabled adapters -> normalize -> dedupe -> upsert into B's
 * `listings`. `planIngest` is the pure, deterministic core (no DB) so it is unit
 * tested directly; `ingestListings` performs the upsert with the service-role client
 * (onConflict on the unique (source_name, external_id) so re-running is idempotent).
 */

export function defaultAdapters(): SourceAdapter[] {
  return [makeSeedAdapter()];
}

/** Pure: collect + normalize + dedupe. Bad rows are skipped, never thrown. */
export async function planIngest(
  adapters: SourceAdapter[],
  opts: { city?: string; now?: number; limit?: number } = {},
): Promise<SourcedListingInsert[]> {
  const city = opts.city ?? "Seattle";
  const normalized: SourcedListingInsert[] = [];

  for (const adapter of adapters) {
    let raws;
    try {
      raws = await adapter.fetchArea(city, { limit: opts.limit });
    } catch {
      // A failing adapter must not sink the whole ingest.
      continue;
    }
    for (const raw of raws) {
      const row = normalizeListing(raw, adapter.name, { city, now: opts.now });
      if (row) normalized.push(row); // null -> skipped bad row
    }
  }
  return dedupe(normalized);
}

export type IngestResult = { planned: number; upserted: number; skipped: number };

/** Full ingest with DB write. Upserts on the unique (source_name, external_id). */
export async function ingestListings(
  admin: SupabaseClient,
  opts: { city?: string; now?: number; limit?: number; adapters?: SourceAdapter[] } = {},
): Promise<IngestResult> {
  const adapters = opts.adapters ?? defaultAdapters();
  const rows = await planIngest(adapters, opts);
  if (rows.length === 0) return { planned: 0, upserted: 0, skipped: 0 };

  const { error, count } = await admin
    .from("listings")
    .upsert(rows, { onConflict: "source_name,external_id", count: "exact" });
  if (error) throw new Error(`ingest upsert failed: ${error.message}`);

  return { planned: rows.length, upserted: count ?? rows.length, skipped: 0 };
}
