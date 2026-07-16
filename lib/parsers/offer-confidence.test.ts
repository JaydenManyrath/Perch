import { describe, it, expect } from "vitest";
import { parseOfferText, emptyOffer, REVIEW_THRESHOLD } from "./offerLetter";

describe("parseOfferText confidence + needsReview (RC4)", () => {
  const clean =
    "On behalf of Stripe, we are pleased to offer you a position at Stripe as a Software Engineer Intern.\n" +
    "Position: Software Engineer Intern\n" +
    "Your annual base salary will be $126,000 per year.\n" +
    "Start date: June 8, 2026.\n" +
    "Location: Seattle, WA.\n";

  it("high confidence on a clean labelled letter; nothing needs review", () => {
    const p = parseOfferText(clean);
    expect(p.salary).toBe(126000);
    expect(p.confidence.salary).toBeGreaterThanOrEqual(0.9);
    expect(p.confidence.employer).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    expect(p.needsReview).not.toContain("salary");
  });

  it("flags a missing salary (confidence 0, never invented)", () => {
    const p = parseOfferText("Welcome to Acme. Start date: 2026-06-01.");
    expect(p.salary).toBeNull();
    expect(p.confidence.salary).toBe(0);
    expect(p.needsReview).toContain("salary");
  });

  it("flags an estimated end date as lower confidence", () => {
    const p = parseOfferText(clean); // no explicit end date -> estimated
    expect(p.endDate).not.toBeNull();
    expect(p.confidence.endDate).toBeLessThan(0.9);
  });

  it("broadened formats: 'compensation of $X' and 'join <Company>'", () => {
    const p = parseOfferText("We would love for you to join Databricks. Your compensation of $140,000 applies.");
    expect(p.employer).toBe("Databricks");
    expect(p.salary).toBe(140000);
  });

  it("every field has a confidence in [0,1]", () => {
    const p = parseOfferText(clean);
    for (const f of Object.values(p.confidence)) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("emptyOffer flags every field and invents nothing", () => {
    const e = emptyOffer();
    expect(e.salary).toBeNull();
    expect(e.needsReview).toEqual(["employer", "role", "salary", "startDate", "endDate", "city"]);
    expect(Object.values(e.confidence).every((c) => c === 0)).toBe(true);
  });
});
