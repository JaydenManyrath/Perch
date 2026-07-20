/**
 * Generate real-shaped offer-letter PDFs for the RC53 regression suite:
 *   tests/fixtures/offers/*.pdf
 *
 * Run: npm run gen:offer-fixtures  (or: npx tsx scripts/gen-offer-fixtures.ts)
 *
 * These are committed binaries; tests read them directly (no token spend - the model is
 * mocked in tests/offer-llm-pipeline.test.ts). Layouts are varied on purpose:
 *   - classic-letter        : prose letter
 *   - table-comp            : table/column-styled comp summary
 *   - stipend-bonus         : letter with relocation stipend + signing bonus
 *   - scanned-image         : image-only page with NO text layer (exercises the OCR path;
 *                             the OCR adapter is mocked in tests, real tesseract in prod)
 *   - adversarial-salary-twice : the same salary is stated twice with no clean label, so a
 *                             model can be tempted to combine/inflate it - verification must
 *                             reject any number not present verbatim.
 *
 * Dates are pinned so re-running the generator produces stable bytes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const OUT = join(process.cwd(), "tests", "fixtures", "offers");
const PINNED = new Date("2026-07-20T00:00:00Z");

type TextFixture = { name: string; kind: "text"; lines: string[] };
type ScanFixture = { name: string; kind: "scanned" };
type Fixture = TextFixture | ScanFixture;

const FIXTURES: Fixture[] = [
  {
    name: "classic-letter",
    kind: "text",
    lines: [
      "STRIPE",
      "",
      "Dear Candidate,",
      "",
      "On behalf of Stripe, we are delighted to offer you the position of",
      "Software Engineer Intern. This is a full-time summer internship.",
      "",
      "Your annual base salary will be $126,000 per year.",
      "Your internship will start on June 8, 2026.",
      "Your internship will conclude on August 14, 2026.",
      "Your Seattle, WA office looks forward to meeting you.",
      "",
      "Warm regards,",
      "University Recruiting",
    ],
  },
  {
    name: "table-comp",
    kind: "text",
    lines: [
      "DATABRICKS - OFFER SUMMARY",
      "",
      "Employer:            Databricks, Inc.",
      "Position:            Machine Learning Intern",
      "Location:            San Francisco, CA",
      "Start Date:          2026-05-26",
      "End Date:            2026-08-14",
      "Annual Base Salary:  $132,000",
      "Relocation:          none",
    ],
  },
  {
    name: "stipend-bonus",
    kind: "text",
    lines: [
      "FIGMA",
      "",
      "Company: Figma",
      "Role: Product Design Intern",
      "Location: Austin, TX",
      "Start date: 2026-06-01",
      "Salary: $118,000 annually",
      "",
      "Relocation stipend: $3,250 will be paid before your start date.",
      "Signing bonus: $7,500 will be paid with your first paycheck.",
    ],
  },
  { name: "scanned-image", kind: "scanned" },
  {
    name: "adversarial-salary-twice",
    kind: "text",
    lines: [
      "GLOBEX ANALYTICS",
      "",
      "Dear Applicant,",
      "",
      "Your base figure of $126,000 reflects our standard intern band this cycle.",
      "For reference, that same $126,000 base is restated in the appendix below.",
      "",
      "Position: Data Science Intern",
      "Start date: 2026-06-15",
      "Location: Austin, TX",
      "",
      "Appendix - base $126,000; monthly housing estimate $2,100.",
    ],
  },
];

async function textPdf(lines: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setCreationDate(PINNED);
  doc.setModificationDate(PINNED);
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 740;
  for (const [i, line] of lines.entries()) {
    if (line.length > 0) {
      page.drawText(line, {
        x: 56,
        y,
        size: 11,
        font: i === 0 ? bold : font,
        color: rgb(0.1, 0.1, 0.12),
      });
    }
    y -= 22;
  }
  return doc.save();
}

async function scannedPdf(): Promise<Uint8Array> {
  // An image-only page: gray bars simulate scanned text lines. There is NO text layer,
  // so pdf.js extracts nothing and the pipeline falls through to the OCR adapter.
  const doc = await PDFDocument.create();
  doc.setCreationDate(PINNED);
  doc.setModificationDate(PINNED);
  const page = doc.addPage([612, 792]);
  page.drawRectangle({ x: 40, y: 60, width: 532, height: 680, color: rgb(0.96, 0.96, 0.96) });
  for (let i = 0; i < 14; i++) {
    const w = 300 + ((i * 37) % 190);
    page.drawRectangle({ x: 72, y: 700 - i * 40, width: w, height: 12, color: rgb(0.25, 0.25, 0.28) });
  }
  return doc.save();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const fx of FIXTURES) {
    const bytes = fx.kind === "text" ? await textPdf(fx.lines) : await scannedPdf();
    const path = join(OUT, `${fx.name}.pdf`);
    writeFileSync(path, bytes);
    console.log(`wrote ${path} (${bytes.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
