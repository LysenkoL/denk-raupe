import type { HilfeStufe } from '../aufgaben/format';
import { gleich, type Antwort } from '../perlen/antwort';
import { fehlantworten } from './historie';
import type { Sitzung } from './sitzung';
import type { Satz } from './vergleich';

/**
 * Hilfeleiter im Satz und der Hilfeknopf gegen Durchprobieren (docs/TZ.md, „Помощь“, Absatz
 * „Против перебора вариантов“; docs/PLAN.md, Aufgabe A6).
 *
 * Der Knopf pulsiert, wenn bei der aktuellen Perle seit dem letzten Druck auf den Hilfeknopf zwei neue
 * Fehlantworten geprüft wurden – „neu“: diese Antwort hat bei dieser Perle vorher noch nie nicht gepasst.
 * Nochmal Vergleichen ohne Änderung und die Rückkehr zu einer alten Fehlantwort zählen nicht.
 * Das Pulsen hängt nur an der Zahl solcher Prüfungen, nie daran, wie nah eine Antwort an der richtigen ist.
 * Die Hilfe öffnet sich nie von selbst; drücken muss das Kind.
 */

/** ab so vielen neuen Fehlantworten seit dem letzten Druck auf den Hilfeknopf pulsiert er */
export const PULS_AB = 2;

/** Zustand des Hilfeknopfs je Perle; wird mit der Sitzung gespeichert */
export interface PulsZustand {
  /** Zahl der Fehlantworten der Perle (`fehlantworten`) beim letzten Druck auf den Hilfeknopf: nur Prüfungen danach zählen */
  marke: number;
  /** der Knopf hat bei dieser Perle mindestens einmal gepulst (für die Historie) */
  puls: boolean;
  /** das Kind hat den Knopf gedrückt, während er pulsierte (für die Historie) */
  hilfeNachPuls: boolean;
}

/** höchste Hilfestufe, die sich gerade öffnen lässt: vor dem ersten Vergleichen 2, danach 4 */
export function hoechsteHilfe(s: Satz): HilfeStufe {
  return s.runden > 0 ? 4 : 2;
}

/**
 * Wie viele Fehlantworten ab Stelle `ab` neu sind: an keiner früheren Stelle der Liste steht dieselbe.
 * Unbekannte Antworten (null, Satz von vor A3) zählen als neu – jede gezählte Fehlprüfung hatte eine
 * geänderte Antwort, eine Wiederholung lässt sich nicht nachweisen.
 */
export function neueFehler(falsch: readonly (Antwort | null)[], ab: number): number {
  let n = 0;
  for (let k = Math.max(0, ab); k < falsch.length; k++) {
    const a = falsch[k];
    if (a === null || !falsch.slice(0, k).some((b) => b !== null && gleich(a, b))) n++;
  }
  return n;
}

/**
 * Zustand für eine Perle ohne gespeicherten Puls (Satz aus der Zeit vor A6): war schon eine Hilfestufe
 * offen, ist unbekannt, ob vor oder nach den Fehlantworten – vorsichtig gilt sie als danach gedrückt.
 */
export function pulsAnfang(s: Pick<Sitzung, 'satz' | 'hilfeOffen'>, i: number): PulsZustand {
  const p = s.satz.perlen[i];
  return { marke: p && (s.hilfeOffen[i] ?? 0) > 0 ? fehlantworten(p).length : 0, puls: false, hilfeNachPuls: false };
}

function pulsVon(s: Sitzung, i: number): PulsZustand {
  return s.puls?.[i] ?? pulsAnfang(s, i);
}

/**
 * Pulsiert der Hilfeknopf bei Perle `i`? Rein aus dem Zustand des Satzes:
 * Perle noch offen (Blatt liegt, nicht zurückgelegt), schon einmal verglichen, nicht alle Hilfestufen
 * offen, und seit dem letzten Druck auf den Knopf mindestens `PULS_AB` neue Fehlantworten.
 */
export function hilfePulst(s: Sitzung, i: number): boolean {
  const p = s.satz.perlen[i];
  if (!p || p.blatt !== 'zu' || p.zurueck) return false;
  if (s.satz.runden === 0) return false;
  if ((s.hilfeOffen[i] ?? 0) >= hoechsteHilfe(s.satz)) return false;
  return neueFehler(fehlantworten(p), pulsVon(s, i).marke) >= PULS_AB;
}

/** Puls für jede Perle festhalten, bei der der Knopf jetzt pulsiert (nach jedem Vergleichen und beim Laden) */
export function pulsNachfuehren(s: Sitzung): Sitzung {
  const puls = s.satz.perlen.map((_, i) => {
    const z = pulsVon(s, i);
    return !z.puls && hilfePulst(s, i) ? { ...z, puls: true } : z;
  });
  return puls.every((z, i) => z === s.puls?.[i]) ? s : { ...s, puls };
}

/**
 * Das Kind drückt den Hilfeknopf bei Perle `i`: die nächste Stufe öffnet sich (höchstens `hoechsteHilfe`),
 * die Aufgabe merkt sich die höchste benutzte Stufe. Der Knopf hört auf zu pulsieren und zählt neu ab hier;
 * pulsierte er gerade, steht das für die Historie fest.
 */
export function hilfeOeffnen(s: Sitzung, i: number = s.aktuell): Sitzung {
  const alt = s.hilfeOffen[i];
  if (alt === undefined || alt >= hoechsteHilfe(s.satz)) return s;
  const neu = (alt + 1) as HilfeStufe;
  const pulste = hilfePulst(s, i);
  const z = pulsVon(s, i);
  const jetzt: PulsZustand = { marke: fehlantworten(s.satz.perlen[i]).length, puls: z.puls || pulste, hilfeNachPuls: z.hilfeNachPuls || pulste };
  return {
    ...s,
    hilfeOffen: s.hilfeOffen.map((h, j) => (j === i ? neu : h)),
    aufgaben: s.aufgaben.map((a, j) => (j === i ? { ...a, hilfe: Math.max(a.hilfe, neu) as HilfeStufe } : a)),
    puls: s.satz.perlen.map((_, j) => (j === i ? jetzt : pulsVon(s, j))),
  };
}
