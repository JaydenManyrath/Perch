/**
 * CS 7314 round 3 regression cases for the two defects left open at the progress
 * report: D07 (booker cancel had no route) and D14 (negotiate stay dates hard-coded),
 * plus D15 found by usage-based testing (negotiate scouts failed with no keys).
 */
import { describe, expect, it } from "vitest";
import { addDays, defaultStay } from "@/app/negotiate/_components/NegotiateClient";

describe("D14 negotiate stay dates come from the intern, not constants", () => {
  it("R3-01 the stay starts on the intern's move-in date", () => {
    expect(defaultStay("2026-06-15")).toEqual({ moveIn: "2026-06-15", moveOut: "2026-08-24" });
  });
  it("R3-02 a different intern gets a different stay", () => {
    expect(defaultStay("2026-05-26").moveIn).toBe("2026-05-26");
  });
  it("R3-03 a missing or malformed move-in date falls back to today", () => {
    const today = new Date("2026-11-10T12:00:00Z");
    expect(defaultStay(null, today).moveIn).toBe("2026-11-10");
    expect(defaultStay("June 8", today).moveIn).toBe("2026-11-10");
  });
  it("R3-04 addDays crosses month ends", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("D15 negotiate scouts work with no keys (fixture mode), found by UBST round 1", () => {
  it("R3-05 returns deterministic verdicts for fixture listings without a session", async () => {
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(
      new Request("http://localhost/api/negotiate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.9" },
        body: JSON.stringify({ listingIds: ["L1", "L3"], constraints: { monthlyBudget: 2000, moveIn: "2026-06-08", moveOut: "2026-08-17" } }),
      }),
    );
    expect(res.status).toBe(200);
    const events = (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as { type: string; listingId?: string });
    expect(events.filter((e) => e.type === "listing_summary").map((e) => e.listingId)).toEqual(["L1", "L3"]);
    expect(events[events.length - 1].type).toBe("done");
  });

  it("R3-06 still validates the request in fixture mode", async () => {
    const { POST } = await import("@/app/api/negotiate/route");
    const res = await POST(
      new Request("http://localhost/api/negotiate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "10.9.9.8" },
        body: JSON.stringify({ listingIds: ["L1"], constraints: { monthlyBudget: 2000, moveIn: "2026-08-17", moveOut: "2026-06-08" } }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
