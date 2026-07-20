import { describe, it, expect } from "vitest";
import type { OfferParse, OfferField } from "@/lib/types/contract";
import { parseOfferText, UNKNOWN_EMPLOYER } from "./offerLetter";
import {
  verifyNumber,
  verifyDate,
  verifySubstring,
  verifyOffer,
  mergeOffers,
  numbersInText,
  datesInText,
} from "./offerVerify";

const SOURCE =
  "On behalf of Stripe, we are pleased to offer you a position at Stripe as a Software Engineer Intern.\n" +
  "Your annual base salary will be $126,000 per year.\n" +
  "Start date: June 8, 2026. End date: 2026-08-14.\n" +
  "Location: Seattle, WA. Relocation stipend: $4,500.00.\n";

const ALL_FIELDS: OfferField[] = [
  "employer",
  "role",
  "salary",
  "startDate",
  "endDate",
  "city",
  "relocationStipend",
  "signingBonus",
];

/** Build a full OfferParse from partial field values (confidence defaults high). */
function offer(
  partial: Partial<Omit<OfferParse, "confidence">> & {
    confidence?: Partial<Record<OfferField, number>>;
  } = {},
): OfferParse {
  const confidence = Object.fromEntries(
    ALL_FIELDS.map((f) => [f, partial.confidence?.[f] ?? 0.85]),
  ) as Record<OfferField, number>;
  const { confidence: _c, ...rest } = partial;
  return {
    employer: UNKNOWN_EMPLOYER,
    role: null,
    salary: null,
    startDate: null,
    endDate: null,
    city: null,
    relocationStipend: null,
    signingBonus: null,
    confidence,
    needsReview: [],
    ...rest,
  };
}

describe("verifyNumber (verbatim modulo $ / comma / decimal)", () => {
  it("accepts a number present as $ + commas", () => {
    expect(verifyNumber(126000, "salary of $126,000 per year")).toBe(true);
  });
  it("accepts a bare comma-grouped number", () => {
    expect(verifyNumber(4500, "Relocation stipend: 4,500.")).toBe(true);
  });
  it("accepts a number written with a decimal tail", () => {
    expect(verifyNumber(4500, "amount is $4,500.00")).toBe(true);
  });
  it("rejects an invented number the text never states", () => {
    expect(verifyNumber(9_999_999, "salary of $126,000 per year")).toBe(false);
  });
  it("does not match a number embedded inside a larger number", () => {
    expect(verifyNumber(126000, "reference 1260000 on file")).toBe(false);
  });
  it("rejects null (nothing to verify)", () => {
    expect(verifyNumber(null, SOURCE)).toBe(false);
  });
  it("numbersInText collects distinct integer values", () => {
    const set = numbersInText("$126,000 and 4,500.00 and 12000");
    expect(set.has(126000)).toBe(true);
    expect(set.has(4500)).toBe(true);
    expect(set.has(12000)).toBe(true);
  });
});

describe("verifyDate (parse-equivalent presence)", () => {
  it("verifies an ISO value against a month-name date in the text", () => {
    expect(verifyDate("2026-06-08", "Start date: June 8, 2026.")).toBe(true);
  });
  it("verifies an ISO value against an ISO date in the text", () => {
    expect(verifyDate("2026-08-14", SOURCE)).toBe(true);
  });
  it("verifies a month-name value by normalizing both sides", () => {
    expect(verifyDate("June 8, 2026", SOURCE)).toBe(true);
  });
  it("rejects a date the text does not contain", () => {
    expect(verifyDate("2026-07-01", SOURCE)).toBe(false);
  });
  it("rejects an unparseable value", () => {
    expect(verifyDate("next summer", SOURCE)).toBe(false);
  });
  it("datesInText normalizes every shape to ISO", () => {
    const set = datesInText("June 8, 2026 / 2026-08-14 / 07/01/2026");
    expect(set.has("2026-06-08")).toBe(true);
    expect(set.has("2026-08-14")).toBe(true);
    expect(set.has("2026-07-01")).toBe(true);
  });
});

describe("verifySubstring (employer / role / city)", () => {
  it("accepts an exact substring (case-insensitive)", () => {
    expect(verifySubstring("stripe", SOURCE)).toBe(true);
    expect(verifySubstring("Software Engineer Intern", SOURCE)).toBe(true);
  });
  it("rejects a value not present verbatim", () => {
    expect(verifySubstring("Databricks", SOURCE)).toBe(false);
  });
  it("rejects empty / null", () => {
    expect(verifySubstring("", SOURCE)).toBe(false);
    expect(verifySubstring(null, SOURCE)).toBe(false);
  });
});

describe("verifyOffer", () => {
  it("passes a fully-grounded extraction unchanged and flags nothing", () => {
    const v = verifyOffer(
      offer({
        employer: "Stripe",
        role: "Software Engineer Intern",
        salary: 126000,
        startDate: "2026-06-08",
        endDate: "2026-08-14",
        city: "Seattle, WA",
        relocationStipend: 4500,
      }),
      SOURCE,
    );
    expect(v.salary).toBe(126000);
    expect(v.employer).toBe("Stripe");
    expect(v.startDate).toBe("2026-06-08");
    expect(v.relocationStipend).toBe(4500);
    expect(v.needsReview).toEqual([]);
  });

  it("nulls + flags an invented salary while keeping the grounded fields", () => {
    const v = verifyOffer(
      offer({ employer: "Stripe", salary: 250000, startDate: "2026-06-08" }),
      SOURCE,
    );
    expect(v.salary).toBeNull();
    expect(v.confidence.salary).toBe(0);
    expect(v.needsReview).toContain("salary");
    // The grounded fields survive.
    expect(v.employer).toBe("Stripe");
    expect(v.startDate).toBe("2026-06-08");
    expect(v.needsReview).not.toContain("employer");
    expect(v.needsReview).not.toContain("startDate");
  });

  it("nulls + flags a hallucinated employer (sentinel) and a fabricated date", () => {
    const v = verifyOffer(
      offer({ employer: "Globex Corp", startDate: "2027-01-01", salary: 126000 }),
      SOURCE,
    );
    expect(v.employer).toBe(UNKNOWN_EMPLOYER);
    expect(v.startDate).toBeNull();
    expect(v.needsReview).toContain("employer");
    expect(v.needsReview).toContain("startDate");
    expect(v.salary).toBe(126000); // grounded, survives
  });

  it("does not treat already-null fields as failures", () => {
    const v = verifyOffer(offer({ salary: 126000 }), SOURCE);
    expect(v.needsReview).toEqual([]); // only salary set, and it verifies
  });
});

describe("mergeOffers precedence", () => {
  const text = SOURCE;

  it("a verified-heuristic value is never overwritten by the LLM", () => {
    const heuristic = parseOfferText(SOURCE); // salary 126000 @ high confidence
    const llm = verifyOffer(offer({ salary: 126000, confidence: { salary: 0.9 } }), text);
    const merged = mergeOffers(heuristic, llm);
    expect(merged.salary).toBe(126000);
    expect(merged.needsReview).not.toContain("salary");
  });

  it("a verified LLM value fills a heuristic null", () => {
    const heuristic = parseOfferText("Welcome to Stripe. Start date: June 8, 2026.");
    expect(heuristic.salary).toBeNull();
    const llm = verifyOffer(offer({ salary: 126000 }), text);
    const merged = mergeOffers(heuristic, llm);
    expect(merged.salary).toBe(126000);
    expect(merged.needsReview).not.toContain("salary");
  });

  it("a verified LLM value overrides a low-confidence heuristic value", () => {
    const heuristic: OfferParse = offer({
      city: "Seatle", // heuristic typo, low confidence
      confidence: { city: 0.4 },
      needsReview: ["city"],
    });
    const llm = verifyOffer(offer({ city: "Seattle, WA", confidence: { city: 0.9 } }), text);
    const merged = mergeOffers(heuristic, llm);
    expect(merged.city).toBe("Seattle, WA");
    expect(merged.needsReview).not.toContain("city");
  });

  it("an unverified LLM value never displaces a verified heuristic value", () => {
    const heuristic = parseOfferText(SOURCE); // employer Stripe @ high confidence
    const llm = verifyOffer(offer({ employer: "Globex" }), text); // rejected -> sentinel
    const merged = mergeOffers(heuristic, llm);
    expect(merged.employer).toBe("Stripe");
  });

  it("leaves a still-missing field flagged for review", () => {
    const heuristic = parseOfferText("Welcome to Stripe.");
    const llm = verifyOffer(offer({}), text); // LLM found nothing
    const merged = mergeOffers(heuristic, llm);
    expect(merged.salary).toBeNull();
    expect(merged.needsReview).toContain("salary");
  });

  it("when the LLM adds nothing, the merge equals the heuristic parse", () => {
    const heuristic = parseOfferText(SOURCE);
    const emptyLlm = verifyOffer(offer({}), text);
    const merged = mergeOffers(heuristic, emptyLlm);
    expect(merged).toEqual(heuristic);
  });

  it("keeps every merged confidence within [0,1]", () => {
    const heuristic = parseOfferText(SOURCE);
    const llm = verifyOffer(offer({ salary: 126000, city: "Seattle, WA" }), text);
    const merged = mergeOffers(heuristic, llm);
    for (const c of Object.values(merged.confidence)) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});
