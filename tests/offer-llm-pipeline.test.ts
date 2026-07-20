import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

/**
 * Route-level end-to-end proof for the LLM-first offer pipeline (RC51/RC52). The model
 * is ALWAYS mocked here, so the default `npm test` spends ZERO tokens; the real model is
 * exercised only by the opt-in live smoke (tests/offer-llm-live.test.ts, LIVE_LLM=1).
 *
 * Covered: byte-identical fallback with no key / LLM_DISABLED=1; verified LLM values
 * merging by precedence; an invented value rejected into needsReview; graceful fallback
 * on a model error; the rate-limit guard still gating the route.
 */

const { guardMock, adminMock, generateObjectMock, ocrImageMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  adminMock: vi.fn(),
  generateObjectMock: vi.fn(),
  ocrImageMock: vi.fn(),
}));

vi.mock("@/lib/http", () => ({ guard: guardMock }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: adminMock }));
vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@ai-sdk/openai", () => ({ openai: () => ({ id: "mock-model" }) }));
// OCR stays gated on OCR_ENABLED (as in prod) but the recognizer is mocked, so the OCR
// path is exercised without tesseract and without any token spend.
vi.mock("@/lib/parsers/ocr", () => ({
  ocrImage: ocrImageMock,
  isOcrEnabled: () => process.env.OCR_ENABLED === "1",
}));

import { parseOfferText } from "@/lib/parsers/offerLetter";
import type { OfferLlmObject } from "@/lib/parsers/offerLlm";
import { POST } from "@/app/api/parse/offer/route";

const CALLER = "11111111-1111-5111-8111-111111111111";
const HEADERS = { "X-RateLimit-Limit": "20", "X-RateLimit-Remaining": "19" };

/** Build a multipart POST carrying `body` as the uploaded file. */
function upload(body: string, type = "text/plain"): Request {
  const file = new File([body], type.includes("pdf") ? "offer.pdf" : "offer.txt", { type });
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://localhost/api/parse/offer", { method: "POST", body: fd });
}

const OFFERS_DIR = join(process.cwd(), "tests", "fixtures", "offers");

/** Build a multipart POST from a committed fixture PDF. */
function uploadFixture(name: string): Request {
  const buf = readFileSync(join(OFFERS_DIR, `${name}.pdf`));
  const file = new File([buf], `${name}.pdf`, { type: "application/pdf" });
  const fd = new FormData();
  fd.append("file", file);
  return new Request("http://localhost/api/parse/offer", { method: "POST", body: fd });
}

/** A model object with all fields null unless overridden. */
function modelObject(partial: Partial<OfferLlmObject> = {}): OfferLlmObject {
  return {
    employer: null,
    role: null,
    salary: null,
    startDate: null,
    endDate: null,
    city: null,
    relocationStipend: null,
    signingBonus: null,
    ...partial,
  };
}

const envSnapshot = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  guardMock.mockResolvedValue({ callerId: CALLER, headers: HEADERS });
  adminMock.mockReturnValue({
    storage: { from: () => ({ upload: vi.fn().mockResolvedValue({ error: null }) }) },
  });
});

afterEach(() => {
  process.env = { ...envSnapshot };
});

function enableLlm() {
  process.env.OPENAI_API_KEY = "sk-test";
  delete process.env.LLM_DISABLED;
}
function disableLlm() {
  delete process.env.OPENAI_API_KEY;
  delete process.env.LLM_DISABLED;
}

const LABELLED =
  "Company: Stripe\n" +
  "Role: Software Engineer Intern\n" +
  "Your annual base salary will be $126,000 per year.\n" +
  "Start date: June 8, 2026.\n" +
  "Location: Seattle, WA.\n";

describe("byte-identical deterministic fallback", () => {
  it("with NO key, the response equals the heuristic parse and the model is never called", async () => {
    disableLlm();
    const res = await POST(upload(LABELLED));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(parseOfferText(LABELLED));
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("with LLM_DISABLED=1 even when a key is present, it stays byte-identical", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.LLM_DISABLED = "1";
    const res = await POST(upload(LABELLED));
    const body = await res.json();
    expect(body).toEqual(parseOfferText(LABELLED));
    expect(generateObjectMock).not.toHaveBeenCalled();
  });
});

describe("LLM-first merge (model mocked)", () => {
  it("a verified LLM value fills a field the heuristics missed", async () => {
    // The heuristic finds no salary here (no salary/compensation label, no $-per-year).
    const text =
      "Company: Stripe\n" +
      "Role: Software Engineer Intern\n" +
      "Start date: 2026-06-01.\n" +
      "Location: Austin, TX.\n" +
      "Your total package references 126,000 for the season.\n";
    expect(parseOfferText(text).salary).toBeNull();

    enableLlm();
    generateObjectMock.mockResolvedValue({ object: modelObject({ salary: 126000 }) });

    const res = await POST(upload(text));
    const body = await res.json();
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    expect(body.salary).toBe(126000); // 126,000 IS present in the text -> verified
    expect(body.needsReview).not.toContain("salary");
  });

  it("rejects an invented salary the letter never states (into needsReview)", async () => {
    const text =
      "Company: Acme\nRole: Software Engineer Intern\nStart date: 2026-06-01.\nLocation: Chicago, IL.\n";
    enableLlm();
    // The model hallucinates a salary that appears NOWHERE in the text.
    generateObjectMock.mockResolvedValue({ object: modelObject({ salary: 9_999_999 }) });

    const res = await POST(upload(text));
    const body = await res.json();
    expect(body.salary).toBeNull(); // verification refused to trust it
    expect(body.needsReview).toContain("salary");
  });

  it("never lets an unverified LLM value overwrite a verified heuristic value", async () => {
    enableLlm();
    // The heuristic already read $126,000 with high confidence; the model disagrees with
    // a number that is not in the letter, so the verified heuristic value must win.
    generateObjectMock.mockResolvedValue({ object: modelObject({ salary: 200000 }) });

    const res = await POST(upload(LABELLED));
    const body = await res.json();
    expect(body.salary).toBe(126000);
  });

  it("falls back to the heuristic parse when the model call throws", async () => {
    enableLlm();
    generateObjectMock.mockRejectedValue(new Error("model unavailable"));

    const res = await POST(upload(LABELLED));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(parseOfferText(LABELLED));
  });
});

describe("guard", () => {
  it("returns the guard's rejection (rate limit) without touching the model", async () => {
    guardMock.mockResolvedValueOnce(
      NextResponse.json({ error: "rate_limited", retryAfterSec: 30 }, { status: 429 }),
    );
    enableLlm();
    const res = await POST(upload(LABELLED));
    expect(res.status).toBe(429);
    expect(generateObjectMock).not.toHaveBeenCalled();
  });

  it("rejects a request with no file", async () => {
    const fd = new FormData();
    const res = await POST(
      new Request("http://localhost/api/parse/offer", { method: "POST", body: fd }),
    );
    expect(res.status).toBe(400);
  });
});

// The plain text a scanner's OCR would return for the image-only fixture. In the default
// run the OCR recognizer is mocked to yield this; in prod tesseract produces it.
const SCAN_OCR_TEXT =
  "NIMBUS ROBOTICS\n" +
  "Internship Offer\n" +
  "Employer: Nimbus Robotics\n" +
  "Position: Robotics Software Intern\n" +
  "Location: Pittsburgh, PA\n" +
  "Start date: 2026-06-08\n" +
  "Annual base salary: $121,000\n";

describe("real-shaped PDF fixtures (model mocked, zero tokens)", () => {
  it("classic prose letter parses to the expected fields", async () => {
    enableLlm();
    generateObjectMock.mockResolvedValue({
      object: modelObject({
        employer: "Stripe",
        role: "Software Engineer Intern",
        salary: 126000,
        startDate: "2026-06-08",
        endDate: "2026-08-14",
        city: "Seattle, WA",
      }),
    });
    const res = await POST(uploadFixture("classic-letter"));
    const body = await res.json();
    expect(body.employer).toBe("Stripe");
    expect(body.role).toBe("Software Engineer Intern");
    expect(body.salary).toBe(126000);
    expect(body.startDate).toBe("2026-06-08");
    expect(body.endDate).toBe("2026-08-14");
    expect(body.city).toBe("Seattle, WA");
  });

  it("table/column-styled comp summary parses to the expected fields", async () => {
    enableLlm();
    generateObjectMock.mockResolvedValue({
      object: modelObject({
        employer: "Databricks, Inc.",
        role: "Machine Learning Intern",
        salary: 132000,
        startDate: "2026-05-26",
        endDate: "2026-08-14",
        city: "San Francisco, CA",
      }),
    });
    const res = await POST(uploadFixture("table-comp"));
    const body = await res.json();
    expect(body.employer).toBe("Databricks, Inc.");
    expect(body.role).toBe("Machine Learning Intern");
    expect(body.salary).toBe(132000);
    expect(body.startDate).toBe("2026-05-26");
    expect(body.city).toBe("San Francisco, CA");
  });

  it("stipend + signing-bonus letter fills the upfront-cash fields", async () => {
    enableLlm();
    generateObjectMock.mockResolvedValue({
      object: modelObject({
        employer: "Figma",
        role: "Product Design Intern",
        salary: 118000,
        startDate: "2026-06-01",
        city: "Austin, TX",
        relocationStipend: 3250,
        signingBonus: 7500,
      }),
    });
    const res = await POST(uploadFixture("stipend-bonus"));
    const body = await res.json();
    expect(body.salary).toBe(118000);
    expect(body.relocationStipend).toBe(3250);
    expect(body.signingBonus).toBe(7500);
    expect(body.employer).toBe("Figma");
    expect(body.role).toBe("Product Design Intern");
  });

  it("scanned image-only PDF exercises the OCR path, then the LLM reads the OCR text", async () => {
    enableLlm();
    process.env.OCR_ENABLED = "1";
    ocrImageMock.mockResolvedValue(SCAN_OCR_TEXT);
    generateObjectMock.mockResolvedValue({
      object: modelObject({
        employer: "Nimbus Robotics",
        role: "Robotics Software Intern",
        salary: 121000,
        startDate: "2026-06-08",
        city: "Pittsburgh, PA",
      }),
    });

    const res = await POST(uploadFixture("scanned-image"));
    const body = await res.json();

    // The OCR adapter was actually invoked (the page has no text layer)...
    expect(ocrImageMock).toHaveBeenCalledTimes(1);
    // ...and the OCR text was handed to the model, not raw bytes.
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    expect(generateObjectMock.mock.calls[0][0].prompt).toContain("Nimbus Robotics");
    // ...and the verified fields survived to the response.
    expect(body.employer).toBe("Nimbus Robotics");
    expect(body.salary).toBe(121000);
    expect(body.role).toBe("Robotics Software Intern");
    expect(body.city).toBe("Pittsburgh, PA");
    expect(body.startDate).toBe("2026-06-08");
  });

  it("adversarial letter: an inflated salary the model invents is rejected into needsReview", async () => {
    enableLlm();
    // The letter states $126,000 twice; a confused model returns a number that appears
    // NOWHERE in the letter. Verification must refuse it and flag salary for review, while
    // the grounded fields (which ARE in the letter) still come through.
    generateObjectMock.mockResolvedValue({
      object: modelObject({
        employer: "Globex Analytics",
        role: "Data Science Intern",
        salary: 9_999_999,
        startDate: "2026-06-15",
        city: "Austin, TX",
      }),
    });

    const res = await POST(uploadFixture("adversarial-salary-twice"));
    const body = await res.json();

    expect(body.salary).toBeNull(); // the invented number was rejected
    expect(body.needsReview).toContain("salary"); // -> shown as "check this" in OfferStep
    expect(body.employer).toBe("Globex Analytics");
    expect(body.role).toBe("Data Science Intern");
    expect(body.city).toBe("Austin, TX");
    expect(body.startDate).toBe("2026-06-15");
  });
});
