import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOfferPdf, parseOfferText } from "@/lib/parsers/offerLetter";
import type { OfferParse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // unpdf's pdf.js needs Node APIs, not edge

// POST /api/parse/offer - multipart PDF upload → structured offer (B6). Deterministic
// extraction; salary is never invented. Stores the file to the private offer-letters
// bucket under the caller's uid prefix (owner-only RLS, 0005).
export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400, headers: g.headers });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const isPdf = (file.type || "").includes("pdf") || buf.subarray(0, 4).toString() === "%PDF";

    const parsed: OfferParse = isPdf
      ? await parseOfferPdf(buf)
      : parseOfferText(buf.toString("utf8"));

    // Best-effort: archive the original to private storage (never blocks the parse).
    try {
      const admin = createAdminClient();
      await admin.storage
        .from("offer-letters")
        .upload(`${g.callerId}/offer-${Date.now()}.pdf`, buf, {
          contentType: isPdf ? "application/pdf" : "text/plain",
          upsert: false,
        });
    } catch (storageErr) {
      console.warn("offer archive skipped:", storageErr);
    }

    return NextResponse.json(parsed, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/parse/offer failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 500, headers: g.headers });
  }
}
