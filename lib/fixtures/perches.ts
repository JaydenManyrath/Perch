import type { PerchCard, PerchDeckResponse, ReviewSummary } from "@/lib/types/contract";
import { listingsFixture } from "./listings";
import { reviewsFixture } from "./reviews";
import { sublettersFixture } from "./users";

/** Compute a review summary for a subject (listing id or subletter id). */
function summarize(subjectType: "listing" | "subletter", subjectId: string): ReviewSummary {
  const rows = reviewsFixture.filter(
    (r) => r.subjectType === subjectType && r.subjectId === subjectId,
  );
  if (rows.length === 0) return { avgRating: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { avgRating: sum / rows.length, count: rows.length };
}

/** Build a PerchCard from a ListingRow. */
function toCard(l: (typeof listingsFixture)[number]): PerchCard {
  const host = sublettersFixture.find((s) => s.id === l.created_by) ?? null;
  return {
    ...l,
    status: l.status ?? "available",
    expiresAt: l.expires_at ?? null,
    lastConfirmedAt: l.last_confirmed_at ?? null,
    sourced: l.sourced ?? true,
    sourceName: l.source_name ?? "seed-adapter",
    reviewSummary: summarize("listing", l.id),
    host: host ? { id: host.id, name: host.name, avatarUrl: host.avatar_url } : null,
  };
}

/**
 * The perch deck: only FRESH listings (server-side filter mirrors this: status='available'
 * and not expired). Person B's /api/perches enforces this; the fixture mirrors it.
 * Round 2 (§11.3).
 */
export const perchDeckFixture: PerchDeckResponse = {
  deck: listingsFixture
    .filter((l) => (l.status ?? "available") === "available")
    .map(toCard),
};

/**
 * The saved tray - the right-swipes. Seeded with a couple of right-swipes so
 * the saved tab isn't empty on first load; the client can push more via right-swipe.
 */
export const savedPerchesFixture: PerchCard[] = [
  toCard(listingsFixture.find((l) => l.id === "L1")!),
  toCard(listingsFixture.find((l) => l.id === "L4")!),
];

/** Convenience: export the full mapping fn for other fixtures/getters. */
export { toCard as buildPerchCard };
