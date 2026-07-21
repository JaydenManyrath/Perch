import type { EventRow } from "@/lib/types/contract";

// Round 2: events carry venue + url + image_url + price_range (from Ticketmaster or seed).
// Round 3 (section 13.1): dates are UPCOMING (>= today) - past events would be filtered out
// server-side, so the fixture mirrors that guarantee. Fixed ISO dates keep the fixture
// deterministic for tests; the late-Jul..Sep 2026 window matches the intern-summer demo,
// and the Ticketmaster fallback (lib/events/ticketmaster.ts) re-projects these dates onto
// a rolling future window anyway. Times encode realistic Seattle local hours as UTC
// (PDT = UTC-7), so shows render as evening events and markets as mornings.
// Ids E1..E10 are referenced by lib/fixtures/feed.ts and lib/fixtures/friends.ts - keep stable.
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=800`;

export const eventsFixture: EventRow[] = [
  {
    id: "E1",
    title: "Fred again.. at Climate Pledge",
    category: "electronic",
    lat: 47.6221,
    lng: -122.3541,
    datetime: "2026-08-15T03:00:00Z", // Fri Aug 14, 8:00 PM PDT
    source: "seeded",
    external_id: "tm-E1",
    url: "https://www.climatepledgearena.com",
    venue: "Climate Pledge Arena",
    image_url: IMG("photo-1465847899084-d164df4dedc6"),
    price_range: "$65-$120",
  },
  {
    id: "E2",
    title: "Phoenix at The Showbox",
    category: "indie",
    lat: 47.6086,
    lng: -122.3394,
    datetime: "2026-08-22T03:00:00Z", // Fri Aug 21, 8:00 PM PDT
    source: "seeded",
    external_id: "tm-E2",
    url: "https://www.showboxpresents.com",
    venue: "The Showbox",
    image_url: IMG("photo-1501386761578-eac5c94b800a"),
    price_range: "$45-$85",
  },
  {
    id: "E3",
    title: "Interns pub-quiz - Capitol Hill",
    category: "social",
    lat: 47.6141,
    lng: -122.3208,
    datetime: "2026-07-24T02:00:00Z", // Thu Jul 23, 7:00 PM PDT
    source: "community",
    external_id: null,
    url: null,
    venue: "Optimism Brewing",
    image_url: IMG("photo-1517457373958-b7bdd4587205"),
    price_range: "Free",
  },
  {
    id: "E4",
    title: "Beach House at Neptune Theatre",
    category: "shoegaze",
    lat: 47.6612,
    lng: -122.313,
    datetime: "2026-09-06T03:30:00Z", // Sat Sep 5, 8:30 PM PDT
    source: "seeded",
    external_id: "tm-E4",
    url: "https://www.stgpresents.org",
    venue: "Neptune Theatre",
    image_url: IMG("photo-1470229722913-7c0e2dbbafd3"),
    price_range: "$55-$95",
  },
  {
    id: "E5",
    title: "Sunset kayak on Lake Union",
    category: "outdoors",
    lat: 47.6469,
    lng: -122.3396,
    datetime: "2026-07-26T01:00:00Z", // Sat Jul 25, 6:00 PM PDT
    source: "meetup",
    external_id: null,
    url: null,
    venue: "Lake Union Park",
    image_url: IMG("photo-1476514525535-07fb3b4ae5f1"),
    price_range: "$25 rental",
  },
  {
    id: "E6",
    title: "Warehouse night: Kremwerk + Timbre Room",
    category: "techno",
    lat: 47.6174,
    lng: -122.3319,
    datetime: "2026-08-08T05:00:00Z", // Fri Aug 7, 10:00 PM PDT
    source: "seeded",
    external_id: "tm-E6",
    url: "https://www.kremwerk.com",
    venue: "Kremwerk",
    image_url: IMG("photo-1470225620780-dba8ba36b745"),
    price_range: "$15-$25",
  },
  {
    id: "E7",
    title: "Fremont Sunday Market",
    category: "market",
    lat: 47.6497,
    lng: -122.351,
    datetime: "2026-07-26T17:00:00Z", // Sun Jul 26, 10:00 AM PDT
    source: "community",
    external_id: null,
    url: "https://www.fremontmarket.com",
    venue: "Fremont Sunday Market",
    image_url: IMG("photo-1488459716781-31db52582fe9"),
    price_range: "Free entry",
  },
  {
    id: "E8",
    title: "Rooftop trivia w/ Perch interns",
    category: "social",
    lat: 47.6104,
    lng: -122.3417,
    datetime: "2026-07-30T02:30:00Z", // Wed Jul 29, 7:30 PM PDT
    source: "community",
    external_id: null,
    url: null,
    venue: "The Nest at Thompson Seattle",
    image_url: IMG("photo-1543007630-9710e4a00a20"),
    price_range: "Free",
  },
  {
    id: "E9",
    title: "boygenius at Paramount",
    category: "indie",
    lat: 47.6134,
    lng: -122.3318,
    datetime: "2026-09-20T03:00:00Z", // Sat Sep 19, 8:00 PM PDT
    source: "seeded",
    external_id: "tm-E9",
    url: "https://www.stgpresents.org",
    venue: "Paramount Theatre",
    image_url: IMG("photo-1459749411175-04bf5292ceea"),
    price_range: "$75-$140",
  },
  {
    id: "E10",
    title: "Mount Rainier day hike (carpool)",
    category: "outdoors",
    lat: 46.8523,
    lng: -121.7603,
    datetime: "2026-08-01T14:00:00Z", // Sat Aug 1, 7:00 AM PDT
    source: "community",
    external_id: null,
    url: null,
    venue: "Paradise Trailhead",
    image_url: IMG("photo-1506905925346-21bda4d32df4"),
    price_range: "Gas share",
  },
];
