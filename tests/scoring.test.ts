import { describe, it, expect } from "vitest";
import { tasteSimilarity, sharedGenres, categoryAffinity } from "@/lib/scoring/taste";
import { rankFeed, type EventRow } from "@/lib/scoring/feed";
import { rankMatches, mondayOf, type UserRow } from "@/lib/scoring/match";
import type { TasteProfile } from "@/lib/types/contract";

const taste = (genres: string[], artists: string[] = []): TasteProfile => ({
  topGenres: genres,
  topArtists: artists,
  topTracks: [],
});

describe("tasteSimilarity", () => {
  it("is 1 for identical genre+artist sets", () => {
    const t = taste(["indie", "techno"], ["Phoenix"]);
    expect(tasteSimilarity(t, t)).toBe(1);
  });
  it("is 0 for disjoint tastes", () => {
    expect(tasteSimilarity(taste(["indie"]), taste(["country"]))).toBe(0);
  });
  it("is between 0 and 1 for partial overlap and symmetric", () => {
    const a = taste(["indie", "techno", "jazz"]);
    const b = taste(["indie", "techno", "metal"]);
    const s = tasteSimilarity(a, b);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
    expect(tasteSimilarity(b, a)).toBe(s);
  });
  it("is case-insensitive", () => {
    expect(tasteSimilarity(taste(["Indie"]), taste(["indie"]))).toBe(1);
  });
});

describe("sharedGenres", () => {
  it("returns the intersection, sorted", () => {
    expect(sharedGenres(taste(["techno", "indie"]), taste(["indie", "techno", "jazz"]))).toEqual([
      "indie",
      "techno",
    ]);
  });
});

describe("categoryAffinity", () => {
  it("is 1 on direct genre membership", () => {
    expect(categoryAffinity(taste(["indie"]), "indie")).toBe(1);
  });
  it("scores token overlap for compound categories", () => {
    expect(categoryAffinity(taste(["live"]), "live music")).toBeGreaterThan(0);
  });
});

describe("rankFeed", () => {
  const now = Date.parse("2026-06-01T00:00:00Z");
  const events: EventRow[] = [
    { id: "e_country", title: "Country night", category: "country", lat: 0, lng: 0, datetime: "2026-06-03T00:00:00Z", source: "seed" },
    { id: "e_indie", title: "Indie show", category: "indie", lat: 0, lng: 0, datetime: "2026-06-03T00:00:00Z", source: "seed" },
  ];
  it("ranks the taste-matching event first", () => {
    const items = rankFeed(taste(["indie"]), events, { now });
    expect(items[0].event.id).toBe("e_indie");
    expect(items[0].tasteScore).toBe(1);
    expect(items[0].reason.length).toBeGreaterThan(0);
  });
  it("is deterministic and respects limit", () => {
    const a = rankFeed(taste(["indie"]), events, { now, limit: 1 });
    const b = rankFeed(taste(["indie"]), events, { now, limit: 1 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
  });
});

describe("mondayOf", () => {
  it("returns the Monday of the week (UTC)", () => {
    expect(mondayOf("2026-06-10")).toBe("2026-06-08"); // Wed → Mon
    expect(mondayOf("2026-06-08")).toBe("2026-06-08"); // Mon → Mon
    expect(mondayOf("2026-06-14")).toBe("2026-06-08"); // Sun → Mon
  });
});

describe("rankMatches", () => {
  const viewer: UserRow = {
    id: "u_me", name: "Me", role: "SWE", city: "Seattle", company: "Stripe",
    move_in_date: "2026-06-10", taste_profile: taste(["indie", "techno"]), verified: true, avatar_url: null,
  };
  const candidates: UserRow[] = [
    { id: "u_me", name: "Me", role: "SWE", city: "Seattle", company: "Stripe", move_in_date: "2026-06-10", taste_profile: taste(["indie"]), verified: true, avatar_url: null },
    { id: "u_a", name: "Ada", role: "SWE", city: "Seattle", company: "Stripe", move_in_date: "2026-06-09", taste_profile: taste(["indie", "techno"]), verified: true, avatar_url: null },
    { id: "u_b", name: "Ben", role: "PM", city: "Austin", company: "Meta", move_in_date: "2026-09-01", taste_profile: taste(["country"]), verified: false, avatar_url: null },
  ];
  it("excludes the viewer and ranks the strong cohort match first", () => {
    const matches = rankMatches(viewer, candidates);
    expect(matches.map((m) => m.user.id)).not.toContain("u_me");
    expect(matches[0].user.id).toBe("u_a");
  });
  it("produces the frozen Match shape with deterministic reasons", () => {
    const top = rankMatches(viewer, candidates)[0];
    expect(top).toMatchObject({
      company: "Stripe",
      banded: true,
      moveWeek: "2026-06-08",
    });
    expect(top.reasons).toContain("Same company");
    expect(top.reasons).toContain("Moving the same week");
    expect(typeof top.tasteScore).toBe("number");
  });
  it("is deterministic", () => {
    expect(rankMatches(viewer, candidates)).toEqual(rankMatches(viewer, candidates));
  });
});
