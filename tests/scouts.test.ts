import { describe, it, expect } from "vitest";
import { safetyScout } from "@/lib/negotiate/safety";
import { routineScout } from "@/lib/negotiate/routine";
import { runScouts, aggregate, rankSummaries } from "@/lib/negotiate/scouts";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";
import type { ScoutResult } from "@/lib/negotiate/types";

const listing: ScoutListing = {
  id: "l1",
  title: "Sunny sublet",
  price: 1800,
  lat: 47.611,
  lng: -122.331,
  lease_start: "2026-06-01",
  lease_end: "2026-08-31",
  safety_flags: { scamSignals: [], notes: [] },
};

const constraints: ScoutConstraints = {
  monthlyBudget: 2000,
  moveIn: "2026-06-08",
  moveOut: "2026-08-14",
  routineAnchors: [{ label: "usual coffee spot", lat: 47.6115, lng: -122.3315 }],
};

describe("safetyScout", () => {
  it("fails on any scam signal", () => {
    const r = safetyScout({ ...listing, safety_flags: { scamSignals: ["wire deposit"], notes: [] } });
    expect(r.verdict).toBe("fail");
    expect(r.value).toMatch(/wire deposit/);
  });
  it("flags on an advisory note", () => {
    const r = safetyScout({ ...listing, safety_flags: { scamSignals: [], notes: ["3rd-floor walkup"] } });
    expect(r.verdict).toBe("flag");
  });
  it("passes when clean", () => {
    expect(safetyScout(listing).verdict).toBe("pass");
  });
});

describe("routineScout", () => {
  it("passes for a short walk to an anchor", () => {
    expect(routineScout(listing, constraints).verdict).toBe("pass");
  });
  it("fails when far from every anchor", () => {
    const r = routineScout(listing, {
      ...constraints,
      routineAnchors: [{ label: "usual coffee spot", lat: 47.9, lng: -122.9 }],
    });
    expect(r.verdict).toBe("fail");
  });
  it("flags when routine data is unavailable", () => {
    expect(routineScout(listing, { ...constraints, routineAnchors: [] }).verdict).toBe("flag");
    expect(routineScout({ ...listing, lat: null, lng: null }, constraints).verdict).toBe("flag");
  });
});

describe("runScouts", () => {
  it("emits the four checks in the frozen order", () => {
    const results = runScouts(listing, constraints);
    expect(results.map((r) => r.check)).toEqual(["budget", "safety", "lease_fit", "routine_fit"]);
  });
  it("is fully deterministic", () => {
    expect(runScouts(listing, constraints)).toEqual(runScouts(listing, constraints));
  });
});

describe("aggregate", () => {
  const mk = (verdicts: ScoutResult["verdict"][]): ScoutResult[] =>
    verdicts.map((v, i) => ({ check: "budget", verdict: v, value: `${i}` }));

  it("any fail → fail", () => {
    expect(aggregate(mk(["pass", "flag", "fail", "pass"])).overall).toBe("fail");
  });
  it("no fail, any flag → flag", () => {
    expect(aggregate(mk(["pass", "flag", "pass", "pass"])).overall).toBe("flag");
  });
  it("all pass → pass", () => {
    const a = aggregate(mk(["pass", "pass", "pass", "pass"]));
    expect(a.overall).toBe("pass");
    expect(a.passedChecks).toBe(4);
    expect(a.totalChecks).toBe(4);
  });
  it("counts passed checks correctly", () => {
    expect(aggregate(mk(["pass", "flag", "pass", "fail"])).passedChecks).toBe(2);
  });
});

describe("rankSummaries", () => {
  it("orders pass < flag < fail, then by passed count, then id", () => {
    const ranked = rankSummaries([
      { listingId: "b", overall: "flag", passedChecks: 3, totalChecks: 4 },
      { listingId: "a", overall: "pass", passedChecks: 4, totalChecks: 4 },
      { listingId: "c", overall: "fail", passedChecks: 1, totalChecks: 4 },
      { listingId: "d", overall: "pass", passedChecks: 4, totalChecks: 4 },
    ]);
    expect(ranked.map((r) => r.listingId)).toEqual(["a", "d", "b", "c"]);
  });
});
