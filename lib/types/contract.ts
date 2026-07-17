/**
 * FROZEN contract types - verbatim from docs/FOUNDATION-CONTRACT.md sections
 * 4, 4.6, 5, 11, and 12.
 *
 * DO NOT DRIFT. If a shape needs to change, edit the contract doc first in
 * a PR both people review, THEN update this file in the same PR.
 *
 * Merged from person-a (UI) + person-b (schema+APIs) + person-c (integrations).
 * Fields are kept OPTIONAL where possible so A's fixture data, B's server
 * rows, and C's pipeline outputs all satisfy the same TypeScript shape.
 * A shared union type is what makes the fixture -> live swap invisible.
 */

// Section 4.1 - GET /api/feed
export type FeedItem = {
  event: {
    id: string;
    title: string;
    category: string;
    lat: number;
    lng: number;
    datetime: string; // ISO 8601
    source: string;
    // Section 11.6 - Ticketmaster / seed event enrichments (nullable).
    venue?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    priceRange?: string | null;
  };
  tasteScore: number; // 0..1, deterministic
  reason: string;     // short human-readable, LLM-generated
  // Section 11.6 / 12.2 - attendance count + viewer's own going flag.
  internsGoing?: number;
  viewerGoing?: boolean;
};

export type FeedResponse = { items: FeedItem[] };

// Section 4.2 - GET /api/matches (connection hero seam)
export type Match = {
  user: {
    id: string;
    name: string;
    role: string;
    city: string;
    avatarUrl: string | null;
  };
  company: string;
  moveWeek: string;   // ISO Monday of the move week
  banded: boolean;    // verified/banded flag
  tasteScore: number; // 0..1, deterministic
  reasons: string[];
};

export type MatchesResponse = { matches: Match[] };

// Section 4.3 - POST /api/negotiate (streamed) - Person B owns
export type NegotiateConstraints = {
  monthlyBudget: number;
  moveIn: string;
  moveOut: string;
  routineAnchors?: { label: string; lat: number; lng: number }[];
};

export type NegotiateRequest = {
  listingIds: string[];
  constraints: NegotiateConstraints;
};

export type ScoutCheck = "budget" | "safety" | "lease_fit" | "routine_fit";
export type Verdict = "pass" | "flag" | "fail";

export type NegotiateStreamEvent =
  | { type: "listing_start"; listingId: string; title: string }
  | {
      type: "scout_verdict";
      listingId: string;
      check: ScoutCheck;
      verdict: Verdict;
      value: string;
    }
  | { type: "explanation_delta"; listingId: string; textDelta: string }
  | {
      type: "listing_summary";
      listingId: string;
      overall: Verdict;
      passedChecks: number;
      totalChecks: number;
    }
  | { type: "done" };

// Section 4.4 - GET /api/itinerary
export type ItineraryItem = {
  time: string;
  title: string;
  kind: "settle" | "explore" | "social" | "errand";
  lat?: number;
  lng?: number;
  note: string;
};

export type ItineraryDay = {
  date: string;
  dayLabel: string;
  items: ItineraryItem[];
};

export type ItineraryResponse = {
  landingWeek: ItineraryDay[];
  calendarSynced: boolean;
};

// Section 4.5 - GET /api/map/places
export type Place = {
  id: string;
  label: string;
  kind: "coffee" | "gym" | "grocery" | "transit" | "show" | "work" | "other";
  lat: number;
  lng: number;
  frequency: number;
  nearestListingMinutes?: number;
};

export type MapPlacesResponse = { places: Place[] };

// Section 4.6 - onboarding data routes
export type OfferField = "employer" | "role" | "salary" | "startDate" | "endDate" | "city";

export type OfferParse = {
  employer: string;
  role: string | null;
  salary: number | null;
  startDate: string | null;
  endDate: string | null;
  city: string | null;
  // Section 11.9 - per-field 0..1 confidence + list of low-confidence fields.
  confidence: Record<OfferField, number>;
  needsReview: OfferField[];
  // Section 13.5 - upfront cash extracted by the parser when present.
  relocationStipend?: number | null;
  signingBonus?: number | null;
};

export type TakeoutParse = { places: Place[] };

export type SpotifyConnectResponse = { redirectUrl: string };

export type TasteProfile = {
  topArtists: string[];
  topGenres: string[];
  topTracks: string[];
  energy?: number;
};

export type SpotifyStatusResponse = {
  connected: boolean;
  taste: TasteProfile | null;
};

// Section 5 - Realtime DM row shapes
export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

export type ConversationRow = {
  id: string;
  participant_ids: string[];
  last_message_at: string;
  created_at: string;
};

// Section 2 + 11.1 - User rows
export type UserType = "intern" | "subletter";

export type UserRow = {
  id: string;
  name: string;
  company: string;
  role: string;
  city: string;
  move_in_date: string;
  taste_profile: TasteProfile | null;
  verified: boolean;
  avatar_url: string | null;
  created_at: string;
  user_type?: UserType;
};

// Section 11.2 - listing freshness state machine
export type ListingStatus = "available" | "pending" | "taken" | "stale";

export type ListingRow = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  lease_start: string;
  lease_end: string;
  lease_type: "sublet" | "short_term" | "standard";
  source: string;
  photos: string[];
  safety_flags: { scamSignals: string[]; notes: string[] };
  created_by: string | null;
  created_at: string;
  status?: ListingStatus;
  expires_at?: string | null;
  last_confirmed_at?: string | null;
  sourced?: boolean;
  source_name?: string;
  source_url?: string | null;
  external_id?: string | null;
};

// Positive-only stickers (contract 2 + 8)
export const POSITIVE_STICKER_CATEGORIES = [
  "good_coffee",
  "safe_feeling",
  "interns_hang",
  "good_vibe",
  "great_food",
  "green_space",
] as const;

/** Alias used by Person B's code; identical to POSITIVE_STICKER_CATEGORIES. */
export const STICKER_CATEGORIES = POSITIVE_STICKER_CATEGORIES;

export type StickerCategory = (typeof POSITIVE_STICKER_CATEGORIES)[number];

export type StickerRow = {
  id: string;
  lat: number;
  lng: number;
  category: StickerCategory;
  note: string;
  created_by: string;
  created_at: string;
};

export type EventRow = {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  datetime: string;
  source: string;
  external_id?: string | null;
  url?: string | null;
  venue?: string | null;
  image_url?: string | null;
  price_range?: string | null;
};

export type NoteRow = {
  id: string;
  city: string | null;
  area: string | null;
  topic: string;
  body: string;
  created_by: string;
  created_at: string;
  // Section 12.1 - when set, the note is a map comment.
  lat?: number | null;
  lng?: number | null;
};

/** Section 13.6 - optional grouping for the fuller checklist. */
export type ChecklistCategory = "travel" | "logistics" | "packing" | "admin";

export type ChecklistItemRow = {
  id: string;
  user_id: string;
  label: string;
  due_offset: number;
  done: boolean;
  /** Section 13.6 - optional grouping (travel, logistics, packing, admin). */
  category?: ChecklistCategory | null;
};

// Round 2 (section 11.5) - Reviews (Airbnb-style)
export type ReviewSubject = "listing" | "subletter";

export type Review = {
  id: string;
  subjectType: ReviewSubject;
  subjectId: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string;
};

export type ReviewSummary = { avgRating: number; count: number };
export type ReviewsResponse = { reviews: Review[]; summary: ReviewSummary };
export type PostReviewInput = {
  subjectType: ReviewSubject;
  subjectId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
};

// Round 2 (section 11.3) - Perches swipe deck.
// Omit the server-internal snake_case freshness fields from ListingRow
// (Person B's API returns camelCase equivalents below); keep everything else so
// A's fixture spread (...listing) still typechecks. `source` and `created_by`
// are similarly omitted because Person B's PerchCard doesn't expose them
// externally.
export type PerchCard = Omit<
  ListingRow,
  | "source"
  | "created_by"
  | "expires_at"
  | "last_confirmed_at"
  | "source_name"
  | "source_url"
  | "external_id"
> & {
  /** Discriminator for map/legend rendering. Optional so client fixtures
   * don't have to author it explicitly. */
  kind?: "listing";
  status: ListingStatus;
  expiresAt: string | null;
  lastConfirmedAt: string | null;
  sourced: boolean;
  sourceName: string;
  reviewSummary: ReviewSummary;
  host: { id: string; name: string; avatarUrl: string | null } | null;
};

export type PerchDeckResponse = { deck: PerchCard[] };
export type SwipeDirection = "left" | "right";
export type SwipeInput = { listingId: string; direction: SwipeDirection };
export type SwipeResponse = { listingId: string; direction: SwipeDirection };
export type SavedPerchesResponse = { saved: PerchCard[] };

// Round 2 (section 11.4) - Subletter posting
// Round 3 (section 13.2) - the additional detail fields (furnished, pros,
// bed/bath/sqft, amenities, utilities). Optional so older callers keep working.
export type PostListingInput = {
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  leaseStart: string;
  leaseEnd: string;
  leaseType: "sublet" | "short_term" | "standard";
  photos: string[];
  safetyNotes?: string[];
  // Round 3 additions
  furnished?: boolean | null;
  pros?: string[];
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  amenities?: string[];
  utilitiesIncluded?: boolean | null;
};

export type ListingResponse = { listing: PerchCard };

// Round 2 (section 11.6 / 12.2) - Events + attendance
export type AttendanceStatus = "going" | "interested";
/** Batch 2 (12.7) form. */
export type AttendInput = { going: boolean };
export type AttendResponse = { going: number; viewerGoing: boolean };

// Round 2 (section 11.8) - Public profile (tappable)
export type PublicProfile = {
  user: {
    id: string;
    name: string;
    role: string;
    city: string;
    company: string;
    avatarUrl: string | null;
  };
  userType: UserType;
  banded: boolean;
  reviewSummary?: ReviewSummary;
  listings?: (ListingRow | PerchCard)[];
};

// Round 2 batch 2 (section 12.1) - Map comments
export type MapComment = {
  id: string;
  author: { id: string; name: string; avatarUrl: string | null };
  lat: number;
  lng: number;
  topic: string;
  body: string;
  createdAt: string;
};

export type MapCommentsResponse = { comments: MapComment[] };
export type PostMapCommentInput = {
  lat: number;
  lng: number;
  topic: string;
  body: string;
};

// Round 2 batch 2 (section 12.2) - Event comments
export type EventComment = {
  id: string;
  eventId: string;
  author: { id: string; name: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
};

export type EventCommentsResponse = { comments: EventComment[] };
export type PostEventCommentInput = { body: string };

// Round 2 batch 2 (section 12.3 / 12.4) - Friends + friend notes
export type FriendStatus = "pending" | "accepted";

export type Friend = {
  /** Server-side friendship row id (optional; UI never invents one). */
  friendshipId?: string;
  user: { id: string; name: string; avatarUrl: string | null; company: string };
  status: FriendStatus;
  direction?: "incoming" | "outgoing";
};

export type FriendsResponse = { friends: Friend[] };
export type FriendRequestsResponse = { requests: Friend[] };

export type FriendNote = {
  friend: { id: string; name: string; avatarUrl: string | null };
  event: { id: string; title: string; datetime: string };
};

export type FriendNotesResponse = { notes: FriendNote[] };

// Round 2 batch 2 (section 12.6) - Commute route + POIs + schedule
export type GeoJSONLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

export type RouteRequest = {
  officeLat: number;
  officeLng: number;
  apartmentLat: number;
  apartmentLng: number;
};
/** Alias for Person B / C code. */
export type RouteInput = RouteRequest;

export type RouteResponse = {
  geometry: GeoJSONLineString;
  distanceMeters: number;
  durationSeconds: number;
};

export type RoutePoiKind = "coffee" | "gym";

export type RoutePoi = {
  place: { id: string; label: string; kind: string; lat: number; lng: number };
  distanceFromRouteMeters: number;
};

export type RoutePoisRequest = {
  geometry: GeoJSONLineString;
  kinds: string[];
};
/** Alias for Person B / C code. */
export type RoutePoiSearchInput = { geometry: GeoJSONLineString; kinds: RoutePoiKind[] };

export type RoutePoisResponse = { pois: RoutePoi[] };

export type CommuteScheduleRequest = {
  apartmentId: string;
  selectedPlaceIds: string[];
};
/** Person B's server-side variant that takes full RoutePoi.place objects. */
export type CommuteScheduleInput = {
  apartmentId: string;
  selectedPlaces: RoutePoi["place"][];
};

export type CommuteScheduleResponse = { day: ItineraryDay };

// Round 3 (section 13.2) - Comprehensive listing detail
export type ListingDetail = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;
  leaseStart: string;
  leaseEnd: string;
  leaseType: "sublet" | "short_term" | "standard";
  furnished: boolean | null;
  pros: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  amenities: string[];
  utilitiesIncluded: boolean | null;
  photos: string[];
  status: ListingStatus;
  host: { id: string; name: string; avatarUrl: string | null } | null;
  reviewSummary: ReviewSummary;
};

// Round 3 (section 13.4) - Booking + roommate grouping
export type BookingStatus = "requested" | "approved" | "booked" | "declined" | "cancelled";

export type Booking = {
  id: string;
  listingId: string;
  booker: { id: string; name: string; avatarUrl: string | null };
  roommates: { id: string; name: string; avatarUrl: string | null }[];
  status: BookingStatus;
  createdAt: string;
  decidedAt: string | null;
};

export type BookRequestInput = { roommateIds?: string[] };

export type BookingsResponse = {
  /** Bookings where I'm the booker (or a roommate). */
  mine: Booking[];
  /** Bookings against MY listings (incoming as owner). */
  incoming: Booking[];
};

// Round 3 (section 13.3) - Roommate invite (server-side result)
export type RoommateInviteInput = { userId: string };

// Round 3 (section 13.5) - Deterministic finance model
export type FinanceBreakdown = {
  salary: number | null;          // annual, gross
  takeHome: number;               // annual, after deterministic tax model
  monthlyTakeHome: number;
  relocationStipend: number;      // 0 if none
  signingBonus: number;           // upfront cash, 0 if none
  upfrontCashNeeded: number;      // deposit + first month + moving estimate
  costOfLivingIndex: number;      // 100 = national average
  monthlyBudget: number;          // COL-adjusted recommended rent ceiling
  city: string;
};

