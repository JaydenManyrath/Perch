import { describe, it, expect } from "vitest";
import { planFreshness, PING_WITHIN_DAYS, type FreshnessRow } from "./freshness";

const NOW = Date.parse("2026-06-10T00:00:00Z");
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

const row = (over: Partial<FreshnessRow>): FreshnessRow => ({
  id: "l1",
  status: "available",
  sourced: true,
  expires_at: iso(NOW + 10 * DAY),
  ...over,
});

describe("planFreshness", () => {
  it("expires an available row past its expires_at", () => {
    const plan = planFreshness([row({ id: "old", expires_at: iso(NOW - DAY) })], NOW);
    expect(plan.expire).toEqual(["old"]);
    expect(plan.ping).toEqual([]);
  });

  it("does not expire a still-fresh row", () => {
    const plan = planFreshness([row({ expires_at: iso(NOW + 5 * DAY) })], NOW);
    expect(plan.expire).toEqual([]);
  });

  it("pings a near-expiry SUBLETTER listing", () => {
    const plan = planFreshness(
      [row({ id: "sub", sourced: false, expires_at: iso(NOW + (PING_WITHIN_DAYS - 1) * DAY) })],
      NOW,
    );
    expect(plan.ping).toEqual(["sub"]);
    expect(plan.expire).toEqual([]);
  });

  it("does NOT ping a near-expiry auto-sourced listing (no owner to ping)", () => {
    const plan = planFreshness(
      [row({ id: "auto", sourced: true, expires_at: iso(NOW + 1 * DAY) })],
      NOW,
    );
    expect(plan.ping).toEqual([]);
    expect(plan.expire).toEqual([]);
  });

  it("ignores taken/pending/stale rows entirely", () => {
    const plan = planFreshness(
      [
        row({ id: "taken", status: "taken", expires_at: iso(NOW - DAY) }),
        row({ id: "stale", status: "stale", expires_at: iso(NOW - DAY) }),
        row({ id: "pending", status: "pending", expires_at: iso(NOW - DAY) }),
      ],
      NOW,
    );
    expect(plan.expire).toEqual([]);
    expect(plan.ping).toEqual([]);
  });

  it("is deterministic and sorted", () => {
    const rows = [
      row({ id: "z", expires_at: iso(NOW - DAY) }),
      row({ id: "a", expires_at: iso(NOW - DAY) }),
    ];
    expect(planFreshness(rows, NOW).expire).toEqual(["a", "z"]);
    expect(planFreshness(rows, NOW)).toEqual(planFreshness(rows, NOW));
  });
});
