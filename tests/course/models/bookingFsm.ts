/**
 * CS 7314 FSM/BBT model of the booking + listing lifecycle.
 *
 * Built from the specification (contract section 13.4, README freshness rules) rather
 * than from the code, so the suites that consume it act as an independent oracle.
 * A state is the pair (latest booking status, listing status). The documented copy of
 * this model, with its diagram, lives in docs/testing/fsm/booking-fsm.md.
 */

export type StateId = "S0" | "S1" | "S2" | "S3" | "S4" | "S5" | "S6";

export const STATES: Record<StateId, { booking: string | null; listing: "available" | "taken" | "stale"; label: string }> = {
  S0: { booking: null, listing: "available", label: "Listed (no live booking)" },
  S1: { booking: "requested", listing: "available", label: "Requested" },
  S2: { booking: "approved", listing: "available", label: "Approved" },
  S3: { booking: "booked", listing: "taken", label: "Booked (listing taken)" },
  S4: { booking: "declined", listing: "available", label: "Declined" },
  S5: { booking: "cancelled", listing: "available", label: "Cancelled" },
  S6: { booking: null, listing: "stale", label: "Stale (expired, unconfirmed)" },
};

/**
 * Events. `actor` is who fires it: A and B are interns, OWNER is the subletter that
 * owns the listing, CRON is the daily freshness pass.
 */
export type EventId =
  | "request" // intern A requests to book
  | "request_b" // a second intern B requests the same listing
  | "approve" // owner approves the live booking
  | "decline" // owner declines the live booking
  | "confirm" // booker confirms an approved booking
  | "cancel" // booker cancels a live booking
  | "relist" // owner re-confirms the listing (POST /api/listings/{id}/confirm)
  | "expire"; // freshness pass after expires_at

export type Transition = { id: string; from: StateId; event: EventId; to: StateId; note?: string };

/** Valid transitions (each must be exercised at least once: transition coverage). */
export const VALID: Transition[] = [
  { id: "T01", from: "S0", event: "request", to: "S1" },
  { id: "T02", from: "S1", event: "approve", to: "S2" },
  { id: "T03", from: "S1", event: "decline", to: "S4" },
  { id: "T04", from: "S2", event: "decline", to: "S4" },
  { id: "T05", from: "S2", event: "confirm", to: "S3", note: "listing flips to taken" },
  { id: "T06", from: "S1", event: "cancel", to: "S5" },
  { id: "T07", from: "S2", event: "cancel", to: "S5" },
  { id: "T08", from: "S3", event: "cancel", to: "S5", note: "listing released with a fresh expiry" },
  { id: "T09", from: "S4", event: "request", to: "S1", note: "a new booking row" },
  { id: "T10", from: "S5", event: "request", to: "S1", note: "a new booking row" },
  { id: "T11", from: "S0", event: "expire", to: "S6" },
  { id: "T12", from: "S6", event: "relist", to: "S0" },
  { id: "T13", from: "S0", event: "relist", to: "S0", note: "self-loop: expiry extended" },
];

/**
 * Invalid (state, event) pairs: the system must reject them and leave the state
 * unchanged. `expect` is the HTTP status the spec implies for the API path.
 */
export type Invalid = { id: string; from: StateId; event: EventId | "approve_by_booker" | "confirm_by_b" | "decline_by_booker" | "request_by_owner"; expect: 403 | 409 };

export const INVALID: Invalid[] = [
  { id: "I01", from: "S1", event: "approve_by_booker", expect: 403 },
  { id: "I02", from: "S1", event: "confirm", expect: 409 },
  { id: "I03", from: "S2", event: "approve", expect: 409 },
  { id: "I04", from: "S3", event: "approve", expect: 409 },
  { id: "I05", from: "S3", event: "decline", expect: 409 },
  { id: "I06", from: "S3", event: "confirm", expect: 409 },
  { id: "I07", from: "S4", event: "approve", expect: 409 },
  { id: "I08", from: "S4", event: "confirm", expect: 409 },
  { id: "I09", from: "S1", event: "request_b", expect: 409 },
  { id: "I10", from: "S2", event: "request_b", expect: 409 },
  { id: "I11", from: "S3", event: "request_b", expect: 409 },
  { id: "I12", from: "S6", event: "request", expect: 409 },
  { id: "I13", from: "S3", event: "relist", expect: 409 },
  { id: "I14", from: "S2", event: "confirm_by_b", expect: 403 },
  { id: "I15", from: "S0", event: "request_by_owner", expect: 403 },
  { id: "I16", from: "S1", event: "decline_by_booker", expect: 403 },
  { id: "I17", from: "S5", event: "cancel", expect: 409 },
  { id: "I18", from: "S4", event: "decline", expect: 409 },
];

/** Paths from the initial state to S3/S5 used for sequence (round-trip) coverage. */
export const PATHS: { id: string; events: EventId[]; end: StateId }[] = [
  { id: "P01", events: ["request", "approve", "confirm"], end: "S3" },
  { id: "P02", events: ["request", "decline", "request_b", "approve", "confirm"], end: "S3" },
  { id: "P03", events: ["expire", "relist", "request", "approve", "confirm"], end: "S3" },
  { id: "P04", events: ["request", "approve", "decline", "request_b", "approve"], end: "S2" },
  { id: "P05", events: ["request", "approve", "confirm", "cancel", "request_b"], end: "S1" },
];

/** Shortest event prefix that drives the system from S0 into each state. */
export const SETUP: Record<StateId, EventId[]> = {
  S0: [],
  S1: ["request"],
  S2: ["request", "approve"],
  S3: ["request", "approve", "confirm"],
  S4: ["request", "decline"],
  S5: ["request", "cancel"],
  S6: ["expire"],
};
