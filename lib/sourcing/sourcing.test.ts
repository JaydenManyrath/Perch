import { describe, it, expect } from "vitest";
import { normalizeListing, safetyFlagsFromText, FRESH_DAYS } from "./normalize";
import { dedupe } from "./dedupe";
import { planIngest } from "./ingest";
import { makeSeedAdapter } from "./adapters/seedAdapter";
import type { RawListing, SourcedListingInsert } from "./types";

const NOW = Date.parse("2026-06-01T00:00:00Z");

const raw = (over: Partial<RawListing> = {}): RawListing => ({
  externalId: "x1",
  title: "Test sublet",
  address: "123 Demo St",
  price: 1500,
  lat: 47.61,
  lng: -122.33,
  leaseStart: "2026-06-01",
  leaseEnd: "2026-08-31",
  photos: [],
  ...over,
});

describe("normalizeListing", () => {
  it("maps every field onto B's listings columns", () => {
    const row = normalizeListing(raw(), "seed-adapter", { now: NOW })!;
    expect(row).toMatchObject({
      title: "Test sublet",
      address: "123 Demo St",
      lat: 47.61,
      lng: -122.33,
      price: 1500,
      lease_type: "sublet",
      sourced: true,
      source_name: "seed-adapter",
      external_id: "x1",
      status: "available",
      created_by: null,
    });
    // expires_at is now + FRESH_DAYS
    expect(row.expires_at).toBe(new Date(NOW + FRESH_DAYS * 86_400_000).toISOString());
  });

  it("skips a row with no external id or a non-positive price (returns null)", () => {
    expect(normalizeListing(raw({ externalId: "" }), "seed-adapter", { now: NOW })).toBeNull();
    expect(normalizeListing(raw({ price: 0 }), "seed-adapter", { now: NOW })).toBeNull();
  });

  it("falls back to city coords when the row carries none", () => {
    const row = normalizeListing(raw({ lat: undefined, lng: undefined }), "seed-adapter", { city: "Seattle", now: NOW });
    expect(row).not.toBeNull();
    expect(row!.lat).toBeCloseTo(47.6062, 3);
  });
});

describe("safetyFlagsFromText", () => {
  it("flags a wire-the-deposit scam signal", () => {
    const f = safetyFlagsFromText("Owner is abroad, wire the deposit, no viewing needed");
    expect(f.scamSignals.length).toBeGreaterThan(0);
  });
  it("flags advisory notes without calling them scams", () => {
    const f = safetyFlagsFromText("3rd floor walkup, no in-unit laundry");
    expect(f.scamSignals).toHaveLength(0);
    expect(f.notes.length).toBeGreaterThan(0);
  });
  it("is clean on ordinary text", () => {
    expect(safetyFlagsFromText("Bright studio near the park")).toEqual({ scamSignals: [], notes: [] });
  });
});

describe("dedupe", () => {
  const mk = (over: Partial<SourcedListingInsert>): SourcedListingInsert =>
    normalizeListing(raw(), "seed-adapter", { now: NOW })!;

  it("collapses exact (source_name, external_id) duplicates", () => {
    const a = mk({});
    expect(dedupe([a, { ...a }])).toHaveLength(1);
  });

  it("collapses fuzzy duplicates (same spot, price within 5%)", () => {
    const a = mk({});
    const b = { ...a, external_id: "x2", price: Math.round(a.price * 1.03) };
    expect(dedupe([a, b])).toHaveLength(1);
  });

  it("keeps genuinely different listings", () => {
    const a = mk({});
    const b = { ...a, external_id: "x2", lat: 47.70, lng: -122.40 };
    expect(dedupe([a, b])).toHaveLength(2);
  });
});

describe("planIngest (seed adapter)", () => {
  it("produces sourced rows with freshness fields", async () => {
    const rows = await planIngest([makeSeedAdapter()], { city: "Seattle", now: NOW });
    expect(rows.length).toBeGreaterThan(8);
    expect(rows.every((r) => r.sourced && r.status === "available" && r.source_name === "seed-adapter")).toBe(true);
  });

  it("is idempotent/deterministic - running twice yields identical rows", async () => {
    const a = await planIngest([makeSeedAdapter()], { city: "Seattle", now: NOW });
    const b = await planIngest([makeSeedAdapter()], { city: "Seattle", now: NOW });
    expect(a).toEqual(b);
  });

  it("carries the deterministic scam heuristic through to safety_flags", async () => {
    const rows = await planIngest([makeSeedAdapter()], { city: "Seattle", now: NOW });
    const scam = rows.find((r) => r.external_id === "scam-10");
    expect(scam!.safety_flags.scamSignals.length).toBeGreaterThan(0);
  });
});
