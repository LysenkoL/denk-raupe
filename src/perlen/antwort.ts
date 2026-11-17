import type { FormFarbe } from '../design/farbe';

/**
 * Eine Antwort wird als Wert gespeichert, nie als Bild der Perle (docs/TZ.md, Harte Regeln, Nr. 3).
 * Die Perle wird aus dem Wert gezeichnet.
 */
export type Form = 'kreis' | 'quadrat' | 'dreieck' | 'raute' | 'stern';
export type Artikel = 'der' | 'die' | 'das';
/** Sammelantworten: Reihenfolge, Gitter, Paar, Bau … – die Perle zeigt ein Zeichen, groß auf Tipp */
export type Sammelzeichen = 'reihe' | 'gitter' | 'paar' | 'bau' | 'ansicht' | 'satz';
/** Rechenzeichen einer kurzen Aufgabe (Nr. 89, 92) */
export type Rechenzeichen = 'plus' | 'minus' | 'mal' | 'geteilt';
/** Einheit einer Größe (Nr. 104) */
export type Einheit = 'mm' | 'cm' | 'm' | 'km' | 'g' | 'kg' | 'ml' | 'l';

export type Antwort =
  | { art: 'zahl'; wert: number }
  | { art: 'buchstabe'; wert: string }
  | { art: 'wort'; wert: string }
  | { art: 'artikel'; wert: Artikel }
  | { art: 'form'; form: Form; farbe: FormFarbe; klein?: boolean }
  | { art: 'zeit'; stunde: number; minute: number }
  | { art: 'geld'; cent: number }
  | { art: 'laenge'; cm: number }
  /** kurze Aufgabe als Antwort: 7 + 3 (Nr. 89, 92); 7 + 3 und 3 + 7 sind verschiedene Antworten */
  | { art: 'ausdruck'; links: number; zeichen: Rechenzeichen; rechts: number }
  /** Größe mit Einheit: 15 cm (Nr. 104) */
  | { art: 'groesse'; wert: number; einheit: Einheit }
  /** Platz im Bild, gezählt ab 1 (Nr. 20, 95, 103) */
  | { art: 'stelle'; nr: number }
  | { art: 'sammel'; zeichen: Sammelzeichen; wert: readonly (string | number)[] };

/** Gleichheit nach Wert (für „Antwort geändert?“; ob sie stimmt, entscheidet allein die Aufgabe) */
export function gleich(a: Antwort | null, b: Antwort | null): boolean {
  if (a === null || b === null) return a === b;
  return JSON.stringify(normal(a)) === JSON.stringify(normal(b));
}

function normal(a: Antwort): unknown {
  // feste Reihenfolge der Felder, damit JSON.stringify vergleichbar ist
  return Object.keys(a)
    .sort()
    .map((k) => [k, (a as Record<string, unknown>)[k]]);
}
