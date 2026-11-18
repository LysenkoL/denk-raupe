import { gleich, type Antwort } from '../perlen/antwort';

/**
 * Selbstkontrolle am Ende des Satzes (docs/TZ.md, „Самопроверка: гусеница и близнец“).
 *
 * Reiner Zustand ohne Oberfläche. Die richtige Lösung kennt dieser Modul nicht: ob eine Antwort
 * stimmt, sagt die Aufgabe über `stimmt(i, antwort)`. Nach außen geht nur, welches Blatt sich hebt –
 * nie, was unter einem liegen gebliebenen Blatt liegt.
 */

export type Blatt = 'zu' | 'gehoben' | 'gold';

export interface PerlenZustand {
  antwort: Antwort | null;
  blatt: Blatt;
  /** zurückgelegt (Hilfe, Stufe 4): Perle bleibt unter dem Blatt, der Satz gilt trotzdem als fertig */
  zurueck: boolean;
  /** Antwort beim letzten Vergleichen – um eine Wiederholung ohne Änderung zu erkennen */
  geprueft: Antwort | null;
  /** wie oft eine geänderte Antwort nicht gepasst hat (für den Schwierigkeitsgrad, nie für das Kind) */
  fehlversuche: number;
  /**
   * Die Antworten, die nicht gepasst haben, in der Reihenfolge der Prüfungen – nur Prüfungen, bei denen
   * sich die Antwort dieser Perle seit der letzten Prüfung geändert hat (wie `fehlversuche`).
   * Fehlt bei Sätzen, die vor Aufgabe A3 begonnen wurden: deren frühere Fehlantworten sind unbekannt.
   */
  falsch?: Antwort[];
  /**
   * Aufgabe aus einem früheren Satz, dort zurückgelegt (docs/PLAN.md, A7): ihr Blatt ist nie golden.
   * Das Blatt für eine Aufgabe kommt einmal, wenn sie gelöst ist (docs/TZ.md, „Самопроверка“, Nr. 7);
   * golden ist nur, was beim allerersten Vergleichen stimmt – das war im Satz, aus dem sie kommt.
   * Optional – fehlt bei jeder anderen Perle.
   */
  keinGold?: boolean;
}

export interface Satz {
  perlen: PerlenZustand[];
  /** wie oft „Vergleichen“ wirklich etwas geprüft hat */
  runden: number;
}

export type Stimmt = (index: number, antwort: Antwort) => boolean;

export function neuerSatz(anzahl: number): Satz {
  if (!Number.isInteger(anzahl) || anzahl < 1) throw new Error(`ungültige Anzahl Aufgaben: ${anzahl}`);
  return {
    perlen: Array.from({ length: anzahl }, () => ({ antwort: null, blatt: 'zu', zurueck: false, geprueft: null, fehlversuche: 0, falsch: [] })),
    runden: 0,
  };
}

/** Perle unter gehobenem Blatt ist fertig und lässt sich nicht mehr ändern */
export function aenderbar(s: Satz, i: number): boolean {
  return s.perlen[i]?.blatt === 'zu';
}

export function setzeAntwort(s: Satz, i: number, antwort: Antwort | null): Satz {
  if (!aenderbar(s, i)) return s;
  return { ...s, perlen: s.perlen.map((p, j) => (j === i ? { ...p, antwort, zurueck: antwort ? false : p.zurueck } : p)) };
}

/** „Vergleichen“ ist aktiv, wenn jede noch offene Perle eine Antwort hat */
export function kannVergleichen(s: Satz): boolean {
  if (fertig(s)) return false;
  return s.perlen.every((p) => p.blatt !== 'zu' || p.zurueck || p.antwort !== null);
}

export interface Ergebnis {
  satz: Satz;
  /** Blätter, die sich bei diesem Vergleichen heben, in Reihenfolge */
  gehoben: number[];
  /** Blätter, die liegen bleiben und wackeln */
  bleiben: number[];
  /** nichts geändert seit dem letzten Mal – zählt nicht als Versuch */
  wiederholung: boolean;
}

export function vergleiche(s: Satz, stimmt: Stimmt): Ergebnis {
  if (!kannVergleichen(s)) return { satz: s, gehoben: [], bleiben: [], wiederholung: false };
  const erste = s.runden === 0;
  const offen = s.perlen.map((p, i) => ({ p, i })).filter(({ p }) => p.blatt === 'zu' && !p.zurueck);
  const wiederholung = !erste && offen.every(({ p }) => gleich(p.antwort, p.geprueft));
  const gehoben: number[] = [];
  const bleiben: number[] = [];
  const perlen = s.perlen.map((p, i) => {
    if (p.blatt !== 'zu' || p.zurueck) return p;
    const a = p.antwort!;
    if (stimmt(i, a)) {
      gehoben.push(i);
      // Gold nur, wenn die Perle schon beim allerersten Vergleichen gestimmt hat – nie bei einer zurückgekehrten Aufgabe
      return { ...p, blatt: (erste && !p.keinGold ? 'gold' : 'gehoben') as Blatt, geprueft: a };
    }
    bleiben.push(i);
    const neu = !gleich(a, p.geprueft);
    if (!neu) return { ...p, geprueft: a };
    return { ...p, geprueft: a, fehlversuche: p.fehlversuche + 1, falsch: [...(p.falsch ?? []), a] };
  });
  return { satz: { perlen, runden: s.runden + (wiederholung ? 0 : 1) }, gehoben, bleiben, wiederholung };
}

/** Zurücklegen (Hilfe, Stufe 4) – erst nach dem ersten Vergleichen */
export function zuruecklegen(s: Satz, i: number): Satz {
  if (s.runden === 0 || !aenderbar(s, i)) return s;
  return { ...s, perlen: s.perlen.map((p, j) => (j === i ? { ...p, zurueck: true } : p)) };
}

/** Satz fertig: jedes Blatt gehoben oder die Aufgabe zurückgelegt */
export function fertig(s: Satz): boolean {
  return s.runden > 0 && s.perlen.every((p) => p.blatt !== 'zu' || p.zurueck);
}

/** Blätter für den Korb: gewöhnliches Blatt zählt 1, goldenes 2 */
export function blaetter(s: Satz): { normal: number; gold: number; wert: number } {
  const gold = s.perlen.filter((p) => p.blatt === 'gold').length;
  const normal = s.perlen.filter((p) => p.blatt === 'gehoben').length;
  return { normal, gold, wert: normal + 2 * gold };
}
