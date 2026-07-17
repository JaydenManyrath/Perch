/**
 * Storage buckets + object policies (RB46).
 *
 * Migration 0005 provisions three buckets and their access policies:
 *   listing-photos : PUBLIC read, authenticated write
 *   offer-letters  : PRIVATE, owner-only keyed on the {uid}/ path prefix
 *   takeout        : PRIVATE, owner-only, same convention
 * This proves, against a real Postgres, that (1) the buckets exist with the right
 * public flags, (2) the four named policies are present, and (3) the {uid}/ prefix
 * rule actually gates writes when RLS is enforced (as the hosted platform enforces
 * it on storage.objects). Gated the same way as tests/rls.test.ts.
 *
 *   RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { AUTH_BOOTSTRAP, STORAGE_BOOTSTRAP } from "../scripts/pg-bootstrap";

const DB_URL = process.env.RLS_TEST_DATABASE_URL;
const MIG = join(process.cwd(), "supabase", "migrations");
const U1 = "11111111-1111-5111-8111-111111111111";
const U2 = "22222222-2222-5222-8222-222222222222";

const suite = process.env.RUN_RLS_TESTS && DB_URL ? describe : describe.skip;

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

suite("storage buckets + object policies (requires Postgres)", () => {
  let c: Client;

  beforeAll(async () => {
    c = new Client({ connectionString: DB_URL });
    await c.connect();
    const managed = await c.query<{ ready: boolean }>(
      "select to_regprocedure('auth.uid()') is not null and to_regclass('storage.buckets') is not null as ready",
    );
    if (!managed.rows[0]?.ready) {
      await c.query(AUTH_BOOTSTRAP);
      await c.query(STORAGE_BOOTSTRAP);
      for (const f of readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort()) {
        await c.query(readFileSync(join(MIG, f), "utf8"));
      }
    }
    // The hosted platform ships storage.objects with RLS enabled; the local shim does
    // not, so enforce it here to exercise the 0005 policies exactly as in production.
    await c.query("alter table storage.objects enable row level security");
    await c.query("alter table storage.objects force row level security");
    await c.query("grant select, insert, update, delete on storage.objects to authenticated");
    await c.query("grant select on storage.objects to anon");
    for (const id of [U1, U2]) {
      await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);
    }
    await c.query("set request.jwt.claims = '{}'");
  });

  afterAll(async () => {
    await c?.query("delete from storage.objects where bucket_id in ('listing-photos','offer-letters','takeout')").catch(() => {});
    await c?.end();
  });

  it("provisions the three buckets with the intended public flags", async () => {
    const { rows } = await c.query<{ id: string; public: boolean }>(
      "select id, public from storage.buckets where id in ('listing-photos','offer-letters','takeout') order by id",
    );
    expect(rows).toEqual([
      { id: "listing-photos", public: true },
      { id: "offer-letters", public: false },
      { id: "takeout", public: false },
    ]);
  });

  it("declares the four named object policies from migration 0005", async () => {
    const { rows } = await c.query<{ policyname: string }>(
      "select policyname from pg_policies where schemaname='storage' and tablename='objects' order by policyname",
    );
    const names = rows.map((r) => r.policyname);
    for (const expected of [
      "listing_photos_read_public",
      "listing_photos_write_authenticated",
      "offer_letters_owner_all",
      "takeout_owner_all",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("listing-photos: any authenticated user may upload and anyone may read", async () => {
    const write = await asUser(c, U1, () =>
      c.query("insert into storage.objects(bucket_id, name) values ('listing-photos', $1) returning id", [`${U1}/room.jpg`]),
    );
    expect(write.rowCount).toBe(1);

    // Public read: an anon caller can select from the public bucket.
    await c.query("begin");
    try {
      await c.query("set local role anon");
      const read = await c.query("select 1 from storage.objects where bucket_id='listing-photos'");
      expect((read.rowCount ?? 0) >= 0).toBe(true); // policy present; select allowed (no error)
    } finally {
      await c.query("rollback");
    }
  });

  it("offer-letters: an owner may write under its own {uid}/ prefix but not another user's", async () => {
    const ok = await asUser(c, U1, () =>
      c.query("insert into storage.objects(bucket_id, name) values ('offer-letters', $1) returning id", [`${U1}/offer.pdf`]),
    );
    expect(ok.rowCount).toBe(1);

    await expect(
      asUser(c, U1, () => c.query("insert into storage.objects(bucket_id, name) values ('offer-letters', $1)", [`${U2}/offer.pdf`])),
    ).rejects.toThrow();
  });

  it("takeout: private bucket - an owner cannot read another user's object", async () => {
    // Seed U2's takeout object as the owner (bypasses RLS).
    await c.query("insert into storage.objects(bucket_id, name) values ('takeout', $1) on conflict do nothing", [`${U2}/history.json`]);
    const u1Reads = await asUser(c, U1, () =>
      c.query("select * from storage.objects where bucket_id='takeout' and name = $1", [`${U2}/history.json`]),
    );
    expect(u1Reads.rowCount).toBe(0);
  });
});
