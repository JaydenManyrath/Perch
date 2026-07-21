import { NextResponse } from "next/server";
import { guardOptionalAuth } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseOfferPdf,
  parseOfferText,
  extractOfferPdfText,
  emptyOffer,
} from "@/lib/parsers/offerLetter";
import { extractOfferWithLlm } from "@/lib/parsers/offerLlm";
import { verifyOffer, mergeOffers } from "@/lib/parsers/offerVerify";
import { isLlmEnabled } from "@/lib/llm/openai";
import type { OfferParse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // unpdf's pdf.js needs Node APIs, not edge

/**
 * LLM-first parse pipeline (RC51/RC52). Order:
 *   extract text -> heuristics -> if LLM enabled, LLM pass -> verify -> merge.
 * A verified LLM value fills a null or overrides a low-confidence heuristic; a
 * verified-heuristic value is never overwritten by an unverified LLM one. With
 * LLM_DISABLED=1 or no key the LLM branch is skipped entirely, so the output is
 * byte-identical to the deterministic heuristics (CLAUDE.md 4/8; contract 14.2).
 */
async function parseOfferPipeline(buf: Buffer, isPdf: boolean): Promise<OfferParse> {
  if (!isLlmEnabled()) {
    return isPdf ? parseOfferPdf(buf) : parseOfferText(buf.toString("utf8"));
  }

  const text = isPdf ? await extractOfferPdfText(buf) : buf.toString("utf8");
  const heuristic = isPdf
    ? text.trim().length === 0
      ? emptyOffer()
      : parseOfferText(text)
    : parseOfferText(text);

  if (text.trim().length === 0) return heuristic; // nothing to read - never fabricate

  try {
    const llm = await extractOfferWithLlm(text);
    const verified = verifyOffer(llm, text);
    return mergeOffers(heuristic, verified);
  } catch (err) {
    // The LLM pass is additive: any model/transport failure falls back to heuristics.
    console.error("offer LLM pass failed; using heuristics:", err);
    return heuristic;
  }
}

// POST /api/parse/offer - multipart PDF upload -> structured offer (B6/RC51/RC52). The
// model may read the letter but may never invent a value; every parsed value is verified
// against the source before it is trusted. Stores the file to the private offer-letters
// bucket under the caller's uid prefix (owner-only RLS, 0005).
export async function POST(req: Request) {
  // Onboarding parses the letter BEFORE the account exists (the parse is what mints
  // it), so anonymous callers are allowed - IP rate-limited - instead of 401ing into
  // the fixture fallback, which would mint the account from the wrong identity.
  const g = await guardOptionalAuth(req);
  if (g instanceof NextResponse) return g;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400, headers: g.headers });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const isPdf = (file.type || "").includes("pdf") || buf.subarray(0, 4).toString() === "%PDF";

    const parsed: OfferParse = await parseOfferPipeline(buf, isPdf);

    // Best-effort: archive the original to private storage (never blocks the parse).
    // Only when a signed-in caller exists - an anonymous onboarder has no uid prefix
    // yet, and their letter should not be stored before they have an account.
    if (g.callerId) {
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
    }

    return NextResponse.json(parsed, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/parse/offer failed:", err);
    return NextResponse.json({ error: "parse_failed" }, { status: 500, headers: g.headers });
  }
}
