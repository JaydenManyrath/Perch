import type { NoteRow } from "@/lib/types/contract";
import { otherUsersFixture } from "./users";

// Round 2: notes with lat/lng are MAP COMMENTS (rendered as placeholders on the map).
// Notes without lat/lng remain informational (kept for legacy but not surfaced in the
// events-only feed).
export const notesFixture: NoteRow[] = [
  {
    id: "N1",
    city: "Seattle",
    area: "Capitol Hill",
    topic: "Grocery runs without a car",
    body:
      "Whole Foods on Broadway is the easiest, but the QFC on 15th is cheaper and less busy on weekday evenings.",
    created_by: otherUsersFixture[1].id, // Sam
    created_at: "2026-05-28T20:00:00Z",
    lat: 47.6162,
    lng: -122.3187,
  },
  {
    id: "N2",
    city: "Seattle",
    area: "SLU",
    topic: "Getting to Stripe office",
    body:
      "The South Lake Union Streetcar drops you a block from the office and it's $2.75. Faster than a bus after 5pm.",
    created_by: otherUsersFixture[0].id, // Jordan
    created_at: "2026-05-30T09:00:00Z",
    lat: 47.6220,
    lng: -122.3363,
  },
  {
    id: "N3",
    city: "Seattle",
    area: null,
    topic: "Weekend micro-trips",
    body:
      "Bainbridge ferry (walk-on) is a $9 vibe reset. Twin Peaks tour goes up to Snoqualmie in ~40 min.",
    created_by: otherUsersFixture[10].id, // Talia
    created_at: "2026-06-02T14:00:00Z",
    lat: 47.6205,
    lng: -122.3493,
  },
  {
    id: "N4",
    city: "Seattle",
    area: "Ballard",
    topic: "Best cheap ramen",
    body: "Ooink on Broadway does a killer tonkotsu for under $16; go before 6.",
    created_by: otherUsersFixture[3].id, // Priya
    created_at: "2026-06-04T18:00:00Z",
    lat: 47.6141,
    lng: -122.3200,
  },
  {
    id: "N5",
    city: "Seattle",
    area: "Fremont",
    topic: "Quiet study spot",
    body: "The library upstairs at the Fremont branch is nearly empty on weekday mornings.",
    created_by: otherUsersFixture[5].id, // Diego
    created_at: "2026-06-05T10:00:00Z",
    lat: 47.6510,
    lng: -122.3502,
  },
];
