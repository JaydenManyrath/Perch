/**
 * Fixtures - local JSON matching the FROZEN contract shapes exactly.
 * Rich enough to make every surface look alive on `NEXT_PUBLIC_DATA_SOURCE=fixture`.
 *
 * Density-first cohort (contract §7): Seattle summer '26, mostly Stripe/Anthropic/
 * Meta/Google interns moving the week of Jun 8 2026.
 *
 * Round 2 adds: subletters, freshness columns on listings, reviews, perches deck,
 * public profiles, map comments, event comments, friends + notes, commute route.
 */

export * from "./users";
export * from "./listings";
export * from "./stickers";
export * from "./events";
export * from "./notes";
export * from "./checklist";
export * from "./feed";
export * from "./matches";
export * from "./places";
export * from "./itinerary";
export * from "./messages";
export * from "./conversations";
export * from "./onboarding";

// Round 2.
export * from "./reviews";
export * from "./perches";
export * from "./publicProfiles";
export * from "./friends";
export * from "./mapComments";
export * from "./eventComments";
export * from "./route";

// Round 3.
export * from "./listingDetails";
export * from "./bookings";
export * from "./finance";
