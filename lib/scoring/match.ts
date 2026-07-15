import type { Match, TasteProfile } from "@/lib/types/contract";
import { tasteSimilarity, sharedGenres, clamp01, round3 } from "./taste";

export type UserRow = {
  id: string;
  name: string;
  role: string | null;
  city: string | null;
  company: string | null;
  move_in_date: string | null; // ISO date
  taste_profile: TasteProfile;
  verified: boolean;
  avatar_url: string | null;
};

const MS_PER_DAY = 86_400_000;

/**
 * ISO date of the Monday of the week containing `dateIso` (UTC). Drives `moveWeek`
 * and same-move-week cohort matching. Deterministic.
 */
export function mondayOf(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sun … 6 = Sat
  const deltaToMonday = (dow + 6) % 7; // days since Monday
  const monday = new Date(d.getTime() - deltaToMonday * MS_PER_DAY);
  return monday.toISOString().slice(0, 10);
}

const W_COMPANY = 0.35;
const W_MOVE_WEEK = 0.3;
const W_TASTE = 0.3;
const W_BANDED = 0.05;

/**
 * Deterministic peer-match ranking (B7/B11 — connection-hero back half). Returns the
 * FROZEN `Match` shape (contract §4.2). `reasons[]` are deterministic chips; the
 * route may append one LLM-polished sentence. Excludes the viewer. Stable ordering.
 */
export function rankMatches(
  viewer: UserRow,
  candidates: UserRow[],
  opts: { limit?: number } = {},
): Match[] {
  const viewerWeek = viewer.move_in_date ? mondayOf(viewer.move_in_date) : null;

  const scored = candidates
    .filter((c) => c.id !== viewer.id)
    .map((c) => {
      const sameCompany =
        !!viewer.company && !!c.company &&
        viewer.company.toLowerCase() === c.company.toLowerCase();
      const candWeek = c.move_in_date ? mondayOf(c.move_in_date) : null;
      const sameWeek = !!viewerWeek && !!candWeek && viewerWeek === candWeek;
      const taste = tasteSimilarity(viewer.taste_profile, c.taste_profile);

      const score =
        W_COMPANY * (sameCompany ? 1 : 0) +
        W_MOVE_WEEK * (sameWeek ? 1 : 0) +
        W_TASTE * taste +
        W_BANDED * (c.verified ? 1 : 0);

      const reasons: string[] = [];
      if (sameCompany) reasons.push("Same company");
      if (sameWeek) reasons.push("Moving the same week");
      const shared = sharedGenres(viewer.taste_profile, c.taste_profile);
      if (shared.length > 0) {
        reasons.push(`Shared taste: ${shared.slice(0, 3).join(", ")}`);
      }
      if (c.verified) reasons.push("Banded");
      if (reasons.length === 0 && c.city) reasons.push(`Also in ${c.city}`);

      const match: Match = {
        user: {
          id: c.id,
          name: c.name,
          role: c.role ?? "",
          city: c.city ?? "",
          avatarUrl: c.avatar_url,
        },
        company: c.company ?? "",
        moveWeek: candWeek ?? "",
        banded: c.verified,
        tasteScore: clamp01(round3(taste)),
        reasons,
      };
      return { match, score, id: c.id };
    });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const limited = opts.limit ? scored.slice(0, opts.limit) : scored;
  return limited.map((s) => s.match);
}
