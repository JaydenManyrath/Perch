import type { NegotiateStreamEvent } from "@/lib/contract";
import type { ScoutListing, ScoutConstraints } from "./types";
import { runScouts, aggregate } from "./scouts";
import { streamListingNarration } from "@/lib/llm/openai";

/**
 * DETERMINISTIC event builder for the negotiation hero (B10). Emits, per listing and
 * in the frozen contract §4.3 order:
 *   listing_start → 4× scout_verdict → listing_summary
 * then a single terminal `done`. No LLM, no I/O — pure and unit-tested. This is the
 * source of truth for the stream; narration is interleaved separately.
 */
export function deterministicEvents(
  listings: ScoutListing[],
  constraints: ScoutConstraints,
): NegotiateStreamEvent[] {
  const events: NegotiateStreamEvent[] = [];
  for (const listing of listings) {
    events.push({ type: "listing_start", listingId: listing.id, title: listing.title });
    const results = runScouts(listing, constraints);
    for (const r of results) {
      events.push({
        type: "scout_verdict",
        listingId: listing.id,
        check: r.check,
        verdict: r.verdict,
        value: r.value,
      });
    }
    const summary = aggregate(results);
    events.push({
      type: "listing_summary",
      listingId: listing.id,
      overall: summary.overall,
      passedChecks: summary.passedChecks,
      totalChecks: summary.totalChecks,
    });
  }
  events.push({ type: "done" });
  return events;
}

/**
 * Full stream (route use): for each listing emit deterministic verdicts, then stream
 * the LLM explanation_delta tokens (skipped entirely when the LLM is disabled), then
 * the deterministic summary. Ends with `done`. Verdicts/summaries are always the
 * deterministic ones above — narration can never change them.
 */
export async function* negotiationStream(
  listings: ScoutListing[],
  constraints: ScoutConstraints,
): AsyncGenerator<NegotiateStreamEvent> {
  for (const listing of listings) {
    yield { type: "listing_start", listingId: listing.id, title: listing.title };

    const results = runScouts(listing, constraints);
    for (const r of results) {
      yield {
        type: "scout_verdict",
        listingId: listing.id,
        check: r.check,
        verdict: r.verdict,
        value: r.value,
      };
    }

    const summary = aggregate(results);
    // Narration comes AFTER the verdicts and BEFORE the summary (contract ordering).
    for await (const textDelta of streamListingNarration(
      listing.title,
      summary.overall,
      results,
    )) {
      yield { type: "explanation_delta", listingId: listing.id, textDelta };
    }

    yield {
      type: "listing_summary",
      listingId: listing.id,
      overall: summary.overall,
      passedChecks: summary.passedChecks,
      totalChecks: summary.totalChecks,
    };
  }
  yield { type: "done" };
}

/** Serialize an event stream as NDJSON (one JSON object per line). */
export function toNdjsonStream(
  events: AsyncGenerator<NegotiateStreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await events.next();
      if (done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
    },
  });
}
