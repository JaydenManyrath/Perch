/**
 * Generate binary demo fixtures that can't be hand-written:
 *   scripts/fixtures/sample-offer-letter.pdf  (from sample-offer-letter.txt)
 *
 * Run: npm run gen:fixtures
 * Keeps the PDF's text identical to the .txt so parser tests stay in sync.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

const FIX = join(process.cwd(), "scripts", "fixtures");

async function main() {
  const text = readFileSync(join(FIX, "sample-offer-letter.txt"), "utf8");

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]); // US Letter
  const fontSize = 11;
  const margin = 56;
  let y = 792 - margin;

  for (const line of text.split("\n")) {
    page.drawText(line, { x: margin, y, size: fontSize, font });
    y -= fontSize * 1.6;
  }

  // useObjectStreams:false -> a classic xref PDF that pdf-parse (old pdfjs) reads
  // reliably. pdf-lib's default object streams trip pdf-parse's flate decoder.
  const bytes = await pdf.save({ useObjectStreams: false });
  const out = join(FIX, "sample-offer-letter.pdf");
  writeFileSync(out, bytes);
  console.log(`wrote ${out} (${bytes.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
