import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { RoutePoiForbiddenError } from "@/lib/route/pois";
import type { GeoJSONLineString } from "@/lib/types/contract";

const guard = vi.fn();
const getAuthenticatedInternRound1Places = vi.fn();
const searchRoutePoiCandidates = vi.fn();

vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/route/round1-places", () => ({ getAuthenticatedInternRound1Places }));
vi.mock("@/lib/route/poi-candidates", () => ({ searchRoutePoiCandidates }));

const geometry: GeoJSONLineString = {
  type: "LineString",
  coordinates: [
    [-122.34, 47.6],
    [-122.34, 47.61],
  ],
};

function request(body: unknown) {
  return new Request("http://localhost/api/route/pois", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/route/pois", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guard.mockResolvedValue({ callerId: "intern-1", headers: { "X-RateLimit-Limit": "20" } });
    getAuthenticatedInternRound1Places.mockResolvedValue([
      { id: "user-coffee", label: "User Coffee", kind: "coffee", lat: 47.605, lng: -122.34 },
    ]);
    searchRoutePoiCandidates.mockResolvedValue([
      { id: "candidate-gym", label: "Candidate Gym", kind: "gym", lat: 47.606, lng: -122.34 },
    ]);
  });

  it("requires authentication through the shared guard", async () => {
    const unauthenticated = NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    guard.mockResolvedValueOnce(unauthenticated);
    const { POST } = await import("@/app/api/route/pois/route");

    const response = await POST(request({ geometry, kinds: ["coffee"] }));

    expect(response.status).toBe(401);
    expect(searchRoutePoiCandidates).not.toHaveBeenCalled();
  });

  it("uses caller-scoped Round 1 places and calls Person C only with geometry and kinds", async () => {
    const { POST } = await import("@/app/api/route/pois/route");

    const response = await POST(request({ geometry, kinds: ["coffee", "gym"] }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pois.map((poi: { place: { id: string } }) => poi.place.id)).toEqual([
      "user-coffee",
      "candidate-gym",
    ]);
    expect(getAuthenticatedInternRound1Places).toHaveBeenCalledWith("intern-1");
    expect(searchRoutePoiCandidates).toHaveBeenCalledWith({ geometry, kinds: ["coffee", "gym"] });
  });

  it("rejects authenticated Subletters before invoking Person C", async () => {
    getAuthenticatedInternRound1Places.mockRejectedValueOnce(
      new RoutePoiForbiddenError("intern_required"),
    );
    const { POST } = await import("@/app/api/route/pois/route");

    const response = await POST(request({ geometry, kinds: ["coffee"] }));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "intern_required" });
    expect(searchRoutePoiCandidates).not.toHaveBeenCalled();
  });

  it("returns a client error for invalid input before invoking Person C", async () => {
    const { POST } = await import("@/app/api/route/pois/route");

    const response = await POST(request({ geometry, kinds: ["avoid"] }));

    expect(response.status).toBe(400);
    expect(searchRoutePoiCandidates).not.toHaveBeenCalled();
  });

  it("rejects out-of-range geometry before loading caller places or invoking Person C", async () => {
    const { POST } = await import("@/app/api/route/pois/route");
    const invalidGeometry = {
      type: "LineString",
      coordinates: [[-181, 47.6], [-122.34, 47.61]],
    };

    const response = await POST(request({ geometry: invalidGeometry, kinds: ["coffee"] }));

    expect(response.status).toBe(400);
    expect(getAuthenticatedInternRound1Places).not.toHaveBeenCalled();
    expect(searchRoutePoiCandidates).not.toHaveBeenCalled();
  });
});
