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

export function schreiben(schluessel: string, wert: unknown): Promise<void> {
  return schreibenMehrere({ [schluessel]: wert });
}

/**
 * Mehrere Schlüssel in EINEM Schritt schreiben (eine Transaktion: alle oder keiner).
 * So landen die Einträge der Historie nie ohne das Zeichen „Satz schon gezählt“ und umgekehrt.
 */
export async function schreibenMehrere(werte: Record<string, unknown>): Promise<void> {
  const paare = Object.entries(werte);
  for (const [k, w] of paare) fluechtig.set(k, w);
  const db = await oeffnen();
  if (!db) return;
  await new Promise<void>((ok) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const [k, w] of paare) store.put(w, k);
      tx.oncomplete = () => ok();
      tx.onerror = () => ok();
      tx.onabort = () => ok();
    } catch {
      ok();
    }
  });
}

/** Schlüssel, unter dem Daten, die diese Version nicht lesen kann, unangetastet aufbewahrt werden */
export const unbekanntSchluessel = (schluessel: string): string => `${schluessel}-unbekannt`;

/**
 * Liste der aufbewahrten Kopien um `roh` ergänzen. Was schon da ist, bleibt (auch ein einzelner Wert,
 * der keine Liste ist); dieselbe Kopie kommt nicht zweimal hinein.
 */
export function aufbewahren(kopien: unknown, roh: unknown): unknown[] {
  const liste = kopien === undefined || kopien === null ? [] : Array.isArray(kopien) ? kopien : [kopien];
  const text = JSON.stringify(roh);
  return liste.some((k) => JSON.stringify(k) === text) ? liste : [...liste, roh];
}

/**
 * Gespeichertes lesen und mit `lade` prüfen bzw. umziehen. Kann `lade` den Wert nicht lesen (neuere,
 * unbekannte Version oder kaputt), wird er zuerst unverändert unter `…-unbekannt` gesichert; erst danach
 * fängt die App unter dem eigentlichen Schlüssel neu an. So gehen Antworten und Blätter nie verloren
 * (docs/TZ.md, „Интерфейс и надёжность“). Nichts gespeichert → null, ohne Kopie.
 */
export async function ladeGeschuetzt<T>(schluessel: string, lade: (roh: unknown) => T | null): Promise<T | null> {
  const roh = await lesen<unknown>(schluessel);
  const wert = lade(roh);
  if (wert === null && roh !== undefined && roh !== null) {
    const k = unbekanntSchluessel(schluessel);
    await schreiben(k, aufbewahren(await lesen<unknown>(k), roh));
  }
  return wert;
}
