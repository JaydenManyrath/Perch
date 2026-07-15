import type { ScoutListing, ScoutConstraints, ScoutResult } from "./types";
import { nearestAnchor } from "@/lib/places/distance";

const WALK_PASS_MIN = 10; // ≤ 10 min walk to nearest anchor = pass
const WALK_FLAG_MIN = 20; // ≤ 20 min = flag; beyond = fail

/**
 * Routine-fit scout — deterministic distance/ETA (plan §6.1), reusing the shared
 * `places/distance` math (same numbers as the life-map "4 min from your usual coffee
 * spot" beat). The LLM never computes the minutes.
 */
export function routineScout(
  listing: ScoutListing,
  constraints: ScoutConstraints,
): ScoutResult {
  const anchors = constraints.routineAnchors ?? [];
  if (listing.lat == null || listing.lng == null || anchors.length === 0) {
    return {
      check: "routine_fit",
      verdict: "flag",
      value: "Routine data unavailable",
    };
  }

  const near = nearestAnchor(
    { lat: listing.lat, lng: listing.lng },
    anchors,
  );
  if (!near) {
    return {
      check: "routine_fit",
      verdict: "flag",
      value: "Routine data unavailable",
    };
  }

  const { minutes, anchor } = near;
  let verdict: ScoutResult["verdict"];
  if (minutes <= WALK_PASS_MIN) verdict = "pass";
  else if (minutes <= WALK_FLAG_MIN) verdict = "flag";
  else verdict = "fail";

  return {
    check: "routine_fit",
    verdict,
    value: `${minutes} min from your ${anchor.label}`,
  };
}
