import { describe, expect, it } from "vitest";
import { createAccountFromOffer, getMe, getFriends, getFriendRequests, getFriendNotes } from "@/lib/data/source";
import { offerParseFixture } from "@/lib/fixtures";
import type { OfferParse } from "@/lib/types/contract";

/**
 * Fixture mode (the default in tests): onboarding takes the LETTER's identity, not the
 * seeded persona, and the new identity starts with zero friends until they add people.
 */
describe("createAccountFromOffer (fixture mode)", () => {
  const letterOffer: OfferParse = {
    ...offerParseFixture,
    name: "Dana Whitfield",
    employer: "Acme",
    role: "Data Intern",
    city: "Austin",
    startDate: "2026-06-15",
  };

  it("the person on the letter becomes 'me', and the friend graph resets to empty", async () => {
    const before = await getFriends();
    expect(before.friends.length).toBeGreaterThan(0); // seeded flock exists pre-onboarding

    const result = await createAccountFromOffer(letterOffer);
    expect(result.mode).toBe("fixture");

    const me = await getMe();
    expect(me.name).toBe("Dana Whitfield");
    expect(me.company).toBe("Acme");
    expect(me.city).toBe("Austin");
    expect(me.move_in_date).toBe("2026-06-15");
    // The seeded persona's photo is not this person's photo.
    expect(me.avatar_url).toBeNull();

    const [friends, requests, notes] = await Promise.all([
      getFriends(),
      getFriendRequests(),
      getFriendNotes(),
    ]);
    expect(friends.friends).toEqual([]);
    expect(requests.requests).toEqual([]);
    expect(notes.notes).toEqual([]);
  });
});
