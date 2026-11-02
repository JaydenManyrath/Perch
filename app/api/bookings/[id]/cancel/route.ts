import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { bookingErrorStatus, parseUuid, performTransition } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/bookings/{id}/cancel (D07) - the booker cancels a requested, approved or booked stay;
// a booked stay releases the listing back to available.
export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  try {
    const { id } = await context.params;
    const bookingId = parseUuid(id, "booking id");
    const supabase = await createServerSupabase();
    const admin = createAdminClient();
    const booking = await performTransition(supabase, admin, g.callerId, bookingId, "cancel");
    return NextResponse.json(booking, { headers: g.headers });
  } catch (err) {
    const mapped = bookingErrorStatus(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: g.headers });
    console.error("POST /api/bookings/[id]/cancel failed:", err);
    return NextResponse.json({ error: "booking_cancel_failed" }, { status: 500, headers: g.headers });
  }
}
