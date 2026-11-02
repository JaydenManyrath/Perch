/**
 * Course reports: convert a simple Markdown file (headings, paragraphs, **bold**,
 * `code`, bullet lists, pipe tables, ![caption](image.png)) to a .docx in the format
 * of our proposal (Times New Roman 12, double-spaced, centered title block).
 *
 *   node scripts/testing/md-to-docx.cjs in.md out.docx
 */
const fs = require('fs');
const path = require('path');
const d = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, Footer, PageNumber, LevelFormat, ImageRun } = d;
const [src, out] = process.argv.slice(2);
const lines = fs.readFileSync(src, 'utf8').split('\n');
const FONT = 'Times New Roman', SZ = 24, DOUBLE = { line: 480 }, SINGLE = { line: 240 };

function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: base.size || SZ, bold: base.bold }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), font: FONT, size: base.size || SZ, bold: true }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: 'Courier New', size: (base.size || SZ) - 2, bold: base.bold }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: base.size || SZ, bold: base.bold }));
  return out;
}
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
function table(rows) {
  const data = rows.filter(r => !/^\|\s*-/.test(r)).map(r => r.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const n = data[0].length, total = 9360;
  const weights = data[0].map((_, j) => Math.max(...data.map(r => (r[j] || "").length), 16) + 6);
  const sum = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map(w => Math.floor(total * w / sum)); widths[n - 1] += total - widths.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: data.map((r, i) => new TableRow({ tableHeader: i === 0, cantSplit: true, children: r.map((c, j) => new TableCell({
      width: { size: widths[j], type: WidthType.DXA }, borders,
      shading: i === 0 ? { type: ShadingType.CLEAR, fill: 'E6E6E6', color: 'auto' } : undefined,
      margins: data.length > 30 ? { top: 10, bottom: 10, left: 60, right: 60 } : { top: 40, bottom: 40, left: 80, right: 80 },
      children: [new Paragraph({ spacing: SINGLE, keepNext: i < data.length - 1, keepLines: true, children: runs(c, { size: data.length > 30 ? 16 : data.length > 12 ? 17 : 20, bold: i === 0 }) })] })) })) });
}
const children = []; let i = 0;
while (i < lines.length) {
  const l = lines[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith('# ')) {
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOUBLE, children: runs(l.slice(2), { bold: true }) })); i++;
    const meta = lines[++i] || ''; // byline paragraph after blank
    const parts = meta.split(' | ');
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOUBLE, children: runs(parts[0]) }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOUBLE, children: runs(parts.slice(1).join(' | ')) }));
    i++; continue;
  }
  const img = l.match(/^!\[(.*)\]\((.*)\)$/);
  if (img) {
    const file = path.resolve(path.dirname(src), img[2]);
    const buf = fs.readFileSync(file);
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20); // PNG header
    const width = 624, height = Math.round(width * h / w);
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width, height } })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...SINGLE, before: 80, after: 160 }, children: runs(img[1], { size: 20 }) }));
    i++; continue;
  }
  if (l.startsWith('### ')) { children.push(new Paragraph({ keepNext: true, spacing: { ...DOUBLE, before: 80 }, children: runs(l.slice(4), { bold: true }) })); i++; continue; }
  if (l.startsWith('## ')) { children.push(new Paragraph({ keepNext: true, spacing: { ...DOUBLE, before: 120 }, children: runs(l.slice(3), { bold: true }) })); i++; continue; }
  if (l.startsWith('|')) { const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]); children.push(table(rows)); continue; }
  if (l.startsWith('- ')) { while (i < lines.length && lines[i].startsWith('- ')) children.push(new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: DOUBLE, children: runs(lines[i++].slice(2)) })); continue; }
  if (/^Table \d+\./.test(l)) { children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { ...SINGLE, before: 120, after: 120 }, children: runs(l, { size: 20 }) })); i++; continue; }
  children.push(new Paragraph({ spacing: DOUBLE, indent: { firstLine: 720 }, children: runs(l) })); i++;
}
const doc = new Document({
  numbering: { config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ })] })] }) },
    children }] });
Packer.toBuffer(doc).then(b => fs.writeFileSync(out, b));
