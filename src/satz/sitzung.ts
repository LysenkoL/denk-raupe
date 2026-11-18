import { FORMATE } from '../aufgaben';
import { aufgabeAus, stimmt, STANDARD_EINSTELLUNG, type Aufgabe, type Einstellung, type FormatId, type HilfeStufe } from '../aufgaben/format';
import type { Mauer } from '../aufgaben/zahlenmauer';
import { zufall } from '../core/zufall';
import type { Antwort } from '../perlen/antwort';
import { blaetter, fertig, neuerSatz, type PerlenZustand, type Satz } from './vergleich';
import { anhaengen, gleicherVerweis, type Eintrag, type Historie, type Verweis } from './historie';
import { pulsAnfang, type PulsZustand } from './hilfe';

/**
 * Ein laufender Satz mit allem, was gespeichert wird: jede Aufgabe ganz (Format, Version, Samen,
 * Stufe, Bedingung, Wahl, Hilfe), dazu der Zustand von Raupe und Zwilling.
 * Wird nach jeder Änderung gespeichert und nach Verlassen, Drehen oder Update genau so wiederhergestellt.
 */
export interface Sitzung {
  /**
   * 2: Aufgabe kennt ihren Zahlenraum, Zahlenmauer ihre Grenze (Umzug von 1: `ladeSitzung`).
   * Seit A3 schreibt jede Perle zusätzlich `falsch` mit – ein optionales Feld, ältere Sätze bleiben
   * gültig, daher keine neue Version.
   */
  version: 2;
  samen: number;
  aufgaben: Aufgabe[];
  satz: Satz;
  aktuell: number;
  /** Hilfestufe, die gerade offen ist, je Aufgabe */
  hilfeOffen: HilfeStufe[];
  /** Blätter schon in den Korb gezählt (einmal je Satz) */
  gezaehlt: boolean;
  /**
   * Lernbeispiel, das gerade offen ist: Format, Schritt, was im Schritt steht und ob schon ein falscher
   * Versuch war. So geht es nach Verlassen, Drehen oder Neuladen beim selben Schritt weiter.
   * Optional seit A4 – ältere Sätze bleiben gültig, daher keine neue Version. Nie Teil von Raupe,
   * Zwilling oder Historie.
   */
  lernbeispiel?: LernZustand;
  /**
   * Hilfeknopf gegen Durchprobieren, je Perle (src/satz/hilfe.ts): ab welcher Fehlantwort neu gezählt wird,
   * ob er gepulst hat und ob das Kind ihn dann gedrückt hat. Seit A6; ein Satz von vorher bekommt ihn
   * beim Laden (`ladeSitzung`) – daher keine neue Version.
   */
  puls: PulsZustand[];
  /**
   * Seit A7, je Perle: die Aufgabe kam aus der Reihe der zurückgelegten (`Profil.zurueckgelegt`) – Verweis auf
   * ihren vorigen Eintrag in der Historie; sonst null. Optional – ein Satz ohne das Feld hat keine
   * zurückgekehrte Aufgabe, daher keine neue Version.
   */
  zurueckAus?: (Verweis | null)[];
}

export interface LernZustand {
  format: FormatId;
  /** 0 … Zahl der Schritte − 1 */
  schritt: number;
  /** Antwort im Schritt: die richtige, eine halb getippte Zahl oder nichts (eine falsche kehrt sofort zurück) */
  antwort: Antwort | null;
  /** in diesem Schritt schon einmal falsch → Hilfe Stufe 2 auf dem Bild, bis er gelöst ist */
  versucht: boolean;
}

/**
 * Wie gut das Kind ein Format kennt (docs/TZ.md, „Самопроверка“, Nr. 8):
 * neu – noch nie gesehen: Lernbeispiel vor der Aufgabe;
 * bekannt – Lernbeispiel nur auf Wunsch (Hilfe Stufe 1, Zeichen „So geht's“);
 * nochmal – letztes Mal zurückgelegt oder nur mit Hilfe Stufe 4 gelöst: Lernbeispiel noch einmal vor der Aufgabe.
 */
export type Kenntnis = 'neu' | 'bekannt' | 'nochmal';

/**
 * Eine zurückgelegte Aufgabe, die auf einen der nächsten Sätze wartet (docs/TZ.md, „Помощь“, Stufe 4:
 * „задание вернётся … вместе со своей историей проверок“). Die Aufgabe kommt genau so wieder, wie sie
 * gezeigt wurde – nichts wird neu erzeugt.
 */
export interface Zurueckgelegt {
  /** die Aufgabe ganz: Format, Version, Samen, Stufe, Zahlenraum, Bedingung, Wahl in gezeigter Reihenfolge; `hilfe` = höchste Stufe bisher */
  aufgabe: Aufgabe;
  /** alle Antworten, die bisher nicht gepasst haben, in der Reihenfolge der Prüfungen (null: aus der Zeit vor A3, unbekannt) */
  falsch: (Antwort | null)[];
  /** der Hilfeknopf hat bei ihr schon gepulst / wurde dann gedrückt (für die Historie) */
  puls: boolean;
  hilfeNachPuls: boolean;
  /** ihr letzter Eintrag in der Historie (Ausgang `zurueck`); zugleich ihr Schlüssel in der Reihe */
  eintrag: Verweis;
}

/** Profil des Kindes (nur auf dem Gerät) */
export interface Profil {
  /**
   * 3: Reihe der zurückgelegten Aufgaben (seit A7); 2: `formate` statt der Liste `gesehen`.
   * Umzug von 1 und 2: `ladeProfil`.
   */
  version: 3;
  /** Kenntnis je Format; ein Format, das hier fehlt, ist neu */
  formate: Partial<Record<FormatId, Kenntnis>>;
  /** Blätter im Korb, gesamt */
  blaetter: number;
  saetze: number;
  /** Geheimwort: Wort und schon geöffnete Buchstaben (Stelle) */
  geheim: { wort: string; offen: number[] };
  ton: boolean;
  /** zurückgelegte Aufgaben in der Reihenfolge des Zurücklegens; jede höchstens einmal */
  zurueckgelegt: Zurueckgelegt[];
}

/** Profil in Version 2 (A4 bis A6): ohne Reihe der zurückgelegten Aufgaben */
interface ProfilV2 extends Omit<Profil, 'version' | 'zurueckgelegt'> {
  version: 2;
}

/** Profil in Version 1 (bis Aufgabe A4): Liste der Formate, deren Lernbeispiel schon gezeigt wurde */
interface ProfilV1 extends Omit<ProfilV2, 'version' | 'formate'> {
  version: 1;
  gesehen: FormatId[];
}

/** Platzhalter bis Etappe 5 (Welt): Wörter, die neue Orte öffnen */
export const GEHEIMWOERTER = ['TEICH', 'BERGE', 'STRAND'];

export function neuesProfil(): Profil {
  return { version: 3, formate: {}, blaetter: 0, saetze: 0, geheim: { wort: GEHEIMWOERTER[0], offen: [] }, ton: true, zurueckgelegt: [] };
}

export function kenntnis(p: Profil, id: FormatId): Kenntnis {
  return p.formate[id] ?? 'neu';
}

/** Lernbeispiel kommt von selbst vor der Aufgabe: bei neu und nochmal */
export function lernbeispielVorher(p: Profil, id: FormatId): boolean {
  return kenntnis(p, id) !== 'bekannt';
}

/** Umzug 1 → 2: jedes Format aus `gesehen` ist bekannt, alle anderen neu; alles Übrige bleibt, wie es war */
function profilVonV1(p: Partial<ProfilV1>): Partial<ProfilV2> {
  const { gesehen, version: _v, ...rest } = p;
  const formate: Profil['formate'] = {};
  for (const id of Array.isArray(gesehen) ? gesehen : []) formate[id] = 'bekannt';
  return { ...rest, version: 2, formate };
}

/** Umzug 2 → 3: die Reihe der zurückgelegten Aufgaben ist leer (vor A7 ging eine zurückgelegte Aufgabe verloren); alles Übrige bleibt */
function profilVonV2(p: Partial<ProfilV2>): Profil {
  const { version: _v, ...rest } = p;
  return { ...neuesProfil(), ...rest, version: 3, zurueckgelegt: [] };
}

/**
 * Gespeichertes Profil lesen, Version 1 und 2 umziehen; fehlt ein Feld, kommt der Wert eines neuen Profils dazu.
 * Nichts gespeichert, kaputt oder unbekannte (neuere) Version → null; das Gespeicherte bewahrt vorher
 * `ladeGeschuetzt` unter `profil-unbekannt` auf.
 */
export function ladeProfil(roh: unknown): Profil | null {
  if (!roh || typeof roh !== 'object') return null;
  const p = roh as { version?: unknown };
  if (p.version === 3) {
    const v3 = { ...neuesProfil(), ...(roh as Partial<Profil>) };
    return Array.isArray(v3.zurueckgelegt) ? v3 : { ...v3, zurueckgelegt: [] };
  }
  if (p.version === 2) return profilVonV2(roh as Partial<ProfilV2>);
  if (p.version === 1) return profilVonV2(profilVonV1(roh as Partial<ProfilV1>));
  return null;
}

/**
 * Kenntnis nach einem fertigen Satz: ein Format, dessen Aufgabe zurückgelegt oder erst mit Hilfe Stufe 4
 * gelöst wurde, bekommt beim nächsten Mal das Lernbeispiel noch einmal. Sonst bleibt alles (aus „nochmal“
 * wird „bekannt“ erst, wenn das Lernbeispiel durch ist). Bei einer zurückgekehrten Aufgabe zählt Stufe 4 nur,
 * wenn sie in diesem Satz geöffnet wurde (`hilfeImSatz`); wieder zurückgelegt → nochmal wie jede andere.
 */
export function kenntnisNachSatz(formate: Profil['formate'], neu: readonly Eintrag[]): Profil['formate'] {
  const out = { ...formate };
  for (const e of neu) {
    // zurückgekehrte Aufgabe: es zählt die Hilfe aus diesem Satz – Stufe 4 aus dem Satz, in dem sie zurückgelegt
    // wurde, hat schon damals „nochmal“ gebracht, und das Lernbeispiel kam vor ihr noch einmal
    const hilfe = e.hilfeImSatz ?? e.hilfe;
    if (e.ergebnis === 'zurueck' || (e.ergebnis === 'hilfe' && hilfe >= 4)) out[e.format] = 'nochmal';
  }
  return out;
}

/** Probesatz (Etappe 3): je ein Zahlenmauer-, Wer-ist-es- und Muster-Aufgabe in zufälliger Reihenfolge */
export const PROBE_FORMATE: FormatId[] = ['zahlenmauer', 'wer-ist-es', 'muster'];

/** `e`: Einstellung der Eltern; bis es sie gibt (Aufgabe C3), der Standard */
export function neueSitzung(samen: number, e: Einstellung = STANDARD_EINSTELLUNG): Sitzung {
  const z = zufall(samen);
  const ids = z.mischen(PROBE_FORMATE);
  const aufgaben = ids.map((id, i) => aufgabeAus(FORMATE[id], (samen + i * 104729) >>> 0, z.ganz(1, 2), e));
  return {
    version: 2,
    samen,
    aufgaben,
    satz: neuerSatz(aufgaben.length),
    aktuell: 0,
    hilfeOffen: aufgaben.map(() => 0),
    gezaehlt: false,
    puls: aufgaben.map(() => ({ marke: 0, puls: false, hilfeNachPuls: false })),
  };
}

/** so viele zurückgelegte Aufgaben kommen höchstens in einen Satz (docs/PLAN.md, A7: „одно из них“) */
export const ZURUECK_JE_SATZ = 1;

/**
 * Kann diese zurückgelegte Aufgabe in einen Satz mit Einstellung `e`? Nur wenn ihr Format sie heute genau so
 * zeigt (gleiche Version) und ihr Zahlenraum in den der Eltern passt. Sonst wartet sie weiter – sie geht
 * nicht verloren und wird nicht neu erzeugt.
 */
function passt(z: Zurueckgelegt, e: Einstellung): boolean {
  const f = FORMATE[z.aufgabe.format];
  return !!f && f.version === z.aufgabe.version && z.aufgabe.zahlenraum <= e.zahlenraum;
}

/** Perle einer zurückgekehrten Aufgabe: noch keine Antwort, Blatt liegt; die Fehlantworten von früher sind dabei */
function perleZurueck(z: Zurueckgelegt): PerlenZustand {
  // unbekannte Fehlantworten (null) stehen immer vorn; `fehlantworten` setzt sie aus `fehlversuche` wieder davor
  const bekannt = z.falsch.filter((a): a is Antwort => a !== null);
  return { antwort: null, blatt: 'zu', zurueck: false, geprueft: null, fehlversuche: z.falsch.length, falsch: bekannt, keinGold: true };
}

/**
 * Zurückgelegte Aufgaben in den Satz setzen (docs/PLAN.md, A7): die früheste in der Reihe, die passt, kommt an
 * den Platz der Aufgabe gleichen Formats – Bedingung und Wahl genau wie damals, mit ihrem Lösungsweg
 * (Fehlantworten, höchste Hilfestufe, Puls). Höchstens `ZURUECK_JE_SATZ`, je Platz eine. Die Hilfeleiter beginnt
 * im neuen Satz wieder unten (Stufe 3–4 erst nach dem ersten Vergleichen); der Puls zählt nur neue Fehlantworten.
 * Die Reihe selbst ändert sich erst beim Abschluss (`abschliessen`): geht der Satz verloren, wartet die Aufgabe weiter.
 */
export function zurueckEinsetzen(s: Sitzung, reihe: readonly Zurueckgelegt[], e: Einstellung = STANDARD_EINSTELLUNG): Sitzung {
  const aufgaben = [...s.aufgaben];
  const perlen = [...s.satz.perlen];
  const hilfeOffen = [...s.hilfeOffen];
  const puls = [...s.puls];
  const zurueckAus: (Verweis | null)[] = s.aufgaben.map((_, i) => s.zurueckAus?.[i] ?? null);
  let n = 0;
  for (const z of reihe) {
    if (n >= ZURUECK_JE_SATZ) break;
    if (!passt(z, e)) continue;
    const i = aufgaben.findIndex((a, j) => a.format === z.aufgabe.format && zurueckAus[j] === null);
    if (i < 0) continue;
    aufgaben[i] = structuredClone(z.aufgabe);
    perlen[i] = perleZurueck(z);
    hilfeOffen[i] = 0;
    puls[i] = { marke: z.falsch.length, puls: z.puls, hilfeNachPuls: z.hilfeNachPuls };
    zurueckAus[i] = { satz: z.eintrag.satz, nr: z.eintrag.nr };
    n++;
  }
  if (!n) return s;
  return { ...s, aufgaben, satz: { ...s.satz, perlen }, hilfeOffen, puls, zurueckAus };
}

/** Nächster Satz für dieses Kind: neu erzeugt, dazu eine zurückgelegte Aufgabe aus dem Profil (`zurueckEinsetzen`) */
export function naechsteSitzung(samen: number, p: Profil, e: Einstellung = STANDARD_EINSTELLUNG): Sitzung {
  return zurueckEinsetzen(neueSitzung(samen, e), p.zurueckgelegt, e);
}

/**
 * Reihe der zurückgelegten Aufgaben nach einem fertigen Satz: was aus der Reihe in diesem Satz war, geht hinaus
 * (gelöst oder wieder zurückgelegt); jede jetzt zurückgelegte Aufgabe kommt hinten dazu, mit ihrem neuen Eintrag
 * als Schlüssel. So steht keine doppelt.
 */
function reiheNachSatz(reihe: readonly Zurueckgelegt[], s: Sitzung, neu: readonly Eintrag[]): Zurueckgelegt[] {
  const genommen = (s.zurueckAus ?? []).filter((v): v is Verweis => !!v);
  const bleibt = reihe.filter((z) => !genommen.some((v) => gleicherVerweis(v, z.eintrag)));
  const dazu = neu
    .filter((e) => e.ergebnis === 'zurueck')
    .map((e): Zurueckgelegt => ({
      aufgabe: structuredClone(s.aufgaben[e.nr]),
      falsch: [...e.falsch],
      puls: e.puls ?? false,
      hilfeNachPuls: e.hilfeNachPuls ?? false,
      eintrag: { satz: e.satz, nr: e.nr },
    }));
  return [...bleibt, ...dazu];
}

/** Sitzung in Version 1 (bis Aufgabe A2): Aufgaben ohne Zahlenraum, Zahlenmauer ohne Grenze */
interface SitzungV1 extends Omit<Sitzung, 'version' | 'aufgaben' | 'puls'> {
  version: 1;
  aufgaben: Omit<Aufgabe, 'zahlenraum'>[];
}

/**
 * Umzug 1 → 2. Version 1 kannte keinen Zahlenraum; ihre Aufgaben sind die von heute bis 20:
 * Zahlenmauer Stufe 1 bis 10, sonst bis 20. Bedingung, Wahl, Version und Samen jeder Aufgabe
 * und der ganze Zustand von Raupe und Zwilling bleiben, wie sie waren.
 */
function vonV1(s: SitzungV1): Omit<Sitzung, 'puls'> {
  const aufgaben: Aufgabe[] = s.aufgaben.map((a) => {
    const bedingung = a.format === 'zahlenmauer' ? { ...(a.bedingung as Omit<Mauer, 'grenze'>), grenze: a.stufe === 1 ? 10 : 20 } : a.bedingung;
    return { ...a, zahlenraum: 20, bedingung };
  });
  return { ...s, version: 2, aufgaben };
}

/**
 * Satz von vor A6 (oder aus Version 1) ohne Puls des Hilfeknopfs: jede Perle bekommt ihn (`pulsAnfang`).
 * Alles andere bleibt, wie es war; ein Satz mit Puls bleibt dasselbe Objekt.
 */
function mitPuls(s: Omit<Sitzung, 'puls'> & { puls?: unknown }): Sitzung {
  if (Array.isArray(s.puls) && s.puls.length === s.satz.perlen.length) return s as Sitzung;
  return { ...s, puls: s.satz.perlen.map((_, i) => pulsAnfang(s, i)) };
}

/**
 * Gespeicherte Sitzung lesen, ältere Versionen umziehen. Unbekanntes (leer, kaputt, neuere Version) → null:
 * dann beginnt ein neuer Satz; das Gespeicherte bewahrt vorher `ladeGeschuetzt` unter `sitzung-unbekannt` auf.
 */
export function ladeSitzung(roh: unknown): Sitzung | null {
  if (!roh || typeof roh !== 'object') return null;
  const s = roh as { version?: unknown };
  if (s.version === 2) return mitPuls(roh as Sitzung);
  if (s.version === 1) return mitPuls(vonV1(roh as SitzungV1));
  return null;
}

export function stimmtFuer(s: Sitzung) {
  return (i: number, a: Antwort) => stimmt(FORMATE[s.aufgaben[i].format], s.aufgaben[i], a);
}

/**
 * Satz fertig → Blätter in den Korb, ein Buchstabe des Geheimworts öffnet sich, jede Aufgabe kommt in
 * die Historie, die Kenntnis der Formate wird nachgeführt (`kenntnisNachSatz`), zurückgelegte Aufgaben kommen in
 * die Reihe, gelöste gehen hinaus (`reiheNachSatz`). Alles genau einmal
 * je Satz (`gezaehlt`); die drei Teile werden zusammen gespeichert.
 * `jetzt`: Zeitpunkt des Abschlusses (Tag in der Historie).
 */
export function abschliessen(
  s: Sitzung,
  p: Profil,
  h: Historie,
  jetzt: Date = new Date(),
  z = zufall(s.samen ^ 0x5bd1e995),
): { sitzung: Sitzung; profil: Profil; historie: Historie; neuerBuchstabe: number | null } {
  if (!fertig(s.satz) || s.gezaehlt) return { sitzung: s, profil: p, historie: h, neuerBuchstabe: null };
  let geheim = p.geheim;
  if (geheim.offen.length >= geheim.wort.length) {
    const naechstes = GEHEIMWOERTER[(GEHEIMWOERTER.indexOf(geheim.wort) + 1) % GEHEIMWOERTER.length];
    geheim = { wort: naechstes, offen: [] };
  }
  const zu = [...geheim.wort].map((_, i) => i).filter((i) => !geheim.offen.includes(i));
  const neu = z.eins(zu);
  const historie = anhaengen(h, s.aufgaben, s.satz, jetzt, { puls: s.puls, zurueckAus: s.zurueckAus, hilfeOffen: s.hilfeOffen });
  const eintraege = historie.eintraege.slice(h.eintraege.length);
  const formate = kenntnisNachSatz(p.formate, eintraege);
  const zurueckgelegt = reiheNachSatz(p.zurueckgelegt, s, eintraege);
  return {
    sitzung: { ...s, gezaehlt: true },
    profil: {
      ...p,
      formate,
      blaetter: p.blaetter + blaetter(s.satz).wert,
      saetze: p.saetze + 1,
      geheim: { ...geheim, offen: [...geheim.offen, neu] },
      zurueckgelegt,
    },
    historie,
    neuerBuchstabe: neu,
  };
}
