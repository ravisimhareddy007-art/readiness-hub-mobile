import JSZip from "jszip";
import { getBlob } from "./idb";
import { getDecrypted } from "./secure-idb";
import type { Doc } from "./types";

export interface ZipResult {
  added: number;
  missing: Doc[]; // documents whose file could not be read: never silently dropped
}

const safe = (s: string) => s.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(0, 70);
const ext = (d: Doc) => {
  const fromName = (d.name.match(/\.(\w{2,4})$/) || [])[1];
  if (fromName) return "";
  if (/pdf/i.test(d.mime)) return ".pdf";
  if (/png/i.test(d.mime)) return ".png";
  if (/jpe?g/i.test(d.mime)) return ".jpg";
  if (/webp/i.test(d.mime)) return ".webp";
  return "";
};

/**
 * Packs the family's own original files. The originals are the deliverable: a doctor reads the
 * actual prescription or report, not a summary of one. Anything that cannot be read is reported
 * back rather than quietly left out.
 */
export async function buildZip(
  name: string,
  docs: Doc[],
  extras?: { name: string; content: string }[],
): Promise<ZipResult> {
  const zip = new JSZip();
  const folder = zip.folder(safe(name)) || zip;
  const missing: Doc[] = [];
  let added = 0;

  /* Numbered and dated so the folder opens in the order a consultation needs, and every file
     says what it is without being opened. */
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    let blob: Blob | null = null;
    try {
      blob =
        d.enc && d.iv && d.wrappedKeys
          ? await getDecrypted(d.fileKey, d.iv, d.wrappedKeys, "you", d.mime)
          : await getBlob(d.fileKey);
    } catch {
      blob = null;
    }
    if (!blob) {
      missing.push(d);
      continue;
    }
    const when = (d.docDate || d.addedAt || "").slice(0, 10);
    const label = safe([String(i + 1).padStart(2, "0"), when, d.docType, d.doctor || d.hospital || d.lab || ""].filter(Boolean).join("_"));
    folder.file(`${label}${ext(d)}` || d.name, blob);
    added++;
  }

  for (const x of extras || []) folder.file(x.name, x.content);

  folder.file(
    "CONTENTS.txt",
    [
      `ReadiNes — ${name}`,
      `Prepared ${new Date().toLocaleString()}`,
      "",
      `Original documents included: ${added}`,
      ...docs
        .filter((d) => !missing.includes(d))
        .map((d, i) => `  ${String(i + 1).padStart(2, "0")}. ${d.docType}${d.doctor ? ` · ${d.doctor}` : ""}${d.docDate ? ` · ${d.docDate.slice(0, 10)}` : ""}`),
      ...(missing.length
        ? ["", `Could not be included (${missing.length}):`, ...missing.map((d) => `  - ${d.docType} (${d.name})`)]
        : []),
    ].join("\n"),
  );

  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe(name)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return { added, missing };
}
