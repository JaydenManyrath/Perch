import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  parseOfferText,
  parseDateToIso,
  parseOfferPdf,
} from "@/lib/parsers/offerLetter";
import { parseTakeout, toVisits } from "@/lib/parsers/takeout";

const FIX = join(process.cwd(), "scripts", "fixtures");

describe("parseDateToIso", () => {
  it("parses ISO, month-name, and numeric dates", () => {
    expect(parseDateToIso("2026-06-08")).toBe("2026-06-08");
    expect(parseDateToIso("June 8, 2026")).toBe("2026-06-08");
    expect(parseDateToIso("06/08/2026")).toBe("2026-06-08");
  });
  it("returns null on junk", () => {
    expect(parseDateToIso("sometime next summer")).toBeNull();
  });
});

describe("parseOfferText (deterministic)", () => {
  const text = readFileSync(join(FIX, "sample-offer-letter.txt"), "utf8");
  const parsed = parseOfferText(text);

  it("extracts the employer", () => {
    expect(parsed.employer).toBe("Stripe");
  });
  it("extracts the role", () => {
    expect(parsed.role).toBe("Software Engineer Intern");
  });
  it("extracts the exact salary number (never invented)", () => {
    expect(parsed.salary).toBe(126000);
  });
  it("extracts the start date as ISO", () => {
    expect(parsed.startDate).toBe("2026-06-08");
  });
  it("estimates an end date ~10 weeks out when only a start is present", () => {
    expect(parsed.endDate).toBe("2026-08-17");
  });
  it("extracts the city", () => {
    expect(parsed.city).toContain("Seattle");
  });
  it("returns null salary when none is present (no hallucinated number)", () => {
    expect(parseOfferText("Welcome to Acme. Start date: 2026-06-01.").salary).toBeNull();
  });
  it("is deterministic", () => {
    expect(parseOfferText(text)).toEqual(parseOfferText(text));
  });
});

describe("parseOfferPdf (real PDF end-to-end)", () => {
  const pdfPath = join(FIX, "sample-offer-letter.pdf");
  it.runIf(existsSync(pdfPath))(
    "extracts the same fields from the generated PDF",
    async () => {
      const parsed = await parseOfferPdf(readFileSync(pdfPath));
      expect(parsed.employer).toBe("Stripe");
      expect(parsed.salary).toBe(126000);
      expect(parsed.startDate).toBe("2026-06-08");
    },
  );
});

describe("parseTakeout", () => {
  const json = JSON.parse(readFileSync(join(FIX, "sample-takeout.json"), "utf8"));

  it("returns recurring places only (the one-off venue is dropped)", () => {
    const places = parseTakeout(json);
    const labels = places.map((p) => p.label);
    expect(labels).toContain("Victrola Coffee Roasters");
    expect(labels).not.toContain("The Crocodile"); // visited once → below threshold
  });
  it("surfaces the usual coffee spot as the most frequent place", () => {
    const places = parseTakeout(json);
    expect(places[0].kind).toBe("coffee");
    expect(places[0].frequency).toBe(6);
  });
  it("infers kinds from names/categories", () => {
    const places = parseTakeout(json);
    const kinds = new Set(places.map((p) => p.kind));
    expect(kinds.has("coffee")).toBe(true);
    expect(kinds.has("gym")).toBe(true);
    expect(kinds.has("grocery")).toBe(true);
  });
  it("supports the Semantic Location History timelineObjects shape", () => {
    const visits = toVisits({
      timelineObjects: [
        { placeVisit: { location: { latitudeE7: 476150000, longitudeE7: -1223400000, name: "Blue Bottle Coffee" } } },
      ],
    });
    expect(visits).toHaveLength(1);
    expect(visits[0].kind).toBe("coffee");
    expect(visits[0].lat).toBeCloseTo(47.615, 3);
  });
  it("is deterministic", () => {
    expect(parseTakeout(json)).toEqual(parseTakeout(json));
  });
});
