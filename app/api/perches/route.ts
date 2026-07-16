import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { buildDeckCards, type PerchListingRecord, type ReviewRow } from "@/lib/perches";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PerchDeckResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

const listingSelect = `
  id,title,address,lat,lng,price,lease_start,lease_end,lease_type,source,photos,safety_flags,
  created_by,created_at,status,expires_at,last_confirmed_at,sourced,source_name,source_url,external_id,
  users:created_by(id,name,avatar_url,user_type)
`;

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

    const ids = (listings ?? []).map((row) => row.id);
    const { data: reviews, error: reviewsError } = ids.length
      ? await supabase.from("reviews").select("subject_id,rating").eq("subject_type", "listing").in("subject_id", ids)
      : { data: [], error: null };
    if (reviewsError) throw reviewsError;

    const body: PerchDeckResponse = {
      deck: buildDeckCards((listings ?? []) as unknown as PerchListingRecord[], (reviews ?? []) as ReviewRow[]),
    };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/perches failed:", err);
    return NextResponse.json({ error: "perches_failed" }, { status: 500, headers: g.headers });
  }
}
