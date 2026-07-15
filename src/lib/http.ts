import { NextResponse } from "next/server";
import { getCallerId } from "@/lib/supabase/server";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";

/**
 * Per-request guard shared by every API route (B12): identify the caller from the
 * session and enforce the rate limit. The caller id is NEVER taken from the request
 * body (contract §4) — only from the session. A `DEV_DEMO_USER_ID` fallback allows
 * driving routes locally before full auth is wired; it is ignored in production.
 */
export async function guard(
  req: Request,
): Promise<{ callerId: string; headers: Record<string, string> } | NextResponse> {
  let callerId = await getCallerId().catch(() => null);
  if (!callerId && process.env.NODE_ENV !== "production" && process.env.DEV_DEMO_USER_ID) {
    callerId = process.env.DEV_DEMO_USER_ID;
  }
  if (!callerId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`${callerId}:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers },
    );
  }
  return { callerId, headers };
}
