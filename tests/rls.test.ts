/**
 * RLS adversarial tests (B2) - the single most security-critical work in the app.
 * Proves participant-locked DMs and owner-only writes at the DATABASE level.
 *
 * Requires a real Postgres (RLS can't be exercised in-process). Opt in with:
 *   RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL=postgres://postgres:postgres@localhost:54322/postgres npm test
 * (e.g. against `supabase start`'s local db). Excluded from the default run.
 *
 * On plain Postgres it self-bootstraps a minimal Supabase-compatible auth shim
 * and applies every SQL migration. On the local Supabase database it reuses the
 * managed auth/storage schemas and the migrations applied by `supabase db reset`.
 * It seeds through the database owner (bypasses RLS), then runs
 * every query as `authenticated` with a per-user JWT claim - so RLS is the only thing
 * deciding access, exactly as in production.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DB_URL = process.env.RLS_TEST_DATABASE_URL;
const MIG = join(process.cwd(), "supabase", "migrations");

// Deterministic uuids for the fixture users.
const U1 = "11111111-1111-5111-8111-111111111111";
const U2 = "22222222-2222-5222-8222-222222222222";
const U3 = "33333333-3333-5333-8333-333333333333";
const U4 = "44444444-4444-5444-8444-444444444444";
const CONV_13 = "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa"; // conversation between U1 and U3
const LISTING_U3 = "bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb";
const LISTING_SOURCED = "cccccccc-cccc-5ccc-8ccc-cccccccccccc";
const EVENT_1 = "dddddddd-dddd-5ddd-8ddd-dddddddddddd";
const LEGACY_NOTE_1 = "eeeeeeee-eeee-5eee-8eee-eeeeeeeeeeee";
const FRIENDSHIP_12 = "ffffffff-ffff-5fff-8fff-ffffffffffff";
const FRIENDSHIP_14 = "abababab-abab-5bab-8bab-abababababab";

const BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;
`;

const STORAGE_BOOTSTRAP = `
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb
);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select case
    when name is null or name = '' then array[]::text[]
    else (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
  end
$$;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on all tables in schema storage to authenticated;
`;

function migrationFiles(): string[] {
  return readdirSync(MIG)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

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

async function asUserCommitted<T>(c: Client, sub: string, fn: () => Promise<T>): Promise<T> {
  await c.query("begin");
  await c.query("set local role authenticated");
  await c.query(`set local request.jwt.claims = '${JSON.stringify({ sub, role: "authenticated" })}'`);
  try {
    const result = await fn();
    await c.query("commit");
    return result;
  } catch (error) {
    await c.query("rollback");
    throw error;
  }
}

const suite = process.env.RUN_RLS_TESTS && DB_URL ? describe : describe.skip;

suite("RLS participant-lock + ownership (requires Postgres)", () => {
  let c: Client;

  beforeAll(async () => {
    c = client();
    await c.connect();
    const managed = await c.query<{ ready: boolean }>(
      "select to_regclass('auth.users') is not null and to_regprocedure('auth.uid()') is not null as ready",
    );
    if (!managed.rows[0]?.ready) {
      await c.query(BOOTSTRAP);
      await c.query(STORAGE_BOOTSTRAP);
      for (const f of migrationFiles()) {
        await c.query(readFileSync(join(MIG, f), "utf8"));
      }
    }
    // Grant table privileges so RLS (not GRANTs) is the boundary being tested.
    await c.query("grant select, insert, update, delete on all tables in schema public to authenticated");
    await c.query("grant select on all tables in schema public to anon");
    await c.query("grant execute on all functions in schema public to authenticated");

    // Seed as the database owner (bypasses RLS).
    await c.query("delete from public.listings where source_name = 'adapter-x' and external_id = 'adapter-x-1'");
    for (const id of [U1, U2, U3, U4]) {
      await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);
      await c.query("insert into public.users(id, name) values ($1,$2) on conflict do nothing", [id, `User ${id.slice(0, 4)}`]);
    }
    await c.query("update public.users set user_type = 'subletter' where id = $1", [U3]);
    await c.query(
      `insert into public.listings (
        id, title, address, lat, lng, price, lease_start, lease_end, lease_type,
        created_by, status, expires_at, sourced, source_name
      ) values ($1, 'Subletter room', '1 Main St', 40, -73, 1800, current_date, current_date + 70, 'sublet',
        $2, 'available', now() + interval '7 days', false, 'subletter')
      on conflict do nothing`,
      [LISTING_U3, U3],
    );
    await c.query(
      `insert into public.listings (
        id, title, address, lat, lng, price, lease_start, lease_end, lease_type,
        created_by, status, expires_at, sourced, source_name, external_id
      ) values ($1, 'Sourced room', '2 Main St', 40.1, -73.1, 1700, current_date, current_date + 70, 'sublet',
        null, 'available', now() + interval '7 days', true, 'seed-adapter', 'seed-1')
      on conflict do nothing`,
      [LISTING_SOURCED],
    );
    await c.query(
      "insert into public.events(id,title,category,datetime,source) values ($1,'Demo show','music',now() + interval '3 days','seed') on conflict do nothing",
      [EVENT_1],
    );
    await c.query(
      "insert into public.conversations(id, participant_ids) values ($1, $2) on conflict do nothing",
      [CONV_13, [U1, U3]],
    );
    await c.query("delete from public.messages where conversation_id = $1", [CONV_13]);
    await c.query(
      "insert into public.messages(id, conversation_id, sender_id, recipient_id, body) values (gen_random_uuid(),$1,$2,$3,$4)",
      [CONV_13, U1, U3, "private between U1 and U3"],
    );
    await c.query(
      "insert into public.notes(id, city, topic, body, created_by) values ($1,'Seattle','Legacy tip','Keep the city value',$2) on conflict do nothing",
      [LEGACY_NOTE_1, U1],
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

  it("U2 (NOT a participant) reads ZERO of U1-to-U3's messages", async () => {
    const rows = await asUser(c, U2, () => c.query("select * from public.messages where conversation_id = $1", [CONV_13]));
    expect(rows.rowCount).toBe(0); // zero rows - not filtered-but-present
  });

  it("U2 CANNOT read the U1-to-U3 conversation row", async () => {
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
    // U2 inserts its own positive sticker - allowed.
    const ok = await asUser(c, U2, () =>
      c.query("insert into public.stickers(id,lat,lng,category,created_by) values (gen_random_uuid(),1,1,'good_coffee',$1) returning id", [U2]),
    );
    expect(ok.rowCount).toBe(1);

    // U2 tries to insert a sticker owned by U1 - denied by RLS.
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
    try {
      await c.query("set local role anon");
      const rows = await c.query("select * from public.users");
      expect(rows.rowCount).toBe(0);
    } finally {
      await c.query("rollback");
    }
  });

  it("users: authenticated callers cannot self-verify or change user_type", async () => {
    await expect(asUser(c, U1, () => c.query("update public.users set verified = true where id = $1", [U1]))).rejects.toThrow();
    await expect(asUser(c, U1, () => c.query("update public.users set user_type = 'subletter' where id = $1", [U1]))).rejects.toThrow();

    const ok = await asUser(c, U1, () => c.query("update public.users set city = 'Seattle' where id = $1 returning city", [U1]));
    expect(ok.rows[0].city).toBe("Seattle");
  });

  it("users: direct profile insertion cannot choose trusted fields", async () => {
    const id = "55555555-5555-5555-8555-555555555555";
    await c.query("insert into auth.users(id) values ($1) on conflict do nothing", [id]);

    await expect(
      asUser(c, id, () =>
        c.query("insert into public.users(id, name, user_type) values ($1, 'Forged subletter', 'subletter')", [id]),
      ),
    ).rejects.toThrow();
  });

  it("listings: only the owning subletter can edit user-authored listing content", async () => {
    await expect(
      asUser(c, U1, () =>
        c.query(
          `insert into public.listings(title, price, created_by, status, expires_at, sourced, source_name)
           values ('Intern forged listing', 1200, $1, 'available', now() + interval '7 days', false, 'subletter')`,
          [U1],
        ),
      ),
    ).rejects.toThrow();
    await expect(
      asUser(c, U3, () =>
        c.query(
          `insert into public.listings(title, price, created_by, status, expires_at, sourced, source_name)
           values ('Direct subletter listing', 1200, $1, 'available', now() + interval '30 days', false, 'subletter')`,
          [U3],
        ),
      ),
    ).rejects.toThrow();

    await expect(asUser(c, U2, () => c.query("update public.listings set title = 'Hijacked' where id = $1", [LISTING_U3]))).resolves.toMatchObject({
      rowCount: 0,
    });

    const ok = await asUser(c, U3, () => c.query("update public.listings set title = 'Updated room' where id = $1 returning title", [LISTING_U3]));
    expect(ok.rows[0].title).toBe("Updated room");
  });

  it("listings: direct authenticated writes cannot tamper with provenance or freshness", async () => {
    await expect(asUser(c, U3, () => c.query("update public.listings set status = 'taken' where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set expires_at = now() + interval '30 days' where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set sourced = true where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set created_by = $1 where id = $2", [U2, LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set external_id = 'forged' where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set source_name = 'forged' where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set source_url = 'https://example.test/forged' where id = $1", [LISTING_U3]))).rejects.toThrow();
    await expect(asUser(c, U3, () => c.query("update public.listings set last_confirmed_at = now() where id = $1", [LISTING_U3]))).rejects.toThrow();
  });

  it("service role can write trusted sourced listing and event integration columns", async () => {
    const listing = await c.query(
      `insert into public.listings (
        title, price, status, expires_at, sourced, source_name, external_id, created_by
      ) values ('Adapter listing', 1500, 'available', now() + interval '7 days', true, 'adapter-x', 'adapter-x-1', null)
      returning id, created_by, sourced`,
    );
    expect(listing.rows[0]).toMatchObject({ created_by: null, sourced: true });

    const event = await c.query(
      `insert into public.events(title, category, datetime, source, external_id, url, venue, image_url, price_range)
       values ('Ticketed show', 'music', now(), 'ticketmaster', 'tm-1', 'https://example.test', 'The Hall', 'https://example.test/img.jpg', '$20-$40')
       on conflict (source, external_id) where external_id is not null
       do update set venue = excluded.venue
       returning external_id, venue`,
    );
    expect(event.rows[0]).toMatchObject({ external_id: "tm-1", venue: "The Hall" });

    await c.query("delete from public.listings where id = $1", [listing.rows[0].id]);
  });

  it("listing_swipes: interns own their rows and subletters cannot forge intern ids", async () => {
    const ok = await asUser(c, U1, () =>
      c.query("insert into public.listing_swipes(user_id, listing_id, direction) values ($1,$2,'right') returning id", [U1, LISTING_U3]),
    );
    expect(ok.rowCount).toBe(1);

    await expect(
      asUser(c, U2, () => c.query("update public.listing_swipes set direction = 'left' where user_id = $1 and listing_id = $2", [U1, LISTING_U3])),
    ).resolves.toMatchObject({ rowCount: 0 });

    await expect(
      asUser(c, U3, () => c.query("insert into public.listing_swipes(user_id, listing_id, direction) values ($1,$2,'left')", [U1, LISTING_U3])),
    ).rejects.toThrow();

    await expect(c.query("insert into public.listing_swipes(user_id, listing_id, direction) values ($1,$2,'right')", [U3, LISTING_U3])).rejects.toThrow();
  });

  it("reviews: intern writes are scoped and subjects must match the declared type", async () => {
    const ok = await asUserCommitted(c, U1, () =>
      c.query("insert into public.reviews(subject_type, subject_id, reviewer_id, rating, body) values ('listing',$1,$2,5,'demo') returning id", [
        LISTING_U3,
        U1,
      ]),
    );
    expect(ok.rowCount).toBe(1);

    await expect(
      asUser(c, U1, () =>
        c.query("insert into public.reviews(subject_type, subject_id, reviewer_id, rating) values ('listing',gen_random_uuid(),$1,4)", [U1]),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(c, U1, () =>
        c.query(
          "insert into public.reviews(subject_type, subject_id, reviewer_id, rating) values ('listing',$1,gen_random_uuid(),4)",
          [LISTING_U3],
        ),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(c, U1, () => c.query("insert into public.reviews(subject_type, subject_id, reviewer_id, rating) values ('subletter',$1,$2,4)", [U2, U1])),
    ).rejects.toThrow();

    await expect(
      asUser(c, U3, () => c.query("insert into public.reviews(subject_type, subject_id, reviewer_id, rating) values ('listing',$1,$2,4)", [LISTING_U3, U1])),
    ).rejects.toThrow();

    await expect(c.query("insert into public.reviews(subject_type, subject_id, reviewer_id, rating) values ('listing',$1,$2,4)", [LISTING_U3, U3])).rejects.toThrow();

    await expect(
      asUser(c, U2, () => c.query("update public.reviews set rating = 1 where reviewer_id = $1 and subject_id = $2", [U1, LISTING_U3])),
    ).resolves.toMatchObject({ rowCount: 0 });

    await expect(
      asUser(c, U1, () => c.query("update public.reviews set reviewer_id = $1 where reviewer_id = $2 and subject_id = $3", [U2, U1, LISTING_U3])),
    ).rejects.toThrow();

    await c.query("delete from public.reviews where id = $1", [ok.rows[0].id]);
  });

  it("event_attendance: direct rows are private, while aggregate counts are available through the guarded function", async () => {
    await asUserCommitted(c, U1, () => c.query("insert into public.event_attendance(event_id, user_id) values ($1,$2)", [EVENT_1, U1]));
    await asUserCommitted(c, U2, () => c.query("insert into public.event_attendance(event_id, user_id) values ($1,$2)", [EVENT_1, U2]));

    const own = await asUser(c, U1, () => c.query("select * from public.event_attendance where event_id = $1", [EVENT_1]));
    expect(own.rowCount).toBe(1);
    expect(own.rows[0].user_id).toBe(U1);

    await expect(
      asUser(c, U3, () => c.query("insert into public.event_attendance(event_id, user_id) values ($1,$2)", [EVENT_1, U1])),
    ).rejects.toThrow();

    await expect(c.query("insert into public.event_attendance(event_id, user_id) values ($1,$2)", [EVENT_1, U3])).rejects.toThrow();

    const count = await asUser(c, U1, () => c.query("select public.event_attendance_count($1) as count", [EVENT_1]));
    expect(count.rows[0].count).toBe(2);

    await c.query("delete from public.event_attendance where event_id = $1", [EVENT_1]);
  });

  it("notes: existing legacy notes keep city while Map Comments require complete coordinates and Intern authors", async () => {
    const legacy = await c.query("select city, lat, lng from public.notes where id = $1", [LEGACY_NOTE_1]);
    expect(legacy.rows[0]).toMatchObject({ city: "Seattle", lat: null, lng: null });

    const mapComment = await asUser(c, U1, () =>
      c.query(
        "insert into public.notes(city, lat, lng, topic, body, created_by) values (null, 47.61, -122.33, 'coffee', 'Good tables', $1) returning id",
        [U1],
      ),
    );
    expect(mapComment.rowCount).toBe(1);

    await expect(
      asUser(c, U1, () =>
        c.query("insert into public.notes(city, lat, topic, body, created_by) values (null, 47.61, 'bad coords', 'missing lng', $1)", [U1]),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(c, U3, () =>
        c.query(
          "insert into public.notes(city, lat, lng, topic, body, created_by) values (null, 47.62, -122.34, 'subletter map', 'not allowed', $1)",
          [U3],
        ),
      ),
    ).rejects.toThrow();

    await expect(
      asUser(c, U3, () => c.query("update public.notes set lat = 47.6, lng = -122.3 where id = $1", [LEGACY_NOTE_1])),
    ).resolves.toMatchObject({ rowCount: 0 });
  });

  it("notes: a demoted Map Comment author cannot update or delete the located comment", async () => {
    const inserted = await asUserCommitted(c, U4, () =>
      c.query(
        "insert into public.notes(city, lat, lng, topic, body, created_by) values (null, 47.63, -122.31, 'coffee', 'before demotion', $1) returning id",
        [U4],
      ),
    );
    const noteId = inserted.rows[0].id;

    await c.query("update public.users set user_type = 'subletter' where id = $1", [U4]);
    try {
      await expect(
        asUser(c, U4, () => c.query("update public.notes set body = 'after demotion' where id = $1", [noteId])),
      ).resolves.toMatchObject({ rowCount: 0 });
      await expect(
        asUser(c, U4, () => c.query("delete from public.notes where id = $1", [noteId])),
      ).resolves.toMatchObject({ rowCount: 0 });
      const stillPresent = await c.query("select body from public.notes where id = $1", [noteId]);
      expect(stillPresent.rows[0].body).toBe("before demotion");
    } finally {
      await c.query("update public.users set user_type = 'intern' where id = $1", [U4]);
      await c.query("delete from public.notes where id = $1", [noteId]);
    }
  });

  it("event_comments: authenticated users can read comments, but only an Intern author can mutate their own", async () => {
    const allowedInsert = await asUser(c, U1, () =>
      c.query("insert into public.event_comments(event_id, author_id, body) values ($1,$2,'see you there') returning id", [EVENT_1, U1]),
    );
    expect(allowedInsert.rowCount).toBe(1);

    const inserted = await c.query("insert into public.event_comments(event_id, author_id, body) values ($1,$2,'see you there') returning id", [
      EVENT_1,
      U1,
    ]);
    expect(inserted.rowCount).toBe(1);
    const commentId = inserted.rows[0].id;

    const visible = await asUser(c, U2, () => c.query("select body from public.event_comments where id = $1", [commentId]));
    expect(visible.rowCount).toBe(1);

    await expect(
      asUser(c, U2, () => c.query("update public.event_comments set body = 'hijacked' where id = $1", [commentId])),
    ).resolves.toMatchObject({ rowCount: 0 });

    const updated = await asUser(c, U1, () => c.query("update public.event_comments set body = 'updated' where id = $1 returning body", [commentId]));
    expect(updated.rows[0].body).toBe("updated");

    await expect(
      asUser(c, U3, () => c.query("insert into public.event_comments(event_id, author_id, body) values ($1,$2,'subletter forged')", [EVENT_1, U3])),
    ).rejects.toThrow();

    await expect(
      asUser(c, U1, () => c.query("insert into public.event_comments(event_id, author_id, body) values (gen_random_uuid(),$1,'missing event')", [U1])),
    ).rejects.toThrow();
  });

  it("friendships: only Intern pairs are valid and each unordered pair has one canonical row", async () => {
    await c.query("delete from public.friendships where id = $1", [FRIENDSHIP_14]);

    const request = await asUser(c, U1, () =>
      c.query("insert into public.friendships(requester_id, addressee_id) values ($1,$2) returning id, status", [U1, U4]),
    );
    expect(request.rows[0].status).toBe("pending");

    await c.query(
      "insert into public.friendships(id, requester_id, addressee_id, status) values ($1,$2,$3,'pending')",
      [FRIENDSHIP_14, U1, U4],
    );

    await expect(
      asUser(c, U4, () => c.query("insert into public.friendships(requester_id, addressee_id) values ($1,$2)", [U4, U1])),
    ).rejects.toThrow();

    await expect(asUser(c, U1, () => c.query("insert into public.friendships(requester_id, addressee_id) values ($1,$1)", [U1]))).rejects.toThrow();

    await expect(
      asUser(c, U1, () => c.query("insert into public.friendships(requester_id, addressee_id) values ($1,$2)", [U1, U3])),
    ).rejects.toThrow();

    await expect(
      asUser(c, U3, () => c.query("insert into public.friendships(requester_id, addressee_id) values ($1,$2)", [U3, U1])),
    ).rejects.toThrow();
  });

  it("friendships: only participants can read and only the addressee can resolve a pending Friend Request", async () => {
    await c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]);
    await c.query(
      "insert into public.friendships(id, requester_id, addressee_id, status) values ($1,$2,$3,'pending')",
      [FRIENDSHIP_12, U1, U2],
    );

    const requesterRead = await asUser(c, U1, () => c.query("select * from public.friendships where id = $1", [FRIENDSHIP_12]));
    expect(requesterRead.rowCount).toBe(1);

    const addresseeRead = await asUser(c, U2, () => c.query("select * from public.friendships where id = $1", [FRIENDSHIP_12]));
    expect(addresseeRead.rowCount).toBe(1);

    const strangerRead = await asUser(c, U4, () => c.query("select * from public.friendships where id = $1", [FRIENDSHIP_12]));
    expect(strangerRead.rowCount).toBe(0);

    await expect(
      asUser(c, U1, () => c.query("update public.friendships set status = 'accepted' where id = $1", [FRIENDSHIP_12])),
    ).resolves.toMatchObject({ rowCount: 0 });

    await expect(asUser(c, U4, () => c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]))).resolves.toMatchObject({
      rowCount: 0,
    });

    const accepted = await asUserCommitted(c, U2, () =>
      c.query("update public.friendships set status = 'accepted' where id = $1 returning status", [FRIENDSHIP_12]),
    );
    expect(accepted.rows[0].status).toBe("accepted");

    await expect(asUser(c, U2, () => c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]))).resolves.toMatchObject({
      rowCount: 0,
    });

    await c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]);
    await c.query(
      "insert into public.friendships(id, requester_id, addressee_id, status) values ($1,$2,$3,'pending')",
      [FRIENDSHIP_12, U1, U2],
    );

    await expect(asUser(c, U1, () => c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]))).resolves.toMatchObject({
      rowCount: 0,
    });

    const deleted = await asUser(c, U2, () => c.query("delete from public.friendships where id = $1", [FRIENDSHIP_12]));
    expect(deleted.rowCount).toBe(1);
  });

  it("every public table has enabled and forced row-level security", async () => {
    const { rows } = await c.query<{ table_name: string; rls_enabled: boolean; rls_forced: boolean }>(`
      select
        c.relname as table_name,
        c.relrowsecurity as rls_enabled,
        c.relforcerowsecurity as rls_forced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind in ('r', 'p')
      order by c.relname
    `);

    const unprotected = rows.filter((row) => !row.rls_enabled || !row.rls_forced);

    expect(
      unprotected.map((row) => ({
        table: row.table_name,
        rlsEnabled: row.rls_enabled,
        rlsForced: row.rls_forced,
      })),
    ).toEqual([]);
  });
});
