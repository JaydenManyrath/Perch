import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

function getRequest(url = "http://localhost/api/map/comments?bbox=-122.36,47.60,-122.30,47.65") {
  return new NextRequest(url);
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/map/comments", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.not = vi.fn(() => q);
  q.gte = vi.fn(() => q);
  q.lte = vi.fn(() => q);
  q.order = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.insert = vi.fn(() => q);
  q.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

describe("/api/map/comments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { GET } = await import("@/app/api/map/comments/route");

    const response = await GET(getRequest());

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", "http://localhost/api/map/comments"],
    ["too few", "http://localhost/api/map/comments?bbox=-122.36,47.60,-122.30"],
    ["blank value", "http://localhost/api/map/comments?bbox=-122.36,,-122.30,47.65"],
    ["non-numeric", "http://localhost/api/map/comments?bbox=-122.36,nope,-122.30,47.65"],
    ["bad latitude", "http://localhost/api/map/comments?bbox=-122.36,-91,-122.30,47.65"],
    ["reversed longitude", "http://localhost/api/map/comments?bbox=-122.30,47.60,-122.36,47.65"],
    ["reversed latitude", "http://localhost/api/map/comments?bbox=-122.36,47.65,-122.30,47.60"],
  ])("rejects invalid bbox: %s", async (_label, url) => {
    const { GET } = await import("@/app/api/map/comments/route");

    const response = await GET(getRequest(url));

    expect(response.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("queries only located notes inside the requested viewport and returns the frozen shape", async () => {
    const notes = chain({
      data: [
        {
          id: "note-1",
          lat: 47.61,
          lng: -122.33,
          topic: "Coffee",
          body: "Good tables",
          created_at: "2026-06-01T12:00:00Z",
          users: { id: "author-1", name: "Ada K.", avatar_url: "/ada.png" },
        },
      ],
      error: null,
    });
    createServerSupabase.mockResolvedValue({ from: vi.fn(() => notes) });
    const { GET } = await import("@/app/api/map/comments/route");

    const response = await GET(getRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(notes.not).toHaveBeenCalledWith("lat", "is", null);
    expect(notes.not).toHaveBeenCalledWith("lng", "is", null);
    expect(notes.gte).toHaveBeenCalledWith("lng", -122.36);
    expect(notes.lte).toHaveBeenCalledWith("lng", -122.3);
    expect(notes.gte).toHaveBeenCalledWith("lat", 47.6);
    expect(notes.lte).toHaveBeenCalledWith("lat", 47.65);
    expect(notes.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(notes.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(body).toEqual({
      comments: [
        {
          id: "note-1",
          author: { id: "author-1", name: "Ada K.", avatarUrl: "/ada.png" },
          lat: 47.61,
          lng: -122.33,
          topic: "Coffee",
          body: "Good tables",
          createdAt: "2026-06-01T12:00:00Z",
        },
      ],
    });
  });

  it("rejects malformed post input before touching Supabase", async () => {
    const { POST } = await import("@/app/api/map/comments/route");

    const response = await POST(postRequest({ lat: 47.61, topic: "Coffee", body: "Good tables" }));

    expect(response.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("denies subletters", async () => {
    const users = chain({ data: { user_type: "subletter" }, error: null });
    createServerSupabase.mockResolvedValue({ from: vi.fn(() => users) });
    const { POST } = await import("@/app/api/map/comments/route");

    const response = await POST(postRequest({ lat: 47.61, lng: -122.33, topic: "Coffee", body: "Good tables" }));

    expect(response.status).toBe(403);
  });

  it("denies forged author fields before touching Supabase", async () => {
    const { POST } = await import("@/app/api/map/comments/route");

    const response = await POST(
      postRequest({ lat: 47.61, lng: -122.33, topic: "Coffee", body: "Good tables", created_by: "attacker" }),
    );

    expect(response.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("sets the caller as author, stores city null, and ignores supplied city fields", async () => {
    const users = chain({ data: { user_type: "intern" }, error: null });
    const notes = chain({
      data: {
        id: "note-1",
        lat: 47.61,
        lng: -122.33,
        topic: "Coffee",
        body: "Good tables",
        created_at: "2026-06-01T12:00:00Z",
        users: { id: "intern-1", name: "Ada K.", avatar_url: null },
      },
      error: null,
    });
    createServerSupabase.mockResolvedValue({
      from: vi.fn((table: string) => ({ users, notes })[table]),
    });
    const { POST } = await import("@/app/api/map/comments/route");

    const response = await POST(
      postRequest({
        lat: 47.61,
        lng: -122.33,
        topic: " Coffee ",
        body: " Good tables ",
        city: "Seattle",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(notes.insert).toHaveBeenCalledWith({
      city: null,
      lat: 47.61,
      lng: -122.33,
      topic: "Coffee",
      body: "Good tables",
      created_by: "intern-1",
    });
    expect(body).toEqual({
      id: "note-1",
      author: { id: "intern-1", name: "Ada K.", avatarUrl: null },
      lat: 47.61,
      lng: -122.33,
      topic: "Coffee",
      body: "Good tables",
      createdAt: "2026-06-01T12:00:00Z",
    });
  });
});
