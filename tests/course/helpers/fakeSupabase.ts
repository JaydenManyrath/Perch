/**
 * CS 7314 test harness: a tiny in-memory stand-in for the Supabase query builder.
 *
 * It supports exactly the chain shapes the booking and listing routes use
 * (select / eq / in / order / insert / update / maybeSingle / single / await), so the
 * FSM and CFT suites can drive the real route handlers end to end and then inspect
 * the resulting table state. RLS is not modeled; the unique partial index on live
 * booking holds IS modeled because the FSM "competing requesters" cases depend on it.
 */

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

type Filter = (row: Row) => boolean;

const LIVE_HOLDS = ["requested", "approved", "booked"];

let idCounter = 0;
export function fakeUuid(): string {
  idCounter += 1;
  const n = idCounter.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${n}`;
}

export type FakeDbOptions = {
  /** Enforce bookings_one_live_hold_per_listing (migration 0011). Default true. */
  uniqueLiveHold?: boolean;
  /** Hook to inject a failure for a given table/operation. */
  failOn?: (table: string, op: "select" | "insert" | "update") => { message: string; code?: string } | null;
};

export function createFakeDb(seed: Tables, options: FakeDbOptions = {}) {
  const tables: Tables = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((r) => ({ ...r }));
  const uniqueLiveHold = options.uniqueLiveHold ?? true;
  const calls: { table: string; op: string }[] = [];

  function builder(table: string) {
    const filters: Filter[] = [];
    let op: "select" | "insert" | "update" = "select";
    let patch: Row | null = null;
    let insertRows: Row[] = [];

    function fail() {
      return options.failOn?.(table, op) ?? null;
    }

    function execute(): { data: Row[] | null; error: { message: string; code?: string } | null } {
      calls.push({ table, op });
      const injected = fail();
      if (injected) return { data: null, error: injected };
      const rows = (tables[table] ??= []);
      if (op === "insert") {
        const created: Row[] = [];
        for (const r of insertRows) {
          const row: Row = { id: fakeUuid(), created_at: new Date().toISOString(), decided_at: null, ...r };
          if (
            uniqueLiveHold &&
            table === "bookings" &&
            LIVE_HOLDS.includes(row.status as string) &&
            rows.some((x) => x.listing_id === row.listing_id && LIVE_HOLDS.includes(x.status as string))
          ) {
            return {
              data: null,
              error: {
                code: "23505",
                message: 'duplicate key value violates unique constraint "bookings_one_live_hold_per_listing"',
              },
            };
          }
          rows.push(row);
          created.push({ ...row });
        }
        return { data: created, error: null };
      }
      const matched = rows.filter((r) => filters.every((f) => f(r)));
      if (op === "update" && patch) {
        for (const r of matched) Object.assign(r, patch);
      }
      return { data: matched.map((r) => ({ ...r })), error: null };
    }

    const q: Record<string, unknown> = {};
    q.select = () => q;
    q.order = () => q;
    q.eq = (col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return q;
    };
    q.in = (col: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[col]));
      return q;
    };
    q.update = (p: Row) => {
      op = "update";
      patch = p;
      return q;
    };
    q.insert = (r: Row | Row[]) => {
      op = "insert";
      insertRows = Array.isArray(r) ? r : [r];
      return q;
    };
    q.maybeSingle = () => {
      const { data, error } = execute();
      return Promise.resolve({ data: data?.[0] ?? null, error });
    };
    q.single = () => {
      const { data, error } = execute();
      if (error) return Promise.resolve({ data: null, error });
      if (!data || data.length !== 1) {
        return Promise.resolve({ data: null, error: { message: "expected exactly one row", code: "PGRST116" } });
      }
      return Promise.resolve({ data: data[0], error: null });
    };
    q.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(execute()).then(resolve, reject);
    return q;
  }

  return {
    client: { from: (table: string) => builder(table) },
    tables,
    calls,
    row(table: string, id: string): Row | undefined {
      return tables[table]?.find((r) => r.id === id);
    },
  };
}

export type FakeDb = ReturnType<typeof createFakeDb>;
