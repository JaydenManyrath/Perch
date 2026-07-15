import type { OfferParse, TasteProfile } from "@/lib/types/contract";

// Canned onboarding parses so the flow is fully demoable on fixtures.
export const offerParseFixture: OfferParse = {
  employer: "Stripe",
  role: "Software Engineer Intern",
  salary: 145000,
  startDate: "2026-06-08",
  endDate: "2026-08-14",
  city: "Seattle",
};

export const tasteProfileFixture: TasteProfile = {
  topArtists: ["Phoenix", "Rina Sawayama", "Fred again..", "Beach House"],
  topGenres: ["indie", "techno", "shoegaze"],
  topTracks: ["Lisztomania", "XS", "Marea (we've lost dancing)"],
  energy: 0.68,
};
