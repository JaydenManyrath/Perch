import type { SupabaseClient } from "@supabase/supabase-js";
import type { Booking, BookingStatus } from "@/lib/types/contract";

export class BookingInputError extends Error {}
export class BookingForbiddenError extends Error {}
export class BookingNotFoundError extends Error {}
export class BookingConflictError extends Error {}

/** Map a booking error to an HTTP status + message; null when it is not a known type. */
export function bookingErrorStatus(err: unknown): { status: number; message: string } | null {
  if (err instanceof BookingInputError) return { status: 400, message: err.message };
  if (err instanceof BookingForbiddenError) return { status: 403, message: err.message };
  if (err instanceof BookingNotFoundError) return { status: 404, message: err.message };
  if (err instanceof BookingConflictError) return { status: 409, message: err.message };
  return null;
}

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseUuid(value: unknown, label: string): string {
  if (typeof value !== "string" || !uuidRe.test(value)) {
    throw new BookingInputError(`${label} must be a valid id`);
  }
  return value;
}

export type BookingRow = {
  id: string;
  listing_id: string;
  booker_id: string;
  roommate_ids: string[];
  roommate_invites: string[];
  status: BookingStatus;
  created_at: string;
  decided_at: string | null;
};

export const BOOKING_SELECT =
  "id,listing_id,booker_id,roommate_ids,roommate_invites,status,created_at,decided_at";

type UserMini = { id: string; name: string; avatarUrl: string | null };

/** Parse the POST /api/listings/{id}/book body (roommateIds optional). */
export function parseBookRequest(input: unknown): { roommateIds: string[] } {
  if (input == null) return { roommateIds: [] };
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new BookingInputError("booking body must be an object");
  }
  const body = input as Record<string, unknown>;
  const extra = Object.keys(body).filter((k) => k !== "roommateIds");
  if (extra.length > 0) throw new BookingInputError(`unexpected fields: ${extra.sort().join(", ")}`);
  if (body.roommateIds === undefined) return { roommateIds: [] };
  if (!Array.isArray(body.roommateIds)) throw new BookingInputError("roommateIds must be an array");
  const ids = body.roommateIds.map((id) => parseUuid(id, "roommateId"));
  return { roommateIds: Array.from(new Set(ids)) };
}

export function parseRoommateInvite(input: unknown): { userId: string } {
  if (!input || typeof input !== "object") throw new BookingInputError("invite body must be an object");
  return { userId: parseUuid((input as Record<string, unknown>).userId, "userId") };
}

async function usersByIds(db: SupabaseClient, ids: string[]): Promise<Map<string, UserMini>> {
  const unique = Array.from(new Set(ids)).filter(Boolean);
  const map = new Map<string, UserMini>();
  if (unique.length === 0) return map;
  const { data, error } = await db.from("users").select("id,name,avatar_url").in("id", unique);
  if (error) throw error;
  for (const u of (data ?? []) as { id: string; name: string; avatar_url: string | null }[]) {
    map.set(u.id, { id: u.id, name: u.name, avatarUrl: u.avatar_url });
  }
  return map;
}

const unknownUser = (id: string): UserMini => ({ id, name: "Unknown", avatarUrl: null });

/** Map a booking row to the frozen Booking shape (pending and confirmed roommates stay separate). */
export async function toBooking(db: SupabaseClient, row: BookingRow): Promise<Booking> {
  const map = await usersByIds(db, [row.booker_id, ...row.roommate_ids, ...row.roommate_invites]);
  return {
    id: row.id,
    listingId: row.listing_id,
    booker: map.get(row.booker_id) ?? unknownUser(row.booker_id),
    pendingRoommates: row.roommate_invites.map((id) => map.get(id) ?? unknownUser(id)),
    roommates: row.roommate_ids.map((id) => map.get(id) ?? unknownUser(id)),
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

/** Batch mapping that avoids N+1 user lookups across many bookings. */
export async function toBookings(db: SupabaseClient, rows: BookingRow[]): Promise<Booking[]> {
  const ids = rows.flatMap((r) => [r.booker_id, ...r.roommate_ids, ...r.roommate_invites]);
  const map = await usersByIds(db, ids);
  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    booker: map.get(row.booker_id) ?? unknownUser(row.booker_id),
    pendingRoommates: row.roommate_invites.map((id) => map.get(id) ?? unknownUser(id)),
    roommates: row.roommate_ids.map((id) => map.get(id) ?? unknownUser(id)),
    status: row.status,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  }));
}

export const LIVE_HOLD_STATUSES: BookingStatus[] = ["requested", "approved", "booked"];

export type BookingAction = "approve" | "decline" | "confirm" | "cancel";
export type ActorRole = "owner" | "booker" | "roommate" | "invitee" | "other";

export function bookingViewerRole(row: BookingRow, viewerId: string, ownerId: string | null): ActorRole {
  if (viewerId === ownerId) return "owner";
  if (viewerId === row.booker_id) return "booker";
  if (row.roommate_ids.includes(viewerId)) return "roommate";
  if (row.roommate_invites.includes(viewerId)) return "invitee";
  return "other";
}

export type TransitionResult = {
  status: BookingStatus;
  /** On booked: flip the listing to 'taken' so the deck drops it for everyone. */
  setListingTaken: boolean;
  /** On decline/cancel: release a held listing back to 'available'. */
  releaseListing: boolean;
};

/**
 * Deterministic booking state machine (contract section 13.4). No model decides a status:
 *   requested --owner approve--> approved --booker confirm--> booked (listing -> taken)
 *   requested/approved --owner decline--> declined (release)
 *   requested/approved/booked --booker cancel--> cancelled (release)
 * Illegal actor/status combinations throw.
 */
export function transitionBooking(
  status: BookingStatus,
  action: BookingAction,
  role: ActorRole,
): TransitionResult {
  switch (action) {
    case "approve":
      if (role !== "owner") throw new BookingForbiddenError("only the listing owner can approve");
      if (status !== "requested") throw new BookingConflictError("only a requested booking can be approved");
      return { status: "approved", setListingTaken: false, releaseListing: false };
    case "decline":
      if (role !== "owner") throw new BookingForbiddenError("only the listing owner can decline");
      if (status !== "requested" && status !== "approved") {
        throw new BookingConflictError("only a live booking can be declined");
      }
      return { status: "declined", setListingTaken: false, releaseListing: true };
    case "confirm":
      if (role !== "booker") throw new BookingForbiddenError("only the booker can confirm");
      if (status !== "approved") throw new BookingConflictError("only an approved booking can be confirmed");
      return { status: "booked", setListingTaken: true, releaseListing: false };
    case "cancel":
      if (role !== "booker") throw new BookingForbiddenError("only the booker can cancel");
      if (!LIVE_HOLD_STATUSES.includes(status)) {
        throw new BookingConflictError("only a live booking can be cancelled");
      }
      return { status: "cancelled", setListingTaken: false, releaseListing: true };
    default:
      throw new BookingInputError("unknown booking action");
  }
}

/**
 * Run a booking transition end-to-end: resolve the caller's role, apply the deterministic
 * state machine, persist the booking, and mirror the listing side effect (booked -> taken,
 * a cancelled booking releases the hold). Writes go through the admin client; authorization
 * is decided here (the RLS trigger is the independent backstop for direct DB access).
 */
export async function performTransition(
  serverDb: SupabaseClient,
  adminDb: SupabaseClient,
  callerId: string,
  bookingId: string,
  action: BookingAction,
): Promise<Booking> {
  const row = await fetchBookingRow(serverDb, bookingId);
  const ownerId = await listingOwnerId(serverDb, row.listing_id);

  let role: ActorRole = "other";
  if (callerId === ownerId) role = "owner";
  else if (callerId === row.booker_id) role = "booker";
  else if (row.roommate_ids.includes(callerId)) role = "roommate";
  else if (row.roommate_invites.includes(callerId)) role = "invitee";

  const result = transitionBooking(row.status, action, role);

  const { data: updated, error: updateError } = await adminDb
    .from("bookings")
    .update({ status: result.status, decided_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", row.status) // optimistic guard against a concurrent transition
    .select(BOOKING_SELECT)
    .maybeSingle();
  if (updateError) throw updateError;
  if (!updated) throw new BookingConflictError("booking changed concurrently");

  if (result.setListingTaken) {
    const { error } = await adminDb.from("listings").update({ status: "taken" }).eq("id", row.listing_id);
    if (error) throw error;
  } else if (result.releaseListing && row.status === "booked") {
    const now = new Date();
    const { error } = await adminDb
      .from("listings")
      .update({
        status: "available",
        last_confirmed_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", row.listing_id);
    if (error) throw error;
  }

  return toBooking(serverDb, updated as BookingRow);
}

/** Load one booking row by id, or throw BookingNotFoundError. */
export async function fetchBookingRow(db: SupabaseClient, id: string): Promise<BookingRow> {
  const { data, error } = await db.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new BookingNotFoundError("booking not found");
  return data as BookingRow;
}

/** The listing owner (subletter) id for a listing, or null when sourced/unowned. */
export async function listingOwnerId(db: SupabaseClient, listingId: string): Promise<string | null> {
  const { data, error } = await db.from("listings").select("created_by").eq("id", listingId).maybeSingle();
  if (error) throw error;
  return (data?.created_by as string | null) ?? null;
}

/** Assert the caller is an intern; used on the intern-only booking actions. */
export async function assertInternCaller(db: SupabaseClient, callerId: string): Promise<void> {
  const { data, error } = await db.from("users").select("user_type").eq("id", callerId).maybeSingle();
  if (error) throw error;
  if (!data || (data as { user_type?: string }).user_type !== "intern") {
    throw new BookingForbiddenError("only interns can perform this action");
  }
}

/** Assert every id is an accepted friend of the booker (roommate grouping rule 13.3). */
export async function assertAcceptedFriends(
  db: SupabaseClient,
  bookerId: string,
  ids: string[],
): Promise<void> {
  for (const id of ids) {
    if (id === bookerId) throw new BookingInputError("you cannot invite yourself as a roommate");
    const { data, error } = await db
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${bookerId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${bookerId})`,
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new BookingForbiddenError("roommate invites must be accepted friends");
  }
}
