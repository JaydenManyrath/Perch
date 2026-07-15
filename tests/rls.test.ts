/**
 * RLS adversarial tests (B2) — the single most security-critical work in the app.
 * Proves participant-locked DMs and owner-only writes at the DATABASE level.
 *
 * Requires a real Postgres (RLS can't be exercised in-process). Opt in with:
 *   RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm test
 * (e.g. against `supabase start`'s local db). Excluded from the default run.
 *
 * It self-bootstraps a minimal Supabase-compatible auth shim (auth.uid(), roles),
 * applies migrations 0001–0004, seeds via the superuser (bypasses RLS), then runs
 * every query as `authenticated` with a per-user JWT claim — so RLS is the only thing
 * deciding access, exactly as in production.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DB_URL = process.env.RLS_TEST_DATABASE_URL;
const MIG = join(process.cwd(), "supabase", "migrations");

// Deterministic uuids for the fixture users.
const U1 = "11111111-1111-5111-8111-111111111111";
const U2 = "22222222-2222-5222-8222-222222222222";
const U3 = "33333333-3333-5333-8333-333333333333";
const CONV_13 = "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa"; // conversation between U1 and U3

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
end $$;
grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;
`;

const client = () => new Client({ connectionString: DB_URL });

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

const suite = process.env.RUN_RLS_TESTS && DB_URL ? describe : describe.skip;

suite("RLS participant-lock + ownership (requires Postgres)", () => {
  let c: Client;

  beforeAll(async () => {
    c = client();
    await c.connect();
    await c.query(BOOTSTRAP);
    for (const f of ["0001_core_tables.sql", "0002_indexes.sql", "0003_rls_enable_and_deny.sql", "0004_rls_policies.sql"]) {
      await c.query(readFileSync(join(MIG, f), "utf8"));
    }
    // Grant table privileges so RLS (not GRANTs) is the boundary being tested.
    await c.query("grant select, insert, update, delete on all tables in schema public to authenticated");
    await c.query("grant execute on all functions in schema public to authenticated");

    // Seed as superuser (bypasses RLS).
    for (const id of [U1, U2, U3]) {
      await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);
      await c.query("insert into public.users(id, name) values ($1,$2) on conflict do nothing", [id, `User ${id.slice(0, 4)}`]);
    }
    await c.query(
      "insert into public.conversations(id, participant_ids) values ($1, $2) on conflict do nothing",
      [CONV_13, [U1, U3]],
    );
    await c.query(
      "insert into public.messages(id, conversation_id, sender_id, recipient_id, body) values (gen_random_uuid(),$1,$2,$3,$4)",
      [CONV_13, U1, U3, "private between U1 and U3"],
    );
  });

  afterAll(async () => {
    await c?.query("delete from public.messages where conversation_id = $1", [CONV_13]).catch(() => {});
    await c?.query("delete from public.conversations where id = $1", [CONV_13]).catch(() => {});
    await c?.end();
  });

  it("U3 (a participant) CAN read the conversation's messages", async () => {
    const rows = await asUser(c, U3, () => c.query("select * from public.messages where conversation_id = $1", [CONV_13]));
    expect(rows.rowCount).toBe(1);
  });

  it("U2 (NOT a participant) reads ZERO of U1↔U3's messages", async () => {
    const rows = await asUser(c, U2, () => c.query("select * from public.messages where conversation_id = $1", [CONV_13]));
    expect(rows.rowCount).toBe(0); // zero rows — not filtered-but-present
  });

  it("U2 CANNOT read the U1↔U3 conversation row", async () => {
    const rows = await asUser(c, U2, () => c.query("select * from public.conversations where id = $1", [CONV_13]));
    expect(rows.rowCount).toBe(0);
  });

  it("U2 CANNOT insert a message into a conversation it isn't in", async () => {
    await expect(
      asUser(c, U2, () =>
        c.query(
          "insert into public.messages(id,conversation_id,sender_id,recipient_id,body) values (gen_random_uuid(),$1,$2,$3,$4)",
          [CONV_13, U2, U1, "intruder"],
        ),
      ),
    ).rejects.toThrow();
  });

  it("U1 (a participant) CAN insert into its own conversation", async () => {
    const res = await asUser(c, U1, () =>
      c.query(
        "insert into public.messages(id,conversation_id,sender_id,recipient_id,body) values (gen_random_uuid(),$1,$2,$3,$4) returning id",
        [CONV_13, U1, U3, "hello from U1"],
      ),
    );
    expect(res.rowCount).toBe(1);
  });

  it("a user cannot forge sender_id as someone else", async () => {
    await expect(
      asUser(c, U1, () =>
        c.query(
          "insert into public.messages(id,conversation_id,sender_id,recipient_id,body) values (gen_random_uuid(),$1,$2,$3,$4)",
          [CONV_13, U3, U1, "spoofed sender"], // sender_id=U3 but caller is U1
        ),
      ),
    ).rejects.toThrow();
  });

  it("stickers: a user can only write their own rows; the positive CHECK blocks bad categories", async () => {
    // U2 inserts its own positive sticker — allowed.
    const ok = await asUser(c, U2, () =>
      c.query("insert into public.stickers(id,lat,lng,category,created_by) values (gen_random_uuid(),1,1,'good_coffee',$1) returning id", [U2]),
    );
    expect(ok.rowCount).toBe(1);

    // U2 tries to insert a sticker owned by U1 — denied by RLS.
    await expect(
      asUser(c, U2, () =>
        c.query("insert into public.stickers(id,lat,lng,category,created_by) values (gen_random_uuid(),1,1,'good_coffee',$1)", [U1]),
      ),
    ).rejects.toThrow();

    // A non-positive category is rejected by the CHECK (as superuser, so RLS isn't the blocker).
    await expect(
      c.query("insert into public.stickers(id,lat,lng,category,created_by) values (gen_random_uuid(),1,1,'unsafe',$1)", [U2]),
    ).rejects.toThrow();
  });

  it("default-deny: an unauthenticated (anon) caller reads no users", async () => {
    await c.query("begin");
    await c.query("set local role anon");
    const rows = await c.query("select * from public.users");
    await c.query("rollback");
    expect(rows.rowCount).toBe(0);
  });
});
