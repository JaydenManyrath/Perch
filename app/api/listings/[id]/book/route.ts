import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { parseListingId, PerchInputError } from "@/lib/perches";
import {
  assertAcceptedFriends,
  assertInternCaller,
  BookingConflictError,
  BookingForbiddenError,
  BookingInputError,
  BOOKING_SELECT,
  LIVE_HOLD_STATUSES,
  parseBookRequest,
  toBooking,
  type BookingRow,
} from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/listings/{id}/book (RB32) - an intern requests to book an available listing,
// optionally inviting accepted-friend roommates. Deterministic; returns the Booking.
export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const params = await context.params;
    const listingId = parseListingId(params.id);
    const { roommateIds } = parseBookRequest(await req.json().catch(() => ({})));

    const supabase = await createServerSupabase();
    await assertInternCaller(supabase, g.callerId);

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id,status,expires_at,created_by")
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404, headers: g.headers });
    }
    if (listing.status !== "available" || new Date(listing.expires_at as string).getTime() <= Date.now()) {
      return NextResponse.json({ error: "listing_not_available" }, { status: 409, headers: g.headers });
    }
    if (listing.created_by === g.callerId) {
      return NextResponse.json({ error: "cannot_book_own_listing" }, { status: 403, headers: g.headers });
    }

    // Roommate invites at request time must be accepted friends of the booker.
    await assertAcceptedFriends(supabase, g.callerId, roommateIds);

    const admin = createAdminClient();
    // One live hold per listing (unique partial index also enforces this at the DB).
    const { data: existing, error: existingError } = await admin
      .from("bookings")
      .select("id,status")
      .eq("listing_id", listingId)
      .in("status", LIVE_HOLD_STATUSES);
    if (existingError) throw existingError;
    if ((existing ?? []).length > 0) {
      return NextResponse.json({ error: "listing_already_held" }, { status: 409, headers: g.headers });
    }

    const { data: inserted, error: insertError } = await admin
      .from("bookings")
      .insert({
        listing_id: listingId,
        booker_id: g.callerId,
        roommate_ids: [],
        roommate_invites: roommateIds,
        status: "requested",
      })
      .select(BOOKING_SELECT)
      .single();
    if (insertError) throw insertError;

    const booking = await toBooking(supabase, inserted as BookingRow);
    return NextResponse.json(booking, { status: 201, headers: g.headers });
  } catch (err) {
    if (err instanceof PerchInputError || err instanceof BookingInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    if (err instanceof BookingForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403, headers: g.headers });
    }
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409, headers: g.headers });
    }
    console.error("POST /api/listings/[id]/book failed:", err);
    return NextResponse.json({ error: "booking_request_failed" }, { status: 500, headers: g.headers });
  }
}
