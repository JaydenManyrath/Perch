import type { Review } from "@/lib/types/contract";
import { otherUsersFixture, sublettersFixture } from "./users";

// A small, believable set of Airbnb-style reviews.
// Two subjects: subjectType='listing' (subjectId = a listing id) or
// subjectType='subletter' (subjectId = a subletter user id).
const REV = (
  id: string,
  subjectType: "listing" | "subletter",
  subjectId: string,
  reviewerIdx: number,
  rating: 1 | 2 | 3 | 4 | 5,
  body: string,
  createdAt: string,
): Review => {
  const r = otherUsersFixture[reviewerIdx];
  return {
    id,
    subjectType,
    subjectId,
    reviewer: { id: r.id, name: r.name, avatarUrl: r.avatar_url },
    rating,
    body,
    createdAt,
  };
};

export const reviewsFixture: Review[] = [
  REV("R1", "listing", "L1", 0, 5, "Sunny room and Elena responded within an hour. Kitchen is small but I basically live at the coffee shop next door.", "2026-05-10T12:00:00Z"),
  REV("R2", "listing", "L1", 3, 4, "Good bones, some street noise on weekends. Neighborhood is a five-minute walk to everything.", "2026-05-14T09:00:00Z"),
  REV("R3", "listing", "L4", 4, 5, "The backyard sold me. Ballard is a hike from SLU but the express bus is fine.", "2026-05-19T14:00:00Z"),
  REV("R4", "listing", "L5", 1, 4, "Tiny but adorable. Marcus left the fridge stocked which was a huge kindness after a red-eye.", "2026-05-21T18:00:00Z"),
  REV("R5", "listing", "L6", 2, 3, "Building is nice; the walk to the office through Belltown after dark is fine but I'd want to be with someone late.", "2026-05-22T18:00:00Z"),
  REV("R6", "listing", "L7", 6, 5, "Hana is a great host, the shared house is chill. The commute to Queen Anne is beautiful in the morning.", "2026-05-24T18:00:00Z"),
  REV("R7", "listing", "L8", 7, 4, "Loved being able to walk Green Lake before work. Marcus was responsive.", "2026-05-26T18:00:00Z"),

  // Subletter-level reviews (about the person, not a specific listing).
  REV("R8", "subletter", sublettersFixture[0].id, 0, 5, "Elena is the reason I'd sublet from a person over a company. Clear, kind, prepared.", "2026-05-11T09:00:00Z"),
  REV("R9", "subletter", sublettersFixture[0].id, 5, 4, "Communicated well, honest about the shared laundry situation.", "2026-05-15T15:00:00Z"),
  REV("R10", "subletter", sublettersFixture[1].id, 2, 5, "Marcus is thorough - a checklist, a welcome note, a spare key at a neighbor. Zero drama.", "2026-05-23T10:00:00Z"),
  REV("R11", "subletter", sublettersFixture[2].id, 6, 3, "Hana was helpful but slow to reply once I moved in. Fine overall.", "2026-05-25T10:00:00Z"),
];
