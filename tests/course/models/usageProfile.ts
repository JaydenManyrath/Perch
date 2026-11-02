/**
 * CS 7314 Markov-OP/UBST: projected usage profile over Perch's main screens.
 *
 * Perch has no production users, so this is a PROJECTED profile: the initial
 * transition probabilities encode the designed journey (onboarding first, then the
 * Flyway feed, Perches and booking as the core) and are team estimates to be refined
 * by the navigation-logging pilot. Each row sums to 1; EXIT is absorbing.
 * Documented in docs/testing/markov/usage-profile.md.
 */

export const SCREENS = [
  "START",
  "ONBOARDING",
  "FEED",
  "PERCHES",
  "LISTING",
  "BOOKING",
  "NEGOTIATE",
  "MAP",
  "CHIRPS",
  "NEST",
  "EXIT",
] as const;

export type Screen = (typeof SCREENS)[number];

/** Route each screen maps to in the app, for the scripted-browser executor. */
export const ROUTES: Record<Exclude<Screen, "START" | "EXIT">, string> = {
  ONBOARDING: "/onboarding",
  FEED: "/feed",
  PERCHES: "/stories",
  LISTING: "/stories (detail sheet)",
  BOOKING: "/stories (request/confirm)",
  NEGOTIATE: "/negotiate",
  MAP: "/map",
  CHIRPS: "/dms",
  NEST: "/profile/me",
};

type Row = Partial<Record<Screen, number>>;

/** P[from][to]. Version tag lets later pilot-refined profiles sit beside this one. */
export const PROFILE_VERSION = "projected-v1";

export const P: Record<Screen, Row> = {
  START: { ONBOARDING: 0.6, FEED: 0.4 }, // first-session users vs returning users
  ONBOARDING: { FEED: 0.85, EXIT: 0.15 }, // 15% abandon onboarding
  FEED: { PERCHES: 0.35, MAP: 0.15, CHIRPS: 0.15, NEST: 0.1, FEED: 0.1, EXIT: 0.15 },
  PERCHES: { LISTING: 0.45, PERCHES: 0.2, NEGOTIATE: 0.1, FEED: 0.1, EXIT: 0.15 },
  LISTING: { BOOKING: 0.3, PERCHES: 0.45, CHIRPS: 0.1, EXIT: 0.15 },
  BOOKING: { PERCHES: 0.3, CHIRPS: 0.25, NEST: 0.15, EXIT: 0.3 },
  NEGOTIATE: { LISTING: 0.4, PERCHES: 0.3, EXIT: 0.3 },
  MAP: { FEED: 0.35, PERCHES: 0.2, MAP: 0.15, EXIT: 0.3 },
  CHIRPS: { CHIRPS: 0.3, FEED: 0.25, NEST: 0.15, EXIT: 0.3 },
  NEST: { FEED: 0.35, PERCHES: 0.2, CHIRPS: 0.15, EXIT: 0.3 },
  EXIT: { EXIT: 1 },
};

/** Deterministic PRNG (mulberry32) so generated test suites are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function step(from: Screen, r: number, profile: Record<Screen, Row> = P): Screen {
  let acc = 0;
  const row = profile[from];
  for (const s of SCREENS) {
    acc += row[s] ?? 0;
    if (r < acc) return s;
  }
  return "EXIT";
}

/** One usage-based test case: a random walk START -> ... -> EXIT. */
export function walk(next: () => number, maxSteps = 40, profile: Record<Screen, Row> = P): Screen[] {
  const path: Screen[] = ["START"];
  while (path[path.length - 1] !== "EXIT" && path.length < maxSteps) {
    path.push(step(path[path.length - 1], next(), profile));
  }
  return path;
}

/**
 * Expected visits to each transient screen per session, from the fundamental matrix
 * N = (I - Q)^-1 of the absorbing chain (row START). Solved by Gauss-Jordan.
 */
export function expectedVisits(profile: Record<Screen, Row> = P): Record<Screen, number> {
  const transient = SCREENS.filter((s) => s !== "EXIT");
  const n = transient.length;
  const m = transient.map((from, i) =>
    transient
      .map((to, j) => (i === j ? 1 : 0) - (profile[from][to] ?? 0))
      .concat(transient.map((_, j) => (i === j ? 1 : 0))),
  );
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let k = 0; k < 2 * n; k++) m[c][k] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      for (let k = 0; k < 2 * n; k++) m[r][k] -= f * m[c][k];
    }
  }
  const startRow = m[transient.indexOf("START")].slice(n);
  const out = {} as Record<Screen, number>;
  transient.forEach((s, j) => (out[s] = startRow[j]));
  out.EXIT = 1;
  return out;
}
