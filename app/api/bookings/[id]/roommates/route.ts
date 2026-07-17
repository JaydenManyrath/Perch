import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  assertAcceptedFriends,
  bookingErrorStatus,
  BOOKING_SELECT,
  BookingForbiddenError,
  BookingConflictError,
  fetchBookingRow,
  parseRoommateInvite,
  parseUuid,
  toBooking,
  type BookingRow,
} from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/bookings/{id}/roommates (RB33) - the booker invites an accepted-friend roommate
// to a live (not yet booked) booking. The invitee accepts via /roommates/accept.
export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { id } = await context.params;
    const bookingId = parseUuid(id, "booking id");
    const { userId } = parseRoommateInvite(await req.json().catch(() => ({})));

    const supabase = await createServerSupabase();
    const row = await fetchBookingRow(supabase, bookingId);

    if (row.booker_id !== g.callerId) {
      throw new BookingForbiddenError("only the booker can invite roommates");
    }
    if (row.status !== "requested" && row.status !== "approved") {
      throw new BookingConflictError("roommates can only be invited on a live booking");
    }
    if (row.booker_id === userId) {
      throw new BookingForbiddenError("the booker is already on the booking");
    }
    if (row.roommate_ids.includes(userId) || row.roommate_invites.includes(userId)) {
      // Idempotent: already invited or confirmed.
      const booking = await toBooking(supabase, row);
      booking.viewerRole = "booker";
      return NextResponse.json(booking, { headers: g.headers });
    }
    await assertAcceptedFriends(supabase, g.callerId, [userId]);

    const admin = createAdminClient();
    const { data: updated, error } = await admin
      .from("bookings")
      .update({ roommate_invites: [...row.roommate_invites, userId] })
      .eq("id", bookingId)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw error;

    const booking = await toBooking(supabase, updated as BookingRow);
    booking.viewerRole = "booker";
    return NextResponse.json(booking, { headers: g.headers });
  } catch (err) {
    const mapped = bookingErrorStatus(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: g.headers });
    console.error("POST /api/bookings/[id]/roommates failed:", err);
    return NextResponse.json({ error: "roommate_invite_failed" }, { status: 500, headers: g.headers });
  }
}
