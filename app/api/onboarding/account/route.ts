import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";
import type { OfferParse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/onboarding/account - mint the account for the person ON the offer letter.
 *
 * The onboarding flow parses the letter; this route turns the parsed identity into a
 * REAL account instead of dropping the user into a seeded persona:
 *   - auth user: <name-slug>@perch.demo with the shared demo password seam
 *     (perch-demo-<email>, same as the seeded accounts, so /login works for it later);
 *   - users row: name/company/city/move-in and the offer money fields from the parse;
 *   - NO social graph: zero friendships, conversations, or requests. Friends exist
 *     only when this user adds them (the flock step / discovery do that).
 *
 * Anonymous by design (it CREATES the session's account - there is nobody to
 * authenticate yet), so it is rate-limited by IP instead of going through guard().
 * Demo-mode seam: a real product would verify an email; this repo is explicitly a
 * dev/test-mode demo (CLAUDE.md section 2), so the letter's name is the identity.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`onboard-account:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers },
    );
  }

  let offer: Partial<OfferParse>;
  try {
    const body = (await req.json()) as { offer?: Partial<OfferParse> };
    offer = body.offer ?? {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers });
  }

  const name = typeof offer.name === "string" ? offer.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name_required" }, { status: 400, headers });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Supabase not configured - the client falls back to the fixture identity.
    return NextResponse.json({ error: "unavailable" }, { status: 503, headers });
  }

  const slug =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "intern";

  try {
    // Mint the auth user; on an email collision, suffix and retry (same person
    // re-onboarding or a namesake - either way they get their own account).
    let email = "";
    let userId = "";
    let lastError = "";
    for (let attempt = 1; attempt <= 5 && !userId; attempt += 1) {
      const candidate = `${slug}${attempt > 1 ? `-${attempt}` : ""}@perch.demo`;
      const { data, error } = await admin.auth.admin.createUser({
        email: candidate,
        password: `perch-demo-${candidate}`,
        email_confirm: true,
      });
      if (!error && data.user) {
        email = candidate;
        userId = data.user.id;
        break;
      }
      lastError = error?.message ?? "unknown";
      const exists = /already|exist|registered|duplicate/i.test(lastError);
      if (!exists) break;
    }
    if (!userId) {
      console.error("onboarding account createUser failed:", lastError);
      return NextResponse.json({ error: "account_failed" }, { status: 500, headers });
    }

    const salary = typeof offer.salary === "number" ? Math.round(offer.salary) : null;
    const stipend =
      typeof offer.relocationStipend === "number" ? Math.round(offer.relocationStipend) : null;
    const bonus = typeof offer.signingBonus === "number" ? Math.round(offer.signingBonus) : null;
    const { error: upsertError } = await admin.from("users").upsert(
      {
        id: userId,
        name,
        company: typeof offer.employer === "string" ? offer.employer : null,
        role: typeof offer.role === "string" ? offer.role : null,
        city: typeof offer.city === "string" ? offer.city : null,
        move_in_date: typeof offer.startDate === "string" ? offer.startDate : null,
        user_type: "intern",
        verified: false,
        offer_salary: salary,
        relocation_stipend: stipend,
        signing_bonus: bonus,
      },
      { onConflict: "id" },
    );
    if (upsertError) {
      console.error("onboarding account users upsert failed:", upsertError.message);
      return NextResponse.json({ error: "account_failed" }, { status: 500, headers });
    }

    // Deliberately NO friendships / conversations / requests here: a new account
    // has friends only when they add them.
    return NextResponse.json({ email, userId }, { headers });
  } catch (err) {
    console.error("POST /api/onboarding/account failed:", err);
    return NextResponse.json({ error: "account_failed" }, { status: 500, headers });
  }
}
