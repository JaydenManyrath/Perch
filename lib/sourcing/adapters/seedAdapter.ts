import type { RawListing, SourceAdapter } from "../types";

/**
 * Demo source adapter (RC1). Emits a believable, STABLE set of Seattle-area sublets so
 * the swipe deck is full on first open. External ids are fixed, so re-running ingest
 * de-dupes to the same rows (idempotent). This is the seam a real source would replace;
 * live scraping is intentionally out of scope for the dev demo (ToS/legal).
 */

type Seed = {
  id: string;
  title: string;
  address: string;
  price: number;
  lat: number;
  lng: number;
  leaseEnd: string;
  leaseType: RawListing["leaseType"];
  rawText?: string;
};

const NEIGHBORHOODS: Seed[] = [
  { id: "caphill-01", title: "Sunny Capitol Hill studio", address: "1500 E Olive Way", price: 1750, lat: 47.6191, lng: -122.3270, leaseEnd: "2026-08-31", leaseType: "sublet" },
  { id: "slu-02", title: "South Lake Union 1BR, walk to Amazon", address: "300 Westlake Ave N", price: 2200, lat: 47.6230, lng: -122.3380, leaseEnd: "2026-08-31", leaseType: "short_term" },
  { id: "ballard-03", title: "Room in Ballard house, 3 interns", address: "5400 Ballard Ave NW", price: 1150, lat: 47.6680, lng: -122.3840, leaseEnd: "2026-09-15", leaseType: "sublet", rawText: "3rd floor walkup, no in-unit laundry" },
  { id: "udist-04", title: "U-District sublet near light rail", address: "4300 Brooklyn Ave NE", price: 1300, lat: 47.6600, lng: -122.3140, leaseEnd: "2026-08-20", leaseType: "sublet" },
  { id: "fremont-05", title: "Fremont loft with skyline view", address: "3500 Fremont Ave N", price: 1950, lat: 47.6510, lng: -122.3500, leaseEnd: "2026-08-31", leaseType: "short_term" },
  { id: "belltown-06", title: "Belltown high-rise, gym included", address: "2600 1st Ave", price: 2400, lat: 47.6150, lng: -122.3490, leaseEnd: "2026-08-31", leaseType: "standard" },
  { id: "wallingford-07", title: "Cozy Wallingford room", address: "4500 Wallingford Ave N", price: 1100, lat: 47.6620, lng: -122.3340, leaseEnd: "2026-09-01", leaseType: "sublet" },
  { id: "columbia-08", title: "Columbia City 1BR near light rail", address: "4900 Rainier Ave S", price: 1500, lat: 47.5600, lng: -122.2870, leaseEnd: "2026-08-31", leaseType: "short_term" },
  { id: "greenlake-09", title: "Green Lake studio, steps to the loop", address: "7100 Woodlawn Ave NE", price: 1650, lat: 47.6800, lng: -122.3280, leaseEnd: "2026-08-31", leaseType: "sublet" },
  { id: "scam-10", title: "Waterfront luxury 2BR - too good to be true", address: "1200 Alaskan Way", price: 1200, lat: 47.6060, lng: -122.3420, leaseEnd: "2026-08-31", leaseType: "sublet", rawText: "Owner is abroad, wire the deposit and keys will be mailed, no viewing needed" },
  { id: "westseattle-11", title: "West Seattle room with Sound view", address: "4400 California Ave SW", price: 1250, lat: 47.5620, lng: -122.3870, leaseEnd: "2026-09-10", leaseType: "sublet" },
  { id: "beacon-12", title: "Beacon Hill 1BR, quiet block", address: "2600 Beacon Ave S", price: 1400, lat: 47.5790, lng: -122.3110, leaseEnd: "2026-08-31", leaseType: "short_term" },
];

const LEASE_START = "2026-06-01";

export function makeSeedAdapter(): SourceAdapter {
  return {
    name: "seed-adapter",
    async fetchArea(_city: string, opts?: { limit?: number }): Promise<RawListing[]> {
      const rows: RawListing[] = NEIGHBORHOODS.map((s) => ({
        externalId: s.id,
        title: s.title,
        address: s.address,
        price: s.price,
        lat: s.lat,
        lng: s.lng,
        leaseStart: LEASE_START,
        leaseEnd: s.leaseEnd,
        leaseType: s.leaseType,
        photos: [],
        sourceUrl: `https://demo.perch.local/listing/${s.id}`,
        rawText: s.rawText,
      }));
      return opts?.limit ? rows.slice(0, opts.limit) : rows;
    },
  };
}
