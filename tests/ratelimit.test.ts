import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rateLimit, __resetBuckets } from "@/lib/llm/ratelimit";

describe("rateLimit", () => {
  beforeEach(() => {
    __resetBuckets();
    process.env.RATE_LIMIT_WINDOW_MS = "1000";
    process.env.RATE_LIMIT_MAX = "3";
  });
  afterEach(() => {
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it("allows up to the limit then blocks (429 semantics)", () => {
    const now = 1_000_000;
    expect(rateLimit("k", now).ok).toBe(true); // 1
    expect(rateLimit("k", now).ok).toBe(true); // 2
    expect(rateLimit("k", now).ok).toBe(true); // 3
    const blocked = rateLimit("k", now); // 4
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const now = 2_000_000;
    rateLimit("k", now);
    rateLimit("k", now);
    rateLimit("k", now);
    expect(rateLimit("k", now).ok).toBe(false);
    expect(rateLimit("k", now + 1001).ok).toBe(true); // new window
  });

  it("tracks callers independently", () => {
    const now = 3_000_000;
    rateLimit("a", now);
    rateLimit("a", now);
    rateLimit("a", now);
    expect(rateLimit("a", now).ok).toBe(false);
    expect(rateLimit("b", now).ok).toBe(true);
  });
});
