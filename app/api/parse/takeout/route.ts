import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { parseTakeout } from "@/lib/parsers/takeout";
import type { TakeoutParse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/parse/takeout - Google Maps Takeout upload (multipart file or raw JSON
// body) → recurring places (B6). Deterministic clustering; frequency populated.
export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    let json: unknown;
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: "missing_file" }, { status: 400, headers: g.headers });
      }
      json = JSON.parse(await file.text());
    } else {
      json = await req.json();
    }

    const body: TakeoutParse = { places: parseTakeout(json) };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/parse/takeout failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 500, headers: g.headers });
  }
}
