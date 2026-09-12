// src/lib/ocr.ts
// On-device OCR. Runs in the browser via tesseract.js (web), Apple Vision (iOS), ML Kit (Android).
// This file is the WEB path. It reads text from an image/PDF-page WITHOUT any network call.
// The extracted text never leaves the device; only the derived metadata is later encrypted + stored.

// Lazy-load tesseract.js so it doesn't bloat initial bundle. `npm i tesseract.js`
type OcrText = { text: string; confidence: number };

let _worker: any = null;
async function getWorker() {
  if (_worker) return _worker;
  const { createWorker } = await import("tesseract.js");
  _worker = await createWorker("eng"); // add "hin" etc. for regional scripts
  return _worker;
}

// Extract text from an image file (jpg/png/webp) fully on-device.
export async function ocrImage(file: Blob): Promise<OcrText> {
  const worker = await getWorker();
  const { data } = await worker.recognize(file);
  return { text: data.text || "", confidence: data.confidence ?? 0 };
}

// Only OCR the file types where it helps; skip large/irrelevant types.
export function shouldOcr(mime: string, sizeKB: number): boolean {
  if (sizeKB > 8000) return false;                       // skip very large files
  return /^image\/(jpeg|png|webp|heic)/.test(mime);      // images only on web MVP
  // PDFs: render page 1 to a canvas first (pdf.js), then pass the canvas blob here.
}

// Graceful: if OCR fails or isn't applicable, return empty so caller falls back to filename.
export async function safeOcr(file: Blob, mime: string, sizeKB: number): Promise<string> {
  if (!shouldOcr(mime, sizeKB)) return "";
  try { return (await ocrImage(file)).text; } catch { return ""; }
}
