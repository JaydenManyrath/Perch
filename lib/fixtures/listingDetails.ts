import type { ListingDetail, ReviewSummary } from "@/lib/types/contract";
import { listingsFixture } from "./listings";
import { reviewsFixture } from "./reviews";
import { sublettersFixture } from "./users";

/**
 * Round 3 (section 13.2) - comprehensive per-listing detail.
 * A hand-tuned map from listing id to the rich fields the perch detail sheet
 * shows (furnished, pros, bed/bath/sqft, amenities, utilities). Person B will
 * return this shape from GET /api/listings/{id}; the fixture below is the
 * default when running with NEXT_PUBLIC_DATA_SOURCE=fixture.
 */
type Details = {
  furnished: boolean | null;
  pros: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  amenities: string[];
  utilitiesIncluded: boolean | null;
};

const DETAILS_BY_ID: Record<string, Details> = {
  L1: {
    furnished: true,
    pros: [
      "Walk to five coffee shops",
      "Quiet block, mid-rise building",
      "Bike storage in the basement",
    ],
    bedrooms: 0,
    bathrooms: 1,
    sqft: 420,
    amenities: ["In-unit laundry", "Air conditioning", "Elevator", "Bike storage"],
    utilitiesIncluded: true,
  },
  L2: {
    furnished: false,
    pros: [
      "Direct bus to campus",
      "Great neighbors, four other interns",
      "Backyard fire pit",
    ],
    bedrooms: 2,
    bathrooms: 1,
    sqft: 780,
    amenities: ["Backyard", "Dishwasher", "Free street parking"],
    utilitiesIncluded: false,
  },
  L3: {
    furnished: true,
    pros: [
      "Two blocks from the office",
      "Great natural light",
      "Rooftop pool building",
    ],
    bedrooms: 0,
    bathrooms: 1,
    sqft: 480,
    amenities: ["Pool", "Gym", "Doorman", "In-unit laundry"],
    utilitiesIncluded: true,
  },
  L4: {
    furnished: true,
    pros: [
      "Backyard with a hammock",
      "Cozy porch",
      "Ballard nightlife on foot",
    ],
    bedrooms: 1,
    bathrooms: 1,
    sqft: 600,
    amenities: ["Backyard", "Washer/dryer", "Off-street parking"],
    utilitiesIncluded: false,
  },
  L5: {
    furnished: true,
    pros: [
      "Steps from Fremont Bridge",
      "Weekly cleaner included",
      "New everything, opened Jan 2026",
    ],
    bedrooms: 0,
    bathrooms: 1,
    sqft: 340,
    amenities: ["Weekly cleaner", "Rooftop lounge", "Gym"],
    utilitiesIncluded: true,
  },
  L6: {
    furnished: true,
    pros: [
      "Corner unit, panoramic view",
      "Building has a gym + rooftop lounge",
      "10-min bus to SLU",
    ],
    bedrooms: 1,
    bathrooms: 1,
    sqft: 720,
    amenities: ["Gym", "Rooftop lounge", "Doorman", "Elevator", "In-unit laundry"],
    utilitiesIncluded: true,
  },
  L7: {
    furnished: true,
    pros: [
      "Three chill roommates already",
      "Backyard for BBQs",
      "Bathroom mostly to yourself",
    ],
    bedrooms: 1,
    bathrooms: 1,
    sqft: 220,
    amenities: ["Shared kitchen", "Backyard", "Washer/dryer"],
    utilitiesIncluded: true,
  },
  L8: {
    furnished: true,
    pros: [
      "Green Lake loop out the front door",
      "Bright kitchen",
      "Extra storage in the closet room",
    ],
    bedrooms: 1,
    bathrooms: 1,
    sqft: 640,
    amenities: ["In-unit laundry", "Dishwasher", "Storage room"],
    utilitiesIncluded: false,
  },
  L9: {
    furnished: false,
    pros: [
      "Best price on Cap Hill this summer",
      "Landlord is chill",
      "12ft ceilings",
    ],
    bedrooms: 0,
    bathrooms: 1,
    sqft: 500,
    amenities: ["Hardwood floors", "Bike storage"],
    utilitiesIncluded: false,
  },
};

function summarizeReviews(listingId: string): ReviewSummary {
  const rows = reviewsFixture.filter(
    (r) => r.subjectType === "listing" && r.subjectId === listingId,
  );
  if (rows.length === 0) return { avgRating: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { avgRating: sum / rows.length, count: rows.length };
}

/** Build a ListingDetail from a listing id (uses live listing data + the details map). */
export function listingDetailFor(id: string): ListingDetail | null {
  const l = listingsFixture.find((x) => x.id === id);
  if (!l) return null;
  const d: Details = DETAILS_BY_ID[id] ?? {
    furnished: null,
    pros: [],
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    amenities: [],
    utilitiesIncluded: null,
  };
  const host = sublettersFixture.find((s) => s.id === l.created_by);
  return {
    id: l.id,
    title: l.title,
    address: l.address,
    lat: l.lat,
    lng: l.lng,
    price: l.price,
    leaseStart: l.lease_start,
    leaseEnd: l.lease_end,
    leaseType: l.lease_type,
    photos: l.photos,
    status: l.status ?? "available",
    host: host
      ? { id: host.id, name: host.name, avatarUrl: host.avatar_url }
      : null,
    reviewSummary: summarizeReviews(l.id),
    furnished: d.furnished,
    pros: d.pros,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    sqft: d.sqft,
    amenities: d.amenities,
    utilitiesIncluded: d.utilitiesIncluded,
  };
}
