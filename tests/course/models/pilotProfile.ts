/**
 * CS 7314 Markov-OP refinement: turn usage-pilot logs (lib/pilot/navlog.ts exports)
 * into transition counts and a refined profile.
 *
 * Sessions are split per browser tab and on gaps over 30 minutes; START is prepended
 * and EXIT appended to each. A transition the pilot never observed keeps a share of its
 * projected probability through pseudo-counts (the same imputation idea as HW3):
 *   p(i,j) = (n(i,j) + w * prior(i,j)) / (n(i) + w)
 */
import { P, SCREENS, type Screen } from "./usageProfile";

export type PilotEvent = { sid: string; screen: string; path?: string; t: number };

const GAP_MS = 30 * 60 * 1000;
const DUP_MS = 1000;

export function sessionsFromEvents(events: PilotEvent[]): Screen[][] {
  const bySid = new Map<string, PilotEvent[]>();
  for (const e of events) {
    if (!(SCREENS as readonly string[]).includes(e.screen) || e.screen === "EXIT") continue;
    const list = bySid.get(e.sid) ?? [];
    list.push(e);
    bySid.set(e.sid, list);
  }
  const sessions: Screen[][] = [];
  for (const list of bySid.values()) {
    list.sort((a, b) => a.t - b.t);
    let cur: PilotEvent[] = [];
    const flush = () => {
      if (cur.length === 0) return;
      const path: Screen[] = ["START"];
      for (const e of cur) {
        if (e.screen === "START") continue;
        path.push(e.screen as Screen);
      }
      path.push("EXIT");
      if (path.length > 2) sessions.push(path);
      cur = [];
    };
    for (const e of list) {
      const prev = cur[cur.length - 1];
      if (prev && e.t - prev.t > GAP_MS) flush();
      // Drop exact repeats a re-render can fire within a second.
      if (prev && prev.screen === e.screen && prev.path === e.path && e.t - prev.t < DUP_MS) continue;
      cur.push(e);
    }
    flush();
  }
  return sessions;
}

export type Counts = Record<string, Record<string, number>>;

export function countTransitions(sessions: Screen[][]): Counts {
  const n: Counts = {};
  for (const s of sessions) {
    for (let k = 1; k < s.length; k++) {
      n[s[k - 1]] ??= {};
      n[s[k - 1]][s[k]] = (n[s[k - 1]][s[k]] ?? 0) + 1;
    }
  }
  return n;
}

/** Refined profile; also reports observed transitions the projected model lacks. */
export function refineProfile(counts: Counts, weight = 5, prior: Record<Screen, Partial<Record<Screen, number>>> = P) {
  const profile = {} as Record<Screen, Partial<Record<Screen, number>>>;
  const unmodeled: string[] = [];
  for (const from of SCREENS) {
    const row = counts[from] ?? {};
    const ni = Object.values(row).reduce((a, b) => a + b, 0);
    const targets = new Set<string>([...Object.keys(prior[from]), ...Object.keys(row)]);
    const out: Partial<Record<Screen, number>> = {};
    for (const to of targets) {
      if (!(to in prior[from])) unmodeled.push(`${from}->${to}`);
      out[to as Screen] = ((row[to] ?? 0) + weight * (prior[from][to as Screen] ?? 0)) / (ni + weight);
    }
    const sum = Object.values(out).reduce((a, b) => a + (b ?? 0), 0);
    for (const k of Object.keys(out)) out[k as Screen] = (out[k as Screen] ?? 0) / sum;
    profile[from] = out;
  }
  return { profile, unmodeled };
}
