import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FlockStepView, FlockCard } from "@/app/onboarding/_steps/FlockStep";
import {
  recommendedFlock,
  toFlockEntries,
  setFlockStatus,
  moveOverlapLabel,
  type FlockViewer,
} from "@/lib/onboarding/flock";
import { matchesFixture } from "@/lib/fixtures/matches";
import { meFixture } from "@/lib/fixtures/users";
import type { Match } from "@/lib/types/contract";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const viewer: FlockViewer = {
  company: meFixture.company, // Stripe
  city: meFixture.city, // Seattle
  moveInDate: meFixture.move_in_date, // 2026-06-08
};

function match(overrides: Partial<Match> & { id: string }): Match {
  return {
    user: {
      id: overrides.id,
      name: overrides.user?.name ?? "Test Intern",
      role: overrides.user?.role ?? "SWE Intern",
      city: overrides.user?.city ?? "Seattle",
      avatarUrl: overrides.user?.avatarUrl ?? null,
    },
    company: overrides.company ?? "Acme",
    moveWeek: overrides.moveWeek ?? "2026-06-08",
    banded: overrides.banded ?? false,
    tasteScore: overrides.tasteScore ?? 0.5,
    reasons: overrides.reasons ?? [],
  };
}

describe("recommendedFlock", () => {
  it("returns at most `limit` recommendations and never more than exist", () => {
    expect(recommendedFlock(matchesFixture.matches, viewer, 6)).toHaveLength(6);
    expect(recommendedFlock(matchesFixture.matches, viewer, 3)).toHaveLength(3);
    expect(recommendedFlock([], viewer, 6)).toEqual([]);
  });

  it("dedupes by user id (a person never appears twice)", () => {
    const recs = recommendedFlock(matchesFixture.matches, viewer, 20);
    const ids = recs.map((r) => r.user.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ranks same-company interns ahead of other-company ones", () => {
    const input = [
      match({ id: "other-1", company: "Meta", tasteScore: 0.99 }),
      match({ id: "same-1", company: viewer.company, tasteScore: 0.2 }),
    ];
    const recs = recommendedFlock(input, viewer, 6);
    expect(recs[0].user.id).toBe("same-1");
  });

  it("ranks same-city overlapping move-ins ahead of non-overlapping ones", () => {
    // Both default to Seattle (viewer.city); only the move week differs.
    const input = [
      match({ id: "far", company: "Meta", moveWeek: "2026-10-01" }),
      match({ id: "near", company: "Meta", moveWeek: "2026-06-08" }),
    ];
    const recs = recommendedFlock(input, viewer, 6);
    expect(recs[0].user.id).toBe("near");
  });

  it("preserves the matches' own ranking as the tiebreak", () => {
    const input = [
      match({ id: "a", company: viewer.company }),
      match({ id: "b", company: viewer.company }),
    ];
    const recs = recommendedFlock(input, viewer, 6);
    expect(recs.map((r) => r.user.id)).toEqual(["a", "b"]);
  });
});

describe("setFlockStatus (optimistic request wiring)", () => {
  it("flips only the targeted entry to pending", () => {
    const entries = toFlockEntries(recommendedFlock(matchesFixture.matches, viewer, 3));
    const targetId = entries[0].match.user.id;
    const next = setFlockStatus(entries, targetId, "pending");
    expect(next.find((e) => e.match.user.id === targetId)?.status).toBe("pending");
    expect(next.filter((e) => e.status === "pending")).toHaveLength(1);
    // The source array is not mutated.
    expect(entries.every((e) => e.status === "idle")).toBe(true);
  });
});

describe("moveOverlapLabel", () => {
  it("calls out the same move week", () => {
    expect(moveOverlapLabel(match({ id: "x", moveWeek: "2026-06-08" }), viewer)).toBe(
      "Moving the same week as you",
    );
  });
  it("calls out a nearby move week as overlapping", () => {
    expect(moveOverlapLabel(match({ id: "x", moveWeek: "2026-06-15" }), viewer)).toBe(
      "Moving around the same time as you",
    );
  });
});

describe("FlockStep rendering (RA51)", () => {
  it("renders a recommendation card with name, company, and an Add friend action", () => {
    const entries = toFlockEntries(recommendedFlock(matchesFixture.matches, viewer, 3));
    const html = renderToStaticMarkup(
      React.createElement(FlockCard, {
        entry: entries[0],
        viewer,
        onAdd: () => {},
      }),
    );
    expect(html).toContain(entries[0].match.user.name);
    expect(html).toContain("Add friend");
  });

  it("shows the pending 'Requested' state after an optimistic add", () => {
    const entries = setFlockStatus(
      toFlockEntries(recommendedFlock(matchesFixture.matches, viewer, 3)),
      matchesFixture.matches[0].user.id,
      "pending",
    );
    const entry = entries.find((e) => e.status === "pending")!;
    const html = renderToStaticMarkup(
      React.createElement(FlockCard, { entry, viewer, onAdd: () => {} }),
    );
    expect(html).toContain("Requested");
    expect(html).toContain("disabled");
  });

  it("renders the skip control so the step never blocks completion", () => {
    const entries = toFlockEntries(recommendedFlock(matchesFixture.matches, viewer, 3));
    const html = renderToStaticMarkup(
      React.createElement(FlockStepView, {
        entries,
        viewer,
        onAdd: () => {},
        onDone: () => {},
      }),
    );
    expect(html).toContain("find my flock later");
    expect(html).toContain("Continue");
    expect(html).toContain("Find your flock");
  });

  it("renders a recommended intern with a null avatar without a broken image", () => {
    const entry = {
      match: match({ id: "no-avatar", user: { name: "Noa Vale", avatarUrl: null } as Match["user"] }),
      status: "idle" as const,
    };
    const html = renderToStaticMarkup(
      React.createElement(FlockCard, { entry, viewer, onAdd: () => {} }),
    );
    expect(html).toContain("NV");
    expect(html).not.toContain("<img");
  });
});
