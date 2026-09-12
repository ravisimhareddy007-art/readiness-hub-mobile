import JSZip from "jszip";
import { getBlob } from "./idb";
import { getDecrypted } from "./secure-idb";
import type { Doc } from "./types";

export async function buildZip(name: string, docs: Doc[], extras?: { name: string; content: string }[]) {
  const zip = new JSZip();
  const folder = zip.folder(name.replace(/[^\w]+/g, "_")) || zip;
  for (const x of extras || []) folder.file(x.name, x.content);
  for (const d of docs) {
    const blob = d.enc && d.iv && d.wrappedKeys
      ? await getDecrypted(d.fileKey, d.iv, d.wrappedKeys, "you", d.mime)
      : await getBlob(d.fileKey);
    if (blob) folder.file(d.name, blob);
  }
  folder.file(
    "MANIFEST.txt",
    `ReadiNes — ${name}\nGenerated ${new Date().toLocaleString()}\n\n` +
      docs.map((d, i) => `${i + 1}. ${d.name}  [${d.docType}]`).join("\n"),
  );
  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.replace(/[^\w]+/g, "_")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
