import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

const callerId = "11111111-1111-5111-8111-111111111111";
const otherId = "22222222-2222-5222-8222-222222222222";
const strangerId = "33333333-3333-5333-8333-333333333333";
const friendshipId = "aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa";

const friendship = {
  id: friendshipId,
  requester_id: callerId,
  addressee_id: otherId,
  status: "pending",
  created_at: "2026-07-16T00:00:00.000Z",
};

const accepted = { ...friendship, status: "accepted" };

const caller = { id: callerId, name: "Ada K.", avatar_url: null, company: "Stripe", user_type: "intern" };
const other = { id: otherId, name: "Ben L.", avatar_url: "/ben.png", company: "Stripe", user_type: "intern" };
const stranger = { id: strangerId, name: "Cy M.", avatar_url: null, company: "Figma", user_type: "intern" };

class Query {
  calls: { method: string; args: unknown[] }[] = [];
  result: unknown;

  constructor(result: unknown) {
    this.result = result;
  }

  select(...args: unknown[]) { this.calls.push({ method: "select", args }); return this; }
  eq(...args: unknown[]) { this.calls.push({ method: "eq", args }); return this; }
  in(...args: unknown[]) { this.calls.push({ method: "in", args }); return this; }
  or(...args: unknown[]) { this.calls.push({ method: "or", args }); return this; }
  order(...args: unknown[]) { this.calls.push({ method: "order", args }); return this; }
  insert(...args: unknown[]) { this.calls.push({ method: "insert", args }); return this; }
  update(...args: unknown[]) { this.calls.push({ method: "update", args }); return this; }
  delete(...args: unknown[]) { this.calls.push({ method: "delete", args }); return this; }
  single() { this.calls.push({ method: "single", args: [] }); return Promise.resolve(this.result); }
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

function req(path: string, body?: unknown) {
  return new Request(`http://localhost${path}`, {
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
    headers: { "content-type": "application/json" },
  });
}

describe("friends routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    guard.mockResolvedValue({ callerId, headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    guard.mockResolvedValueOnce(NextResponse.json({ error: "unauthenticated" }, { status: 401 }));
    const { GET } = await import("@/app/api/friends/route");

    const response = await GET(req("/api/friends"));

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("GET /api/friends returns accepted friendships with the other intern and caller-relative direction", async () => {
    const db = supabaseWith({
      friendships: [new Query({ data: [accepted], error: null })],
      users: [new Query({ data: [other], error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { GET } = await import("@/app/api/friends/route");

    const response = await GET(req("/api/friends"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      friends: [
        {
          friendshipId,
          user: { id: otherId, name: "Ben L.", avatarUrl: "/ben.png", company: "Stripe" },
          status: "accepted",
          direction: "outgoing",
        },
      ],
    });
    expect(db.used.friendships[0].calls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["status", "accepted"] },
        { method: "or", args: [`requester_id.eq.${callerId},addressee_id.eq.${callerId}`] },
      ]),
    );
  });

  it("GET /api/friends/requests returns only incoming pending requests", async () => {
    const incoming = { ...friendship, requester_id: otherId, addressee_id: callerId };
    const db = supabaseWith({
      friendships: [new Query({ data: [incoming], error: null })],
      users: [new Query({ data: [other], error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { GET } = await import("@/app/api/friends/requests/route");

    const response = await GET(req("/api/friends/requests"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.friends[0]).toMatchObject({ friendshipId, status: "pending", direction: "incoming" });
    expect(db.used.friendships[0].calls).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["status", "pending"] },
        { method: "eq", args: ["addressee_id", callerId] },
      ]),
    );
  });

  it("POST /api/friends/request creates one canonical pending friend for intern pairs", async () => {
    const db = supabaseWith({
      users: [
        new Query({ data: caller, error: null }),
        new Query({ data: other, error: null }),
        new Query({ data: [other], error: null }),
      ],
      friendships: [
        new Query({ data: null, error: null }),
        new Query({ data: friendship, error: null }),
      ],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { POST } = await import("@/app/api/friends/request/route");

    const response = await POST(req("/api/friends/request", { userId: otherId, direction: "incoming" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ friendshipId, status: "pending", direction: "outgoing" });
    expect(db.used.friendships[1].calls).toEqual(
      expect.arrayContaining([{ method: "insert", args: [{ requester_id: callerId, addressee_id: otherId, status: "pending" }] }]),
    );
  });

  it("POST /api/friends/request returns an existing reverse relationship without inserting", async () => {
    const reverse = { ...friendship, requester_id: otherId, addressee_id: callerId };
    const db = supabaseWith({
      users: [
        new Query({ data: caller, error: null }),
        new Query({ data: other, error: null }),
        new Query({ data: [other], error: null }),
      ],
      friendships: [new Query({ data: reverse, error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { POST } = await import("@/app/api/friends/request/route");

    const response = await POST(req("/api/friends/request", { userId: otherId }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ friendshipId, status: "pending", direction: "incoming" });
    expect(db.used.friendships).toHaveLength(1);
  });

  it("POST /api/friends/request rejects self, missing targets, and subletter callers or targets", async () => {
    const { POST } = await import("@/app/api/friends/request/route");

    const malformed = await POST(req("/api/friends/request", { userId: "not-a-uuid,addressee_id.eq.anything" }));
    expect(malformed.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();

    const self = await POST(req("/api/friends/request", { userId: callerId }));
    expect(self.status).toBe(400);

    createServerSupabase.mockResolvedValueOnce(
      supabaseWith({
        users: [new Query({ data: caller, error: null }), new Query({ data: null, error: null })],
      }).client,
    );
    const missing = await POST(req("/api/friends/request", { userId: otherId }));
    expect(missing.status).toBe(400);

    createServerSupabase.mockResolvedValueOnce(
      supabaseWith({
        users: [new Query({ data: { ...caller, user_type: "subletter" }, error: null })],
      }).client,
    );
    const subletterCaller = await POST(req("/api/friends/request", { userId: otherId }));
    expect(subletterCaller.status).toBe(403);

    createServerSupabase.mockResolvedValueOnce(
      supabaseWith({
        users: [new Query({ data: caller, error: null }), new Query({ data: { ...other, user_type: "subletter" }, error: null })],
      }).client,
    );
    const subletterTarget = await POST(req("/api/friends/request", { userId: otherId }));
    expect(subletterTarget.status).toBe(400);
  });

  it("POST /api/friends/{id}/accept succeeds only for addressees and returns the accepted friend", async () => {
    const incoming = { ...accepted, requester_id: otherId, addressee_id: callerId };
    const db = supabaseWith({
      friendships: [new Query({ data: incoming, error: null })],
      users: [new Query({ data: [other], error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { POST } = await import("@/app/api/friends/[id]/accept/route");

    const response = await POST(req(`/api/friends/${friendshipId}/accept`, {}), { params: { id: friendshipId } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ friendshipId, status: "accepted", direction: "incoming" });
    expect(db.used.friendships[0].calls).toEqual(
      expect.arrayContaining([
        { method: "update", args: [{ status: "accepted" }] },
        { method: "eq", args: ["id", friendshipId] },
        { method: "eq", args: ["addressee_id", callerId] },
        { method: "eq", args: ["status", "pending"] },
      ]),
    );
  });

  it("POST /api/friends/{id}/decline deletes only addressee pending requests and returns no body", async () => {
    const db = supabaseWith({
      friendships: [new Query({ data: { id: friendshipId }, error: null })],
    });
    createServerSupabase.mockResolvedValue(db.client);
    const { POST } = await import("@/app/api/friends/[id]/decline/route");

    const response = await POST(req(`/api/friends/${friendshipId}/decline`, {}), { params: { id: friendshipId } });

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(db.used.friendships[0].calls).toEqual(
      expect.arrayContaining([
        { method: "delete", args: [] },
        { method: "eq", args: ["id", friendshipId] },
        { method: "eq", args: ["addressee_id", callerId] },
        { method: "eq", args: ["status", "pending"] },
      ]),
    );
  });

  it("rejects requester or stranger resolution when no addressee-scoped row is visible", async () => {
    createServerSupabase.mockResolvedValue(
      supabaseWith({
        friendships: [new Query({ data: null, error: null })],
      }).client,
    );
    const { POST: acceptPost } = await import("@/app/api/friends/[id]/accept/route");
    const accept = await acceptPost(req(`/api/friends/${friendshipId}/accept`, {}), { params: { id: friendshipId } });
    expect(accept.status).toBe(403);

    guard.mockResolvedValueOnce({ callerId: strangerId, headers: {} });
    createServerSupabase.mockResolvedValueOnce(
      supabaseWith({
        friendships: [new Query({ data: null, error: null })],
      }).client,
    );
    const { POST: declinePost } = await import("@/app/api/friends/[id]/decline/route");
    const decline = await declinePost(req(`/api/friends/${friendshipId}/decline`, {}), { params: { id: friendshipId } });
    expect(decline.status).toBe(403);
  });
});
