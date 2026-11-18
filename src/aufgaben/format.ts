import type { Antwort } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import { zufall, type Zufall } from '../core/zufall';
import type { AuftragSchluessel } from '../i18n/kind';

/**
 * Ein Format = Pass + Generator + Löser + Hilfeleiter + Lernbeispiel (docs/FORMATE.md, Abschnitt 3).
 *
 * Harte Regel: jede ausgegebene Aufgabe hat genau EINE richtige Antwort nach dem, was das Kind sieht.
 * `erzeuge` baut eine Aufgabe, `loesungen` sucht unabhängig davon ALLE passenden Antworten;
 * `aufgabeAus` nimmt nur Aufgaben mit genau einer Lösung (Test: 10 000 je Stufe und Zahlenraum).
 */

export type FormatId = 'zahlenmauer' | 'wer-ist-es' | 'muster';

/** Sieben Bereiche, die der Elternteil ein- und ausschaltet */
export type Bereich = 'zahlen' | 'muster' | 'logik' | 'raum' | 'blick' | 'woerter' | 'welt';

/** Engine: wie das Kind auf dem Bildschirm handelt (docs/FORMATE.md, Abschnitt 5) */
export type Motor = 'bild' | 'auswahl' | 'raster' | 'reihe' | 'verbinden' | 'weg' | 'bauen' | 'blick';

/** Fähigkeiten (docs/FORMATE.md, Abschnitt 2): Buchstabe des Bereichs + Nummer */
export const FAEHIGKEITEN = [
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'Z9',
  'M1', 'M2',
  'L1', 'L2', 'L3', 'L4',
  'R1', 'R2', 'R3', 'R4',
  'B1', 'B2',
  'W1', 'W2', 'W3', 'W4', 'W5',
  'S1', 'S2',
] as const;
export type Faehigkeit = (typeof FAEHIGKEITEN)[number];

const BEREICH_BUCHSTABE: Record<string, Bereich> = { Z: 'zahlen', M: 'muster', L: 'logik', R: 'raum', B: 'blick', W: 'woerter', S: 'welt' };

/** Bereich einer Fähigkeit = ihr erster Buchstabe */
export function bereichVon(f: Faehigkeit): Bereich {
  return BEREICH_BUCHSTABE[f[0]];
}

export type Zahlenraum = 10 | 20 | 100;
export const ZAHLENRAEUME: readonly Zahlenraum[] = [10, 20, 100];

/** Einstellung des Elternteils, die in den Generator geht */
export interface Einstellung {
  zahlenraum: Zahlenraum;
}

/**
 * Solange es die Elterneinstellung noch nicht gibt (Aufgabe C3), nimmt der Satz diese.
 * Bis 20: so sehen die Aufgaben genau so aus wie vor Version 2 des Formats.
 */
export const STANDARD_EINSTELLUNG: Einstellung = { zahlenraum: 20 };

/** Wie das Kind antwortet */
export type Eingabe =
  /** Zahl mit Ziffernperlen; max = größte Antwort, die das Format hier verlangen kann (bei max < 10 ein Platz) */
  | { art: 'zahl'; max: number }
  /** eine von mehreren Perlen wählen */
  | { art: 'wahl' }
  /** im Bild auf ein Ding tippen (Elemente mit data-wahl="k"); mehrfach: mehrere */
  | { art: 'bild'; mehrfach?: boolean }
  /** Uhrzeit auf dem Zifferblatt und in Ziffern */
  | { art: 'zeit' }
  /** Betrag in Euro und Cent */
  | { art: 'geld'; maxCent: number }
  /** Sammelantwort einer Engine */
  | { art: 'raster' | 'reihe' | 'paare' | 'weg' | 'bau' };

/**
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“):
 * 1 – Beispiel „So geht's“ groß; 2 – Aufmerksamkeit lenken (Teil hervorheben);
 * 3 – einen Lösungsschritt zeigen; 4 – ähnliche Aufgabe vorrechnen (eigene nie).
 * Stufe 3 darf nie die ganze Lösung verraten – sonst zeigt sie das an der ähnlichen Aufgabe.
 */
export type HilfeStufe = 0 | 1 | 2 | 3 | 4;

export type Braucht = 'woerterbuch' | 'autorensatz' | 'bilder';

export interface Format<B> {
  // Pass
  id: FormatId;
  /** Nummer im Katalog des Briefs */
  nr: number;
  /** steigt bei jeder Änderung des Generators – gespeicherte Aufgaben bleiben so reproduzierbar */
  version: number;
  bereich: Bereich;
  faehigkeit: Faehigkeit;
  motor: Motor;
  /** ab welcher Klasse */
  klasse: 1 | 2;
  /** 1: Lesen ist Teil der Aufgabe („nur für Lesende“) */
  lesen: 0 | 1;
  braucht: Braucht[];
  /** false: nur Bildschirm */
  druck: boolean;
  /** Schlüssel des festen Auftrags in src/i18n/kind.ts */
  auftrag: AuftragSchluessel;
  /** mindestens 3 */
  stufen: number;

  // Aufgabe
  /** Formate, die vom Zahlenraum nicht abhängen, lesen `e` nicht */
  erzeuge(z: Zufall, stufe: number, e: Einstellung): B;
  /** alle Antworten, die nach dem Sichtbaren passen (Löser, unabhängig vom Generator) */
  loesungen(b: B): Antwort[];
  eingabe(b: B): Eingabe;
  /** Wahlmöglichkeiten (bei 'wahl' und 'bild'), in fester Reihenfolge */
  wahl?(b: B, z: Zufall): Antwort[];
  /** true nur bei Nr. 9 und 10: jede richtige Belegung zählt */
  mehrere?: boolean;

  // Anzeige
  /** Bild der Aufgabe; `hilfe` 2 oder 3 zeigt die Hilfe auf dem Bild; `gewaehlt` = Antwort des Kindes */
  zeichne(b: B, o: { hilfe: HilfeStufe; gewaehlt: Antwort | null; vorrechnen?: boolean }): string;
  /** true: Hilfe Stufe 3 würde hier die Lösung verraten – dann wird sie an der ähnlichen Aufgabe gezeigt */
  schrittVerraet?(b: B): boolean;
  /**
   * 2–3 Aufgaben des Lernbeispiels, von leicht zu gewöhnlich: die erste löst eine einzige offensichtliche
   * Handlung, die letzte ist eine gewöhnliche Aufgabe der Stufe 1. Jede muss die Prüfung wie `aufgabeAus`
   * bestehen (siehe `lernbeispiel`).
   */
  beispiele(z: Zufall): B[];
  /** Block für das A4-Blatt; Pflicht bei druck: true */
  druckBlock?(b: B): string;
}

/** gespeicherte Aufgabe: alles, um sie genau so wieder zu zeigen, zu prüfen und neu zu erzeugen */
export interface Aufgabe<B = unknown> {
  format: FormatId;
  version: number;
  samen: number;
  stufe: number;
  /** Zahlenraum, mit dem die Aufgabe erzeugt wurde: Samen + Version + Zahlenraum → dieselbe Aufgabe */
  zahlenraum: Zahlenraum;
  bedingung: B;
  wahl: Antwort[] | null;
  /** höchste benutzte Hilfestufe (für den Schwierigkeitsgrad später) */
  hilfe: HilfeStufe;
}

const VERSUCHE = 200;

/** Aufgabe mit genau einer Lösung; sonst nächster Samen (deterministisch) */
export function aufgabeAus<B>(f: Format<B>, samen: number, stufe: number, e: Einstellung = STANDARD_EINSTELLUNG): Aufgabe<B> {
  for (let v = 0; v < VERSUCHE; v++) {
    const s = (samen + v * 7919) >>> 0;
    const z = zufall(s);
    const b = f.erzeuge(z, stufe, e);
    if (f.loesungen(b).length !== 1) continue;
    const wahl = f.wahl ? f.wahl(b, z) : null;
    if (wahl && wahl.filter((w) => f.loesungen(b).some((l) => gleich(l, w))).length !== 1) continue;
    return { format: f.id, version: f.version, samen: s, stufe, zahlenraum: e.zahlenraum, bedingung: b, wahl, hilfe: 0 };
  }
  throw new Error(`${f.id}: keine eindeutige Aufgabe gefunden (Stufe ${stufe}, bis ${e.zahlenraum})`);
}

/** Samen der Schritte im Lernbeispiel: fest, damit Wahl und Reihenfolge nach Neuladen gleich bleiben */
const LERN_SAMEN = 1;

/**
 * Schritte des Lernbeispiels als Aufgaben (Stufe 1, Standard-Zahlenraum). Jeder Schritt besteht dieselbe
 * Prüfung wie `aufgabeAus`: genau eine Lösung, in der Wahl genau einmal. Sonst Fehler – ein Format mit
 * mehrdeutigem Lernbeispiel kommt nicht durch die Tests.
 */
export function lernbeispiel<B>(f: Format<B>): Aufgabe<B>[] {
  return f.beispiele(zufall(LERN_SAMEN)).map((b, k) => {
    const samen = LERN_SAMEN + k;
    const l = f.loesungen(b);
    const wahl = f.wahl ? f.wahl(b, zufall(samen)) : null;
    const eindeutig = l.length === 1 && (!wahl || wahl.filter((w) => gleich(w, l[0])).length === 1);
    if (!eindeutig) throw new Error(`${f.id}: Lernbeispiel, Schritt ${k + 1}, ist nicht eindeutig`);
    return { format: f.id, version: f.version, samen, stufe: 1, zahlenraum: STANDARD_EINSTELLUNG.zahlenraum, bedingung: b, wahl, hilfe: 0 };
  });
}

/**
 * Sofortige Rückmeldung im Lernbeispiel (nur dort – im Satz gibt es keine bis zum Vergleichen):
 * richtig; falsch; offen = noch nichts oder eine Zahl, die erst halb eingegeben ist. Die Plätze lassen sich
 * in jeder Reihenfolge füllen (src/satz/zahleingabe.ts): 1 auf dem Weg zu 14 (getippt, gleich wird
 * geschoben) und 4 auf dem Weg zu 14 (erst E, dann Z) sind beide offen.
 */
export function lernPruefen<B>(f: Format<B>, a: Aufgabe<B>, antwort: Antwort | null): 'richtig' | 'falsch' | 'offen' {
  if (!antwort) return 'offen';
  const l = f.loesungen(a.bedingung)[0];
  if (gleich(l, antwort)) return 'richtig';
  if (antwort.art === 'zahl' && l.art === 'zahl') {
    const ziel = String(l.wert);
    const da = String(antwort.wert);
    if (da.length < ziel.length && (ziel.startsWith(da) || ziel.endsWith(da))) return 'offen';
  }
  return 'falsch';
}

export function stimmt<B>(f: Format<B>, a: Aufgabe<B>, antwort: Antwort): boolean {
  return f.loesungen(a.bedingung).some((l) => gleich(l, antwort));
}
