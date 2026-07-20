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
// Genre families so related genres score a partial affinity instead of a stark 0%.
// A folk night for an indie fan should read "close to your taste", not "0% match".
const FAMILY_GROUPS: Record<string, string[]> = {
  electronic: ["electronic", "techno", "house", "edm", "dance", "trance", "dubstep", "dnb", "drum and bass", "garage", "disco"],
  indie: ["indie", "alternative", "alt", "folk", "singer-songwriter", "acoustic", "rock", "punk", "live", "emo", "shoegaze", "indie pop"],
  urban: ["hip hop", "hip-hop", "rap", "r&b", "rnb", "soul", "trap", "funk"],
  pop: ["pop", "dance-pop", "synthpop"],
  roots: ["jazz", "blues", "classical", "lounge", "country", "americana", "bluegrass"],
};
const GENRE_FAMILY: Record<string, string> = {};
for (const [family, genres] of Object.entries(FAMILY_GROUPS)) {
  for (const g of genres) GENRE_FAMILY[g] = family;
}

/** Graded genre-to-genre affinity: same genre 1, same family ~0.55, else a small floor. */
function genreFamilyAffinity(a: string, b: string): number {
  if (a === b) return 1;
  const fa = GENRE_FAMILY[a];
  const fb = GENRE_FAMILY[b];
  if (fa && fb && fa === fb) return 0.55;
  return 0.2; // small nonzero floor so an off-taste event never reads as a stark 0%
}

/**
 * How well an event category fits a taste profile, as a graded 0..1 score (not binary).
 * Exact genre match -> 1; a compound category sharing a token (e.g. "live music") -> high;
 * otherwise the best genre-family affinity, so related genres score partially and
 * unrelated ones get a small floor rather than 0.
 */
export function categoryAffinity(taste: TasteProfile, category: string): number {
  const genres = (taste.topGenres ?? []).map(norm);
  if (genres.length === 0) return 0;
  const genreSet = new Set(genres);
  const cat = norm(category);

  if (genreSet.has(cat)) return 1;

  const catTokens = cat.split(/[^a-z0-9]+/).filter(Boolean);
  let tokenHits = 0;
  for (const t of catTokens) if (genreSet.has(t)) tokenHits += 1;
  if (tokenHits > 0 && catTokens.length > 0) {
    return round3(0.7 + 0.3 * (tokenHits / catTokens.length)); // 0.7..1.0
  }

  let best = 0;
  for (const g of genres) best = Math.max(best, genreFamilyAffinity(g, cat));
  return round3(best);
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
