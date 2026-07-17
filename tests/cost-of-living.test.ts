import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  costOfLivingFor,
  NATIONAL_COL,
  resolveCostOfLiving,
} from "@/lib/finance/colLookup";

function mockCostOfLivingQuery(result: unknown, throws = false) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.ilike = vi.fn(() => q);
  q.maybeSingle = vi.fn(() => {
    if (throws) throw new Error("database unavailable");
    return Promise.resolve(result);
  });
  return q;
}

function mockSupabaseClient(result: unknown, throws = false): SupabaseClient {
  return {
    from: vi.fn(() => mockCostOfLivingQuery(result, throws)),
  } as unknown as SupabaseClient;
}

describe("costOfLivingFor", () => {
  it("returns the exact public result shape for bundled cities", () => {
    const result = costOfLivingFor("Seattle");
    expect(Object.keys(result).sort()).toEqual(["city", "index", "medianRent"]);
    expect(result).toEqual({ city: "Seattle", index: 152, medianRent: 2100 });
  });

  it("normalizes case, whitespace, trailing punctuation, and common city-state forms", () => {
    const variants = ["Seattle", " seattle ", "SEATTLE", "Seattle, WA", "Seattle.", "Seattle, Washington"];
    expect(variants.map((city) => costOfLivingFor(city))).toEqual(
      variants.map(() => ({ city: "Seattle", index: 152, medianRent: 2100 })),
    );
  });

  it("falls back nationally for empty and unknown cities without fuzzy matching", () => {
    expect(costOfLivingFor("")).toEqual(NATIONAL_COL);
    expect(costOfLivingFor("Seatttle")).toEqual(NATIONAL_COL);
    expect(costOfLivingFor("Austinville, TX")).toEqual(NATIONAL_COL);
  });

  it("returns stable no-key results across repeated calls", () => {
    expect(costOfLivingFor("Austin")).toEqual(costOfLivingFor(" Austin, TX "));
    expect(costOfLivingFor("Unknown")).toEqual(costOfLivingFor("Unknown"));
  });
});

describe("resolveCostOfLiving", () => {
  it("lets a valid persisted canonical row override the bundled city", async () => {
    await expect(
      resolveCostOfLiving(
        mockSupabaseClient({ data: { city: " Seattle, WA ", index: 160, median_rent: 2300 }, error: null }),
        "Seattle, WA",
      ),
    ).resolves.toEqual({ city: "Seattle", index: 160, medianRent: 2300 });
  });

  it("uses a valid persisted canonical row even when the city is not bundled", async () => {
    await expect(
      resolveCostOfLiving(
        mockSupabaseClient({ data: { city: "Boston", index: 149, median_rent: 2800 }, error: null }),
        " Boston, MA ",
      ),
    ).resolves.toEqual({ city: "Boston", index: 149, medianRent: 2800 });
  });

  it("falls back to the bundled city for missing rows, database errors, thrown failures, and malformed rows", async () => {
    await expect(resolveCostOfLiving(mockSupabaseClient({ data: null, error: null }), "Seattle, WA")).resolves.toEqual({
      city: "Seattle",
      index: 152,
      medianRent: 2100,
    });
    await expect(resolveCostOfLiving(mockSupabaseClient({ data: null, error: new Error("nope") }), "Seattle")).resolves.toEqual({
      city: "Seattle",
      index: 152,
      medianRent: 2100,
    });
    await expect(resolveCostOfLiving(mockSupabaseClient(null, true), "Seattle")).resolves.toEqual({
      city: "Seattle",
      index: 152,
      medianRent: 2100,
    });
    await expect(
      resolveCostOfLiving(
        mockSupabaseClient({ data: { city: "Seattle", index: "NaN", median_rent: -1 }, error: null }),
        "Seattle",
      ),
    ).resolves.toEqual({ city: "Seattle", index: 152, medianRent: 2100 });
  });
});
