/**
 * Generate binary demo fixtures that can't be hand-written:
 *   scripts/fixtures/sample-offer-letter.pdf  (from sample-offer-letter.txt)
 *
 * Run: npm run gen:fixtures
 * Keeps the PDF's text identical to the .txt so parser tests stay in sync.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FIX = join(process.cwd(), "scripts", "fixtures");

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

async function main() {
  const text = readFileSync(join(FIX, "sample-offer-letter.txt"), "utf8");

  const fontSize = 11;
  const margin = 56;
  const maxCharsPerLine = 48;
  let y = 792 - margin;
  const commands = ["BT", "/F1 11 Tf"];

  for (const line of text.split("\n")) {
    const wrapped = line.match(new RegExp(`.{1,${maxCharsPerLine}}(?:\\s|$)`, "g")) ?? [line];
    for (const segment of wrapped) {
      commands.push(`1 0 0 1 ${margin} ${y.toFixed(1)} Tm (${escapePdfText(segment.trimEnd())}) Tj`);
      y -= fontSize * 1.6;
    }
  }
  commands.push("ET");

  const content = `${commands.join("\n")}\n`;
  const byteLength = (value: string) => Buffer.byteLength(value, "latin1");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${byteLength(content)} >>\nstream\n${content}endstream`,
  ];

  const eol = "\r\n";
  let pdf = `%PDF-1.4${eol}%\xE2\xE3\xCF\xD3${eol}`;
  const offsets = [0];
  objects.forEach((obj, index) => {
    offsets.push(byteLength(pdf));
    pdf += `${index + 1} 0 obj${eol}${obj}${eol}endobj${eol}`;
  });
  const xrefOffset = byteLength(pdf);
  pdf += `xref${eol}0 ${objects.length + 1}${eol}`;
  pdf += `0000000000 65535 f ${eol}`;
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n ${eol}`;
  }
  pdf += `trailer${eol}<< /Size ${objects.length + 1} /Root 1 0 R >>${eol}startxref${eol}${xrefOffset}${eol}%%EOF${eol}`;

  const out = join(FIX, "sample-offer-letter.pdf");
  writeFileSync(out, pdf, "latin1");
  console.log(`wrote ${out} (${byteLength(pdf)} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
