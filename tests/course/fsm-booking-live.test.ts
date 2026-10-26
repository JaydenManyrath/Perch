/**
 * CS 7314 - FSM/BBT, implementation under test #1: the LIVE API path.
 *
 * Every valid transition, every listed invalid (sneak-path) pair and every sequence
 * path from tests/course/models/bookingFsm.ts is driven through the real route
 * handlers (book, approve, decline, confirm, listing confirm/relist) and the freshness
 * pass, against an in-memory DB. The oracle is the model, not the code.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INVALID, PATHS, SETUP, VALID, type StateId } from "./models/bookingFsm";
import { BookingWorld, INTERN_A, INTERN_B, LISTING } from "./helpers/bookingWorld";

const h = vi.hoisted(() => ({ world: null as unknown as { caller: string; db: { client: unknown } } }));

vi.mock("@/lib/http", () => ({
  guard: vi.fn(async () => ({ callerId: h.world.caller, headers: {} })),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn(async () => h.world.db.client) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => h.world.db.client) }));

import { POST as book } from "@/app/api/listings/[id]/book/route";
import { POST as approve } from "@/app/api/bookings/[id]/approve/route";
import { POST as decline } from "@/app/api/bookings/[id]/decline/route";
import { POST as confirm } from "@/app/api/bookings/[id]/confirm/route";
import { POST as relist } from "@/app/api/listings/[id]/confirm/route";
import { bookingErrorStatus, performTransition } from "@/lib/bookings";
import { runFreshnessPass } from "@/lib/sourcing/freshness";
import type { FakeDb } from "./helpers/fakeSupabase";

const routes = {
  book,
  approve,
  decline,
  confirm,
  relist,
  async cancel(db: FakeDb, callerId: string, bookingId: string) {
    try {
      await performTransition(db.client as never, db.client as never, callerId, bookingId, "cancel");
      return 200;
    } catch (err) {
      return bookingErrorStatus(err)?.status ?? 500;
    }
  },
  expire: (db: FakeDb, now: number) => runFreshnessPass(db.client as never, now),
};

function newWorld(opts?: ConstructorParameters<typeof BookingWorld>[1]) {
  const w = new BookingWorld(routes as never, opts);
  h.world = w;
  return w;
}

async function driveTo(w: BookingWorld, s: StateId) {
  for (const e of SETUP[s]) {
    const status = await w.fire(e);
    expect(status, `setup event ${e} toward ${s}`).toBeLessThan(300);
  }
  expect(w.state()).toBe(s);
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("FSM booking model - live API path - valid transitions (transition coverage)", () => {
  for (const t of VALID) {
    it(`${t.id}: ${t.from} --${t.event}--> ${t.to}`, async () => {
      const w = newWorld();
      await driveTo(w, t.from);
      const status = await w.fire(t.event);
      expect(status).toBeLessThan(300);
      expect(w.state()).toBe(t.to);
    });
  }

  it("T05 side effect: confirming flips the listing to taken", async () => {
    const w = newWorld();
    await driveTo(w, "S3");
    expect(w.snapshot().listing.status).toBe("taken");
  });

  it("T08 side effect: cancelling a booked stay releases the listing with a future expiry", async () => {
    const w = newWorld();
    await driveTo(w, "S3");
    await w.fire("cancel");
    const l = w.snapshot().listing;
    expect(l.status).toBe("available");
    expect(Date.parse(l.expires_at as string)).toBeGreaterThan(Date.now());
  });
});

describe("FSM booking model - live API path - invalid transitions (sneak paths)", () => {
  for (const inv of INVALID) {
    it(`${inv.id}: ${inv.from} --${inv.event}--> rejected with ${inv.expect}, state unchanged`, async () => {
      const w = newWorld();
      await driveTo(w, inv.from);
      const before = w.snapshot();
      const status = await w.fire(inv.event);
      expect(status).toBe(inv.expect);
      expect(w.state()).toBe(inv.from);
      expect(w.snapshot().listing.status).toBe(before.listing.status);
    });
  }
});

describe("FSM booking model - live API path - sequences (path coverage)", () => {
  for (const p of PATHS) {
    it(`${p.id}: ${p.events.join(" -> ")} ends in ${p.end}`, async () => {
      const w = newWorld();
      for (const e of p.events) {
        const status = await w.fire(e);
        expect(status, `event ${e} in ${p.id} (log ${JSON.stringify(w.log)})`).toBeLessThan(300);
      }
      expect(w.state()).toBe(p.end);
      // Invariant: never more than one live hold on the listing.
      const live = w.snapshot().bookings.filter((b) =>
        ["requested", "approved", "booked"].includes(b.status as string),
      );
      expect(live.length).toBeLessThanOrEqual(1);
    });
  }
});

describe("FSM booking model - live API path - concurrency", () => {
  it("C01: two interns request the same listing at the same instant; the loser gets 409, not 500", async () => {
    const w = newWorld();
    // Both requests read "no live hold" before either inserts, so the second one is
    // stopped only by the DB unique index (bookings_one_live_hold_per_listing).
    const reqA = book(new Request("http://t/api", { method: "POST", body: "{}" }), { params: { id: LISTING } });
    w.caller = INTERN_B;
    const reqB = book(new Request("http://t/api", { method: "POST", body: "{}" }), { params: { id: LISTING } });
    const statuses = (await Promise.all([reqA, reqB])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(w.snapshot().bookings).toHaveLength(1);
    void INTERN_A;
  });

  it("C02: owner approves the same booking twice concurrently; exactly one wins", async () => {
    const w = newWorld();
    await driveTo(w, "S1");
    w.caller = (w.snapshot().listing.created_by as string) ?? "";
    const id = w.latestBookingId!;
    const [r1, r2] = await Promise.all([
      approve(new Request("http://t/api", { method: "POST" }), { params: { id } }),
      approve(new Request("http://t/api", { method: "POST" }), { params: { id } }),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(w.state()).toBe("S2");
  });
});
