import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { PerchInputError, parseSwipeInput } from "@/lib/perches";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SwipeResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const input = parseSwipeInput(await req.json());
    const supabase = await createServerSupabase();
    const { data: me, error: meError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", g.callerId)
      .single();
    if (meError) throw meError;
    if (me?.user_type !== "intern") {
      return NextResponse.json({ error: "interns_only" }, { status: 403, headers: g.headers });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id")
      .eq("id", input.listingId)
      .single();
    if (listingError || !listing) {
      return NextResponse.json({ error: "listing_not_found" }, { status: 404, headers: g.headers });
    }

    const { data: existing, error: existingError } = await supabase
      .from("listing_swipes")
      .select("direction")
      .eq("user_id", g.callerId)
      .eq("listing_id", input.listingId)
      .maybeSingle();
    if (existingError) throw existingError;

    if (!existing) {
      const { error: insertError } = await supabase.from("listing_swipes").insert({
        user_id: g.callerId,
        listing_id: input.listingId,
        direction: input.direction,
      });
      if (insertError) throw insertError;
    }

    const body: SwipeResponse = {
      listingId: input.listingId,
      direction: (existing?.direction ?? input.direction) as SwipeResponse["direction"],
    };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    if (err instanceof PerchInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("POST /api/perches/swipe failed:", err);
    return NextResponse.json({ error: "swipe_failed" }, { status: 500, headers: g.headers });
  }
}
