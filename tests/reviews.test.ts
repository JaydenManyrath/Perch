import { describe, expect, it } from "vitest";
import { parseReviewPayload, parseReviewSubject, summarizeRatings } from "@/lib/reviews/aggregate";

describe("review parsing and summaries", () => {
  it("returns an empty deterministic summary for subjects with no reviews", () => {
    expect(summarizeRatings([])).toEqual({ avgRating: 0, count: 0 });
  });

  it("rounds non-empty integer ratings to one decimal place", () => {
    expect(summarizeRatings([5, 4, 4])).toEqual({ avgRating: 4.3, count: 3 });
    expect(summarizeRatings([1, 2, 2])).toEqual({ avgRating: 1.7, count: 3 });
  });

  it("accepts only listing or subletter UUID subjects", () => {
    expect(() => parseReviewSubject("intern", "11111111-1111-5111-8111-111111111111")).toThrow();
    expect(() => parseReviewSubject("listing", "not-a-uuid")).toThrow();
    expect(parseReviewSubject("subletter", "33333333-3333-5333-8333-333333333333")).toEqual({
      subjectType: "subletter",
      subjectId: "33333333-3333-5333-8333-333333333333",
    });
  });

  it("rejects ratings outside 1 through 5 and ignores forged reviewer ids", () => {
    expect(() =>
      parseReviewPayload({
        subjectType: "listing",
        subjectId: "11111111-1111-5111-8111-111111111111",
        rating: 6,
        body: "too high",
      }),
    ).toThrow();

    expect(
      parseReviewPayload({
        subjectType: "listing",
        subjectId: "11111111-1111-5111-8111-111111111111",
        reviewer_id: "22222222-2222-5222-8222-222222222222",
        rating: 5,
        body: "great",
      }),
    ).not.toHaveProperty("reviewer_id");
  });
});
