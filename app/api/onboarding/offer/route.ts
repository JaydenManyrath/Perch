import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function optionalMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * PATCH /api/onboarding/offer - persist corrected fields that finance/listing
 * surfaces read later. The caller id comes only from the session guard.
 */
export async function PATCH(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const update = {
      city: optionalText(body.city),
      offer_salary: optionalMoney(body.salary),
      relocation_stipend: optionalMoney(body.relocationStipend),
      signing_bonus: optionalMoney(body.signingBonus),
    };

    const admin = createAdminClient();
    const { error } = await admin.from("users").update(update).eq("id", g.callerId);
    if (error) throw error;

    return NextResponse.json({ ok: true }, { headers: g.headers });
  } catch (err) {
    console.error("PATCH /api/onboarding/offer failed:", err);
    return NextResponse.json({ error: "offer_persist_failed" }, { status: 500, headers: g.headers });
  }
}
