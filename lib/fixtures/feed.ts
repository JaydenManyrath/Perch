import type { FeedResponse } from "@/lib/types/contract";
import { eventsFixture } from "./events";

function eventForFeed(id: string): FeedResponse["items"][number]["event"] {
  const event = eventsFixture.find((e) => e.id === id);
  if (!event) throw new Error(`Missing event fixture ${id}`);
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    lat: event.lat,
    lng: event.lng,
    datetime: event.datetime,
    source: event.source,
    venue: event.venue ?? null,
    url: event.url ?? null,
    imageUrl: event.image_url ?? null,
    priceRange: event.price_range ?? null,
  };
}

/**
 * The Flyway - taste-ranked events. Deterministic tasteScore + LLM-style reason.
 * Round 2 (batch 2): each item carries an internsGoing count and viewerGoing flag.
 * Round 2: feed is events-only (past-intern notes moved to the map, §12.1).
 */
export const feedFixture: FeedResponse = {
  items: [
    {
      event: eventForFeed("E1"),
      tasteScore: 0.94,
      reason: "Matches your Fred again.. + electronic top-artists profile.",
      internsGoing: 12,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E2"),
      tasteScore: 0.9,
      reason: "Phoenix - one of your top artists, live within a mile of your sublet.",
      internsGoing: 8,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E3"),
      tasteScore: 0.82,
      reason: "Other Stripe interns going. Same move-week cohort.",
      internsGoing: 14,
      viewerGoing: true,
    },
    {
      event: eventForFeed("E4"),
      tasteScore: 0.79,
      reason: "Shoegaze - pulls straight from your Beach House rotation.",
      internsGoing: 5,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E5"),
      tasteScore: 0.71,
      reason: "You've been marking outdoors places on the map - good group intro.",
      internsGoing: 6,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E6"),
      tasteScore: 0.7,
      reason: "Warehouse techno fits your electronic picks. Late show - bring a jacket.",
      internsGoing: 9,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E8"),
      tasteScore: 0.66,
      reason: "Same company, same week - small-group trivia on a rooftop.",
      internsGoing: 11,
      viewerGoing: true,
    },
    {
      event: eventForFeed("E7"),
      tasteScore: 0.58,
      reason: "Fremont Sunday Market - vintage stalls and food trucks, a Sunday staple.",
      internsGoing: 4,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E9"),
      tasteScore: 0.55,
      reason: "boygenius - the indie side of your taste.",
      internsGoing: 7,
      viewerGoing: false,
    },
    {
      event: eventForFeed("E10"),
      tasteScore: 0.49,
      reason: "Rainier day-hike - a whole-day social with your cohort.",
      internsGoing: 3,
      viewerGoing: false,
    },
  ],
};
