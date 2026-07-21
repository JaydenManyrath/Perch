import type { OfferParse, OfferField } from "@/lib/types/contract";
import { ocrImage, isOcrEnabled } from "./ocr";

/**
 * Offer-letter parsing (B6). DETERMINISTIC extraction — regex/heuristics over the
 * letter text. The LLM may only normalize ambiguous fields downstream; it must NEVER
 * invent a number (docs/ARCHITECTURE.md). `parseOfferText` is pure and fully unit-tested;
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

/** Sentinel used when no employer can be read - shared by the heuristic, the LLM
 * layer, and the verification/merge layer so "absent employer" means one thing. */
export const UNKNOWN_EMPLOYER = "Unknown employer";

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

const MONEY = "\\$?\\s*([\\d,]+(?:\\.\\d{2})?)(?![\\d,])";

type BenefitParse = {
  value: number | null;
  conf: number;
  mentioned: boolean;
};

function parseMoney(raw: string): number | null {
  const n = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function parseBenefit(
  text: string,
  labels: RegExp[],
): BenefitParse {
  const mentioned = labels.some((label) => label.test(text));
  if (!mentioned) return { value: null, conf: 0, mentioned: false };

  let sawAmbiguousMention = false;
  for (const label of labels) {
    const source = label.source;
    const flags = label.flags.includes("i") ? label.flags : `${label.flags}i`;
    const clauses = [...text.matchAll(new RegExp(`${source}[^\\n.]{0,160}`, `${flags}g`))].map(
      (match) => match[0],
    );

    const single = new RegExp(
      `${source}[^\\n.]{0,80}?${MONEY}(?!\\s*(?:-|to|through|and)\\s*\\$?\\s*[\\d,])`,
      flags,
    );
    for (const clause of clauses) {
      if (
        /\$\s*[\d,]+(?:\.\d{2})?\s*(?:-|to|through|and)\s*\$?\s*[\d,]+/i.test(clause) ||
        /\b(?:up to|as much as|estimated|estimate|depending|subject to|may be|eligible|available)\b/i.test(clause)
      ) {
        sawAmbiguousMention = true;
        continue;
      }

      const match = clause.match(single);
      if (!match?.[1]) {
        sawAmbiguousMention = true;
        continue;
      }

      const context = match[0];
      if (/\b(?:up to|as much as|estimated|estimate|depending|subject to|may be|eligible|available)\b/i.test(context)) {
        sawAmbiguousMention = true;
        continue;
      }

      const value = parseMoney(match[1]);
      if (value !== null) return { value, conf: 0.92, mentioned: true };
      sawAmbiguousMention = true;
    }
  }

  return { value: null, conf: sawAmbiguousMention ? 0.4 : 0, mentioned: true };
}

function extractLiteralPdfText(pdf: Buffer): string {
  const source = pdf.toString("latin1");
  const chunks = [...source.matchAll(/\(([^()]*(?:\\.[^()]*)*)\)\s*Tj/g)].map((match) =>
    match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\([\\()])/g, "$1"),
  );
  return chunks.join("\n");
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

  // --- candidate name (the person the letter is addressed to) --- the account is
  // minted for THEM, so this is a first-class field. Labelled forms and salutations
  // are high confidence; never fabricate - no match -> null, confidence 0.
  const nameM = matchConf(flat, [
    { re: /(?:Candidate|Name|Recipient)\s*:\s*([A-Z][\w'.\-]+(?:\s+[A-Z][\w'.\-]+){1,3})/, conf: 0.92 },
    { re: /Dear\s+([A-Z][\w'.\-]+(?:\s+[A-Z][\w'.\-]+){1,3})\s*[,:\n]/, conf: 0.88 },
    { re: /offer (?:of employment )?(?:letter )?(?:for|to)\s+([A-Z][\w'.\-]+(?:\s+[A-Z][\w'.\-]+){1,3})\b/, conf: 0.8 },
    { re: /Dear\s+([A-Z][\w'.\-]+)\s*[,:\n]/, conf: 0.6 },
  ]);
  const name = nameM?.value ?? null;
  const nameConf = nameM?.conf ?? 0;

  // --- employer ---
  const employerM = matchConf(flat, [
    { re: /(?:Employer|Company)\s*:\s*(.+)/i, conf: 0.92 },
    { re: /pleased to offer you (?:a|the) position at\s+([A-Z][\w&.,'’\- ]+?)(?:[.,\n]|\s+as\b)/, conf: 0.78 },
    { re: /welcome to\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i, conf: 0.7 },
    { re: /on behalf of\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i, conf: 0.7 },
    { re: /(?:join|joining)\s+([A-Z][\w&.,'’\- ]+?)(?:[.,\n]|\s+as\b)/, conf: 0.62 },
  ]);
  const employer = employerM?.value ?? UNKNOWN_EMPLOYER;
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

  const relocation = parseBenefit(flat, [
    /relocation\s+(?:stipend|bonus|allowance|assistance|payment)/i,
    /move[- ]?in\s+(?:stipend|allowance|assistance|payment)/i,
    /moving\s+(?:stipend|allowance|assistance|payment)/i,
  ]);
  const signing = parseBenefit(flat, [
    /sign(?:ing|-on| on)\s+(?:bonus|payment)/i,
    /one[- ]time\s+sign[- ]on\s+payment/i,
    /joining\s+bonus/i,
  ]);

  const confidence: Record<OfferField, number> = {
    name: nameConf,
    employer: employerConf,
    role: roleConf,
    salary: salaryConf,
    startDate: startConf,
    endDate: endConf,
    city: cityConf,
    relocationStipend: relocation.conf,
    signingBonus: signing.conf,
  };
  const needsReview = (["name", "employer", "role", "salary", "startDate", "endDate", "city"] as OfferField[]).filter(
    (f) => confidence[f] < REVIEW_THRESHOLD,
  );
  if (relocation.mentioned && relocation.conf < REVIEW_THRESHOLD) needsReview.push("relocationStipend");
  if (signing.mentioned && signing.conf < REVIEW_THRESHOLD) needsReview.push("signingBonus");

  return {
    name: name || null,
    employer,
    role: role || null,
    salary,
    startDate,
    endDate,
    city: city || null,
    relocationStipend: relocation.value,
    signingBonus: signing.value,
    confidence,
    needsReview,
  };
}

/**
 * Extract text from an offer-letter PDF buffer, then parse. `pdf-parse` is loaded
 * dynamically (server-only CJS) so it never enters the client bundle.
 */
export async function extractOfferText(pdf: Buffer): Promise<string> {
  try {
    // `unpdf` wraps a modern, serverless-safe pdf.js: no filesystem reads and no debug
    // harness (the old `pdf-parse` crashed in the Vercel bundle because its index.js runs
    // `isDebugMode = !module.parent`, which fires in an ESM bundle and reads a missing
    // bundled test PDF, so every upload parsed as empty). Loaded dynamically so it stays
    // server-only. We rebuild the text from pdf.js text items and re-insert newlines at
    // each `hasEOL` marker - the field parsers are line-anchored, and a newline-free blob
    // would let `Company: (.+)` swallow the rest of the letter. Falls back to literal
    // PDF-text extraction if it throws.
    const { getDocumentProxy } = await import("unpdf");
    const doc = await getDocumentProxy(new Uint8Array(pdf));
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
        if (typeof item.str !== "string") continue;
        text += item.str;
        if (item.hasEOL) text += "\n";
      }
      text += "\n";
    }
    if (text.trim().length > 0) return text;
    const literalText = extractLiteralPdfText(pdf);
    if (literalText.trim().length > 0) return literalText;
    return text;
  } catch (err) {
    const literalText = extractLiteralPdfText(pdf);
    if (literalText.trim().length > 0) return literalText;
    throw err;
  }
}

/** An all-unknown result (every field flagged) - used when nothing is extractable. */
export function emptyOffer(): OfferParse {
  const fields: OfferField[] = ["name", "employer", "role", "salary", "startDate", "endDate", "city"];
  const confidence = Object.fromEntries(
    [...fields, "relocationStipend", "signingBonus"].map((f) => [f, 0]),
  ) as Record<OfferField, number>;
  return {
    name: null,
    employer: UNKNOWN_EMPLOYER,
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
 * Extract the plain text of an offer PDF: the pdf.js text layer first, then OCR for a
 * scanned/image PDF when OCR is enabled. Never fabricates - returns "" when nothing is
 * extractable. Shared by the heuristic path and the LLM pipeline (RC52) so both read
 * exactly the same source text; the LLM never sees raw PDF bytes.
 */
export async function extractOfferPdfText(pdf: Buffer): Promise<string> {
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

  return text;
}

/**
 * Parse an offer PDF. Tries the text layer first; a scanned/image PDF yields almost no
 * text, so we fall back to OCR when enabled. If nothing is extractable, returns an
 * all-flagged result - never a fabricated value.
 */
export async function parseOfferPdf(pdf: Buffer): Promise<OfferParse> {
  const text = await extractOfferPdfText(pdf);
  if (text.trim().length === 0) return emptyOffer();
  return parseOfferText(text);
}
