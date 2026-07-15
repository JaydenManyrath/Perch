import type { FeedResponse } from "@/lib/types/contract";
import { eventsFixture } from "./events";

// The Flyway — taste-ranked events. Deterministic tasteScore + LLM-style reason.
export const feedFixture: FeedResponse = {
  items: [
    {
      event: eventsFixture.find((e) => e.id === "E1")!,
      tasteScore: 0.94,
      reason: "Matches your Fred again.. + electronic top-artists profile.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E2")!,
      tasteScore: 0.9,
      reason: "Phoenix — one of your top artists, live within a mile of your sublet.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E3")!,
      tasteScore: 0.82,
      reason: "Other Stripe interns going. Same move-week cohort.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E4")!,
      tasteScore: 0.79,
      reason: "Shoegaze — pulls straight from your Beach House rotation.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E5")!,
      tasteScore: 0.71,
      reason: "You've been marking outdoors places on the map — good group intro.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E6")!,
      tasteScore: 0.7,
      reason: "Peggy Gou fits your techno picks. Late show — bring a jacket.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E8")!,
      tasteScore: 0.66,
      reason: "Same company, same week — small-group trivia on a rooftop.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E7")!,
      tasteScore: 0.58,
      reason: "Ballard SeafoodFest — a Seattle summer staple.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E9")!,
      tasteScore: 0.55,
      reason: "boygenius — the indie side of your taste.",
    },
    {
      event: eventsFixture.find((e) => e.id === "E10")!,
      tasteScore: 0.49,
      reason: "Rainier day-hike — a whole-day social with your cohort.",
    },
  ],
};
