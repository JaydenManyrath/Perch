/**
 * CS 7314 - PT/BBT on the deterministic verdict rules (budget, lease fit, routine fit,
 * safety, roll-up). Each `describe` is one input dimension; each case id maps to a row
 * of the partition tables in docs/testing/pt/partitions.md. Expected values come from
 * the specification (contract 13.5 / plan 6.1 thresholds), computed by hand.
 */
import { describe, expect, it } from "vitest";
import { budgetScout, affordableRent } from "@/lib/negotiate/budget";
import { leaseScout } from "@/lib/negotiate/lease";
import { routineScout } from "@/lib/negotiate/routine";
import { safetyScout } from "@/lib/negotiate/safety";
import { aggregate } from "@/lib/negotiate/scouts";
import type { ScoutConstraints, ScoutListing, ScoutResult } from "@/lib/negotiate/types";

const base: ScoutListing = {
  id: "L",
  title: "t",
  price: 1500,
  lat: 47.6,
  lng: -122.33,
  lease_start: "2026-06-01",
  lease_end: "2026-08-31",
  safety_flags: { scamSignals: [], notes: [] },
};
const stay: ScoutConstraints = { monthlyBudget: 2000, moveIn: "2026-06-08", moveOut: "2026-08-14" };
const L = (o: Partial<ScoutListing>): ScoutListing => ({ ...base, ...o });
const C = (o: Partial<ScoutConstraints>): ScoutConstraints => ({ ...stay, ...o });

describe("PT-B1 budget: rent price vs affordable rent (no salary, affordable = stated budget 2000)", () => {
  const cases: [string, number, ScoutResult["verdict"]][] = [
    ["PB-01 price well under budget", 1200, "pass"],
    ["PB-02 price exactly at budget (upper edge of pass)", 2000, "pass"],
    ["PB-03 price just over budget (lower edge of flag)", 2001, "flag"],
    ["PB-04 price at 110% (upper edge of flag)", 2200, "flag"],
    ["PB-05 price just over 110% (lower edge of fail)", 2201, "fail"],
    ["PB-06 price far over budget", 5000, "fail"],
    ["PB-07 free listing (price 0)", 0, "pass"],
  ];
  for (const [name, price, verdict] of cases) {
    it(name, () => expect(budgetScout(L({ price }), stay).verdict).toBe(verdict));
  }
});

describe("PT-B2 budget: salary dimension feeding the affordable rent", () => {
  it("PB-08 salary absent -> stated budget used verbatim", () => {
    expect(affordableRent(C({ salary: null }))).toBe(2000);
  });
  it("PB-09 salary zero (invalid) -> treated as absent", () => {
    expect(affordableRent(C({ salary: 0 }))).toBe(2000);
  });
  it("PB-10 salary negative (invalid) -> treated as absent", () => {
    expect(affordableRent(C({ salary: -50_000 }))).toBe(2000);
  });
  it("PB-11 high salary -> capped by the lower stated budget", () => {
    // 145k take-home 102,319/yr -> 8,527/mo; 30% at COL 100 = 2,558 > 2,000 stated.
    expect(affordableRent(C({ salary: 145_000, costOfLivingIndex: 100 }))).toBe(2000);
  });
  it("PB-12 low salary -> salary-derived ceiling below the stated budget wins", () => {
    // 30k take-home 24,589/yr -> 2,049.08/mo; 30% = 614.7 -> 615.
    expect(affordableRent(C({ salary: 30_000, costOfLivingIndex: 100 }))).toBe(615);
  });
});

describe("PT-L lease fit: listing window vs the intern's stay (flag tolerance 7 days)", () => {
  const cases: [string, Partial<ScoutListing>, ScoutResult["verdict"], string?][] = [
    ["PL-01 lease covers stay with margin", {}, "pass", "Covers your full internship"],
    ["PL-02 lease exactly equals stay", { lease_start: "2026-06-08", lease_end: "2026-08-14" }, "pass"],
    ["PL-03 starts 1 day late", { lease_start: "2026-06-09" }, "flag", "Misses 1 day of your stay"],
    ["PL-04 starts 7 days late (flag edge)", { lease_start: "2026-06-15" }, "flag", "Misses 7 days of your stay"],
    ["PL-05 starts 8 days late (fail edge)", { lease_start: "2026-06-16" }, "fail", "Gap of 8 days vs your stay"],
    ["PL-06 ends 7 days early", { lease_end: "2026-08-07" }, "flag"],
    ["PL-07 ends 8 days early", { lease_end: "2026-08-06" }, "fail"],
    ["PL-08 both ends short, total 7", { lease_start: "2026-06-11", lease_end: "2026-08-10" }, "flag"],
    ["PL-09 both ends short, total 8", { lease_start: "2026-06-12", lease_end: "2026-08-10" }, "fail"],
    ["PL-10 lease entirely before stay", { lease_start: "2026-01-01", lease_end: "2026-03-01" }, "fail"],
    ["PL-11 lease start missing", { lease_start: null }, "fail", "Lease dates unknown"],
    ["PL-12 lease end missing", { lease_end: null }, "fail", "Lease dates unknown"],
  ];
  for (const [name, o, verdict, value] of cases) {
    it(name, () => {
      const r = leaseScout(L(o), stay);
      expect(r.verdict).toBe(verdict);
      if (value) expect(r.value).toBe(value);
    });
  }

  it("PL-13 malformed listing date (invalid class) -> fail without a NaN in the user-facing text", () => {
    const r = leaseScout(L({ lease_start: "2026-13-40" }), stay);
    expect(r.verdict).toBe("fail");
    expect(r.value).not.toMatch(/NaN/);
  });

  it("PL-14 malformed stay date (invalid class) -> fail without a NaN in the user-facing text", () => {
    const r = leaseScout(base, C({ moveIn: "June 8" }));
    expect(r.verdict).toBe("fail");
    expect(r.value).not.toMatch(/NaN/);
  });

  it("PL-15 inverted stay (moveOut before moveIn, invalid class) must not report full coverage", () => {
    const r = leaseScout(L({ lease_start: "2026-07-01", lease_end: "2026-07-15" }), C({ moveIn: "2026-08-01", moveOut: "2026-06-01" }));
    expect(r.verdict).not.toBe("pass");
  });
});

describe("PT-R routine fit: walking minutes to the nearest anchor (pass <=10, flag <=20)", () => {
  const M_PER_DEG_LAT = (Math.PI / 180) * 6_371_000;
  const anchorAt = (minutes: number) => [{ label: "coffee", lat: 47.6 + (minutes * 80) / M_PER_DEG_LAT, lng: -122.33 }];
  const cases: [string, number, ScoutResult["verdict"]][] = [
    ["PR-01 same spot (0 min)", 0, "pass"],
    ["PR-02 10 min (pass edge)", 10, "pass"],
    ["PR-03 11 min (flag edge)", 11, "flag"],
    ["PR-04 20 min (flag upper edge)", 20, "flag"],
    ["PR-05 21 min (fail edge)", 21, "fail"],
    ["PR-06 60 min", 60, "fail"],
  ];
  for (const [name, minutes, verdict] of cases) {
    it(name, () => expect(routineScout(base, C({ routineAnchors: anchorAt(minutes) })).verdict).toBe(verdict));
  }
  it("PR-07 no anchors -> flag (data unavailable)", () => {
    expect(routineScout(base, C({ routineAnchors: [] })).value).toBe("Routine data unavailable");
  });
  it("PR-08 listing without coordinates -> flag (data unavailable)", () => {
    expect(routineScout(L({ lat: null }), C({ routineAnchors: anchorAt(1) })).verdict).toBe("flag");
  });
});

describe("PT-S safety flags", () => {
  it("PS-01 clean -> pass", () => expect(safetyScout(base).verdict).toBe("pass"));
  it("PS-02 advisory note only -> flag", () =>
    expect(safetyScout(L({ safety_flags: { scamSignals: [], notes: ["Ground floor"] } })).verdict).toBe("flag"));
  it("PS-03 one scam signal -> fail", () =>
    expect(safetyScout(L({ safety_flags: { scamSignals: ["wire transfer"], notes: [] } })).verdict).toBe("fail"));
  it("PS-04 scam signal and note -> fail (scam dominates)", () =>
    expect(safetyScout(L({ safety_flags: { scamSignals: ["x"], notes: ["y"] } })).value).toBe("Scam signal: x"));
  it("PS-05 flags object missing (null from DB) -> pass", () =>
    expect(safetyScout(L({ safety_flags: null as never })).verdict).toBe("pass"));
  it("PS-06 partial flags object (no scamSignals key) -> uses notes", () =>
    expect(safetyScout(L({ safety_flags: { notes: ["n"] } as never })).verdict).toBe("flag"));
});

describe("PT-A overall roll-up (combinations across the four dimensions)", () => {
  const r = (v: ScoutResult["verdict"]): ScoutResult => ({ check: "budget", verdict: v, value: "" });
  it("PA-01 all pass", () => expect(aggregate([r("pass"), r("pass"), r("pass"), r("pass")]).overall).toBe("pass"));
  it("PA-02 one flag", () => expect(aggregate([r("pass"), r("flag"), r("pass"), r("pass")]).overall).toBe("flag"));
  it("PA-03 one fail among flags", () => expect(aggregate([r("flag"), r("fail"), r("flag"), r("pass")]).overall).toBe("fail"));
  it("PA-04 counts passed checks", () => expect(aggregate([r("pass"), r("fail"), r("pass"), r("flag")]).passedChecks).toBe(2));
});
