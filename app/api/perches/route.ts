import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { buildDeckCards, listingsHeldByOthers, type PerchListingRecord, type ReviewRow } from "@/lib/perches";
import { LIVE_HOLD_STATUSES } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerchDeckResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

const listingSelect = `
  id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,
  created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id,
  users:created_by(id,name,avatar_url,user_type)
`;

/**
 * Listing ids another intern holds (D16). RLS hides other users' bookings, so this reads
 * with the service role. Best effort: if the lookup fails the deck is served unfiltered
 * (a request on a held listing is still refused with 409), never a broken deck.
 */
async function heldByOthers(ids: string[], callerId: string): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  try {
    const admin: SupabaseClient = createAdminClient();
    const { data, error } = await admin
      .from("bookings")
      .select("listing_id,booker_id,roommate_ids,roommate_invites")
      .in("status", LIVE_HOLD_STATUSES)
      .in("listing_id", ids);
    if (error) throw error;
    return listingsHeldByOthers(
      ((data ?? []) as { listing_id: string; booker_id: string; roommate_ids: string[] | null; roommate_invites: string[] | null }[]).map((b) => ({
        listingId: b.listing_id,
        bookerId: b.booker_id,
        roommateIds: b.roommate_ids ?? [],
        inviteIds: b.roommate_invites ?? [],
      })),
      callerId,
    );
  } catch (err) {
    console.error("GET /api/perches hold lookup failed (deck served unfiltered):", err);
    return new Set();
  }
}

export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = await createServerSupabase();
    const { data: swipes, error: swipesError } = await supabase
      .from("listing_swipes")
      .select("listing_id")
      .eq("user_id", g.callerId);
    if (swipesError) throw swipesError;

    const swipedIds = (swipes ?? []).map((row) => row.listing_id);
    let query = supabase
      .from("listings")
      .select(listingSelect)
      .eq("status", "available")
      .gt("expires_at", new Date().toISOString())
      .not("address", "is", null)
      .neq("address", "")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .not("lease_start", "is", null)
      .not("lease_end", "is", null)
      .not("lease_type", "is", null)
      .order("expires_at", { ascending: true })
      .order("last_confirmed_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .limit(100);

    if (swipedIds.length > 0) {
      query = query.not("id", "in", `(${swipedIds.join(",")})`);
    }

    const { data: listings, error: listingsError } = await query;
    if (listingsError) throw listingsError;

    const held = await heldByOthers((listings ?? []).map((row) => row.id), g.callerId);
    const visible = (listings ?? []).filter((row) => !held.has(row.id));
    const ids = visible.map((row) => row.id);
    const { data: reviews, error: reviewsError } = ids.length
      ? await supabase.from("reviews").select("subject_id,rating").eq("subject_type", "listing").in("subject_id", ids)
      : { data: [], error: null };
    if (reviewsError) throw reviewsError;

    const body: PerchDeckResponse = {
      deck: buildDeckCards(visible as unknown as PerchListingRecord[], (reviews ?? []) as ReviewRow[]),
    };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/perches failed:", err);
    return NextResponse.json({ error: "perches_failed" }, { status: 500, headers: g.headers });
  }
}
