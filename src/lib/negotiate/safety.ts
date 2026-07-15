import type { ScoutListing, ScoutResult } from "./types";

/**
 * Safety scout — deterministic rule table over `listing.safety_flags` (plan §6.1).
 *   any scam signal        → fail
 *   soft/advisory note only → flag
 *   clean                   → pass
 * Positive-only framing: we never infer "avoid this area" from location (bias/harm
 * risk, CLAUDE.md §8). Verdicts come only from explicit flags on the listing itself.
 */
export function safetyScout(listing: ScoutListing): ScoutResult {
  const flags = listing.safety_flags ?? { scamSignals: [], notes: [] };
  const scamSignals = flags.scamSignals ?? [];
  const notes = flags.notes ?? [];

  if (scamSignals.length > 0) {
    return {
      check: "safety",
      verdict: "fail",
      value: `Scam signal: ${scamSignals[0]}`,
    };
  }
  if (notes.length > 0) {
    return {
      check: "safety",
      verdict: "flag",
      value: notes[0],
    };
  }
  return { check: "safety", verdict: "pass", value: "No safety flags" };
}
