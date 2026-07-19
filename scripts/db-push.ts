/**
 * Reproducible, idempotent migration applier (RB41).
 *
 * Applies every supabase/migrations/*.sql, in order, to a target Postgres over a
 * direct connection string. Works in BOTH modes:
 *   - LIVE:  point SUPABASE_DB_URL at the hosted project's direct Postgres URL.
 *            The managed `auth`/`storage` schemas already exist, so only the
 *            project migrations run.
 *   - LOCAL: point SUPABASE_DB_URL (or RLS_TEST_DATABASE_URL) at a throwaway
 *            Postgres. The Supabase-compatible shims (scripts/pg-bootstrap.ts)
 *            are applied first so the migrations have `auth.uid()`, the roles,
 *            and the storage schema to build on.
 *
 * Idempotent: each applied file is recorded in perch_meta.applied_migrations and
 * skipped on re-run, so a second `db:push` is a no-op. This is the direct-psql
 * path from the plan (option b); it needs no Supabase CLI or Docker.
 *
 *   SUPABASE_DB_URL=postgres://... npm run db:push
 *   npm run db:push:live            # requires a hosted SUPABASE_DB_URL (guarded)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { config } from "dotenv";
import { AUTH_BOOTSTRAP, STORAGE_BOOTSTRAP } from "./pg-bootstrap";

config({ path: ".env.local" });

const MIG = join(process.cwd(), "supabase", "migrations");
const REQUIRE_HOSTED = process.env.DB_PUSH_REQUIRE_HOSTED === "1";

function resolveDbUrl(): string {
  const url = process.env.SUPABASE_DB_URL || process.env.RLS_TEST_DATABASE_URL;
  if (!url) {
    console.error(
      "db:push - no database URL. Set SUPABASE_DB_URL to the target Postgres (hosted or local).\n" +
        "  LIVE:  SUPABASE_DB_URL=postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres npm run db:push:live\n" +
        "  LOCAL: SUPABASE_DB_URL=postgres://postgres:postgres@127.0.0.1:54322/postgres npm run db:push",
    );
    process.exit(1);
  }
  if (REQUIRE_HOSTED && !isHostedUrl(url)) {
    console.error(
      "db:push:live - refusing to run: SUPABASE_DB_URL does not look like a hosted Supabase project " +
        "(expected a *.supabase.co / *.supabase.com / pooler host). Set SUPABASE_DB_URL to the real project, " +
        "or use `npm run db:push` for a local target.",
    );
    process.exit(1);
  }
  return url;
}

function isHostedUrl(url: string): boolean {
  return /supabase\.(co|com|net)|pooler\.supabase/i.test(url);
}

function migrationFiles(): string[] {
  return readdirSync(MIG)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

async function isManaged(c: Client): Promise<boolean> {
  const { rows } = await c.query<{ ready: boolean }>(
    "select to_regprocedure('auth.uid()') is not null and to_regclass('storage.buckets') is not null as ready",
  );
  return Boolean(rows[0]?.ready);
}

async function ensureTracking(c: Client): Promise<void> {
  await c.query("create schema if not exists perch_meta");
  await c.query(
    "create table if not exists perch_meta.applied_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
}

async function appliedVersions(c: Client): Promise<Set<string>> {
  const { rows } = await c.query<{ version: string }>("select version from perch_meta.applied_migrations");
  return new Set(rows.map((r) => r.version));
}

async function verify(c: Client): Promise<void> {
  const tables = await c.query<{ n: string }>(
    "select count(*)::text as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')",
  );
  const funcs = await c.query<{ n: string }>(
    "select count(*)::text as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'",
  );
  const triggers = await c.query<{ n: string }>(
    "select count(*)::text as n from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal",
  );
  const unprotected = await c.query<{ table_name: string }>(
    "select c.relname as table_name from pg_class c join pg_namespace n on n.oid=c.relnamespace " +
      "where n.nspname='public' and c.relkind in ('r','p') and (not c.relrowsecurity or not c.relforcerowsecurity)",
  );
  const buckets = await c.query<{ id: string; public: boolean }>("select id, public from storage.buckets order by id");

  console.log(
    `verify: ${tables.rows[0].n} public tables, ${funcs.rows[0].n} functions, ${triggers.rows[0].n} triggers`,
  );
  console.log(
    "verify: storage buckets -> " +
      (buckets.rows.map((b) => `${b.id}(${b.public ? "public" : "private"})`).join(", ") || "NONE"),
  );
  const expectedBuckets = ["listing-photos", "offer-letters", "takeout"];
  const missingBuckets = expectedBuckets.filter((id) => !buckets.rows.some((b) => b.id === id));
  if (missingBuckets.length) throw new Error(`verify FAILED: missing storage buckets: ${missingBuckets.join(", ")}`);
  if (unprotected.rows.length) {
    throw new Error(`verify FAILED: public tables without forced RLS: ${unprotected.rows.map((r) => r.table_name).join(", ")}`);
  }
  console.log("verify: OK - every public table has forced RLS; all storage buckets present");
}

async function main(): Promise<void> {
  const url = resolveDbUrl();
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    const managed = await isManaged(c);
    console.log(`db:push - target ${isHostedUrl(url) ? "HOSTED" : "LOCAL"}; managed schemas ${managed ? "present" : "absent (applying shims)"}`);
    if (!managed) {
      await c.query(AUTH_BOOTSTRAP);
      await c.query(STORAGE_BOOTSTRAP);
    }
    await ensureTracking(c);
    const done = await appliedVersions(c);
    const files = migrationFiles();

    let applied = 0;
    let skipped = 0;
    for (const f of files) {
      if (done.has(f)) {
        skipped++;
        continue;
      }
      const sql = readFileSync(join(MIG, f), "utf8");
      await c.query("begin");
      try {
        await c.query(sql);
        await c.query("insert into perch_meta.applied_migrations(version) values ($1)", [f]);
        await c.query("commit");
        applied++;
        console.log(`applied ${f}`);
      } catch (err) {
        await c.query("rollback");
        throw new Error(`migration ${f} failed: ${(err as Error).message}`);
      }
    }
    console.log(`db:push - ${applied} applied, ${skipped} skipped (${files.length} total)`);
    await verify(c);
    console.log(applied === 0 ? "db:push - no-op (already up to date)" : "db:push - complete");
  } finally {
    await c.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
