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
  };
  tasteScore: number; // 0..1, deterministic
  reason: string;     // short human-readable, LLM-generated
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
export type OfferParse = {
  employer: string;
  role: string | null;
  salary: number | null;   // annual USD
  startDate: string | null; // ISO
  endDate: string | null;   // ISO
  city: string | null;
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
};

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
};

export type NoteRow = {
  id: string;
  city: string;
  area: string | null;
  topic: string;
  body: string;
  created_by: string;
  created_at: string;
};

export type ChecklistItemRow = {
  id: string;
  user_id: string;
  label: string;
  due_offset: number; // days before move_in
  done: boolean;
};
