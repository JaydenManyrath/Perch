import { describe, it, expect } from "vitest";
import { deterministicEvents } from "@/lib/negotiate/stream";
import { rankSummaries } from "@/lib/negotiate/scouts";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";
import type { NegotiateStreamEvent, Verdict } from "@/lib/types/contract";

const constraints: ScoutConstraints = {
  monthlyBudget: 2000,
  moveIn: "2026-06-08",
  moveOut: "2026-08-14",
  routineAnchors: [{ label: "usual coffee spot", lat: 47.6150, lng: -122.3400 }],
};

// A clean pass, a budget fail, and a lease flag.
const listings: ScoutListing[] = [
  {
    id: "good",
    title: "Cozy Capitol Hill studio",
    price: 1800,
    lat: 47.6151,
    lng: -122.3401,
    lease_start: "2026-06-01",
    lease_end: "2026-08-31",
    safety_flags: { scamSignals: [], notes: [] },
  },
  {
    id: "pricey",
    title: "Luxury tower 2BR",
    price: 3200,
    lat: 47.6152,
    lng: -122.3402,
    lease_start: "2026-06-01",
    lease_end: "2026-08-31",
    safety_flags: { scamSignals: [], notes: [] },
  },
];

describe("deterministicEvents", () => {
  const events = deterministicEvents(listings, constraints);

  it("emits the frozen per-listing order: start → 4 verdicts → summary", () => {
    const good = events.filter(
      (e) => "listingId" in e && e.listingId === "good",
    ) as Extract<NegotiateStreamEvent, { listingId: string }>[];
    expect(good[0].type).toBe("listing_start");
    expect(good.slice(1, 5).map((e) => e.type)).toEqual([
      "scout_verdict",
      "scout_verdict",
      "scout_verdict",
      "scout_verdict",
    ]);
    expect(good[5].type).toBe("listing_summary");
  });

  it("emits the four checks in contract order", () => {
    const verdicts = events.filter(
      (e): e is Extract<NegotiateStreamEvent, { type: "scout_verdict" }> =>
        e.type === "scout_verdict" && e.listingId === "good",
    );
    expect(verdicts.map((v) => v.check)).toEqual([
      "budget",
      "safety",
      "lease_fit",
      "routine_fit",
    ]);
  });

  it("ends with exactly one terminal done", () => {
    expect(events.filter((e) => e.type === "done")).toHaveLength(1);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("gives the affordable listing overall=pass and the pricey one overall=fail", () => {
    const summaries = events.filter(
      (e): e is Extract<NegotiateStreamEvent, { type: "listing_summary" }> =>
        e.type === "listing_summary",
    );
    const good = summaries.find((s) => s.listingId === "good")!;
    const pricey = summaries.find((s) => s.listingId === "pricey")!;
    expect(good.overall).toBe("pass");
    expect(good.passedChecks).toBe(4);
    expect(pricey.overall).toBe("fail"); // 3200 blows the budget
  });

  it("contains NO prose (explanation_delta) — deterministic core only", () => {
    expect(events.some((e) => e.type === "explanation_delta")).toBe(false);
  });

  it("is fully deterministic", () => {
    expect(deterministicEvents(listings, constraints)).toEqual(
      deterministicEvents(listings, constraints),
    );
  });

  it("client-side ranking puts the pass ahead of the fail", () => {
    const summaries = events
      .filter(
        (e): e is Extract<NegotiateStreamEvent, { type: "listing_summary" }> =>
          e.type === "listing_summary",
      )
      .map((s) => ({
        listingId: s.listingId,
        overall: s.overall as Verdict,
        passedChecks: s.passedChecks,
        totalChecks: s.totalChecks,
      }));
    expect(rankSummaries(summaries).map((s) => s.listingId)).toEqual(["good", "pricey"]);
  });
});
