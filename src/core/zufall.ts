/**
 * Zufall mit Zahl als Samen (mulberry32): dieselbe Zahl gibt immer dieselbe Aufgabe.
 * So lässt sich jede ausgegebene Aufgabe genau wiederherstellen (docs/TZ.md, Надёжность).
 */
export interface Zufall {
  /** 0 ≤ x < 1 */
  zahl(): number;
  /** ganze Zahl von a bis b (beide eingeschlossen) */
  ganz(a: number, b: number): number;
  eins<T>(liste: readonly T[]): T;
  mischen<T>(liste: readonly T[]): T[];
}

export function zufall(samen: number): Zufall {
  let s = samen >>> 0;
  const zahl = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ganz = (a: number, b: number) => a + Math.floor(zahl() * (b - a + 1));
  return {
    zahl,
    ganz,
    eins: (liste) => liste[Math.floor(zahl() * liste.length)],
    mischen: (liste) => {
      const a = [...liste];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(zahl() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/** neuer Samen (für neue Sätze); in Tests fest */
export function neuerSamen(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
