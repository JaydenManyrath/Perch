import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { searchRoutePoiCandidates } from "@/lib/route/poi-candidates";
import {
  buildRoutePois,
  parseRoutePoisInput,
  RoutePoiForbiddenError,
  RoutePoiInputError,
} from "@/lib/route/pois";
import { getAuthenticatedInternRound1Places } from "@/lib/route/round1-places";
import type { RoutePoisResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const input = parseRoutePoisInput(await req.json());
    const userPlaces = await getAuthenticatedInternRound1Places(g.callerId);

    const pois = await buildRoutePois({
      ...input,
      userPlaces,
      searchCandidates: searchRoutePoiCandidates,
    });

    const body: RoutePoisResponse = { pois };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    if (err instanceof RoutePoiInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    if (err instanceof RoutePoiForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403, headers: g.headers });
    }
    console.error("POST /api/route/pois failed:", err);
    return NextResponse.json({ error: "route_pois_failed" }, { status: 500, headers: g.headers });
  }
}
