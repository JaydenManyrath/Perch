/**
 * Live-style RLS acceptance demo (RB44).
 *
 * Runs the "log in as two seeded users, prove isolation" beat from the plan's
 * Definition of Done against a REAL database (LOCAL Postgres or a hosted project's
 * direct URL), using the data written by `npm run seed:local`. Each check runs a
 * query inside a transaction as `authenticated` with a per-user JWT `sub`, so RLS -
 * not GRANTs - decides access, exactly as in production.
 *
 * The comprehensive adversarial matrix lives in tests/rls.test.ts (28 cases). This
 * script is the human-readable demo artifact for the runbook.
 *
 *   SEED_DIRECT_DB_URL=postgres://postgres:postgres@127.0.0.1:54322/perch npm run rls:acceptance
 */
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { Client } from "pg";

config({ path: ".env.local" });

const DB_URL = process.env.SEED_DIRECT_DB_URL || process.env.SUPABASE_DB_URL || process.env.RLS_TEST_DATABASE_URL;
if (!DB_URL) {
  console.error("rls:acceptance - set SEED_DIRECT_DB_URL / SUPABASE_DB_URL / RLS_TEST_DATABASE_URL to the seeded database.");
  process.exit(1);
}

function uuid(name: string): string {
  const h = createHash("sha1").update(name).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const A = uuid("local-intern-0"); // participant / booker
const B = uuid("local-intern-2"); // stranger (not in the conversation, not the booker)
const CONV = uuid("local-conv-0-1");
const BOOKING = uuid("local-booking-0");

async function asUser<T>(c: Client, sub: string, fn: () => Promise<T>): Promise<T> {
  await c.query("begin");
  await c.query("set local role authenticated");
  await c.query(`set local request.jwt.claims = '${JSON.stringify({ sub, role: "authenticated" })}'`);
  try {
    return await fn();
  } finally {
    await c.query("rollback");
  }
}

let failures = 0;
function check(name: string, pass: boolean): void {
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  if (!pass) failures++;
}

async function main(): Promise<void> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    // Sanity: the seed must be present.
    const seeded = await c.query("select 1 from public.conversations where id=$1", [CONV]);
    if (seeded.rowCount === 0) {
      console.error("rls:acceptance - seed rows not found. Run `npm run seed:local` against this database first.");
      process.exit(1);
    }

    // Participant A can read the DM and its own booking.
    const aMsgs = await asUser(c, A, () => c.query("select * from public.messages where conversation_id=$1", [CONV]));
    check("participant A reads the private DM", (aMsgs.rowCount ?? 0) >= 1);
    const aBooking = await asUser(c, A, () => c.query("select * from public.bookings where id=$1", [BOOKING]));
    check("booker A reads its own booking", aBooking.rowCount === 1);

    // Stranger B is fully isolated (zero rows - filtered by RLS, not error).
    const bMsgs = await asUser(c, B, () => c.query("select * from public.messages where conversation_id=$1", [CONV]));
    check("stranger B reads ZERO of A's DMs", bMsgs.rowCount === 0);
    const bConv = await asUser(c, B, () => c.query("select * from public.conversations where id=$1", [CONV]));
    check("stranger B cannot see the conversation row", bConv.rowCount === 0);
    const bBooking = await asUser(c, B, () => c.query("select * from public.bookings where id=$1", [BOOKING]));
    check("stranger B reads ZERO of A's bookings", bBooking.rowCount === 0);

    // Stranger B cannot inject a message into A's conversation.
    let injectionBlocked = false;
    try {
      await asUser(c, B, () =>
        c.query("insert into public.messages(id,conversation_id,sender_id,recipient_id,body) values (gen_random_uuid(),$1,$2,$3,'intruder')", [
          CONV,
          B,
          A,
        ]),
      );
    } catch {
      injectionBlocked = true;
    }
    check("stranger B cannot inject a message into A's conversation", injectionBlocked);

    // Anonymous caller reads no users at all (default-deny). Ensure anon holds the
    // table SELECT grant (the hosted platform grants this by default) so RLS - not a
    // missing GRANT - is the boundary being demonstrated.
    await c.query("grant usage on schema public to anon");
    await c.query("grant select on all tables in schema public to anon");
    await c.query("begin");
    await c.query("set local role anon");
    const anon = await c.query("select * from public.users");
    await c.query("rollback");
    check("anonymous caller reads ZERO users (default-deny)", anon.rowCount === 0);

    console.log(failures === 0 ? "\nrls:acceptance - ALL CHECKS PASSED" : `\nrls:acceptance - ${failures} CHECK(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
