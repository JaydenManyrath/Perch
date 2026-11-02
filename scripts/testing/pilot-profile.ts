/**
 * CS 7314: build the pilot-refined Markov-OP from volunteer logs.
 *
 *   npx tsx scripts/testing/pilot-profile.ts out.json pilot-log-1.json [pilot-log-2.json ...]
 *
 * Each input is a file downloaded from /pilot. Writes the session count, transition
 * counts, the refined profile (version "pilot-v1") and any observed transitions the
 * projected model did not have. Feed the profile to markov-walk.ts with --profile.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { countTransitions, refineProfile, sessionsFromEvents, type PilotEvent } from "../../tests/course/models/pilotProfile";

const [out, ...files] = process.argv.slice(2);
if (!out || files.length === 0) {
  console.error("usage: pilot-profile.ts out.json log1.json [log2.json ...]");
  process.exit(1);
}
const events: PilotEvent[] = files.flatMap((f, k) =>
  (JSON.parse(readFileSync(f, "utf8")).events as PilotEvent[]).map((e) => ({ ...e, sid: `${k}:${e.sid}` })),
);
const sessions = sessionsFromEvents(events);
const counts = countTransitions(sessions);
const { profile, unmodeled } = refineProfile(counts);
writeFileSync(out, JSON.stringify({ version: "pilot-v1", volunteers: files.length, sessions: sessions.length, counts, unmodeled, profile }, null, 2));
console.log(`${files.length} logs, ${sessions.length} sessions, ${unmodeled.length} unmodeled transitions -> ${out}`);
