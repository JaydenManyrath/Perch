import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  LISTING_DETAIL_SELECT,
  parseListingId,
  PerchInputError,
  toListingDetail,
  type DetailListingRecord,
  type ReviewRow,
} from "@/lib/perches";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/listings/{id} (RB31) - comprehensive ListingDetail: the row plus furnished,
// pros, bed/bath/sqft, amenities, utilities, host, and the review summary.
export async function GET(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const params = await context.params;
    const listingId = parseListingId(params.id);
    const supabase = await createServerSupabase();

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select(LISTING_DETAIL_SELECT)
      .eq("id", listingId)
      .maybeSingle();
    if (listingError) throw listingError;
    if (!listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404, headers: g.headers });
    }

    const { data: reviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("subject_id,rating")
      .eq("subject_type", "listing")
      .eq("subject_id", listingId);
    if (reviewsError) throw reviewsError;

    const detail = toListingDetail(listing as unknown as DetailListingRecord, (reviews ?? []) as ReviewRow[]);
    return NextResponse.json(detail, { headers: g.headers });
  } catch (err) {
    if (err instanceof PerchInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("GET /api/listings/[id] failed:", err);
    return NextResponse.json({ error: "listing_detail_failed" }, { status: 500, headers: g.headers });
  }
}
