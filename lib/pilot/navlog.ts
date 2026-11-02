/**
 * Opt-in navigation logging for the CS 7314 usage pilot (Markov-OP refinement).
 *
 * Nothing is recorded unless the volunteer turns the pilot on at /pilot. Events stay in
 * this browser's localStorage (screen name + timestamp + a random per-tab session id,
 * no account or content data) until the volunteer downloads them from /pilot.
 * Screens use the Markov-OP state names in tests/course/models/usageProfile.ts.
 */

export const PILOT_FLAG = "perch.pilot";
export const PILOT_LOG = "perch.pilot.log";
const SESSION_KEY = "perch.pilot.sid";

export type PilotScreen =
  | "START"
  | "ONBOARDING"
  | "FEED"
  | "PERCHES"
  | "LISTING"
  | "BOOKING"
  | "NEGOTIATE"
  | "MAP"
  | "CHIRPS"
  | "NEST"
  | "OTHER";

export type PilotEvent = { sid: string; screen: PilotScreen; path: string; t: number };

/** Map a route to its Markov-OP screen. Overlays (LISTING, BOOKING) are logged directly. */
export function screenForPath(pathname: string): PilotScreen {
  if (pathname === "/") return "START";
  if (pathname.startsWith("/onboarding")) return "ONBOARDING";
  if (pathname.startsWith("/feed")) return "FEED";
  if (pathname.startsWith("/stories")) return "PERCHES";
  if (pathname.startsWith("/negotiate")) return "NEGOTIATE";
  if (pathname.startsWith("/map")) return "MAP";
  if (pathname.startsWith("/dms")) return "CHIRPS";
  if (pathname.startsWith("/profile")) return "NEST";
  return "OTHER";
}

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function pilotEnabled(): boolean {
  return store()?.getItem(PILOT_FLAG) === "on";
}

export function setPilotEnabled(on: boolean): void {
  const s = store();
  if (!s) return;
  if (on) s.setItem(PILOT_FLAG, "on");
  else s.removeItem(PILOT_FLAG);
}

function sessionId(): string {
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 10);
      window.sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "nosession";
  }
}

export function readPilotLog(): PilotEvent[] {
  try {
    const raw = store()?.getItem(PILOT_LOG);
    return raw ? (JSON.parse(raw) as PilotEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearPilotLog(): void {
  store()?.removeItem(PILOT_LOG);
}

/** Record one screen visit if (and only if) the pilot is on. */
export function logScreen(screen: PilotScreen, path = typeof window === "undefined" ? "" : window.location.pathname): void {
  if (!pilotEnabled()) return;
  try {
    const log = readPilotLog();
    log.push({ sid: sessionId(), screen, path, t: Date.now() });
    store()?.setItem(PILOT_LOG, JSON.stringify(log.slice(-5000)));
  } catch {
    // Storage full or blocked: the pilot simply records less.
  }
}
