import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  freshnessExpiry,
  LISTING_SELECT,
  listingResponse,
  parseListingId,
  PerchInputError,
  type PerchListingRecord,
} from "@/lib/perches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const params = await context.params;
    const listingId = parseListingId(params.id);
    const supabase = await createServerSupabase();
    const { data: me, error: meError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", g.callerId)
      .single();
    if (meError) throw meError;
    if (me?.user_type !== "subletter") {
      return NextResponse.json({ error: "subletters_only" }, { status: 403, headers: g.headers });
    }

    const { data: owned, error: ownedError } = await supabase
      .from("listings")
      .select("id,sourced,source_name,created_by")
      .eq("id", listingId)
      .maybeSingle();
    if (ownedError) throw ownedError;
    if (!owned) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404, headers: g.headers });
    }
    if (owned.created_by !== g.callerId || owned.sourced !== false || owned.source_name !== "subletter") {
      return NextResponse.json({ error: "not_listing_owner" }, { status: 403, headers: g.headers });
    }

    const now = new Date();
    const admin = createAdminClient();
    const { data: listing, error: updateError } = await admin
      .from("listings")
      .update({
        status: "available",
        last_confirmed_at: now.toISOString(),
        expires_at: freshnessExpiry(now),
      })
      .eq("id", listingId)
      .select(LISTING_SELECT)
      .single();
    if (updateError) throw updateError;

    return NextResponse.json(listingResponse(listing as unknown as PerchListingRecord), { headers: g.headers });
  } catch (err) {
    if (err instanceof PerchInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("POST /api/listings/[id]/confirm failed:", err);
    return NextResponse.json({ error: "listing_confirm_failed" }, { status: 500, headers: g.headers });
  }
}
