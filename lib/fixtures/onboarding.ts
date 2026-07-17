import type { OfferParse, TasteProfile } from "@/lib/types/contract";

// Canned onboarding parses so the flow is fully demoable on fixtures.
// Round 2 (§11.9): confidence + needsReview mimic what Person C's OCR pipeline returns.
export const offerParseFixture: OfferParse = {
  employer: "Stripe",
  role: "Software Engineer Intern",
  salary: 145000,
  startDate: "2026-06-08",
  endDate: "2026-08-14",
  city: "Seattle",
  relocationStipend: 5000,
  signingBonus: 10000,
  confidence: {
    employer: 0.98,
    role: 0.94,
    // City came from a scanned-image PDF and the OCR guessed - flag it for the user.
    city: 0.52,
    // The salary line was truncated by a page break; low confidence.
    salary: 0.48,
    startDate: 0.91,
    endDate: 0.83,
  },
  needsReview: ["salary", "city"],
};

export const tasteProfileFixture: TasteProfile = {
  topArtists: ["Phoenix", "Rina Sawayama", "Fred again..", "Beach House"],
  topGenres: ["indie", "techno", "shoegaze"],
  topTracks: ["Lisztomania", "XS", "Marea (we've lost dancing)"],
  energy: 0.68,
};
