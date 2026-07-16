import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const guard = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));

function request(body: unknown) {
  return new Request("http://localhost/api/route/schedule", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/route/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { POST } = await import("@/app/api/route/schedule/route");

    const response = await POST(request({ apartmentId: "a", selectedPlaces: [] }));

    expect(response.status).toBe(401);
  });

  it("returns exactly a day response for complete selected place objects", async () => {
    const { POST } = await import("@/app/api/route/schedule/route");

    const response = await POST(
      request({
        apartmentId: "listing-bluebird",
        selectedPlaces: [{ id: "coffee-1", label: "Ada Coffee", kind: "coffee", lat: 47.61, lng: -122.33 }],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Object.keys(body)).toEqual(["day"]);
    expect(body.day.items.map((item: { title: string }) => item.title)).toEqual([
      "Leave your selected apartment",
      "Commute stop: Ada Coffee",
      "Arrive near the office",
    ]);
  });

  it("returns a client error for malformed selected places", async () => {
    const { POST } = await import("@/app/api/route/schedule/route");

    const response = await POST(request({ apartmentId: "listing-bluebird", selectedPlaces: ["coffee-1"] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_selected_place" });
  });
});
