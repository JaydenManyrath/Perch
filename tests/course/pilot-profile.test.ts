/**
 * CS 7314: checks for the usage-pilot logger mapping and the log -> profile conversion.
 */
import { describe, expect, it } from "vitest";
import { screenForPath } from "@/lib/pilot/navlog";
import { countTransitions, refineProfile, sessionsFromEvents } from "./models/pilotProfile";
import { SCREENS } from "./models/usageProfile";

describe("pilot logger route mapping", () => {
  it("PL-01 maps every app route to its Markov-OP screen", () => {
    expect(["/", "/onboarding", "/feed", "/stories", "/negotiate", "/map", "/dms/conv-x", "/profile/me", "/post"].map(screenForPath)).toEqual([
      "START", "ONBOARDING", "FEED", "PERCHES", "NEGOTIATE", "MAP", "CHIRPS", "NEST", "OTHER",
    ]);
  });
});

describe("pilot log -> sessions -> profile", () => {
  const t0 = Date.parse("2026-11-05T18:00:00Z");
  const ev = (sid: string, screen: string, min: number, path = screen) => ({ sid, screen, path, t: t0 + min * 60_000 });

  it("PL-02 splits sessions per tab and on 30-minute gaps, adding START and EXIT", () => {
    const s = sessionsFromEvents([
      ev("a", "FEED", 0), ev("a", "PERCHES", 1), ev("a", "FEED", 45), ev("b", "MAP", 2),
    ]);
    expect(s).toEqual([
      ["START", "FEED", "PERCHES", "EXIT"],
      ["START", "FEED", "EXIT"],
      ["START", "MAP", "EXIT"],
    ]);
  });

  it("PL-03 drops a duplicate event fired twice by one render, keeps real repeats", () => {
    const s = sessionsFromEvents([
      { sid: "a", screen: "CHIRPS", path: "/dms", t: t0 },
      { sid: "a", screen: "CHIRPS", path: "/dms", t: t0 + 100 },
      { sid: "a", screen: "CHIRPS", path: "/dms/conv-1", t: t0 + 5_000 },
    ]);
    expect(s).toEqual([["START", "CHIRPS", "CHIRPS", "EXIT"]]);
  });

  it("PL-04 refined rows are distributions and unseen links keep a prior share", () => {
    const counts = countTransitions([["START", "FEED", "EXIT"], ["START", "FEED", "PERCHES", "EXIT"]]);
    const { profile, unmodeled } = refineProfile(counts);
    for (const s of SCREENS) {
      expect(Object.values(profile[s]).reduce((a, b) => a! + b!, 0)).toBeCloseTo(1, 10);
    }
    expect(profile.START.ONBOARDING!).toBeGreaterThan(0); // never observed, still possible
    expect(profile.START.FEED!).toBeGreaterThan(0.4); // observed twice, pulled above the 0.40 prior
    expect(unmodeled).toEqual([]);
  });

  it("PL-05 reports an observed transition the projected model does not have", () => {
    const { unmodeled } = refineProfile(countTransitions([["START", "MAP", "EXIT"]]));
    expect(unmodeled).toContain("START->MAP");
  });
});
