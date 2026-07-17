import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  assertInternCaller,
  bookingErrorStatus,
  BOOKING_SELECT,
  BookingConflictError,
  BookingForbiddenError,
  fetchBookingRow,
  parseUuid,
  toBooking,
  type BookingRow,
} from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/bookings/{id}/roommates/accept (RB33) - an invited intern accepts, moving from
// the pending invites to the confirmed roommates on the booking.
export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { id } = await context.params;
    const bookingId = parseUuid(id, "booking id");

    const supabase = await createServerSupabase();
    await assertInternCaller(supabase, g.callerId);
    const row = await fetchBookingRow(supabase, bookingId);

    if (!row.roommate_invites.includes(g.callerId)) {
      throw new BookingForbiddenError("no pending roommate invite for you on this booking");
    }
    if (row.status !== "requested" && row.status !== "approved") {
      throw new BookingConflictError("roommate invites can only be accepted on a live booking");
    }
    if (row.roommate_ids.includes(g.callerId)) {
      const booking = await toBooking(supabase, row);
      booking.viewerRole = "roommate";
      return NextResponse.json(booking, { headers: g.headers });
    }

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("bookings")
      .update({
        roommate_ids: [...row.roommate_ids, g.callerId],
        roommate_invites: row.roommate_invites.filter((uid) => uid !== g.callerId),
      })
      .eq("id", bookingId)
      .eq("status", row.status)
      .contains("roommate_invites", [g.callerId])
      .select(BOOKING_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!updated) throw new BookingConflictError("booking changed concurrently");

    const booking = await toBooking(supabase, updated as BookingRow);
    booking.viewerRole = "roommate";
    return NextResponse.json(booking, { headers: g.headers });
  } catch (err) {
    const mapped = bookingErrorStatus(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: g.headers });
    console.error("POST /api/bookings/[id]/roommates/accept failed:", err);
    return NextResponse.json({ error: "roommate_accept_failed" }, { status: 500, headers: g.headers });
  }
}
