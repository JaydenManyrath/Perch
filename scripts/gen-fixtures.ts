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

  // pdf-parse bundles an older pdf.js release that cannot reliably read pdf-lib's
  // compressed object streams. Keep the real PDF fixture broadly compatible.
  const bytes = await pdf.save({ useObjectStreams: false });
  // pdf-lib emits a 1.7 header even when the body uses classic objects and xref.
  // pdf-parse 1.x embeds an older pdf.js parser, so advertise the compatible 1.4
  // feature level used by this simple text-only document.
  bytes[7] = "4".charCodeAt(0);
  const out = join(FIX, "sample-offer-letter.pdf");
  writeFileSync(out, bytes);
  console.log(`wrote ${out} (${bytes.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
