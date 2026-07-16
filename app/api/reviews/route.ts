import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getReviewsResponse,
  parseReviewPayload,
  parseReviewSubject,
  ReviewForbiddenError,
  ReviewInputError,
  upsertReview,
} from "@/lib/reviews/aggregate";

export const dynamic = "force-dynamic";

function errorResponse(error: unknown, headers: Record<string, string>) {
  if (error instanceof ReviewInputError) {
    return NextResponse.json({ error: error.message }, { status: 400, headers });
  }
  if (error instanceof ReviewForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403, headers });
  }
  console.error("reviews route failed:", error);
  return NextResponse.json({ error: "reviews_failed" }, { status: 500, headers });
}

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { subjectType, subjectId } = parseReviewSubject(
      req.nextUrl.searchParams.get("subjectType"),
      req.nextUrl.searchParams.get("subjectId"),
    );
    const supabase = await createServerSupabase();
    return NextResponse.json(await getReviewsResponse(supabase, subjectType, subjectId), { headers: g.headers });
  } catch (err) {
    return errorResponse(err, g.headers);
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const input = parseReviewPayload(await req.json());
    const supabase = await createServerSupabase();
    return NextResponse.json(await upsertReview(supabase, g.callerId, input), { headers: g.headers });
  } catch (err) {
    return errorResponse(err, g.headers);
  }
}
