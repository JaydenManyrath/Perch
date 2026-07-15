import type { ItineraryResponse } from "@/lib/types/contract";

// A believable first-week plan starting Mon Jun 8 2026. Decision content stays clean;
// the chick only bookends at completion (A13 rule).
export const itineraryFixture: ItineraryResponse = {
  calendarSynced: false,
  landingWeek: [
    {
      date: "2026-06-08",
      dayLabel: "Day 1 — Landing",
      items: [
        {
          time: "10:30",
          title: "Land at SEA, ride Link light-rail to Capitol Hill",
          kind: "settle",
          note: "One-time $3 Link ticket. Bag then keys — sublease host is home 12–2.",
        },
        {
          time: "13:00",
          title: "Coffee near your usual-style spot",
          kind: "settle",
          lat: 47.6208,
          lng: -122.3202,
          note: "Perch found a place matching your usual — 4 min from your sublet.",
        },
        {
          time: "18:00",
          title: "Stripe intern welcome dinner",
          kind: "social",
          lat: 47.62,
          lng: -122.336,
          note: "SLU. Team pays. Wear whatever.",
        },
      ],
    },
    {
      date: "2026-06-09",
      dayLabel: "Day 2 — First day at Stripe",
      items: [
        {
          time: "08:30",
          title: "Walk to SLU (12 min)",
          kind: "settle",
          note: "Take the pedestrian bridge over I-5 — shaves 4 min.",
        },
        {
          time: "18:30",
          title: "Grocery run: QFC 15th Ave",
          kind: "errand",
          lat: 47.6145,
          lng: -122.3187,
          note: "Bag-your-own is faster in the evening.",
        },
      ],
    },
    {
      date: "2026-06-10",
      dayLabel: "Day 3",
      items: [
        {
          time: "19:00",
          title: "Rooftop trivia w/ your cohort",
          kind: "social",
          lat: 47.6115,
          lng: -122.3401,
          note: "6 same-company interns already RSVP'd.",
        },
      ],
    },
    {
      date: "2026-06-11",
      dayLabel: "Day 4",
      items: [
        {
          time: "07:00",
          title: "First gym workout",
          kind: "settle",
          lat: 47.6162,
          lng: -122.318,
          note: "Day passes are $10 — you'll want a monthly by next week.",
        },
        {
          time: "19:30",
          title: "Interns pub-quiz — Capitol Hill",
          kind: "social",
          lat: 47.6141,
          lng: -122.3208,
          note: "Bring a team name.",
        },
      ],
    },
    {
      date: "2026-06-12",
      dayLabel: "Day 5",
      items: [
        {
          time: "12:30",
          title: "Lunch walk to Pike Place",
          kind: "explore",
          lat: 47.6094,
          lng: -122.3395,
          note: "Post Alley has buskers — leave time to wander.",
        },
      ],
    },
    {
      date: "2026-06-13",
      dayLabel: "Day 6 — Weekend",
      items: [
        {
          time: "10:00",
          title: "Bainbridge ferry (walk-on)",
          kind: "explore",
          note: "$9 round-trip. Skips the queue.",
        },
        {
          time: "18:00",
          title: "Sunset kayak on Lake Union",
          kind: "social",
          lat: 47.6469,
          lng: -122.3396,
          note: "Bring layers; the wind picks up.",
        },
      ],
    },
    {
      date: "2026-06-14",
      dayLabel: "Day 7",
      items: [
        {
          time: "11:00",
          title: "Farmers market (Ballard)",
          kind: "explore",
          lat: 47.6684,
          lng: -122.384,
          note: "Cash for cherries.",
        },
        {
          time: "20:00",
          title: "Fred again.. at Climate Pledge",
          kind: "social",
          lat: 47.6221,
          lng: -122.3541,
          note: "Perch top pick — matches your top-artist profile.",
        },
      ],
    },
  ],
};
