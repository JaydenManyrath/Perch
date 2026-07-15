import type { OfferParse } from "@/lib/types/contract";

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

/** Deterministic extraction from offer-letter plain text. */
export function parseOfferText(text: string): OfferParse {
  const flat = text.replace(/\r/g, "");

  // --- salary (annual USD) ---
  let salary: number | null = null;
  const salaryMatch =
    flat.match(/(?:annual\s+(?:base\s+)?salary|base\s+salary|salary)[^\d$]{0,20}\$?\s*([\d,]+)/i) ??
    flat.match(/\$\s*([\d,]{4,})\s*(?:per\s+year|\/\s*year|annually|USD)/i);
  if (salaryMatch) {
    const n = Number(salaryMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) salary = n;
  }

  // --- employer ---
  const employer =
    firstMatch(flat, [
      /(?:Employer|Company)\s*:\s*(.+)/i,
      /pleased to offer you (?:a|the) position at\s+([A-Z][\w&.,'’\- ]+?)(?:[.,\n]|\s+as\b)/,
      /welcome to\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i,
      /on behalf of\s+([A-Z][\w&.,'’\- ]+?)[.,\n]/i,
    ]) ?? "Unknown employer";

  // --- role ---
  const role = firstMatch(flat, [
    /(?:Role|Position|Title)\s*:\s*(.+)/i,
    /position of\s+([A-Z][\w\/\- ]+?)(?:[.,\n]|\s+(?:at|in|with)\b)/i,
    /as (?:an?|the)\s+([A-Z][\w\/\- ]+?(?:Intern|Engineer|Manager|Designer|Analyst))/i,
  ]);

  // --- city ---
  const city = firstMatch(flat, [
    /(?:City|Location|Office)\s*:\s*(.+)/i,
    /(?:located|based|office)\s+in\s+([A-Z][\w .'\-]+?)(?:[.,\n]|\s+(?:office|starting)\b)/i,
  ]);

  // --- dates ---
  const startRaw = firstMatch(flat, [
    /(?:start date|starting on|start on|begins on|commencing)\s*:?\s*([A-Za-z0-9,\/\- ]+?)(?:[.\n]|and\b)/i,
  ]);
  const endRaw = firstMatch(flat, [
    /(?:end date|ending on|through|until|end on)\s*:?\s*([A-Za-z0-9,\/\- ]+?)(?:[.\n]|and\b)/i,
  ]);

  const startDate = startRaw ? parseDateToIso(startRaw) : null;
  let endDate = endRaw ? parseDateToIso(endRaw) : null;
  if (!endDate && startDate) {
    endDate = addDaysIso(startDate, INTERNSHIP_WEEKS * 7);
  }

  return {
    employer,
    role: role || null,
    salary,
    startDate,
    endDate,
    city: city || null,
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

export async function parseOfferPdf(pdf: Buffer): Promise<OfferParse> {
  return parseOfferText(await extractOfferText(pdf));
}
