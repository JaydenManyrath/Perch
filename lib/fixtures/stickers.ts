import type { StickerRow } from "@/lib/types/contract";
import { ME_ID } from "./users";

// POSITIVE-ONLY stickers across the six categories (contract §2).
export const stickersFixture: StickerRow[] = [
  {
    id: "S1",
    lat: 47.6205,
    lng: -122.3212,
    category: "good_coffee",
    note: "Small quiet spot, oat lattes 5/5.",
    created_by: ME_ID,
    created_at: "2026-06-02T09:00:00Z",
  },
  {
    id: "S2",
    lat: 47.6141,
    lng: -122.3388,
    category: "interns_hang",
    note: "Amazon interns pack this rooftop Fridays.",
    created_by: ME_ID,
    created_at: "2026-06-03T18:00:00Z",
  },
  {
    id: "S3",
    lat: 47.6612,
    lng: -122.312,
    category: "safe_feeling",
    note: "Well-lit and busy till late — good walk-home.",
    created_by: ME_ID,
    created_at: "2026-06-03T21:00:00Z",
  },
  {
    id: "S4",
    lat: 47.65,
    lng: -122.3502,
    category: "great_food",
    note: "Fremont — the bakery on 34th is a religion.",
    created_by: ME_ID,
    created_at: "2026-06-04T12:00:00Z",
  },
  {
    id: "S5",
    lat: 47.6062,
    lng: -122.3321,
    category: "good_vibe",
    note: "Post Alley near Pike — buskers all summer.",
    created_by: ME_ID,
    created_at: "2026-06-04T20:00:00Z",
  },
  {
    id: "S6",
    lat: 47.665,
    lng: -122.371,
    category: "green_space",
    note: "Woodland Park — grab lunch and touch grass.",
    created_by: ME_ID,
    created_at: "2026-06-05T13:00:00Z",
  },
];
