import type { OfferParse, OfferField } from "@/lib/types/contract";
import { ocrImage, isOcrEnabled } from "./ocr";

/**
 * Offer-letter parsing (B6). DETERMINISTIC extraction — regex/heuristics over the
 * letter text. The LLM may only normalize ambiguous fields downstream; it must NEVER
 * invent a number (CLAUDE.md §8). `parseOfferText` is pure and fully unit-tested;
 * `extractOfferText` is the thin PDF-to-text step used by the route.
 */

const MS_PER_DAY = 86_400_000;
const INTERNSHIP_WEEKS = 10; // used to estimate endDate when only a start is given

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/** Parse "June 8, 2026" | "2026-06-08" | "06/08/2026" → ISO "2026-06-08" | null. */
export function parseDateToIso(raw: string): string | null {
  const s = raw.trim();

  const iso = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const monthName = s.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (monthName) {
    const m = MONTHS[monthName[1].toLowerCase()];
    if (m) {
      const d = String(Number(monthName[2])).padStart(2, "0");
      return `${monthName[3]}-${String(m).padStart(2, "0")}-${d}`;
    }
  }

  const numeric = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/); // MM/DD/YYYY
  if (numeric) {
    return `${numeric[3]}-${numeric[1].padStart(2, "0")}-${numeric[2].padStart(2, "0")}`;
  }
  return null;
}

function addDaysIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return null;
}

/** Confidence below this flags a field for manual review (contract 11.9). */
export const REVIEW_THRESHOLD = 0.6;

/** Try patterns in order; return the captured value + the pattern's confidence. */
function matchConf(
  text: string,
  patterns: { re: RegExp; conf: number }[],
): { value: string; conf: number } | null {
  for (const { re, conf } of patterns) {
    const m = text.match(re);
    if (m && m[1]) return { value: m[1].trim(), conf };
  }
  return null;
}

/**
 * Deterministic extraction from offer-letter plain text (RC4). Broadened formats;
 * every field gets a 0..1 confidence and low-confidence fields are flagged in
 * needsReview. A number is NEVER invented - a missing salary is null with confidence 0.
 */
export function parseOfferText(text: string): OfferParse {
  const flat = text.replace(/\r/g, "");

  // --- salary (annual USD) --- labelled forms are high confidence; a bare "$X/year"
  // is slightly lower. Never fabricate: no match -> null, confidence 0.
  let salary: number | null = null;
  let salaryConf = 0;
  const salaryMatch = matchConf(flat, [
    { re: /(?:annual\s+(?:base\s+)?salary|base\s+salary|salary|compensation)[^\d$]{0,20}\$?\s*([\d,]+)/i, conf: 0.92 },
    { re: /\$\s*([\d,]{4,})\s*(?:per\s+year|\/\s*year|annually|a\s+year|USD)/i, conf: 0.85 },
    { re: /(?:USD|US\$)\s*([\d,]{4,})/i, conf: 0.7 },
  ]);
  if (salaryMatch) {
    const n = Number(salaryMatch.value.replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) {
      salary = n;
      salaryConf = salaryMatch.conf;
    }
  }

  // --- employer ---
  const employerM = matchConf(flat, [
    { re: /(?:Employer|Company)\s*:\s*(.+)/i, conf: 0.92 },
    { re: /pleased to offer you (?:a|the) position at\s+([A-Z][\w&.,'’\- ]+?)(?:[.,\n]|\s+as\b)/, conf: 0.78 },
    { re: /welcome to\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i, conf: 0.7 },
    { re: /on behalf of\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i, conf: 0.7 },
    { re: /(?:join|joining)\s+([A-Z][\w&.,'’\- ]+?)(?:[.,\n]|\s+as\b)/, conf: 0.62 },
  ]);
  const employer = employerM?.value ?? "Unknown employer";
  const employerConf = employerM?.conf ?? 0;

  // --- role ---
  const roleM = matchConf(flat, [
    { re: /(?:Role|Position|Title)\s*:\s*(.+)/i, conf: 0.92 },
    { re: /position of\s+([A-Z][\w\/\- ]+?)(?:[.,\n]|\s+(?:at|in|with)\b)/i, conf: 0.78 },
    { re: /as (?:an?|the)\s+([A-Z][\w\/\- ]+?(?:Intern|Engineer|Manager|Designer|Analyst|Scientist))/i, conf: 0.72 },
    { re: /the\s+([A-Z][\w\/\- ]+?)\s+role/i, conf: 0.62 },
  ]);
  const role = roleM?.value ?? null;
  const roleConf = roleM?.conf ?? 0;

  // --- city ---
  const cityM = matchConf(flat, [
    { re: /(?:City|Location|Office)\s*:\s*(.+)/i, conf: 0.9 },
    { re: /(?:located|based|office)\s+in\s+([A-Z][\w .'\-]+?)(?:[.,\n]|\s+(?:office|starting)\b)/i, conf: 0.72 },
  ]);
  const city = cityM?.value ?? null;
  const cityConf = cityM?.conf ?? 0;

  // --- dates ---
  const startRaw = matchConf(flat, [
    { re: /(?:start date|starting on|start on|begins on|commencing)\s*:?\s*([A-Za-z0-9,\/\- ]+?)(?:[.\n]|and\b)/i, conf: 0.9 },
  ]);
  const endRaw = matchConf(flat, [
    { re: /(?:end date|ending on|through|until|end on)\s*:?\s*([A-Za-z0-9,\/\- ]+?)(?:[.\n]|and\b)/i, conf: 0.9 },
  ]);

  const startDate = startRaw ? parseDateToIso(startRaw.value) : null;
  const startConf = startDate ? startRaw!.conf : 0;

  let endDate = endRaw ? parseDateToIso(endRaw.value) : null;
  let endConf = endDate ? endRaw!.conf : 0;
  if (!endDate && startDate) {
    // Estimated from a ~10-week internship - flag as lower confidence (it is a guess
    // about the length, not the letter's own number).
    endDate = addDaysIso(startDate, INTERNSHIP_WEEKS * 7);
    endConf = 0.5;
  }

  const confidence: Record<OfferField, number> = {
    employer: employerConf,
    role: roleConf,
    salary: salaryConf,
    startDate: startConf,
    endDate: endConf,
    city: cityConf,
  };
  const needsReview = (Object.keys(confidence) as OfferField[]).filter(
    (f) => confidence[f] < REVIEW_THRESHOLD,
  );

  return {
    employer,
    role: role || null,
    salary,
    startDate,
    endDate,
    city: city || null,
    // Upfront-cash extraction (relocationStipend, signingBonus) is Person C's parser
    // work (section 13.5); until it lands these stay null and the finance model treats
    // them as 0 or reads persisted values.
    relocationStipend: null,
    signingBonus: null,
    confidence,
    needsReview,
  };
}

/**
 * Extract text from an offer-letter PDF buffer, then parse. `pdf-parse` is loaded
 * dynamically (server-only CJS) so it never enters the client bundle.
 */
export async function extractOfferText(pdf: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default;
  const parsed = await pdfParse(pdf);
  return parsed.text;
}

/** An all-unknown result (every field flagged) - used when nothing is extractable. */
export function emptyOffer(): OfferParse {
  const fields: OfferField[] = ["employer", "role", "salary", "startDate", "endDate", "city"];
  const confidence = Object.fromEntries(fields.map((f) => [f, 0])) as Record<OfferField, number>;
  return {
    employer: "Unknown employer",
    role: null,
    salary: null,
    startDate: null,
    endDate: null,
    city: null,
    relocationStipend: null,
    signingBonus: null,
    confidence,
    needsReview: fields,
  };
}

/**
 * Parse an offer PDF. Tries the text layer first; a scanned/image PDF yields almost no
 * text, so we fall back to OCR when enabled. If nothing is extractable, returns an
 * all-flagged result - never a fabricated value.
 */
export async function parseOfferPdf(pdf: Buffer): Promise<OfferParse> {
  let text = "";
  try {
    text = await extractOfferText(pdf);
  } catch (err) {
    console.warn("pdf text extraction failed; will try OCR if enabled:", err);
  }

  if (text.trim().length < 40 && isOcrEnabled()) {
    const ocrText = await ocrImage(pdf);
    if (ocrText && ocrText.length > text.length) text = ocrText;
  }

  if (text.trim().length === 0) return emptyOffer();
  return parseOfferText(text);
}
