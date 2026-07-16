/**
 * Sourcing pipeline types (RC1, SOURCING-PROPOSAL.md). Person C owns the pipeline;
 * it writes INTO Person B's `listings` table (contract 11.2 columns). Real scraping
 * is out of scope for the dev demo (ToS/legal); the SourceAdapter interface is the
 * seam where real sources plug in later.
 */

/** A listing as an adapter emits it, before normalization into B's schema. */
export type RawListing = {
  externalId: string; // adapter-native id (dedupe key)
  title: string;
  address: string;
  price: number; // USD/mo
  lat?: number; // demo adapters carry coords directly; real ones geocode in normalize
  lng?: number;
  leaseStart?: string; // ISO date
  leaseEnd?: string; // ISO date
  leaseType?: "sublet" | "short_term" | "standard";
  photos?: string[];
  sourceUrl?: string;
  rawText?: string; // free text scanned by the deterministic safety heuristics
};

/** A source of area listings. `name` becomes `listings.source_name`. */
export interface SourceAdapter {
  name: string;
  fetchArea(city: string, opts?: { limit?: number }): Promise<RawListing[]>;
}

/** A normalized row ready to upsert into B's `listings` table (contract 11.2). */
export type SourcedListingInsert = {
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  lease_start: string | null;
  lease_end: string | null;
  lease_type: "sublet" | "short_term" | "standard";
  photos: string[];
  safety_flags: { scamSignals: string[]; notes: string[] };
  created_by: null; // auto-sourced rows have no owner
  sourced: true;
  source_name: string;
  source_url: string | null;
  external_id: string;
  status: "available";
  expires_at: string; // ISO timestamptz
};
