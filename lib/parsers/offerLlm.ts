import { z } from "zod";
import type { OfferParse } from "@/lib/types/contract";
import { UNKNOWN_EMPLOYER } from "./offerLetter";

/**
 * LLM extraction layer (RC51). Reads the ALREADY-extracted offer text (unpdf / OCR
 * output - never raw PDF bytes) and returns an OfferParse-shaped object via the Vercel
 * AI SDK's structured output (`generateObject`). The model READS; it must never invent
 * a value (CLAUDE.md sections 4 + 8) - the prompt forbids inference, and every value is
 * independently re-checked against the source by offerVerify before it is trusted. This
 * module has no opinion on trust; it only turns text into candidate fields.
 */

const confidence = z.number().min(0).max(1);

/** Structured shape the model must fill - mirrors OfferParse fields; absent -> null. */
export const OfferLlmSchema = z.object({
  name: z
    .string()
    .nullable()
    .describe("The candidate's full name - the person the letter is addressed to - exactly as written, or null."),
  employer: z.string().nullable().describe("Company/employer name exactly as written, or null if absent."),
  role: z.string().nullable().describe("Job title / position, exactly as written, or null."),
  salary: z
    .number()
    .nullable()
    .describe("Annual base salary in USD as a plain number (no $, no commas), or null. Never estimate."),
  startDate: z
    .string()
    .nullable()
    .describe("Internship start date as ISO YYYY-MM-DD when a full date is stated, else null."),
  endDate: z
    .string()
    .nullable()
    .describe("Internship end date as ISO YYYY-MM-DD, or null. Do NOT compute it from the start date."),
  city: z.string().nullable().describe("Work city / location, exactly as written, or null."),
  relocationStipend: z
    .number()
    .nullable()
    .describe("One-time relocation/moving stipend in USD (plain number), or null. Only a concrete stated amount."),
  signingBonus: z
    .number()
    .nullable()
    .describe("One-time signing/joining bonus in USD (plain number), or null. Only a concrete stated amount."),
  fieldConfidence: z
    .object({
      name: confidence,
      employer: confidence,
      role: confidence,
      salary: confidence,
      startDate: confidence,
      endDate: confidence,
      city: confidence,
      relocationStipend: confidence,
      signingBonus: confidence,
    })
    .partial()
    .optional()
    .describe("Your 0..1 confidence per field. Omit a field if you are unsure how to score it."),
});

export type OfferLlmObject = z.infer<typeof OfferLlmSchema>;

export const OFFER_SYSTEM =
  "You extract structured fields from an internship offer letter. You are a READER, not a " +
  "guesser. Copy values EXACTLY as they appear in the text. If a field is not explicitly " +
  "present, return null - NEVER infer, estimate, average, or fabricate a number, date, " +
  "employer, role, or city. Do NOT compute an end date from a start date. Salaries and " +
  "bonuses must be plain numbers with no currency symbols or commas. Use ISO YYYY-MM-DD for " +
  "dates when the letter states a full date. Output only the requested fields.";

export function offerUserPrompt(text: string): string {
  return (
    "Offer letter text (verbatim):\n" +
    '"""\n' +
    text +
    '\n"""\n\n' +
    "Extract the fields. Use null for anything not explicitly stated in the text above."
  );
}

/** The model id for offer parsing - defaults to the cheap dev model (contract 14.1). */
function modelId(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

/** Round a possibly-null money value to an integer, or null. */
function toInt(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.round(value);
}

/** Trim a string field to a non-empty value, or null. */
function toStr(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Map the raw model object to an OfferParse (unverified). A present value takes the
 * model's self-reported confidence (default 0.8 - the value is still re-verified against
 * the source downstream); an absent value is null with confidence 0. `needsReview` is
 * left empty here - the verification layer owns flagging.
 */
export function toOfferParse(object: OfferLlmObject): OfferParse {
  const c = object.fieldConfidence ?? {};
  const conf = (key: keyof typeof c, present: boolean): number =>
    present ? (typeof c[key] === "number" ? (c[key] as number) : 0.8) : 0;

  const name = toStr(object.name);
  const employer = toStr(object.employer);
  const role = toStr(object.role);
  const salary = toInt(object.salary);
  const startDate = toStr(object.startDate);
  const endDate = toStr(object.endDate);
  const city = toStr(object.city);
  const relocationStipend = toInt(object.relocationStipend);
  const signingBonus = toInt(object.signingBonus);

  return {
    name,
    employer: employer ?? UNKNOWN_EMPLOYER,
    role,
    salary,
    startDate,
    endDate,
    city,
    relocationStipend,
    signingBonus,
    confidence: {
      name: conf("name", name !== null),
      employer: conf("employer", employer !== null),
      role: conf("role", role !== null),
      salary: conf("salary", salary !== null),
      startDate: conf("startDate", startDate !== null),
      endDate: conf("endDate", endDate !== null),
      city: conf("city", city !== null),
      relocationStipend: conf("relocationStipend", relocationStipend !== null),
      signingBonus: conf("signingBonus", signingBonus !== null),
    },
    needsReview: [],
  };
}

/**
 * Run the LLM extraction over already-extracted offer text. The AI SDK and provider are
 * imported lazily so they are only touched when the pipeline is actually enabled (the
 * route gates this behind isLlmEnabled()). Throws on model/transport failure - the route
 * catches it and falls back to the deterministic heuristics.
 */
export async function extractOfferWithLlm(text: string): Promise<OfferParse> {
  const { generateObject } = await import("ai");
  const { openai } = await import("@ai-sdk/openai");
  const { object } = await generateObject({
    model: openai(modelId()),
    schema: OfferLlmSchema,
    system: OFFER_SYSTEM,
    prompt: offerUserPrompt(text),
    temperature: 0,
    maxTokens: 600,
  });
  return toOfferParse(object);
}
