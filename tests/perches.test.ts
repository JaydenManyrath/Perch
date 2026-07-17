import { describe, expect, it } from "vitest";
import {
  buildDeckCards,
  listingInsertPayload,
  parsePostListingInput,
  parseSwipeInput,
  rankDeckRows,
  type PerchListingRecord,
} from "@/lib/perches";

const base: PerchListingRecord = {
  id: "11111111-1111-5111-8111-111111111111",
  title: "Fresh perch",
  address: "10 Demo St",
  lat: 47.61,
  lng: -122.33,
  price: 1800,
  lease_start: "2026-06-01",
  lease_end: "2026-08-15",
  lease_type: "sublet",
  source: "legacy",
  photos: [],
  safety_flags: { scamSignals: [], notes: [] },
  created_by: null,
  created_at: "2026-07-01T00:00:00.000Z",
  status: "available",
  expires_at: "2026-07-20T00:00:00.000Z",
  last_confirmed_at: "2026-07-10T00:00:00.000Z",
  sourced: true,
  source_name: "seed-adapter",
  source_url: null,
  external_id: "seed-1",
  users: null,
};

function listing(overrides: Partial<PerchListingRecord>): PerchListingRecord {
  return { ...base, ...overrides };
}

describe("perches domain", () => {
  it("builds deck cards only from complete Fresh Listings and omits legacy fields", () => {
    const deck = buildDeckCards(
      [
        listing({ id: "11111111-1111-5111-8111-111111111111" }),
        listing({ id: "22222222-2222-5222-8222-222222222222", status: "pending" }),
        listing({ id: "33333333-3333-5333-8333-333333333333", address: "" }),
        listing({ id: "44444444-4444-5444-8444-444444444444", expires_at: "2026-07-10T00:00:00.000Z" }),
      ],
      [
        { subject_id: "11111111-1111-5111-8111-111111111111", rating: 5 },
        { subject_id: "11111111-1111-5111-8111-111111111111", rating: 4 },
      ],
      new Date("2026-07-16T00:00:00.000Z"),
    );

    expect(deck).toHaveLength(1);
    expect(deck[0]).toMatchObject({
      kind: "listing",
      sourceName: "seed-adapter",
      reviewSummary: { avgRating: 4.5, count: 2 },
      host: null,
    });
    expect(deck[0]).not.toHaveProperty("source");
    expect(deck[0]).not.toHaveProperty("created_by");
    expect(Object.keys(deck[0]).sort()).toEqual([
      "address",
      "created_at",
      "expiresAt",
      "host",
      "id",
      "kind",
      "lastConfirmedAt",
      "lat",
      "lease_end",
      "lease_start",
      "lease_type",
      "lng",
      "photos",
      "price",
      "reviewSummary",
      "safety_flags",
      "sourceName",
      "sourced",
      "status",
      "title",
    ].sort());
  });

  it("projects subletter hosts only for subletter-posted rows", () => {
    const [card] = buildDeckCards(
      [
        listing({
          sourced: false,
          source_name: "subletter",
          created_by: "55555555-5555-5555-8555-555555555555",
          users: {
            id: "55555555-5555-5555-8555-555555555555",
            name: "Subletter Sam",
            avatar_url: null,
            user_type: "subletter",
          },
        }),
      ],
      [],
      new Date("2026-07-16T00:00:00.000Z"),
    );

    expect(card.host).toEqual({
      id: "55555555-5555-5555-8555-555555555555",
      name: "Subletter Sam",
      avatarUrl: null,
    });
  });

  it("ranks deterministically with a stable tie-break", () => {
    const ids = rankDeckRows([
      listing({ id: "33333333-3333-5333-8333-333333333333", expires_at: "2026-07-21T00:00:00.000Z" }),
      listing({ id: "22222222-2222-5222-8222-222222222222", expires_at: "2026-07-20T00:00:00.000Z" }),
      listing({ id: "11111111-1111-5111-8111-111111111111", expires_at: "2026-07-20T00:00:00.000Z" }),
    ]).map((row) => row.id);

    expect(ids).toEqual([
      "11111111-1111-5111-8111-111111111111",
      "22222222-2222-5222-8222-222222222222",
      "33333333-3333-5333-8333-333333333333",
    ]);
  });

  it("accepts only a valid listing id and direction for swipes", () => {
    expect(parseSwipeInput({ listingId: base.id, direction: "right" })).toEqual({
      listingId: base.id,
      direction: "right",
    });
    expect(() => parseSwipeInput({ listingId: "listing-1", direction: "right" })).toThrow();
    expect(() => parseSwipeInput({ listingId: base.id, direction: "up" })).toThrow();
  });

  it("accepts explicit nulls from the listing form for nullable round-3 details", () => {
    const input = parsePostListingInput({
      title: "Summer studio",
      address: "10 Demo St",
      lat: 47.61,
      lng: -122.33,
      price: 1800,
      leaseStart: "2026-06-01",
      leaseEnd: "2026-08-15",
      leaseType: "sublet",
      photos: [],
      furnished: true,
      pros: [],
      bedrooms: 0,
      bathrooms: 1,
      sqft: null,
      amenities: [],
      utilitiesIncluded: null,
    });

    expect(input).toMatchObject({ sqft: null, utilitiesIncluded: null });
    expect(listingInsertPayload(input, "55555555-5555-5555-8555-555555555555")).toMatchObject({
      sqft: null,
      utilities_included: null,
    });
  });
});
