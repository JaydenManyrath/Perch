/**
 * CS 7314 regression cases for D16 (found by UBST round 2): the deck offered "Request to
 * book" on listings another intern already held, and the request was then refused.
 * Held listings are now hidden from the deck, except for the people in the hold.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listingsHeldByOthers } from "@/lib/perches";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("D16 hold rule", () => {
  it("R16-01 hides a listing held by someone else", () => {
    expect([...listingsHeldByOthers([{ listingId: "L", bookerId: OTHER, roommateIds: [], inviteIds: [] }], ME)]).toEqual(["L"]);
  });
  it("R16-02 keeps it for the booker, a roommate and an invitee", () => {
    for (const hold of [
      { listingId: "L", bookerId: ME, roommateIds: [], inviteIds: [] },
      { listingId: "L", bookerId: OTHER, roommateIds: [ME], inviteIds: [] },
      { listingId: "L", bookerId: OTHER, roommateIds: [], inviteIds: [ME] },
    ]) {
      expect(listingsHeldByOthers([hold], ME).size).toBe(0);
    }
  });
});

describe("D16 fixture deck", () => {
  it("R16-03 the deck no longer offers L8, which Priya holds", async () => {
    const { getPerchDeck } = await import("@/lib/data/source");
    const { deck } = await getPerchDeck();
    expect(deck.some((c) => c.id === "L8")).toBe(false);
    expect(deck.length).toBeGreaterThan(0);
  });
});

// ---- live route ----
const guard = vi.fn();
const createServerSupabase = vi.fn();
const createAdminClient = vi.fn();
vi.mock("@/lib/http", () => ({ guard }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

const listing = (id: string) => ({
  id, title: id, address: "1 Pine St", lat: 47.6, lng: -122.3, price: 1500, lease_start: "2026-06-01", lease_end: "2026-08-31",
  lease_type: "sublet", source: null, photos: [], safety_flags: { scamSignals: [], notes: [] }, created_by: null,
  created_at: "2026-07-01T00:00:00Z", status: "available", expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  last_confirmed_at: null, sourced: true, source_name: "seed", source_url: null, external_id: null, users: null,
});

/** Chainable stand-in: every builder method returns itself; awaiting yields `result`. */
function chain(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gt", "not", "neq", "order", "limit", "in"]) q[m] = () => q;
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("D16 live deck route", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    guard.mockResolvedValue({ callerId: ME, headers: {} });
    createServerSupabase.mockResolvedValue({
      from: (t: string) =>
        chain(t === "listing_swipes" ? { data: [], error: null } : t === "listings" ? { data: [listing(A), listing(B)], error: null } : { data: [], error: null }),
    });
  });

  it("R16-04 hides a listing another intern holds", async () => {
    createAdminClient.mockReturnValue({
      from: () => chain({ data: [{ listing_id: B, booker_id: OTHER, roommate_ids: [], roommate_invites: [] }], error: null }),
    });
    const { GET } = await import("@/app/api/perches/route");
    const body = await (await GET(new Request("http://t/api/perches"))).json();
    expect(body.deck.map((c: { id: string }) => c.id)).toEqual([A]);
  });

  it("R16-05 serves the full deck if the hold lookup fails (never a broken deck)", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("no service role key");
    });
    const { GET } = await import("@/app/api/perches/route");
    const res = await GET(new Request("http://t/api/perches"));
    expect(res.status).toBe(200);
    expect((await res.json()).deck).toHaveLength(2);
  });
});
