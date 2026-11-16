import type { Antwort } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import { zufall, type Zufall } from '../core/zufall';

/**
 * Ein Format = Generator + Löser + Hilfeleiter + Lernbeispiel (docs/TZ.md, „Движки“).
 *
 * Harte Regel: jede ausgegebene Aufgabe hat genau EINE richtige Antwort nach dem, was das Kind sieht.
 * `erzeuge` baut eine Aufgabe, `loesungen` sucht unabhängig davon ALLE passenden Antworten;
 * `aufgabeAus` nimmt nur Aufgaben mit genau einer Lösung (Test: 10 000 je Stufe).
 */

export type FormatId = 'zahlenmauer' | 'wer-ist-es' | 'muster';

/** Wie das Kind antwortet */
export type Eingabe =
  /** Zahl mit Ziffernperlen 0–9 tippen */
  | 'zahl'
  /** eine von mehreren Perlen wählen */
  | 'wahl'
  /** im Bild auf ein Ding tippen (Elemente mit data-wahl="k") */
  | 'bild';

/**
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“):
 * 1 – Beispiel „So geht's“ groß; 2 – Aufmerksamkeit lenken (Teil hervorheben);
 * 3 – einen Lösungsschritt zeigen; 4 – ähnliche Aufgabe vorrechnen (eigene nie).
 * Stufe 3 darf nie die ganze Lösung verraten – sonst zeigt sie das an der ähnlichen Aufgabe.
 */
export type HilfeStufe = 0 | 1 | 2 | 3 | 4;

export interface Format<B> {
  id: FormatId;
  /** steigt, wenn sich der Generator ändert – gespeicherte Aufgaben bleiben so reproduzierbar */
  version: number;
  /** Auftrag für das Kind: kurz, immer gleich, Deutsch */
  auftrag: string;
  stufen: number;
  eingabe: Eingabe;
  erzeuge(z: Zufall, stufe: number): B;
  /** alle Antworten, die nach dem Sichtbaren passen (Löser, unabhängig vom Generator) */
  loesungen(b: B): Antwort[];
  /** Wahlmöglichkeiten (bei 'wahl' und 'bild'), in fester Reihenfolge */
  wahl?(b: B, z: Zufall): Antwort[];
  /** Bild der Aufgabe; `hilfe` 2 oder 3 zeigt die Hilfe auf dem Bild; `gewaehlt` = Antwort des Kindes */
  zeichne(b: B, o: { hilfe: HilfeStufe; gewaehlt: Antwort | null; vorrechnen?: boolean }): string;
  /** true: Hilfe Stufe 3 würde hier die Lösung verraten – dann wird sie an der ähnlichen Aufgabe gezeigt */
  schrittVerraet?(b: B): boolean;
  /** sehr leichte Aufgabe für das Lernbeispiel */
  beispiel(z: Zufall): B;
}

/** gespeicherte Aufgabe: alles, um sie genau so wieder zu zeigen und zu prüfen */
export interface Aufgabe<B = unknown> {
  format: FormatId;
  version: number;
  samen: number;
  stufe: number;
  bedingung: B;
  wahl: Antwort[] | null;
  /** höchste benutzte Hilfestufe (für den Schwierigkeitsgrad später) */
  hilfe: HilfeStufe;
}

const VERSUCHE = 200;

/** Aufgabe mit genau einer Lösung; sonst nächster Samen (deterministisch) */
export function aufgabeAus<B>(f: Format<B>, samen: number, stufe: number): Aufgabe<B> {
  for (let v = 0; v < VERSUCHE; v++) {
    const s = (samen + v * 7919) >>> 0;
    const z = zufall(s);
    const b = f.erzeuge(z, stufe);
    if (f.loesungen(b).length !== 1) continue;
    const wahl = f.wahl ? f.wahl(b, z) : null;
    if (wahl && wahl.filter((w) => f.loesungen(b).some((l) => gleich(l, w))).length !== 1) continue;
    return { format: f.id, version: f.version, samen: s, stufe, bedingung: b, wahl, hilfe: 0 };
  }
  throw new Error(`${f.id}: keine eindeutige Aufgabe gefunden (Stufe ${stufe})`);
}

export function stimmt<B>(f: Format<B>, a: Aufgabe<B>, antwort: Antwort): boolean {
  return f.loesungen(a.bedingung).some((l) => gleich(l, antwort));
}
