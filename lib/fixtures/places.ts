import type { MapPlacesResponse } from "@/lib/types/contract";

// Life-map — recurring places from a pre-loaded Takeout sample.
// nearestListingMinutes is the deterministic distance beat (owned by Person B; A only renders).
export const mapPlacesFixture: MapPlacesResponse = {
  places: [
    {
      id: "P1",
      label: "Your usual coffee spot",
      kind: "coffee",
      lat: 47.6208,
      lng: -122.3202,
      frequency: 34,
      nearestListingMinutes: 4,
    },
    {
      id: "P2",
      label: "Gym you keep going to",
      kind: "gym",
      lat: 47.6162,
      lng: -122.318,
      frequency: 21,
      nearestListingMinutes: 8,
    },
    {
      id: "P3",
      label: "Grocery run",
      kind: "grocery",
      lat: 47.6145,
      lng: -122.3187,
      frequency: 12,
      nearestListingMinutes: 6,
    },
    {
      id: "P4",
      label: "Light-rail stop",
      kind: "transit",
      lat: 47.614,
      lng: -122.32,
      frequency: 60,
      nearestListingMinutes: 3,
    },
    {
      id: "P5",
      label: "Venue you love",
      kind: "show",
      lat: 47.6612,
      lng: -122.313,
      frequency: 5,
    },
    {
      id: "P6",
      label: "Office (Stripe)",
      kind: "work",
      lat: 47.62,
      lng: -122.336,
      frequency: 50,
      nearestListingMinutes: 12,
    },
    {
      id: "P7",
      label: "Bakery you love",
      kind: "other",
      lat: 47.651,
      lng: -122.35,
      frequency: 9,
    },
  ],
};
