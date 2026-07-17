import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { BOOKING_SELECT, bookingViewerRole, toBookings, type BookingRow } from "@/lib/bookings";
import { createServerSupabase } from "@/lib/supabase/server";
import type { BookingsResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/bookings (RB32) - the caller's own bookings (as booker or roommate) plus the
// bookings incoming against listings they own. RLS already limits visibility to parties.
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("bookings")
      .select(BOOKING_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw error;

    const rows = (data ?? []) as BookingRow[];

    // Resolve listing owners to classify incoming (owner) vs mine (booker/roommate).
    const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
    const ownerByListing = new Map<string, string | null>();
    if (listingIds.length > 0) {
      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("id,created_by")
        .in("id", listingIds);
      if (listingsError) throw listingsError;
      for (const l of (listings ?? []) as { id: string; created_by: string | null }[]) {
        ownerByListing.set(l.id, l.created_by);
      }
    }

    const mineRows = rows.filter(
      (r) =>
        r.booker_id === g.callerId ||
        r.roommate_ids.includes(g.callerId) ||
        r.roommate_invites.includes(g.callerId),
    );
    const incomingRows = rows.filter(
      (r) => ownerByListing.get(r.listing_id) === g.callerId && r.booker_id !== g.callerId,
    );

    const [mine, incoming] = await Promise.all([
      toBookings(supabase, mineRows),
      toBookings(supabase, incomingRows),
    ]);
    mine.forEach((booking, index) => {
      const row = mineRows[index];
      booking.viewerRole = bookingViewerRole(row, g.callerId, ownerByListing.get(row.listing_id) ?? null);
    });
    incoming.forEach((booking, index) => {
      const row = incomingRows[index];
      booking.viewerRole = bookingViewerRole(row, g.callerId, ownerByListing.get(row.listing_id) ?? null);
    });

    const body: BookingsResponse = { mine, incoming };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/bookings failed:", err);
    return NextResponse.json({ error: "bookings_failed" }, { status: 500, headers: g.headers });
  }
}
