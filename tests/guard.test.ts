/**
 * guard() live-auth + rate-limit contract (RB45).
 *
 * guard() is the single per-request gate every API route passes through. It must:
 *   - resolve the caller id ONLY from the session (getCallerId -> auth.uid), never
 *     the request body;
 *   - 401 an unauthenticated request;
 *   - return the caller id + rate-limit headers for an authenticated one;
 *   - 429 once the per-caller window is exhausted.
 * This exercises guard() directly (routes elsewhere mock it).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const { getCallerId } = vi.hoisted(() => ({ getCallerId: vi.fn<() => Promise<string | null>>() }));
vi.mock("@/lib/supabase/server", () => ({ getCallerId }));

import { guard } from "@/lib/http";
import { __resetBuckets } from "@/lib/llm/ratelimit";

const req = () => new Request("http://localhost/api/x", { headers: { "x-forwarded-for": "203.0.113.5" } });

describe("guard() session + rate limit", () => {
  beforeEach(() => {
    __resetBuckets();
    getCallerId.mockReset();
    delete process.env.DEV_DEMO_USER_ID;
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "3";
  });
  afterEach(() => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it("401s an unauthenticated caller (no session, no dev fallback)", async () => {
    getCallerId.mockResolvedValue(null);
    const res = await guard(req());
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(401);
  });

  it("still 401s when getCallerId throws (fixture-safe, never crashes)", async () => {
    getCallerId.mockRejectedValue(new Error("supabase down"));
    const res = await guard(req());
    expect((res as NextResponse).status).toBe(401);
  });

  it("returns the session caller id + rate-limit headers when authenticated", async () => {
    getCallerId.mockResolvedValue("caller-abc");
    const res = await guard(req());
    expect(res).not.toBeInstanceOf(NextResponse);
    const ok = res as { callerId: string; headers: Record<string, string> };
    expect(ok.callerId).toBe("caller-abc");
    expect(ok.headers["X-RateLimit-Limit"]).toBe("3");
  });

  it("429s once the per-caller window is exhausted", async () => {
    getCallerId.mockResolvedValue("caller-abc");
    await guard(req()); // 1
    await guard(req()); // 2
    await guard(req()); // 3 (limit)
    const blocked = await guard(req()); // 4 -> over
    expect(blocked).toBeInstanceOf(NextResponse);
    expect((blocked as NextResponse).status).toBe(429);
  });
});
