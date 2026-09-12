// Minimal IndexedDB wrapper to persist uploaded file blobs across reloads.
const DB = "lifepack", STORE = "files";
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function putBlob(key: string, blob: Blob) {
  const db = await open();
  return new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
export async function getBlob(key: string): Promise<Blob | null> {
  const db = await open();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const rq = tx.objectStore(STORE).get(key);
    rq.onsuccess = () => res(rq.result ?? null);
    rq.onerror = () => res(null);
  });
}
export async function delBlob(key: string) {
  const db = await open();
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => res();
  });
}
