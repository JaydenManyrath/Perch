import type { OfferParse, OfferField } from "@/lib/types/contract";
import { parseDateToIso, REVIEW_THRESHOLD, UNKNOWN_EMPLOYER } from "./offerLetter";

/**
 * Deterministic trust layer (RC52). The LLM may READ the offer text; it may NEVER
 * introduce a value that is not grounded in that text (docs/ARCHITECTURE.md).
 * Every field the model returns is checked against the source BEFORE it is trusted:
 *   - numbers must appear verbatim, modulo formatting ($, commas, decimals);
 *   - dates must parse from a date string present in the text (via parseDateToIso);
 *   - employer / role / city must be substrings of the text.
 * A field that fails is nulled and flagged needsReview so the OfferStep
 * manual-correction UI catches it. Verification only ever REJECTS - it never invents.
 */

// A money-ish number token: optional $, digits with optional thousands commas and an
// optional decimal tail. We compare on the integer part so "$126,000.00" == 126000.
const MONEY_TOKEN = /\$?\s*\d[\d,]*(?:\.\d+)?/g;

// Date tokens the letter might use, matching the three shapes parseDateToIso understands.
const DATE_TOKEN =
  /\b(?:\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4})\b/g;

/** Integer value of a money token, dropping $, commas, and any decimal tail. */
function moneyToInt(token: string): number | null {
  const cleaned = token.replace(/[$,\s]/g, "");
  const intPart = cleaned.split(".")[0];
  if (intPart.length === 0) return null;
  const n = Number(intPart);
  return Number.isFinite(n) ? n : null;
}

/** Every distinct number present in the text, as integers (formatting stripped). */
export function numbersInText(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(MONEY_TOKEN)) {
    const n = moneyToInt(m[0]);
    if (n !== null) out.add(n);
  }
  return out;
}

/** Every date present in the text, normalized to ISO YYYY-MM-DD. */
export function datesInText(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(DATE_TOKEN)) {
    const iso = parseDateToIso(m[0]);
    if (iso) out.add(iso);
  }
  return out;
}

/**
 * A number is verified only if it appears in the text as a standalone number token
 * (so 126000 does NOT match inside "1260000"), comparing on integer parts.
 */
export function verifyNumber(value: number | null, text: string): boolean {
  if (value === null || !Number.isFinite(value)) return false;
  return numbersInText(text).has(Math.trunc(value));
}

/**
 * A date is verified only if the text contains a date string that normalizes to the
 * SAME ISO date (the model's own value is normalized too, so "June 8, 2026" verifies
 * against "2026-06-08").
 */
export function verifyDate(value: string | null, text: string): boolean {
  if (!value) return false;
  const iso = parseDateToIso(value);
  if (!iso) return false;
  return datesInText(text).has(iso);
}

/** A string field is verified only if it is a (case-insensitive) substring of the text. */
export function verifySubstring(value: string | null, text: string): boolean {
  if (!value) return false;
  const needle = value.trim().toLowerCase();
  if (needle.length === 0) return false;
  return text.toLowerCase().includes(needle);
}

/**
 * Verify an LLM extraction against its source text. Returns a copy where every value
 * that cannot be grounded in the text is nulled (employer falls back to the shared
 * sentinel) with its confidence zeroed; `needsReview` lists exactly the fields that
 * FAILED verification. Absent (already-null) fields are not failures.
 */
export function verifyOffer(llm: OfferParse, text: string): OfferParse {
  const confidence: Record<OfferField, number> = { ...llm.confidence };
  const failed: OfferField[] = [];
  const reject = (field: OfferField) => {
    confidence[field] = 0;
    failed.push(field);
  };

  let salary = llm.salary;
  if (salary !== null && !verifyNumber(salary, text)) {
    salary = null;
    reject("salary");
  }
  let relocationStipend = llm.relocationStipend;
  if (relocationStipend !== null && !verifyNumber(relocationStipend, text)) {
    relocationStipend = null;
    reject("relocationStipend");
  }
  let signingBonus = llm.signingBonus;
  if (signingBonus !== null && !verifyNumber(signingBonus, text)) {
    signingBonus = null;
    reject("signingBonus");
  }

  let startDate = llm.startDate;
  if (startDate !== null && !verifyDate(startDate, text)) {
    startDate = null;
    reject("startDate");
  }
  let endDate = llm.endDate;
  if (endDate !== null && !verifyDate(endDate, text)) {
    endDate = null;
    reject("endDate");
  }

  let name = llm.name;
  if (name !== null && !verifySubstring(name, text)) {
    name = null;
    reject("name");
  }
  let city = llm.city;
  if (city !== null && !verifySubstring(city, text)) {
    city = null;
    reject("city");
  }
  let role = llm.role;
  if (role !== null && !verifySubstring(role, text)) {
    role = null;
    reject("role");
  }
  let employer = llm.employer;
  if (
    employer &&
    employer !== UNKNOWN_EMPLOYER &&
    !verifySubstring(employer, text)
  ) {
    employer = UNKNOWN_EMPLOYER;
    reject("employer");
  }

  return {
    name,
    employer,
    role,
    salary,
    startDate,
    endDate,
    city,
    relocationStipend,
    signingBonus,
    confidence,
    needsReview: failed,
  };
}

const CORE_FIELDS: OfferField[] = [
  "name",
  "employer",
  "role",
  "salary",
  "startDate",
  "endDate",
  "city",
];

/** Pick a value + confidence honoring the merge precedence for one field. */
function pick<T>(
  hv: T | null,
  hc: number,
  lv: T | null,
  lc: number,
): { value: T | null; conf: number } {
  // A verified-heuristic value is never overwritten by the LLM.
  if (hv !== null && hc >= REVIEW_THRESHOLD) return { value: hv, conf: hc };
  // A verified LLM value fills a null or overrides a low-confidence heuristic.
  if (lv !== null) return { value: lv, conf: lc };
  // Otherwise keep whatever the heuristic had (possibly null / low-confidence).
  return { value: hv, conf: hc };
}

/**
 * Merge the heuristic parse with an already-VERIFIED LLM parse (RC52). Precedence:
 * a verified-heuristic value (confidence >= REVIEW_THRESHOLD) wins and is never
 * overwritten; otherwise a verified LLM value fills a null or overrides a
 * low-confidence heuristic value. `needsReview` is recomputed from the merged
 * confidences using the same rule as the heuristic parser.
 */
export function mergeOffers(heuristic: OfferParse, llm: OfferParse): OfferParse {
  const hEmp = heuristic.employer === UNKNOWN_EMPLOYER ? null : heuristic.employer;
  const lEmp = llm.employer === UNKNOWN_EMPLOYER ? null : llm.employer;
  const emp = pick(hEmp, heuristic.confidence.employer, lEmp, llm.confidence.employer);
  const employer = emp.value ?? UNKNOWN_EMPLOYER;
  const employerConf = emp.value === null ? 0 : emp.conf;

  const name = pick(heuristic.name, heuristic.confidence.name, llm.name, llm.confidence.name);
  const role = pick(heuristic.role, heuristic.confidence.role, llm.role, llm.confidence.role);
  const salary = pick(heuristic.salary, heuristic.confidence.salary, llm.salary, llm.confidence.salary);
  const startDate = pick(heuristic.startDate, heuristic.confidence.startDate, llm.startDate, llm.confidence.startDate);
  const endDate = pick(heuristic.endDate, heuristic.confidence.endDate, llm.endDate, llm.confidence.endDate);
  const city = pick(heuristic.city, heuristic.confidence.city, llm.city, llm.confidence.city);
  const relocation = pick(
    heuristic.relocationStipend,
    heuristic.confidence.relocationStipend,
    llm.relocationStipend,
    llm.confidence.relocationStipend,
  );
  const signing = pick(
    heuristic.signingBonus,
    heuristic.confidence.signingBonus,
    llm.signingBonus,
    llm.confidence.signingBonus,
  );

  const confidence: Record<OfferField, number> = {
    name: name.value === null ? 0 : name.conf,
    employer: employerConf,
    role: role.value === null ? 0 : role.conf,
    salary: salary.value === null ? 0 : salary.conf,
    startDate: startDate.value === null ? 0 : startDate.conf,
    endDate: endDate.value === null ? 0 : endDate.conf,
    city: city.value === null ? 0 : city.conf,
    // Benefits keep their confidence even when null: the heuristic marks a
    // mentioned-but-ambiguous benefit as (null, ~0.4), and that flag must survive.
    relocationStipend: relocation.conf,
    signingBonus: signing.conf,
  };

  const needsReview = CORE_FIELDS.filter((f) => confidence[f] < REVIEW_THRESHOLD);
  // A benefit is flagged only when we actually have a shaky number, or the heuristic
  // already flagged it as a mentioned-but-ambiguous amount that stayed unresolved.
  const benefitFlagged = (
    f: "relocationStipend" | "signingBonus",
    value: number | null,
  ) =>
    confidence[f] < REVIEW_THRESHOLD &&
    (value !== null || heuristic.needsReview.includes(f));
  if (benefitFlagged("relocationStipend", relocation.value)) needsReview.push("relocationStipend");
  if (benefitFlagged("signingBonus", signing.value)) needsReview.push("signingBonus");

  return {
    name: name.value,
    employer,
    role: role.value,
    salary: salary.value,
    startDate: startDate.value,
    endDate: endDate.value,
    city: city.value,
    relocationStipend: relocation.value,
    signingBonus: signing.value,
    confidence,
    needsReview,
  };
}
