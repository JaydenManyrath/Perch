/**
 * FROZEN contract types — verbatim from docs/FOUNDATION-CONTRACT.md §4, §4.6, §5.
 *
 * DO NOT DRIFT. If a shape needs to change, edit the contract doc first in a PR both
 * people review, THEN update this file in the same PR. Silent divergence is a bug.
 *
 * If while wiring you believe a seam must change, leave a
 *   // CONTRACT-CHANGE-NEEDED: <reason>
 * marker rather than editing the shape locally.
 */

// ─────────────────────────────────────────────────────────────
// §4.1 — GET /api/feed  (FeedResponse)
// ─────────────────────────────────────────────────────────────
export type FeedItem = {
  event: {
    id: string;
    title: string;
    category: string;
    lat: number;
    lng: number;
    datetime: string; // ISO 8601
    source: string;
    // Round 2 (§11.6): Ticketmaster/seed event enrichments.
    venue?: string | null;
    url?: string | null;
    imageUrl?: string | null;
    priceRange?: string | null;
  };
  tasteScore: number; // 0..1, deterministic
  reason: string;     // short human-readable, LLM-generated
  // Round 2 (§11.6, §12.2): attendance count + viewer's own going flag.
  internsGoing?: number;
  viewerGoing?: boolean;
};

export type FeedResponse = {
  items: FeedItem[];
};

// ─────────────────────────────────────────────────────────────
// §4.2 — GET /api/matches  (MatchesResponse) — connection-hero seam
// ─────────────────────────────────────────────────────────────
export type Match = {
  user: {
    id: string;
    name: string;
    role: string;
    city: string;
    avatarUrl: string | null;
  };
  company: string;   // e.g. "Stripe"
  moveWeek: string;  // ISO date of the Monday of their move week, e.g. "2026-06-08"
  banded: boolean;   // verified/banded flag (from users.verified)
  tasteScore: number; // 0..1, deterministic
  reasons: string[]; // ["Same company", "Moving the same week", "Shared taste: indie, techno"]
};

export type MatchesResponse = {
  matches: Match[];
};

// ─────────────────────────────────────────────────────────────
// §4.3 — POST /api/negotiate  (streamed) — Person B owns; A only holds types
// ─────────────────────────────────────────────────────────────
export type NegotiateConstraints = {
  monthlyBudget: number; // USD
  moveIn: string;        // ISO
  moveOut: string;       // ISO
  routineAnchors?: {
    label: string;
    lat: number;
    lng: number;
  }[];
};

export type NegotiateRequest = {
  listingIds: string[];
  constraints: NegotiateConstraints;
};

/** Scout check enum used by the streamed verdicts. */
export type ScoutCheck = "budget" | "safety" | "lease_fit" | "routine_fit";
/** Verdict enum — maps to func.pass / func.flag / func.scam. */
export type Verdict = "pass" | "flag" | "fail";

export type NegotiateStreamEvent =
  | { type: "listing_start"; listingId: string; title: string }
  | {
      type: "scout_verdict";
      listingId: string;
      check: "budget" | "safety" | "lease_fit" | "routine_fit";
      verdict: "pass" | "flag" | "fail";
      value: string;
    }
  | { type: "explanation_delta"; listingId: string; textDelta: string }
  | {
      type: "listing_summary";
      listingId: string;
      overall: "pass" | "flag" | "fail";
      passedChecks: number;
      totalChecks: number;
    }
  | { type: "done" };

// ─────────────────────────────────────────────────────────────
// §4.4 — GET /api/itinerary  (ItineraryResponse) — landing
// ─────────────────────────────────────────────────────────────
export type ItineraryItem = {
  time: string; // "09:00"
  title: string;
  kind: "settle" | "explore" | "social" | "errand";
  lat?: number;
  lng?: number;
  note: string;
};

export type ItineraryDay = {
  date: string;     // ISO date
  dayLabel: string; // "Day 1 — Landing"
  items: ItineraryItem[];
};

export type ItineraryResponse = {
  landingWeek: ItineraryDay[];
  calendarSynced: boolean;
};

// ─────────────────────────────────────────────────────────────
// §4.5 — GET /api/map/places  (MapPlacesResponse)
// ─────────────────────────────────────────────────────────────
export type Place = {
  id: string;
  label: string;
  kind: "coffee" | "gym" | "grocery" | "transit" | "show" | "work" | "other";
  lat: number;
  lng: number;
  frequency: number;
  nearestListingMinutes?: number;
};

export type MapPlacesResponse = {
  places: Place[];
};

// ─────────────────────────────────────────────────────────────
// §4.6 — onboarding data routes
// ─────────────────────────────────────────────────────────────
/** Field ids in an OfferParse — used for confidence + needsReview (§11.9). */
export type OfferField = "employer" | "role" | "salary" | "startDate" | "endDate" | "city";

export type OfferParse = {
  employer: string;
  role: string | null;
  salary: number | null;   // annual USD
  startDate: string | null; // ISO
  endDate: string | null;   // ISO
  city: string | null;
  // Round 2 (§11.9): per-field 0..1 confidence + list of low-confidence fields the UI must let the user correct.
  confidence?: Record<OfferField, number>;
  needsReview?: OfferField[];
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

// ─────────────────────────────────────────────────────────────
// §5 — Realtime DM row shapes (Supabase Postgres rows)
// ─────────────────────────────────────────────────────────────
export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string; // ISO 8601
};

export type ConversationRow = {
  id: string;
  participant_ids: string[]; // [uidA, uidB]
  last_message_at: string;
  created_at: string;
};

// ─────────────────────────────────────────────────────────────
// §2 — Table row shapes (Postgres, snake_case) — consumed by A
// ─────────────────────────────────────────────────────────────
/** §11.1 — one of the two account roles for the demo. */
export type UserType = "intern" | "subletter";

export type UserRow = {
  id: string;
  name: string;
  company: string;
  role: string;
  city: string;
  move_in_date: string; // ISO date
  taste_profile: TasteProfile | null;
  verified: boolean;
  avatar_url: string | null;
  created_at: string;
  // Round 2 (§11.1).
  user_type?: UserType;
};

/** §11.2 — listing freshness state machine. */
export type ListingStatus = "available" | "pending" | "taken" | "stale";

export type ListingRow = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number; // USD/mo
  lease_start: string; // ISO date
  lease_end: string;   // ISO date
  lease_type: "sublet" | "short_term" | "standard";
  source: string;
  photos: string[];
  safety_flags: { scamSignals: string[]; notes: string[] };
  created_by: string;
  created_at: string;
  // Round 2 (§11.2): freshness + provenance.
  status?: ListingStatus;
  expires_at?: string | null;
  last_confirmed_at?: string | null;
  sourced?: boolean;
  source_name?: string;
  source_url?: string | null;
  external_id?: string | null;
};

/** Positive-only enum — no avoid/unsafe categories, EVER. (contract §2, §8) */
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
  // Round 2 (§11.6): Ticketmaster/seed enrichments.
  external_id?: string | null;
  url?: string | null;
  venue?: string | null;
  image_url?: string | null;
  price_range?: string | null;
};

export type NoteRow = {
  id: string;
  city: string;
  area: string | null;
  topic: string;
  body: string;
  created_by: string;
  created_at: string;
  // Round 2 (§12.1): when set, the note is a map comment.
  lat?: number | null;
  lng?: number | null;
};

export type ChecklistItemRow = {
  id: string;
  user_id: string;
  label: string;
  due_offset: number; // days before move_in
  done: boolean;
};

// ─────────────────────────────────────────────────────────────
// ROUND 2 (§11) — Reviews (Airbnb-style)
// ─────────────────────────────────────────────────────────────
export type ReviewSubject = "listing" | "subletter";

export type Review = {
  id: string;
  subjectType: ReviewSubject;
  subjectId: string;
  reviewer: { id: string; name: string; avatarUrl: string | null };
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
  createdAt: string; // ISO
};

export type ReviewSummary = { avgRating: number; count: number };
export type ReviewsResponse = { reviews: Review[]; summary: ReviewSummary };
export type PostReviewInput = {
  subjectType: ReviewSubject;
  subjectId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  body: string;
};

// ─────────────────────────────────────────────────────────────
// ROUND 2 (§11.3) — Perches swipe deck
// ─────────────────────────────────────────────────────────────
export type PerchCard = ListingRow & {
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

// ─────────────────────────────────────────────────────────────
// ROUND 2 (§11.4) — Subletter posting
// ─────────────────────────────────────────────────────────────
export type PostListingInput = {
  title: string;
  address: string;
  lat: number;
  lng: number;
  price: number;          // USD/mo
  leaseStart: string;     // ISO date
  leaseEnd: string;       // ISO date
  leaseType: "sublet" | "short_term" | "standard";
  photos: string[];
  safetyNotes?: string[];
};

// ─────────────────────────────────────────────────────────────
// ROUND 2 (§11.6, §12.2) — Events + attendance
// ─────────────────────────────────────────────────────────────
export type AttendanceStatus = "going" | "interested";
/** Batch 2 (§12.7) SUPERSEDES the earlier AttendResponse — this is the final shape. */
export type AttendInput = { going: boolean };
export type AttendResponse = { going: number; viewerGoing: boolean };

// ─────────────────────────────────────────────────────────────
// ROUND 2 (§11.8) — Public profile (tappable)
// ─────────────────────────────────────────────────────────────
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
  reviewSummary?: ReviewSummary; // present for subletters
  listings?: ListingRow[];       // present for subletters
};

// ─────────────────────────────────────────────────────────────
// ROUND 2 batch 2 (§12.1) — Map comments (notes with a location)
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// ROUND 2 batch 2 (§12.2) — Event comments
// ─────────────────────────────────────────────────────────────
export type EventComment = {
  id: string;
  eventId: string;
  author: { id: string; name: string; avatarUrl: string | null };
  body: string;
  createdAt: string;
};

export type EventCommentsResponse = { comments: EventComment[] };
export type PostEventCommentInput = { body: string };

// ─────────────────────────────────────────────────────────────
// ROUND 2 batch 2 (§12.3, §12.4) — Friends + friend notes
// ─────────────────────────────────────────────────────────────
export type FriendStatus = "pending" | "accepted";

export type Friend = {
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

// ─────────────────────────────────────────────────────────────
// ROUND 2 batch 2 (§12.6) — Commute route + POIs + schedule
// ─────────────────────────────────────────────────────────────
export type GeoJSONLineString = {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat]
};

export type RouteRequest = {
  officeLat: number;
  officeLng: number;
  apartmentLat: number;
  apartmentLng: number;
};

export type RouteResponse = {
  geometry: GeoJSONLineString;
  distanceMeters: number;
  durationSeconds: number;
};

export type RoutePoi = {
  place: { id: string; label: string; kind: string; lat: number; lng: number };
  distanceFromRouteMeters: number;
};

export type RoutePoisRequest = {
  geometry: GeoJSONLineString;
  kinds: string[];
};

export type RoutePoisResponse = { pois: RoutePoi[] };

export type CommuteScheduleRequest = {
  apartmentId: string;
  selectedPlaceIds: string[];
};

export type CommuteScheduleResponse = { day: ItineraryDay };

