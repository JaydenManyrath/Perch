import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createAdminClient = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const callerId = "11111111-1111-5111-8111-111111111111";
const friendId = "22222222-2222-5222-8222-222222222222";
const secondFriendId = "44444444-4444-5444-8444-444444444444";
const pendingId = "55555555-5555-5555-8555-555555555555";
const strangerId = "33333333-3333-5333-8333-333333333333";

const caller = { id: callerId, name: "Ada K.", avatar_url: null, company: "Stripe", user_type: "intern" };
const friend = { id: friendId, name: "Ben L.", avatar_url: "/ben.png", company: "Stripe" };
const secondFriend = { id: secondFriendId, name: "Ari M.", avatar_url: null, company: "Figma" };
const eventEarly = { id: "event-early", title: "Morning Market", datetime: "2026-07-20T16:00:00.000Z" };
const eventLate = { id: "event-late", title: "Warehouse Show", datetime: "2026-07-21T03:00:00.000Z" };

class Query {
  calls: { method: string; args: unknown[] }[] = [];
  result: unknown;

  constructor(result: unknown) {
    this.result = result;
  }

  select(...args: unknown[]) { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return this; }
  gte(...args: unknown[]) { this.calls.push({ method: "gte", args }); return this; }
  in(...args: unknown[]) { this.calls.push({ method: "in", args }); return this; }
  or(...args: unknown[]) { this.calls.push({ method: "or", args }); return this; }
  order(...args: unknown[]) { this.calls.push({ method: "order", args }); return this; }
  maybeSingle() { this.calls.push({ method: "maybeSingle", args: [] }); return Promise.resolve(this.result); }
  then(resolve: (value: unknown) => void) { return Promise.resolve(this.result).then(resolve); }
}

function supabaseWith(tables: Record<string, Query[]>) {
  const used: Record<string, Query[]> = {};
  return {
    used,
    client: {
      from(name: string) {
        const query = tables[name]?.shift();
        if (!query) throw new Error(`unexpected table ${name}`);
        used[name] ??= [];
        used[name].push(query);
        return query;
      },
    },
  };
}

function req(path = "/api/friends/notes?userId=impersonate&eventId=event-late") {
  return new Request(`http://localhost${path}`);
}

describe("GET /api/friends/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/friends/notes/route");

    const response = await GET(req());

    expect(response.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it("returns only accepted friends' event plans in deterministic public shape", async () => {
    const db = supabaseWith({
      users: [new Query({ data: caller, error: null }), new Query({ data: [friend, secondFriend], error: null })],
      friendships: [
        new Query({
          data: [
            { id: "f1", requester_id: callerId, addressee_id: friendId, status: "accepted", created_at: "2026-07-16T00:00:00.000Z" },
            { id: "f2", requester_id: secondFriendId, addressee_id: callerId, status: "accepted", created_at: "2026-07-15T00:00:00.000Z" },
          ],
          error: null,
        }),
      ],
      event_attendance: [
        new Query({
          data: [
            { event_id: "event-late", user_id: friendId, created_at: "2026-07-16T12:00:00.000Z" },
            { event_id: "event-early", user_id: secondFriendId, created_at: "2026-07-16T13:00:00.000Z" },
          ],
          error: null,
        }),
      ],
      events: [new Query({ data: [eventLate, eventEarly], error: null })],
    });
    createAdminClient.mockReturnValue(db.client);
    const { GET } = await import("@/app/api/friends/notes/route");

    const response = await GET(req());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      notes: [
        { friend: { id: secondFriendId, name: "Ari M.", avatarUrl: null }, event: eventEarly },
        { friend: { id: friendId, name: "Ben L.", avatarUrl: "/ben.png" }, event: eventLate },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("event_attendance");
    expect(JSON.stringify(body)).not.toContain("requester_id");
    expect(JSON.stringify(body)).not.toContain("addressee_id");
    expect(db.used.friendships[0].calls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["status", "accepted"] },
        { method: "or", args: [`requester_id.eq.${callerId},addressee_id.eq.${callerId}`] },
      ]),
    );
    expect(db.used.event_attendance[0].calls).toEqual(
      expect.arrayContaining([{ method: "in", args: ["user_id", [friendId, secondFriendId]] }]),
    );
    // Round 7 upcoming guard: the events lookup must filter datetime >= now in-query so a
    // passed event a friend marked "going" never resurfaces in the notes strip.
    const gte = db.used.events[0].calls.find((call) => call.method === "gte");
    expect(gte).toBeDefined();
    expect(gte?.args[0]).toBe("datetime");
    expect(Number.isNaN(Date.parse(String(gte?.args[1])))).toBe(false);
  });

  it("does not expose pending Friend Requests, strangers, or query-parameter targets", async () => {
    const db = supabaseWith({
      users: [new Query({ data: caller, error: null })],
      friendships: [
        new Query({
          data: [
            { id: "pending", requester_id: callerId, addressee_id: pendingId, status: "pending" },
            { id: "stranger", requester_id: strangerId, addressee_id: pendingId, status: "accepted" },
          ],
          error: null,
        }),
      ],
    });
    createAdminClient.mockReturnValue(db.client);
    const { GET } = await import("@/app/api/friends/notes/route");

    const response = await GET(req("/api/friends/notes?userId=33333333-3333-5333-8333-333333333333&eventId=event-late"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ notes: [] });
    expect(db.used.event_attendance).toBeUndefined();
  });

  it("changes when an accepted friend's attendance changes without exposing other attendees", async () => {
    const friendships = new Query({
      data: [{ id: "f1", requester_id: callerId, addressee_id: friendId, status: "accepted" }],
      error: null,
    });
    const db = supabaseWith({
      users: [new Query({ data: caller, error: null }), new Query({ data: [friend], error: null })],
      friendships: [friendships],
      event_attendance: [new Query({ data: [{ event_id: "event-late", user_id: friendId }], error: null })],
      events: [new Query({ data: [eventLate], error: null })],
    });
    createAdminClient.mockReturnValue(db.client);
    const { GET } = await import("@/app/api/friends/notes/route");

    const response = await GET(req());
    const body = await response.json();

    expect(body.notes).toHaveLength(1);
    expect(body.notes[0].friend.id).toBe(friendId);

    const removedDb = supabaseWith({
      users: [new Query({ data: caller, error: null })],
      friendships: [new Query({ data: [{ id: "f1", requester_id: callerId, addressee_id: friendId, status: "accepted" }], error: null })],
      event_attendance: [new Query({ data: [], error: null })],
    });
    createAdminClient.mockReturnValueOnce(removedDb.client);

    const removed = await GET(req());
    expect(await removed.json()).toEqual({ notes: [] });
  });

  it("denies Subletters before reading Friendships or attendance", async () => {
    const db = supabaseWith({
      users: [new Query({ data: { ...caller, user_type: "subletter" }, error: null })],
    });
    createAdminClient.mockReturnValue(db.client);
    const { GET } = await import("@/app/api/friends/notes/route");

    const response = await GET(req("/api/friends/notes?userId=someone-else"));

    expect(response.status).toBe(403);
    expect(db.used.friendships).toBeUndefined();
    expect(db.used.event_attendance).toBeUndefined();
  });
});
