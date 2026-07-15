/**
 * LIVE narration smoke test (B10) — verifies the real OpenAI streaming path, not the
 * deterministic fallback. Gated: runs only with LIVE_LLM=1 and a key present, so the
 * default `npm test` never spends money. Loads .env.local for the key.
 *
 *   LIVE_LLM=1 npx vitest run tests/live-narration.test.ts
 */
import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { negotiationStream } from "@/lib/negotiate/stream";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";
import type { NegotiateStreamEvent } from "@/lib/types/contract";

config({ path: ".env.local" });

const enabled = process.env.LIVE_LLM === "1" && !!process.env.OPENAI_API_KEY;
const maybe = enabled ? it : it.skip;

describe("live negotiation narration", () => {
  maybe("streams real LLM prose AFTER deterministic verdicts, never changing them", async () => {
    const listing: ScoutListing = {
      id: "live1",
      title: "Cozy Capitol Hill studio",
      price: 1800,
      lat: 47.6151,
      lng: -122.3401,
      lease_start: "2026-06-01",
      lease_end: "2026-08-31",
      safety_flags: { scamSignals: [], notes: [] },
    };
    const constraints: ScoutConstraints = {
      monthlyBudget: 2000,
      moveIn: "2026-06-08",
      moveOut: "2026-08-14",
      routineAnchors: [{ label: "usual coffee spot", lat: 47.615, lng: -122.34 }],
    };

    const events: NegotiateStreamEvent[] = [];
    for await (const ev of negotiationStream([listing], constraints)) events.push(ev);

    const verdicts = events.filter((e) => e.type === "scout_verdict");
    const prose = events.filter((e) => e.type === "explanation_delta");
    const summary = events.find((e) => e.type === "listing_summary");

    // Deterministic verdicts intact.
    expect(verdicts).toHaveLength(4);
    expect(summary && summary.type === "listing_summary" && summary.overall).toBe("pass");

    // Real prose arrived.
    const text = prose.map((p) => (p.type === "explanation_delta" ? p.textDelta : "")).join("");
    console.log("LLM narration:", text);
    expect(prose.length).toBeGreaterThan(0);
    expect(text.trim().length).toBeGreaterThan(0);

    // Ordering: all verdicts precede the first prose token (contract §4.3).
    const firstProse = events.findIndex((e) => e.type === "explanation_delta");
    const lastVerdict = events.map((e) => e.type).lastIndexOf("scout_verdict");
    expect(lastVerdict).toBeLessThan(firstProse);
  }, 30_000);
});
