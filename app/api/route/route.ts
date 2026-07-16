import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/http";
import { getRoute } from "@/lib/routing/mapbox";
import { geocodeEmployer } from "@/lib/routing/geocode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/route (RC6) - commute route office -> apartment via Mapbox Directions, with
 * a straight-line fallback. Office coords may be supplied directly, or derived from the
 * user's employer (RC7 geocode) when omitted. Rate-limited; token stays server-side.
 */
const Body = z.object({
  apartmentLat: z.number(),
  apartmentLng: z.number(),
  officeLat: z.number().optional(),
  officeLng: z.number().optional(),
  employer: z.string().optional(),
});

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: g.headers });
  }

  try {
    let office = { lat: body.officeLat, lng: body.officeLng };
    let officeSource: "provided" | "mapbox" | "seeded" | "city" = "provided";
    if (office.lat == null || office.lng == null) {
      const geo = await geocodeEmployer(body.employer);
      office = geo.coords;
      officeSource = geo.source;
    }

    const { route, source } = await getRoute(
      { lat: office.lat!, lng: office.lng! },
      { lat: body.apartmentLat, lng: body.apartmentLng },
    );

    return NextResponse.json({ ...route, source, office, officeSource }, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/route failed:", err);
    return NextResponse.json({ error: "route_failed" }, { status: 500, headers: g.headers });
  }
}
