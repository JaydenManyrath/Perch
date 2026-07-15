import { describe, it, expect } from "vitest";
import { leaseScout } from "@/lib/negotiate/lease";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";

const listing = (lease_start: string | null, lease_end: string | null): ScoutListing => ({
  id: "l1",
  title: "Test",
  price: 1800,
  lat: 47.6,
  lng: -122.3,
  lease_start,
  lease_end,
  safety_flags: { scamSignals: [], notes: [] },
});

const stay: ScoutConstraints = {
  monthlyBudget: 2000,
  moveIn: "2026-06-08",
  moveOut: "2026-08-14",
};

describe("leaseScout", () => {
  it("passes when the lease fully covers the stay", () => {
    const r = leaseScout(listing("2026-06-01", "2026-08-31"), stay);
    expect(r.verdict).toBe("pass");
    expect(r.value).toMatch(/covers your full internship/i);
  });
  it("flags a small gap (≤ 7 days total)", () => {
    // lease starts 3 days late, ends on time → 3-day gap
    const r = leaseScout(listing("2026-06-11", "2026-08-31"), stay);
    expect(r.verdict).toBe("flag");
    expect(r.value).toMatch(/misses 3 days/i);
  });
  it("fails a large gap", () => {
    // lease ends 2 weeks before moveOut
    const r = leaseScout(listing("2026-06-01", "2026-07-31"), stay);
    expect(r.verdict).toBe("fail");
    expect(r.value).toMatch(/gap of 14 days/i);
  });
  it("sums gaps at both ends", () => {
    // starts 4 late + ends 4 early = 8-day gap → fail (>7)
    const r = leaseScout(listing("2026-06-12", "2026-08-10"), stay);
    expect(r.verdict).toBe("fail");
    expect(r.value).toMatch(/gap of 8 days/i);
  });
  it("fails when dates are unknown", () => {
    expect(leaseScout(listing(null, null), stay).verdict).toBe("fail");
    expect(leaseScout(listing("2026-06-01", null), stay).verdict).toBe("fail");
  });
});
