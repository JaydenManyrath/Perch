import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

const { guardMock, adminMock, generateObjectMock } = vi.hoisted(() => ({
  guardMock: vi.fn(),
  adminMock: vi.fn(),
  generateObjectMock: vi.fn(),
}));

vi.mock("@/lib/http", () => ({ guard: guardMock }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: adminMock }));
vi.mock("ai", () => ({ generateObject: generateObjectMock }));
vi.mock("@ai-sdk/openai", () => ({ openai: () => ({ id: "mock-model" }) }));

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
