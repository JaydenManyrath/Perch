import type { TasteProfile } from "@/lib/types/contract";

/**
 * Deterministic taste similarity. Pure function, stable, unit-tested. No LLM.
 * Jaccard-style overlap across genres (weighted) + artists, normalized to 0..1.
 */

const norm = (s: string): string => s.trim().toLowerCase();

function overlap(a: string[], b: string[]): { shared: string[]; ratio: number } {
  const setA = new Set(a.map(norm));
  const setB = new Set(b.map(norm));
  if (setA.size === 0 || setB.size === 0) return { shared: [], ratio: 0 };
  const shared: string[] = [];
  for (const x of setA) if (setB.has(x)) shared.push(x);
  const union = new Set([...setA, ...setB]);
  return { shared, ratio: shared.length / union.size };
}

const GENRE_WEIGHT = 0.7;
const ARTIST_WEIGHT = 0.3;

/**
 * Similarity in [0,1] between two taste profiles (genres weighted over artists).
 * A dimension only counts when BOTH profiles have data for it; the weights are then
 * renormalized over the present dimensions, so a user with no listed artists can
 * still reach 1.0 on genre overlap alone.
 */
export function tasteSimilarity(a: TasteProfile, b: TasteProfile): number {
  const genresPresent = (a.topGenres?.length ?? 0) > 0 && (b.topGenres?.length ?? 0) > 0;
  const artistsPresent = (a.topArtists?.length ?? 0) > 0 && (b.topArtists?.length ?? 0) > 0;

  let weighted = 0;
  let weightSum = 0;
  if (genresPresent) {
    weighted += GENRE_WEIGHT * overlap(a.topGenres!, b.topGenres!).ratio;
    weightSum += GENRE_WEIGHT;
  }
  if (artistsPresent) {
    weighted += ARTIST_WEIGHT * overlap(a.topArtists!, b.topArtists!).ratio;
    weightSum += ARTIST_WEIGHT;
  }
  if (weightSum === 0) return 0;
  return clamp01(round3(weighted / weightSum));
}

/** Shared genres between two profiles (for human-readable reasons), stable order. */
export function sharedGenres(a: TasteProfile, b: TasteProfile): string[] {
  return overlap(a.topGenres ?? [], b.topGenres ?? []).shared.sort();
}

/**
 * Similarity of a taste profile to a single event category (0..1). Deterministic:
 * direct genre membership, else token overlap on the category string.
 */
export function categoryAffinity(taste: TasteProfile, category: string): number {
  const genres = new Set((taste.topGenres ?? []).map(norm));
  const cat = norm(category);
  if (genres.has(cat)) return 1;
  const catTokens = cat.split(/[^a-z0-9]+/).filter(Boolean);
  let hits = 0;
  for (const t of catTokens) if (genres.has(t)) hits += 1;
  return catTokens.length === 0 ? 0 : round3(hits / catTokens.length);
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
