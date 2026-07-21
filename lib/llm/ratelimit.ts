/**
 * Rate limiting (B12). Every LLM/external route passes through this so a leaked or
 * abused key can't be drained (docs/ARCHITECTURE.md). In-memory sliding-window token
 * bucket keyed per caller (session id) or IP. Sufficient for the demo / single
 * instance; swap for Upstash/Redis in production.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function cfg() {
  return {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 20),
  };
}

export type RateResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSec: number;
};

/** Consume one token for `key`. `ok=false` means the caller is over the limit. */
export function rateLimit(key: string, now: number = Date.now()): RateResult {
  const { windowMs, max } = cfg();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { ok: true, limit: max, remaining: max - 1, resetAt: bucket.resetAt, retryAfterSec: 0 };
  }

  existing.count += 1;
  const remaining = Math.max(0, max - existing.count);
  const ok = existing.count <= max;
  return {
    ok,
    limit: max,
    remaining,
    resetAt: existing.resetAt,
    retryAfterSec: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/** Build the standard rate-limit headers for a response. */
export function rateHeaders(r: RateResult): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.floor(r.resetAt / 1000)),
  };
  if (!r.ok) h["Retry-After"] = String(r.retryAfterSec);
  return h;
}

/** Test-only: clear all buckets. */
export function __resetBuckets() {
  buckets.clear();
}
