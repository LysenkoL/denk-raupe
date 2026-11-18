import { FORMATE } from '../aufgaben';
import type { Aufgabe, Eingabe, FormatId, HilfeStufe } from '../aufgaben/format';
import { ladeGeschuetzt } from '../core/speicher';
import { gleich, type Antwort } from '../perlen/antwort';
import { fertig, type PerlenZustand, type Satz } from './vergleich';

/**
 * Historie der Aufgaben (docs/PLAN.md, Aufgabe A3; docs/FORMATE.md, „Вид сохранённого задания“).
 *
 * Eigener Speicher neben Satz und Profil. Beim Abschluss eines Satzes kommt jede Aufgabe ganz hinein –
 * Format, Version, Samen, Stufe, Zahlenraum, Bedingung, Wahl in gezeigter Reihenfolge – zusammen mit
 * dem Lösungsweg. Ein neuer Satz löscht nichts; die Historie wird nicht aufgeräumt.
 * Nur für Eltern und Schwierigkeitsgrad, nie für das Kind.
 */

export const HISTORIE_SCHLUESSEL = 'historie';

/**
 * Ausgang einer Aufgabe:
 * gold – beim ersten Vergleichen gleich; selbst – später korrigiert, ohne Hilfestufe 2–4;
 * hilfe – später korrigiert, mit Hilfestufe 2–4; zurueck – zurückgelegt (Hilfe, Stufe 4).
 * Das goldene Blatt hängt nur am ersten Vergleichen: „gold“ kann also auch Hilfe 1–2 haben –
 * deshalb steht die höchste Hilfestufe immer zusätzlich in `hilfe`.
 */
export type Ausgang = 'gold' | 'selbst' | 'hilfe' | 'zurueck';

/** Ein Eintrag = die gespeicherte Aufgabe (mit `hilfe`: höchste benutzte Stufe 0–4) + Lösungsweg */
export interface Eintrag extends Aufgabe {
  /** laufende Nummer des Satzes in dieser Historie (0, 1, 2 …): Aufgaben eines Satzes gehören zusammen */
  satz: number;
  /** Platz der Aufgabe im Satz (0 …) */
  nr: number;
  /** Tag des Abschlusses, Ortszeit des Geräts, JJJJ-MM-TT (Kalender der Blättchen) */
  tag: string;
  ergebnis: Ausgang;
  /** letzte Antwort des Kindes (bei gold/selbst/hilfe die passende; bei zurueck die zuletzt eingegebene) */
  antwort: Antwort | null;
  /**
   * Antworten, die nicht gepasst haben, in der Reihenfolge der Prüfungen (nur geänderte Antworten,
   * siehe `fehlantworten`). null: es gab hier eine Fehlantwort, aber der Satz stammt aus der Zeit vor A3
   * und hat sie nicht aufgeschrieben.
   */
  falsch: (Antwort | null)[];
  /** siehe `gleicheFehler` */
  gleicherFehler: number;
  /** Wahrscheinlichkeit, die Antwort zu erraten (siehe `rateChance`) */
  rateChance: number;
  // Erweiterung A6: hier kommt dazu, ob der Hilfeknopf gepulst hat und ob das Kind danach Hilfe nahm.
  // Neue Felder sind optional – ältere Einträge bleiben gültig, die Version der Historie bleibt 1.
}

export interface Historie {
  version: 1;
  eintraege: Eintrag[];
}

export function neueHistorie(): Historie {
  return { version: 1, eintraege: [] };
}

/** Datum ohne Uhrzeit, Ortszeit des Geräts: JJJJ-MM-TT */
export function tagVon(d: Date): string {
  const zwei = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** Ausgang einer fertigen Perle; null, solange sie offen ist */
export function ausgangVon(p: PerlenZustand, hilfe: HilfeStufe): Ausgang | null {
  if (p.blatt === 'gold') return 'gold';
  if (p.blatt === 'gehoben') return hilfe >= 2 ? 'hilfe' : 'selbst';
  if (p.zurueck) return 'zurueck';
  return null;
}

/**
 * Fehlantworten einer Perle für die Historie. Seit A3 schreibt `vergleiche` sie mit; bei einem Satz
 * von vorher fehlen sie – dann steht für jeden gezählten Fehlversuch ohne Antwort ein null davor,
 * damit die Zahl der Fehlversuche nicht verloren geht.
 */
export function fehlantworten(p: PerlenZustand): (Antwort | null)[] {
  const liste = p.falsch ?? [];
  const unbekannt = Math.max(0, p.fehlversuche - liste.length);
  return [...Array<null>(unbekannt).fill(null), ...liste];
}

/**
 * gleicherFehler: wie oft das Kind bei dieser Aufgabe eine Antwort zur Prüfung gegeben hat, die bei
 * einer FRÜHEREN Prüfung schon nicht gepasst hatte. Gezählt wird über `falsch`, also nur Prüfungen,
 * bei denen die Antwort seit der letzten Prüfung geändert wurde: nochmal Vergleichen ohne Änderung ist
 * kein Fehler (docs/TZ.md, „Самопроверка“, Nr. 6).
 * Beispiele: 5 → 7 → 5 ergibt 1; 5 → 7 → 5 → 7 ergibt 2; 5, nochmal 5 ohne Änderung ergibt 0.
 * Unbekannte Antworten (null) zählen nicht.
 */
export function gleicheFehler(falsch: readonly (Antwort | null)[]): number {
  return falsch.filter((a, i) => a !== null && falsch.slice(0, i).some((b) => b !== null && gleich(a, b))).length;
}

/**
 * Wahrscheinlichkeit, die Antwort zu erraten – aus der Art der Eingabe, kein eigenes Feld im Format
 * (docs/FORMATE.md, Abschnitt 3, Regel 6): Wahl aus k Möglichkeiten (Perlen oder ein Ding im Bild) 1/k;
 * Zahl, Uhrzeit, Geld und Sammelantwort (auch mehrere Dinge im Bild) 0.
 */
export function rateChance(e: Eingabe, wahl: readonly Antwort[] | null): number {
  const eineWahl = e.art === 'wahl' || (e.art === 'bild' && !e.mehrfach);
  return eineWahl && wahl && wahl.length > 0 ? 1 / wahl.length : 0;
}

/** Hilfe mindert das Gewicht: Stufe 0–1 (nur „So geht's“) gar nicht, 2 auf ¾, 3 auf ½, 4 auf ¼ */
const HILFE_FAKTOR: Record<HilfeStufe, number> = { 0: 1, 1: 1, 2: 0.75, 3: 0.5, 4: 0.25 };

/**
 * Gewicht einer Antwort, 0 … 1: wie viel sie als Zeichen für „kann es“ zählt (docs/TZ.md, „Сложность“:
 * richtige Wahl aus drei wiegt weniger als eine richtig eingegebene Zahl; Antwort mit Hilfe auch).
 * Vorläufig und bewusst einfach: (1 − rateChance) × Hilfefaktor; zurückgelegt → 0.
 * Das genaue Modell legt das eigene Pflichtenheft vor Etappe 7 fest.
 */
export function gewicht(e: Pick<Eintrag, 'ergebnis' | 'hilfe' | 'rateChance'>): number {
  if (e.ergebnis === 'zurueck') return 0;
  return (1 - e.rateChance) * HILFE_FAKTOR[e.hilfe];
}

/** Nummer, die der nächste Satz in der Historie bekommt */
export function naechsterSatz(h: Historie): number {
  const letzter = h.eintraege[h.eintraege.length - 1];
  return letzter ? letzter.satz + 1 : 0;
}

/** Einträge eines fertigen Satzes (noch nicht fertig → keine) */
export function eintraegeAus(aufgaben: readonly Aufgabe[], satz: Satz, nummer: number, jetzt: Date): Eintrag[] {
  if (!fertig(satz)) return [];
  const tag = tagVon(jetzt);
  return aufgaben.map((a, nr) => {
    const p = satz.perlen[nr];
    const falsch = fehlantworten(p);
    return {
      ...a,
      satz: nummer,
      nr,
      tag,
      ergebnis: ausgangVon(p, a.hilfe)!,
      antwort: p.antwort,
      falsch,
      gleicherFehler: gleicheFehler(falsch),
      rateChance: rateChance(FORMATE[a.format].eingabe(a.bedingung), a.wahl),
    };
  });
}

/** Satz an die Historie anhängen (nichts wird überschrieben) */
export function anhaengen(h: Historie, aufgaben: readonly Aufgabe[], satz: Satz, jetzt: Date): Historie {
  const neu = eintraegeAus(aufgaben, satz, naechsterSatz(h), jetzt);
  return neu.length ? { ...h, eintraege: [...h.eintraege, ...neu] } : h;
}

/**
 * Gespeicherte Historie lesen. Version 1 → so, wie sie ist. Nichts gespeichert, kaputt oder unbekannte
 * (neuere) Version → null; aufbewahrt wird Unbekanntes von `historieLesen`.
 */
export function ladeHistorie(roh: unknown): Historie | null {
  if (!roh || typeof roh !== 'object') return null;
  const h = roh as { version?: unknown; eintraege?: unknown };
  if (h.version === 1 && Array.isArray(h.eintraege)) return roh as Historie;
  return null;
}

/** Historie vom Gerät lesen (für Satz, Elternteil, Schwierigkeitsgrad); Unbekanntes bleibt unter `historie-unbekannt` */
export async function historieLesen(): Promise<Historie> {
  return (await ladeGeschuetzt(HISTORIE_SCHLUESSEL, ladeHistorie)) ?? neueHistorie();
}

export interface Filter {
  format?: FormatId;
  /** erster Tag, eingeschlossen (JJJJ-MM-TT) */
  von?: string;
  /** letzter Tag, eingeschlossen */
  bis?: string;
}

/** Einträge nach Format und Zeitraum, in der Reihenfolge, in der sie gelöst wurden */
export function eintraege(h: Historie, f: Filter = {}): Eintrag[] {
  return h.eintraege.filter((e) => (!f.format || e.format === f.format) && (!f.von || e.tag >= f.von) && (!f.bis || e.tag <= f.bis));
}

/** Tage mit mindestens einem fertigen Satz, aufsteigend (Kalender der Blättchen) */
export function tage(h: Historie): string[] {
  return [...new Set(h.eintraege.map((e) => e.tag))].sort();
}
