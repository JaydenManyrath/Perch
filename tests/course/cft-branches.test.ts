/**
 * CS 7314 - CFT/WBT. Each `describe` targets one control flow graph documented in
 * docs/testing/cft/cfg.md; each case names the decision outcome (edge) it forces.
 * The goal is branch coverage of the error, fallback and expiry paths that the
 * black-box suites rarely reach, measured with `vitest --coverage`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planFreshness, runFreshnessPass, PING_WITHIN_DAYS } from "@/lib/sourcing/freshness";
import { performTransition, transitionBooking, BookingConflictError, BookingForbiddenError, BookingNotFoundError, BookingInputError } from "@/lib/bookings";
import { createFakeDb } from "./helpers/fakeSupabase";
import { INTERN_A, INTERN_B, LISTING, OWNER, seedTables } from "./helpers/bookingWorld";

const DAY = 86_400_000;
const NOW = Date.parse("2026-07-01T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("CFG-1 planFreshness (decisions D1 status, D2 expires_at, D3 NaN, D4 expired, D5 ping)", () => {
  const row = (o: Record<string, unknown>) => ({ id: "x", status: "available", sourced: false, expires_at: iso(NOW + 10 * DAY), ...o }) as never;
  it("CF-01 D1 false: non-available rows are never touched", () => {
    expect(planFreshness([row({ status: "taken", expires_at: iso(NOW - DAY) })], NOW)).toEqual({ expire: [], ping: [] });
  });
  it("CF-02 D2 false: null expiry is skipped", () => {
    expect(planFreshness([row({ expires_at: null })], NOW)).toEqual({ expire: [], ping: [] });
  });
  it("CF-03 D3 true: unparseable expiry is skipped, not expired", () => {
    expect(planFreshness([row({ expires_at: "not-a-date" })], NOW)).toEqual({ expire: [], ping: [] });
  });
  it("CF-04 D4 true: past expiry expires", () => {
    expect(planFreshness([row({ expires_at: iso(NOW - 1) })], NOW).expire).toEqual(["x"]);
  });
  it("CF-05 D4 boundary: now == expires_at is not yet expired", () => {
    expect(planFreshness([row({ expires_at: iso(NOW) })], NOW).expire).toEqual([]);
  });
  it("CF-06 D5 true: subletter row inside the ping window is pinged", () => {
    expect(planFreshness([row({ expires_at: iso(NOW + PING_WITHIN_DAYS * DAY) })], NOW).ping).toEqual(["x"]);
  });
  it("CF-07 D5 false (sourced): auto-sourced rows are never pinged", () => {
    expect(planFreshness([row({ sourced: true, expires_at: iso(NOW + DAY) })], NOW).ping).toEqual([]);
  });
  it("CF-08 D5 false (window): just outside the window is not pinged", () => {
    expect(planFreshness([row({ expires_at: iso(NOW + PING_WITHIN_DAYS * DAY + 1) })], NOW).ping).toEqual([]);
  });
});

describe("CFG-2 runFreshnessPass (read error, nothing to expire, update error, success)", () => {
  const listing = (o: Record<string, unknown>) => ({ ...seedTables(NOW).listings[0], ...o });
  it("CF-09 read error is surfaced", async () => {
    const db = createFakeDb({ listings: [] }, { failOn: (t, op) => (op === "select" ? { message: "boom" } : null) });
    await expect(runFreshnessPass(db.client as never, NOW)).rejects.toThrow("freshness read failed: boom");
  });
  it("CF-10 nothing expired -> no update issued", async () => {
    const db = createFakeDb({ listings: [listing({})] });
    expect(await runFreshnessPass(db.client as never, NOW)).toMatchObject({ expired: 0 });
    expect(db.calls.some((c) => c.op === "update")).toBe(false);
  });
  it("CF-11 update error is surfaced", async () => {
    const db = createFakeDb({ listings: [listing({ expires_at: iso(NOW - DAY) })] }, { failOn: (t, op) => (op === "update" ? { message: "denied" } : null) });
    await expect(runFreshnessPass(db.client as never, NOW)).rejects.toThrow("freshness expire failed: denied");
  });
  it("CF-12 expired available row flips to stale; taken row untouched", async () => {
    const db = createFakeDb({
      listings: [listing({ expires_at: iso(NOW - DAY) }), listing({ id: "t", status: "taken", expires_at: iso(NOW - DAY) })],
    });
    expect(await runFreshnessPass(db.client as never, NOW)).toMatchObject({ expired: 1 });
    expect(db.row("listings", LISTING)!.status).toBe("stale");
    expect(db.row("listings", "t")!.status).toBe("taken");
  });
});

describe("CFG-3 cron/expire-listings route (rate limit, auth, success, failure)", () => {
  const createAdminClient = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({ createAdminClient }));
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.doUnmock("@/lib/supabase/admin");
    vi.unstubAllEnvs();
  });
  const call = async (headers: Record<string, string>) => {
    const { POST } = await import("@/app/api/cron/expire-listings/route");
    return POST(new Request("http://t/api/cron/expire-listings", { method: "POST", headers }));
  };
  it("CF-13 auth false -> 403", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect((await call({ "x-forwarded-for": "1.1.1.1" })).status).toBe(403);
  });
  it("CF-14 auth true -> 200 with counts", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    createAdminClient.mockReturnValue(createFakeDb({ listings: [] }).client);
    const res = await call({ "x-forwarded-for": "1.1.1.2", authorization: "Bearer s3cret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ expired: 0, pinged: 0 });
  });
  it("CF-15 pass throws -> 500", async () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    createAdminClient.mockImplementation(() => {
      throw new Error("no service key");
    });
    expect((await call({ "x-forwarded-for": "1.1.1.3", authorization: "Bearer s3cret" })).status).toBe(500);
  });
  it("CF-16 rate limit exceeded -> 429", async () => {
    vi.stubEnv("RATE_LIMIT_MAX", "1");
    vi.stubEnv("CRON_SECRET", "s3cret");
    createAdminClient.mockReturnValue(createFakeDb({ listings: [] }).client);
    const h = { "x-forwarded-for": "9.9.9.9", authorization: "Bearer s3cret" };
    await call(h);
    expect((await call(h)).status).toBe(429);
  });
});

describe("CFG-4 transitionBooking (switch on action x role/status guards)", () => {
  it("CF-17 unknown action hits the default branch", () => {
    expect(() => transitionBooking("requested", "explode" as never, "owner")).toThrow(BookingInputError);
  });
  it("CF-18 decline by non-owner", () => {
    expect(() => transitionBooking("requested", "decline", "booker")).toThrow(BookingForbiddenError);
  });
  it("CF-19 cancel by non-booker", () => {
    expect(() => transitionBooking("approved", "cancel", "owner")).toThrow(BookingForbiddenError);
  });
  it("CF-20 cancel from a terminal status", () => {
    expect(() => transitionBooking("declined", "cancel", "booker")).toThrow(BookingConflictError);
  });
});

describe("CFG-5 performTransition (role resolution, persist, listing side effects)", () => {
  function world(status: string, extra: Record<string, unknown> = {}, opts = {}) {
    const t = seedTables();
    t.bookings.push({ id: "b1", listing_id: LISTING, booker_id: INTERN_A, roommate_ids: [INTERN_B], roommate_invites: [], status, created_at: iso(NOW), decided_at: null, ...extra });
    return createFakeDb(t, opts);
  }
  const run = (db: ReturnType<typeof createFakeDb>, caller: string, action: "approve" | "decline" | "confirm" | "cancel") =>
    performTransition(db.client as never, db.client as never, caller, "b1", action);

  it("CF-21 booking not found", async () => {
    const db = createFakeDb(seedTables());
    await expect(performTransition(db.client as never, db.client as never, OWNER, "nope", "approve")).rejects.toThrow(BookingNotFoundError);
  });
  it("CF-22 roommate role is resolved and rejected for confirm", async () => {
    await expect(run(world("approved"), INTERN_B, "confirm")).rejects.toThrow(BookingForbiddenError);
  });
  it("CF-23 invitee role is resolved and rejected for approve", async () => {
    const db = world("requested", { roommate_ids: [], roommate_invites: [INTERN_B] });
    await expect(run(db, INTERN_B, "approve")).rejects.toThrow(BookingForbiddenError);
  });
  it("CF-24 booking update error propagates", async () => {
    const db = world("requested", {}, { failOn: (t: string, op: string) => (t === "bookings" && op === "update" ? { message: "write failed" } : null) });
    await expect(run(db, OWNER, "approve")).rejects.toMatchObject({ message: "write failed" });
  });
  it("CF-25 listing 'taken' write error propagates after confirm", async () => {
    const db = world("approved", {}, { failOn: (t: string, op: string) => (t === "listings" && op === "update" ? { message: "listing write failed" } : null) });
    await expect(run(db, INTERN_A, "confirm")).rejects.toMatchObject({ message: "listing write failed" });
  });
  it("CF-26 cancel of a non-booked hold does NOT touch the listing (release branch false)", async () => {
    const db = world("requested");
    await run(db, INTERN_A, "cancel");
    expect(db.calls.filter((c) => c.table === "listings" && c.op === "update")).toHaveLength(0);
  });
  it("CF-27 cancel of a booked stay releases the listing (release branch true)", async () => {
    const db = world("booked");
    db.row("listings", LISTING)!.status = "taken";
    await run(db, INTERN_A, "cancel");
    expect(db.row("listings", LISTING)!.status).toBe("available");
  });
});
