import type { FeedItem, TasteProfile } from "@/lib/contract";
import { categoryAffinity, clamp01, round3 } from "./taste";

export type EventRow = {
  id: string;
  title: string;
  category: string;
  lat: number | null;
  lng: number | null;
  datetime: string; // ISO
  source: string | null;
};

const TASTE_WEIGHT = 0.8;
const RECENCY_WEIGHT = 0.2;
const RECENCY_HALF_LIFE_DAYS = 21;

/** Recency score in [0,1]: upcoming-soon events score highest; past events decay. */
function recencyScore(datetimeIso: string, nowMs: number): number {
  const t = Date.parse(datetimeIso);
  if (Number.isNaN(t)) return 0;
  const days = Math.abs(t - nowMs) / 86_400_000;
  return round3(clamp01(Math.pow(0.5, days / RECENCY_HALF_LIFE_DAYS)));
}

/**
 * Deterministic feed ranking (B7). `tasteScore` is the taste affinity (0..1);
 * ordering combines taste + recency. Stable: tie-break by event id. The `reason`
 * here is a deterministic template — the route layers optional LLM polish on top.
 */
export function rankFeed(
  taste: TasteProfile,
  events: EventRow[],
  opts: { now?: number; limit?: number } = {},
): FeedItem[] {
  const now = opts.now ?? Date.now();

  const scored = events.map((event) => {
    const tasteScore = categoryAffinity(taste, event.category);
    const relevance =
      TASTE_WEIGHT * tasteScore + RECENCY_WEIGHT * recencyScore(event.datetime, now);
    return { event, tasteScore, relevance };
  });

  scored.sort((a, b) => {
    if (b.relevance !== a.relevance) return b.relevance - a.relevance;
    return a.event.id < b.event.id ? -1 : a.event.id > b.event.id ? 1 : 0;
  });

  const limited = opts.limit ? scored.slice(0, opts.limit) : scored;

  return limited.map(({ event, tasteScore }) => ({
    event: {
      id: event.id,
      title: event.title,
      category: event.category,
      lat: event.lat ?? 0,
      lng: event.lng ?? 0,
      datetime: event.datetime,
      source: event.source ?? "seed",
    },
    tasteScore,
    reason: deterministicFeedReason(taste, event.category, tasteScore),
  }));
}

export function deterministicFeedReason(
  taste: TasteProfile,
  category: string,
  tasteScore: number,
): string {
  if (tasteScore >= 0.75) return `Right in your ${category} wheelhouse`;
  if (tasteScore >= 0.4) return `Close to your ${category} taste`;
  const topGenre = (taste.topGenres ?? [])[0];
  return topGenre
    ? `A change of pace from your usual ${topGenre}`
    : `Popular with interns in your city`;
}
