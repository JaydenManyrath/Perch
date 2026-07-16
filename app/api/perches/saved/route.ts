import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { toPerchCard, type PerchListingRecord, type ReviewRow } from "@/lib/perches";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SavedPerchesResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

const listingSelect = `
  listing_id,
  listings:listing_id(
    id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,
    created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id,
    users:created_by(id,name,avatar_url,user_type)
  )
`;

export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = await createServerSupabase();
    const { data: swipes, error: swipesError } = await supabase
      .from("listing_swipes")
      .select(listingSelect)
      .eq("user_id", g.callerId)
      .eq("direction", "right")
      .order("created_at", { ascending: false });
    if (swipesError) throw swipesError;

    const listings = (swipes ?? [])
      .map((row) => row.listings)
      .filter(Boolean) as unknown as PerchListingRecord[];
    const ids = listings.map((row) => row.id);
    const { data: reviews, error: reviewsError } = ids.length
      ? await supabase.from("reviews").select("subject_id,rating").eq("subject_type", "listing").in("subject_id", ids)
      : { data: [], error: null };
    if (reviewsError) throw reviewsError;

    const body: SavedPerchesResponse = {
      saved: listings.map((listing) => toPerchCard(listing, (reviews ?? []) as ReviewRow[])),
    };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/perches/saved failed:", err);
    return NextResponse.json({ error: "saved_perches_failed" }, { status: 500, headers: g.headers });
  }
}
