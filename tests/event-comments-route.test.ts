import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/events/event-1/comments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

function query(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.insert = vi.fn(() => q);
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(result));
  return q;
}

describe("/api/events/[id]/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { GET } = await import("@/app/api/events/[id]/comments/route");

    const response = await GET(new Request("http://localhost/api/events/event-1/comments") as NextRequest, {
      params: { id: "event-1" },
    });

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("GET returns comments with public authors in deterministic order", async () => {
    const events = query({ data: { id: "event-1" }, error: null });
    const comments = query({
      data: [
        {
          id: "comment-1",
          event_id: "event-1",
          body: "See you there.",
          created_at: "2026-07-16T10:00:00.000Z",
          users: { id: "intern-2", name: "Mia C.", avatar_url: "/mia.png" },
        },
      ],
      error: null,
    });
    const from = vi.fn((table: string) => ({ events, event_comments: comments })[table]);
    createServerSupabase.mockResolvedValue({ from });
    const { GET } = await import("@/app/api/events/[id]/comments/route");

    const response = await GET(new Request("http://localhost/api/events/event-1/comments") as NextRequest, {
      params: { id: "event-1" },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body)).toEqual(["comments"]);
    expect(comments.eq).toHaveBeenCalledWith("event_id", "event-1");
    expect(comments.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(comments.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(body).toEqual({
      comments: [
        {
          id: "comment-1",
          eventId: "event-1",
          author: { id: "intern-2", name: "Mia C.", avatarUrl: "/mia.png" },
          body: "See you there.",
          createdAt: "2026-07-16T10:00:00.000Z",
        },
      ],
    });
  });

  it("returns not found when the event is missing", async () => {
    const events = query({ data: null, error: null });
    const from = vi.fn((table: string) => ({ events })[table]);
    createServerSupabase.mockResolvedValue({ from });
    const { GET } = await import("@/app/api/events/[id]/comments/route");

    const response = await GET(new Request("http://localhost/api/events/missing/comments") as NextRequest, {
      params: { id: "missing" },
    });

    expect(response.status).toBe(404);
  });

  it("POST creates a comment from the route event and session author", async () => {
    const users = query({ data: { user_type: "intern" }, error: null });
    const events = query({ data: { id: "event-1" }, error: null });
    const comments = query({
      data: {
        id: "comment-2",
        event_id: "event-1",
        body: "I am in.",
        created_at: "2026-07-16T11:00:00.000Z",
        users: { id: "intern-1", name: "Ada K.", avatar_url: null },
      },
      error: null,
    });
    const from = vi.fn((table: string) => ({ users, events, event_comments: comments })[table]);
    createServerSupabase.mockResolvedValue({ from });
    const { POST } = await import("@/app/api/events/[id]/comments/route");

    const response = await POST(
      request({ event_id: "other-event", author_id: "other-user", body: "  I am in.  " }),
      { params: { id: "event-1" } },
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(comments.insert).toHaveBeenCalledWith({
      event_id: "event-1",
      author_id: "intern-1",
      body: "I am in.",
    });
    expect(body).toEqual({
      id: "comment-2",
      eventId: "event-1",
      author: { id: "intern-1", name: "Ada K.", avatarUrl: null },
      body: "I am in.",
      createdAt: "2026-07-16T11:00:00.000Z",
    });
  });

  it("POST rejects invalid bodies, subletters, and missing events", async () => {
    const { POST } = await import("@/app/api/events/[id]/comments/route");

    const invalid = await POST(request({ body: "" }), { params: { id: "event-1" } });
    expect(invalid.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();

    const subletter = query({ data: { user_type: "subletter" }, error: null });
    createServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({ users: subletter })[table]),
    });
    const denied = await POST(request({ body: "hello" }), { params: { id: "event-1" } });
    expect(denied.status).toBe(403);

    const intern = query({ data: { user_type: "intern" }, error: null });
    const missingEvent = query({ data: null, error: null });
    createServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({ users: intern, events: missingEvent })[table]),
    });
    const missing = await POST(request({ body: "hello" }), { params: { id: "missing" } });
    expect(missing.status).toBe(404);
  });
});
