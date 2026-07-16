import type { EventComment } from "@/lib/types/contract";
import { otherUsersFixture } from "./users";

/** Round 2 batch 2 (§12.2) — seed comments on a couple of events. */

const EC = (
  id: string,
  eventId: string,
  authorIdx: number,
  body: string,
  createdAt: string,
): EventComment => {
  const u = otherUsersFixture[authorIdx];
  return {
    id,
    eventId,
    author: { id: u.id, name: u.name, avatarUrl: u.avatar_url },
    body,
    createdAt,
  };
};

export const eventCommentsFixture: EventComment[] = [
  EC("EC1", "E1", 0, "grabbing a group before the show - dm me", "2026-06-10T12:00:00Z"),
  EC("EC2", "E1", 3, "cheapest tix went on presale, check Dice", "2026-06-11T18:00:00Z"),
  EC("EC3", "E3", 8, "the trivia team last week was mostly Stripe folks, come find us", "2026-06-08T20:00:00Z"),
  EC("EC4", "E6", 3, "warehouse doors close early, get there by 10", "2026-06-25T09:00:00Z"),
];
