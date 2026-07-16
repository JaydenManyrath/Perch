import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { LISTING_SELECT, toPerchCard, type PerchListingRecord, type ReviewRow } from "@/lib/perches";
import { summarizeRatings } from "@/lib/reviews/aggregate";
import { createServerSupabase } from "@/lib/supabase/server";
import type { PublicProfile } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

type UserRecord = {
  id: string;
  name: string;
  role: string | null;
  city: string | null;
  company: string | null;
  avatar_url: string | null;
  user_type: "intern" | "subletter";
  verified: boolean | null;
};

type RouteContext = { params: { id: string } };

function profileFromUser(user: UserRecord): PublicProfile {
  return {
    user: {
      id: user.id,
      name: user.name,
      role: user.role ?? "",
      city: user.city ?? "",
      company: user.company ?? "",
      avatarUrl: user.avatar_url,
    },
    userType: user.user_type,
    banded: user.verified === true,
  };
}

export async function GET(req: Request, { params }: RouteContext) {
  const guardResult = await guard(req);
  if (guardResult instanceof NextResponse) return guardResult;

  try {
    const supabase = await createServerSupabase();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id,name,role,city,company,avatar_url,user_type,verified")
      .eq("id", params.id)
      .maybeSingle();
    if (userError) throw userError;
    if (!user) {
      return NextResponse.json({ error: "profile_not_found" }, { status: 404, headers: guardResult.headers });
    }

    const profile = profileFromUser(user as UserRecord);
    if (profile.userType !== "subletter") {
      return NextResponse.json(profile, { headers: guardResult.headers });
    }

    const { data: subletterReviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("subject_id,rating")
      .eq("subject_type", "subletter")
      .eq("subject_id", profile.user.id);
    if (reviewsError) throw reviewsError;

    const ownerViewingSelf = guardResult.callerId === profile.user.id;
    let listingsQuery = supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("created_by", profile.user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });

    if (!ownerViewingSelf) {
      listingsQuery = listingsQuery
        .eq("status", "available")
        .gt("expires_at", new Date().toISOString());
    }

    const { data: listings, error: listingsError } = await listingsQuery;
    if (listingsError) throw listingsError;

    const listingRows = (listings ?? []) as unknown as PerchListingRecord[];
    const listingIds = listingRows.map((listing) => listing.id);
    const { data: listingReviews, error: listingReviewsError } = listingIds.length
      ? await supabase
          .from("reviews")
          .select("subject_id,rating")
          .eq("subject_type", "listing")
          .in("subject_id", listingIds)
      : { data: [], error: null };
    if (listingReviewsError) throw listingReviewsError;

    const body: PublicProfile = {
      ...profile,
      reviewSummary: summarizeRatings((subletterReviews ?? []).map((row) => row.rating)),
      listings: listingRows.map((listing) => toPerchCard(listing, (listingReviews ?? []) as ReviewRow[])),
    };

    return NextResponse.json(body, { headers: guardResult.headers });
  } catch (err) {
    console.error("GET /api/users/[id] failed:", err);
    return NextResponse.json({ error: "profile_failed" }, { status: 500, headers: guardResult.headers });
  }
}
