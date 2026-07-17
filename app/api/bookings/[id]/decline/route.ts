import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { bookingErrorStatus, parseUuid, performTransition } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/bookings/{id}/decline (RB32) - the listing owner declines and releases the hold.
export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;
  try {
    const { id } = await context.params;
    const bookingId = parseUuid(id, "booking id");
    const supabase = await createServerSupabase();
    const admin = createAdminClient();
    const booking = await performTransition(supabase, admin, g.callerId, bookingId, "decline");
    return NextResponse.json(booking, { headers: g.headers });
  } catch (err) {
    const mapped = bookingErrorStatus(err);
    if (mapped) return NextResponse.json({ error: mapped.message }, { status: mapped.status, headers: g.headers });
    console.error("POST /api/bookings/[id]/decline failed:", err);
    return NextResponse.json({ error: "booking_decline_failed" }, { status: 500, headers: g.headers });
  }
}
