/**
 * OCR for scanned/image offer PDFs (RC4), behind the OCR_ENABLED server flag. Uses
 * tesseract.js when present (dynamic import so it never enters the default bundle and
 * is optional to install). Returns extracted text, or null when OCR is disabled or
 * unavailable - in which case the parser flags every field for manual review rather
 * than inventing any value.
 *
 * Note: production OCR of a PDF also needs a raster step (PDF page -> image) before
 * tesseract; that rasterizer is the next adapter to add. This module is the gated seam.
 */
export function isOcrEnabled(): boolean {
  return process.env.OCR_ENABLED === "1";
}

export async function ocrImage(image: Buffer): Promise<string | null> {
  if (!isOcrEnabled()) return null;
  try {
    // Variable specifier: tesseract.js is an OPTIONAL dependency (may not be installed),
    // so we resolve it dynamically and TS does not require its types at build time.
    const spec = "tesseract.js";
    const mod = await import(/* @vite-ignore */ spec).catch(() => null);
    if (!mod) return null;
    const t = mod as unknown as {
      recognize: (img: Buffer | string, lang?: string) => Promise<{ data: { text: string } }>;
    };
    const { data } = await t.recognize(image, "eng");
    return data.text?.trim() || null;
  } catch (err) {
    console.warn("ocr failed:", err);
    return null;
  }
}
