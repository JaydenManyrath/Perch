import type { Match } from "@/lib/types/contract";

/**
 * Pure recommendation + request-state logic for the "find your flock" onboarding
 * step (RA51). Kept framework-free so it is unit-testable in the node test env
 * (the step component only renders what these functions decide).
 */

export type FlockViewer = {
  company: string;
  city: string;
  moveInDate: string; // ISO date (users.move_in_date)
};

export type FlockRequestStatus = "idle" | "pending";

export type FlockEntry = {
  match: Match;
  status: FlockRequestStatus;
};

/** Move-in windows this many days apart still count as overlapping. */
export const MOVE_OVERLAP_DAYS = 14;

function daysApart(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / (1000 * 60 * 60 * 24);
}

function priority(match: Match, viewer: FlockViewer): { sameCompany: number; cityOverlap: number } {
  const sameCompany = match.company === viewer.company ? 1 : 0;
  const sameCity = match.user.city === viewer.city;
  const cityOverlap =
    sameCity && daysApart(match.moveWeek, viewer.moveInDate) <= MOVE_OVERLAP_DAYS ? 1 : 0;
  return { sameCompany, cityOverlap };
}

/**
 * Pick the interns to recommend, reusing the already-ranked matches. Priority:
 * same company first, then same city with an overlapping move-in window, then the
 * matches' own taste ranking (preserved as the stable tiebreak). Dedupes by user
 * id so a person can never appear twice. Returns 0..limit entries (the caller
 * shows 3-6); an empty matches list yields an empty list, never an error.
 */
export function recommendedFlock(matches: Match[], viewer: FlockViewer, limit = 6): Match[] {
  const seen = new Set<string>();
  const unique: Match[] = [];
  for (const match of matches) {
    if (seen.has(match.user.id)) continue;
    seen.add(match.user.id);
    unique.push(match);
  }
  return unique
    .map((match, index) => ({ match, index, ...priority(match, viewer) }))
    .sort(
      (a, b) =>
        b.sameCompany - a.sameCompany ||
        b.cityOverlap - a.cityOverlap ||
        a.index - b.index,
    )
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.match);
}

/** Wrap recommendations as idle request entries for the step's local state. */
export function toFlockEntries(matches: Match[]): FlockEntry[] {
  return matches.map((match) => ({ match, status: "idle" }));
}

/** Optimistic state update: flip one recommendation's request status. */
export function setFlockStatus(
  entries: FlockEntry[],
  userId: string,
  status: FlockRequestStatus,
): FlockEntry[] {
  return entries.map((entry) =>
    entry.match.user.id === userId ? { ...entry, status } : entry,
  );
}

/** A short, plain move-in overlap line for a recommendation card. */
export function moveOverlapLabel(match: Match, viewer: FlockViewer): string {
  if (match.user.city !== viewer.city) return `Heading to ${match.user.city}`;
  const days = daysApart(match.moveWeek, viewer.moveInDate);
  if (days <= 3) return "Moving the same week as you";
  if (days <= MOVE_OVERLAP_DAYS) return "Moving around the same time as you";
  return `Also moving to ${match.user.city}`;
}
