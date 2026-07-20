import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOfferPdf, parseOfferText, emptyOffer, REVIEW_THRESHOLD } from "./offerLetter";

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
    expect(e.relocationStipend).toBeNull();
    expect(e.signingBonus).toBeNull();
    expect(e.needsReview).toEqual(["name", "employer", "role", "salary", "startDate", "endDate", "city"]);
    expect(Object.keys(e.confidence).sort()).toEqual([
      "city",
      "employer",
      "endDate",
      "name",
      "relocationStipend",
      "role",
      "salary",
      "signingBonus",
      "startDate",
    ]);
    expect(Object.values(e.confidence).every((c) => c === 0)).toBe(true);
  });
});

describe("parseOfferText upfront-cash benefits (RC32)", () => {
  const fullOffer =
    "Employer: Stripe\n" +
    "Position: Software Engineer Intern\n" +
    "Your annual base salary will be $126,000 per year.\n" +
    "Start date: June 8, 2026.\n" +
    "End date: August 14, 2026.\n" +
    "Location: Seattle, WA.\n" +
    "Relocation stipend: $4,500.\n" +
    "Signing bonus: $12,000.\n";

  it("extracts exact labelled relocation stipend and signing bonus amounts", () => {
    const p = parseOfferText(fullOffer);
    expect(p.salary).toBe(126000);
    expect(p.relocationStipend).toBe(4500);
    expect(p.signingBonus).toBe(12000);
    expect(p.confidence.relocationStipend).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    expect(p.confidence.signingBonus).toBeGreaterThanOrEqual(REVIEW_THRESHOLD);
    expect(p.needsReview).not.toContain("relocationStipend");
    expect(p.needsReview).not.toContain("signingBonus");
  });

  it("supports common aliases and one-time payment wording", () => {
    const p = parseOfferText(
      "Company: Figma\n" +
        "Role: Product Design Intern\n" +
        "Location: San Francisco, CA.\n" +
        "Start date: 2026-06-01.\n" +
        "Salary: $118,000 annually.\n" +
        "Move-in allowance of $3,250 will be paid before your start date.\n" +
        "You will also receive a one-time sign-on payment of $7,500.\n",
    );
    expect(p.relocationStipend).toBe(3250);
    expect(p.signingBonus).toBe(7500);
  });

  it("does not mistake salary or unrelated payments for benefits", () => {
    const p = parseOfferText(
      "Company: Acme\n" +
        "Role: Software Engineer Intern\n" +
        "Location: Austin, TX.\n" +
        "Start date: 2026-06-01.\n" +
        "Salary: $115,000 annually.\n" +
        "Monthly housing near the office is estimated at $1,900.\n" +
        "Equity refresh value: $20,000.\n",
    );
    expect(p.salary).toBe(115000);
    expect(p.relocationStipend).toBeNull();
    expect(p.signingBonus).toBeNull();
    expect(p.confidence.relocationStipend).toBe(0);
    expect(p.confidence.signingBonus).toBe(0);
    expect(p.needsReview).not.toContain("relocationStipend");
    expect(p.needsReview).not.toContain("signingBonus");
  });

  it("distinguishes absent optional benefits from ambiguous mentioned benefits", () => {
    const absent = parseOfferText("Company: Acme\nRole: Intern\nSalary: $90,000 annually.\nStart date: 2026-06-01.\nLocation: Chicago, IL.");
    expect(absent.relocationStipend).toBeNull();
    expect(absent.signingBonus).toBeNull();
    expect(absent.needsReview).not.toContain("relocationStipend");
    expect(absent.needsReview).not.toContain("signingBonus");

    const ambiguous = parseOfferText(
      "Company: Acme\nRole: Intern\nSalary: $90,000 annually.\nStart date: 2026-06-01.\nLocation: Chicago, IL.\n" +
        "Relocation assistance is available after approval.\n" +
        "A signing bonus may be discussed with recruiting.\n",
    );
    expect(ambiguous.relocationStipend).toBeNull();
    expect(ambiguous.signingBonus).toBeNull();
    expect(ambiguous.needsReview).toContain("relocationStipend");
    expect(ambiguous.needsReview).toContain("signingBonus");
  });

  it("flags ranged or qualified benefit amounts without inventing a number", () => {
    const p = parseOfferText(
      "Company: Acme\nRole: Intern\nSalary: $90,000 annually.\nStart date: 2026-06-01.\nLocation: Chicago, IL.\n" +
        "Relocation stipend: $2,000 to $4,000 depending on distance.\n" +
        "Sign-on bonus up to $6,000 if approved.\n",
    );
    expect(p.relocationStipend).toBeNull();
    expect(p.signingBonus).toBeNull();
    expect(p.needsReview).toContain("relocationStipend");
    expect(p.needsReview).toContain("signingBonus");
  });

  it("prefers a later exact amount over an earlier ambiguous benefit mention", () => {
    const p = parseOfferText(
      "Company: Acme\nRole: Intern\nSalary: $90,000 annually.\nStart date: 2026-06-01.\nLocation: Chicago, IL.\n" +
        "Relocation assistance is available after approval. Relocation stipend: $4,500.\n" +
        "A signing bonus may be discussed with recruiting. Signing bonus: $8,000.\n",
    );
    expect(p.relocationStipend).toBe(4500);
    expect(p.signingBonus).toBe(8000);
    expect(p.needsReview).not.toContain("relocationStipend");
    expect(p.needsReview).not.toContain("signingBonus");
  });

  it("keeps every confidence value in the valid range and remains deterministic", () => {
    const first = parseOfferText(fullOffer);
    const second = parseOfferText(fullOffer);
    expect(first).toEqual(second);
    for (const value of Object.values(first.confidence)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("returns compatible benefit fields through the real-PDF path", async () => {
    const pdfPath = join(process.cwd(), "scripts", "fixtures", "sample-offer-letter.pdf");
    const fromText = parseOfferText(readFileSync(join(process.cwd(), "scripts", "fixtures", "sample-offer-letter.txt"), "utf8"));
    const fromPdf = await parseOfferPdf(readFileSync(pdfPath));
    expect(fromPdf.relocationStipend).toBe(fromText.relocationStipend);
    expect(fromPdf.signingBonus).toBe(fromText.signingBonus);
    expect(fromPdf.confidence.relocationStipend).toBe(fromText.confidence.relocationStipend);
    expect(fromPdf.confidence.signingBonus).toBe(fromText.confidence.signingBonus);
  });
});
