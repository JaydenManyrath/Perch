import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const guard = vi.fn();
const createServerSupabase = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));

function request(body: unknown): NextRequest {
  return new Request("http://localhost/api/events/event-1/attend", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as NextRequest;
}

function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.single = vi.fn(async () => result);
  q.maybeSingle = vi.fn(async () => result);
  q.upsert = vi.fn(async () => result);
  q.delete = vi.fn(() => q);
  return q;
}

describe("POST /api/events/[id]/attend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { POST } = await import("@/app/api/events/[id]/attend/route");

    const response = await POST(request({ going: true }), { params: { id: "event-1" } });

    expect(response.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("rejects malformed going values before touching Supabase", async () => {
    const { POST } = await import("@/app/api/events/[id]/attend/route");

    const response = await POST(request({ going: "yes" }), { params: { id: "event-1" } });

    expect(response.status).toBe(400);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("upserts one caller attendance row and returns guarded aggregate counts", async () => {
    const users = chain({ data: { user_type: "intern" }, error: null });
    const events = chain({ data: { id: "event-1" }, error: null });
    const attendance = chain({ error: null });
    const from = vi.fn((table: string) => ({ users, events, event_attendance: attendance })[table]);
    const rpc = vi.fn(async () => ({ data: 4, error: null }));
    createServerSupabase.mockResolvedValue({ from, rpc });
    const { POST } = await import("@/app/api/events/[id]/attend/route");

    const response = await POST(request({ going: true }), { params: { id: "event-1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(attendance.upsert).toHaveBeenCalledWith(
      { event_id: "event-1", user_id: "intern-1" },
      { onConflict: "event_id,user_id" },
    );
    expect(rpc).toHaveBeenCalledWith("event_attendance_count", { event: "event-1" });
    expect(body).toEqual({ going: 4, viewerGoing: true });
  });

  it("deletes only the caller attendance row for going false", async () => {
    const users = chain({ data: { user_type: "intern" }, error: null });
    const events = chain({ data: { id: "event-1" }, error: null });
    const attendance = chain({ error: null });
    const from = vi.fn((table: string) => ({ users, events, event_attendance: attendance })[table]);
    createServerSupabase.mockResolvedValue({
      from,
      rpc: vi.fn(async () => ({ data: 2, error: null })),
    });
    const { POST } = await import("@/app/api/events/[id]/attend/route");

    const response = await POST(request({ going: false }), { params: { id: "event-1" } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(attendance.delete).toHaveBeenCalled();
    expect(attendance.eq).toHaveBeenCalledWith("event_id", "event-1");
    expect(attendance.eq).toHaveBeenCalledWith("user_id", "intern-1");
    expect(body).toEqual({ going: 2, viewerGoing: false });
  });

  it("denies subletters and missing events", async () => {
    const users = chain({ data: { user_type: "subletter" }, error: null });
    const from = vi.fn((table: string) => ({ users })[table]);
    createServerSupabase.mockResolvedValue({ from, rpc: vi.fn() });
    const { POST } = await import("@/app/api/events/[id]/attend/route");

    const subletter = await POST(request({ going: true }), { params: { id: "event-1" } });
    expect(subletter.status).toBe(403);

    const intern = chain({ data: { user_type: "intern" }, error: null });
    const missingEvent = chain({ data: null, error: null });
    createServerSupabase.mockResolvedValueOnce({
      from: vi.fn((table: string) => ({ users: intern, events: missingEvent })[table]),
      rpc: vi.fn(),
    });

    const missing = await POST(request({ going: true }), { params: { id: "missing" } });
    expect(missing.status).toBe(404);
  });
});
