/**
 * CS 7314 test harness: drives the REAL booking/listing route handlers against the
 * in-memory fake DB and reports the observed FSM state after every event.
 *
 * The caller must `vi.mock` "@/lib/http", "@/lib/supabase/server" and
 * "@/lib/supabase/admin" to read `world.caller` and `world.db.client` (see
 * tests/course/fsm-booking-live.test.ts).
 */
import { createFakeDb, type FakeDb } from "./fakeSupabase";
import type { EventId, StateId } from "../models/bookingFsm";

export const INTERN_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const INTERN_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const OWNER = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
export const LISTING = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const DAY = 86_400_000;

export function seedTables(now = Date.now()) {
  return {
    users: [
      { id: INTERN_A, name: "Ada Intern", avatar_url: null, user_type: "intern" },
      { id: INTERN_B, name: "Ben Intern", avatar_url: null, user_type: "intern" },
      { id: OWNER, name: "Sam Subletter", avatar_url: null, user_type: "subletter" },
    ],
    listings: [
      {
        id: LISTING,
        title: "Sunny studio",
        address: "1 Pine St",
        lat: 47.61,
        lng: -122.33,
        price: 1800,
        lease_start: "2026-06-01",
        lease_end: "2026-08-31",
        lease_type: "sublet",
        source: null,
        photos: [],
        safety_flags: { scamSignals: [], notes: [] },
        created_by: OWNER,
        created_at: new Date(now - DAY).toISOString(),
        status: "available",
        expires_at: new Date(now + 5 * DAY).toISOString(),
        last_confirmed_at: null,
        sourced: false,
        source_name: "subletter",
        source_url: null,
        external_id: null,
      },
    ],
    bookings: [] as Record<string, unknown>[],
    friendships: [],
  };
}

type Routes = {
  book: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
  approve: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
  decline: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
  confirm: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
  relist: (req: Request, ctx: { params: { id: string } }) => Promise<Response>;
  /** No HTTP route exists for cancel; the library entry point is used instead. */
  cancel: (db: FakeDb, callerId: string, bookingId: string) => Promise<number>;
  expire: (db: FakeDb, now: number) => Promise<unknown>;
};

export class BookingWorld {
  db: FakeDb;
  caller: string = INTERN_A;
  latestBookingId: string | null = null;
  log: { event: string; status: number; state: StateId | "?" }[] = [];

  constructor(private routes: Routes, opts: Parameters<typeof createFakeDb>[1] = {}) {
    this.db = createFakeDb(seedTables(), opts);
  }

  private req(body?: unknown) {
    return new Request("http://test.local/api", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  private bookerOfLatest(): string {
    const b = this.latestBookingId ? this.db.row("bookings", this.latestBookingId) : undefined;
    return (b?.booker_id as string) ?? INTERN_A;
  }

  /** Fire one model event (or an invalid-actor variant) and return the HTTP status. */
  async fire(
    event: EventId | "approve_by_booker" | "confirm_by_b" | "decline_by_booker" | "request_by_owner",
  ): Promise<number> {
    let status: number;
    const bid = this.latestBookingId ?? "00000000-0000-4000-8000-000000000000";
    const as = async (caller: string, fn: () => Promise<Response>) => {
      this.caller = caller;
      const res = await fn();
      if (res.status === 201) {
        const body = (await res.json()) as { id: string };
        this.latestBookingId = body.id;
      }
      return res.status;
    };
    switch (event) {
      case "request":
        status = await as(INTERN_A, () => this.routes.book(this.req({}), { params: { id: LISTING } }));
        break;
      case "request_b":
        status = await as(INTERN_B, () => this.routes.book(this.req({}), { params: { id: LISTING } }));
        break;
      case "request_by_owner":
        status = await as(OWNER, () => this.routes.book(this.req({}), { params: { id: LISTING } }));
        break;
      case "approve":
        status = await as(OWNER, () => this.routes.approve(this.req(), { params: { id: bid } }));
        break;
      case "approve_by_booker":
        status = await as(this.bookerOfLatest(), () => this.routes.approve(this.req(), { params: { id: bid } }));
        break;
      case "decline":
        status = await as(OWNER, () => this.routes.decline(this.req(), { params: { id: bid } }));
        break;
      case "decline_by_booker":
        status = await as(this.bookerOfLatest(), () => this.routes.decline(this.req(), { params: { id: bid } }));
        break;
      case "confirm":
        status = await as(this.bookerOfLatest(), () => this.routes.confirm(this.req(), { params: { id: bid } }));
        break;
      case "confirm_by_b":
        status = await as(INTERN_B, () => this.routes.confirm(this.req(), { params: { id: bid } }));
        break;
      case "relist":
        status = await as(OWNER, () => this.routes.relist(this.req(), { params: { id: LISTING } }));
        break;
      case "cancel":
        status = await this.routes.cancel(this.db, this.bookerOfLatest(), bid);
        break;
      case "expire": {
        const l = this.db.row("listings", LISTING)!;
        await this.routes.expire(this.db, Date.parse(l.expires_at as string) + 1);
        status = 200;
        break;
      }
    }
    this.log.push({ event, status, state: this.state() });
    return status;
  }

  /** Observe the current FSM state from the persisted rows. */
  state(): StateId | "?" {
    const listing = this.db.row("listings", LISTING)!;
    const b = this.latestBookingId ? this.db.row("bookings", this.latestBookingId) : undefined;
    const bs = (b?.status as string) ?? null;
    const ls = listing.status as string;
    if (ls === "stale" && (bs === null || bs === "declined" || bs === "cancelled")) return "S6";
    if (ls === "available" && bs === null) return "S0";
    if (ls === "available" && bs === "requested") return "S1";
    if (ls === "available" && bs === "approved") return "S2";
    if (ls === "taken" && bs === "booked") return "S3";
    if (ls === "available" && bs === "declined") return "S4";
    if (ls === "available" && bs === "cancelled") return "S5";
    return "?";
  }

  snapshot() {
    return {
      listing: { ...this.db.row("listings", LISTING)! },
      bookings: this.db.tables.bookings.map((b) => ({ ...b })),
    };
  }
}
