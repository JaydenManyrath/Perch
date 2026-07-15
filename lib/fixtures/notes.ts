import type { NoteRow } from "@/lib/types/contract";
import { otherUsersFixture } from "./users";

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
  },
];
