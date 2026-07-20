import type { Friend, FriendNote } from "@/lib/types/contract";
import { otherUsersFixture } from "./users";
import { eventsFixture } from "./events";

/** Round 2 batch 2 (§12.3, §12.4) — accepted friends + pending requests + friend notes. */

const F = (idx: number, status: "pending" | "accepted", direction?: "incoming" | "outgoing"): Friend => {
  const u = otherUsersFixture[idx];
  return {
    user: { id: u.id, name: u.name, avatarUrl: u.avatar_url, company: u.company },
    status,
    ...(direction ? { direction } : {}),
  };
};

// Accepted friends (Alex's flock so far).
export const friendsFixture: Friend[] = [
  F(0, "accepted"),  // Jordan Kim
  F(3, "accepted"),  // Priya Menon
  F(4, "accepted"),  // Miles Okafor
  F(8, "accepted"),  // Wesley Cho
];

// Pending requests inbox (incoming — someone wants to add me).
export const friendRequestsFixture: Friend[] = [
  F(2, "pending", "incoming"),  // Sam Rivera
  F(10, "pending", "incoming"), // Talia Berg
  // One outgoing (I sent it, waiting on them).
  F(9, "pending", "outgoing"),  // Rafi Haque
];

// Friends going to events (Notes strip source).
const N = (friendIdx: number, eventId: string): FriendNote => {
  const u = otherUsersFixture[friendIdx];
  const e = eventsFixture.find((ev) => ev.id === eventId)!;
  return {
    friend: { id: u.id, name: u.name, avatarUrl: u.avatar_url },
    event: { id: e.id, title: e.title, datetime: e.datetime },
  };
};

export const friendNotesFixture: FriendNote[] = [
  N(0, "E1"),  // Jordan -> Fred again..
  N(3, "E6"),  // Priya -> Kremwerk warehouse night
  N(4, "E2"),  // Miles -> Phoenix
  N(8, "E3"),  // Wesley -> intern pub-quiz
];
