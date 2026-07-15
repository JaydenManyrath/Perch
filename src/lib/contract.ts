/**
 * Frozen contract types — mirrors FOUNDATION-CONTRACT.md §4 / §5 verbatim.
 *
 * These are the seams Person A consumes. Do NOT change a shape here without first
 * amending the contract doc in a reviewed PR (contract §9). Everything B exposes is
 * typed against this file so drift is a compile error, not a silent runtime bug.
 */

// ---- §2 taste_profile (written by B5, read by B7) ----
export type TasteProfile = {
  topArtists: string[];
  topGenres: string[];
  topTracks: string[];
  energy?: number;
};

// ---- §4.1 GET /api/feed ----
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
  reason: string; // short human-readable, LLM-generated (or deterministic template)
};
export type FeedResponse = { items: FeedItem[] };

// ---- §4.2 GET /api/matches (frozen Match shape) ----
export type Match = {
  user: {
    id: string;
    name: string;
    role: string;
    city: string;
    avatarUrl: string | null;
  };
  company: string;
  moveWeek: string; // ISO date of the Monday of their move week
  banded: boolean;
  tasteScore: number; // 0..1, deterministic
  reasons: string[];
};
export type MatchesResponse = { matches: Match[] };

// ---- §4.3 POST /api/negotiate ----
export type NegotiateConstraints = {
  monthlyBudget: number; // USD
  moveIn: string; // ISO date
  moveOut: string; // ISO date
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

// ---- §4.4 GET /api/itinerary ----
export type ItineraryItem = {
  time: string; // "09:00"
  title: string;
  kind: "settle" | "explore" | "social" | "errand";
  lat?: number;
  lng?: number;
  note: string;
};
export type ItineraryDay = {
  date: string; // ISO date
  dayLabel: string; // "Day 1 — Landing"
  items: ItineraryItem[];
};
export type ItineraryResponse = {
  landingWeek: ItineraryDay[];
  calendarSynced: boolean;
};

// ---- §4.5 GET /api/map/places ----
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

// ---- §4.6 onboarding routes ----
export type OfferParse = {
  employer: string;
  role: string | null;
  salary: number | null; // annual USD
  startDate: string | null; // ISO
  endDate: string | null; // ISO
  city: string | null;
};
export type TakeoutParse = { places: Place[] };
export type SpotifyConnectResponse = { redirectUrl: string };
export type SpotifyStatusResponse = {
  connected: boolean;
  taste: TasteProfile | null;
};

// ---- §5 realtime rows ----
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

// ---- §2 positive-only sticker categories (frozen enum) ----
export const STICKER_CATEGORIES = [
  "good_coffee",
  "safe_feeling",
  "interns_hang",
  "good_vibe",
  "great_food",
  "green_space",
] as const;
export type StickerCategory = (typeof STICKER_CATEGORIES)[number];
