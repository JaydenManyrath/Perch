import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetBuckets } from "@/lib/llm/ratelimit";

const getCallerId = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/supabase/server", () => ({ getCallerId, createServerSupabase }));

function request() {
  return new Request("http://localhost/api/negotiate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({
      listingIds: ["11111111-1111-5111-8111-111111111111"],
      constraints: {
        monthlyBudget: 2000,
        moveIn: "2026-06-08",
        moveOut: "2026-08-14",
      },
    }),
  });
}

describe("POST /api/negotiate route rate limit", () => {
  beforeEach(() => {
    __resetBuckets();
    process.env.RATE_LIMIT_MAX = "1";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.LLM_DISABLED = "1";
    getCallerId.mockResolvedValue("11111111-1111-5111-8111-111111111111");
    createServerSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          in: async () => ({ data: [], error: null }),
        }),
      }),
    });
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.LLM_DISABLED;
  });

  it("returns 429 from the actual route after the caller exceeds the limit", async () => {
    const { POST } = await import("@/app/api/negotiate/route");

    const first = await POST(request());
    const second = await POST(request());

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(await second.json()).toMatchObject({ error: "rate_limited" });
    expect(second.headers.get("retry-after")).not.toBeNull();
    expect(createServerSupabase).toHaveBeenCalledTimes(1);
  });
});
