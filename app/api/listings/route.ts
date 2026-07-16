import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  LISTING_SELECT,
  listingInsertPayload,
  listingResponse,
  parsePostListingInput,
  PerchInputError,
  type PerchListingRecord,
} from "@/lib/perches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const input = parsePostListingInput(await req.json());
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

    const admin = createAdminClient();
    const { data: listing, error: insertError } = await admin
      .from("listings")
      .insert(listingInsertPayload(input, g.callerId))
      .select(LISTING_SELECT)
      .single();
    if (insertError) throw insertError;

    return NextResponse.json(listingResponse(listing as unknown as PerchListingRecord), {
      status: 201,
      headers: g.headers,
    });
  } catch (err) {
    if (err instanceof PerchInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("POST /api/listings failed:", err);
    return NextResponse.json({ error: "listing_create_failed" }, { status: 500, headers: g.headers });
  }
}
