/**
 * Speicher auf dem Gerät (IndexedDB), Schlüssel → Wert. Daten bleiben nur auf dem Gerät.
 * Ist IndexedDB nicht da (privates Fenster, Vorschau), läuft alles im Arbeitsspeicher weiter.
 */
const DB = 'denk-raupe';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;
const fluechtig = new Map<string, unknown>();

function oeffnen(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((ok) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => ok(req.result);
        req.onerror = () => ok(null);
        req.onblocked = () => ok(null);
      } catch {
        ok(null);
      }
    });
  }
  return dbPromise;
}

export async function lesen<T>(schluessel: string): Promise<T | undefined> {
  const db = await oeffnen();
  if (!db) return fluechtig.get(schluessel) as T | undefined;
  return new Promise((ok) => {
    try {
      const req = db.transaction(STORE).objectStore(STORE).get(schluessel);
      req.onsuccess = () => ok(req.result as T | undefined);
      req.onerror = () => ok(fluechtig.get(schluessel) as T | undefined);
    } catch {
      ok(fluechtig.get(schluessel) as T | undefined);
    }
  });
}

export async function schreiben(schluessel: string, wert: unknown): Promise<void> {
  fluechtig.set(schluessel, wert);
  const db = await oeffnen();
  if (!db) return;
  await new Promise<void>((ok) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(wert, schluessel);
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
    } catch {
      ok();
    }
  });
}
