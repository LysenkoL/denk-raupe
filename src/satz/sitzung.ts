import { FORMATE } from '../aufgaben';
import { aufgabeAus, stimmt, STANDARD_EINSTELLUNG, type Aufgabe, type Einstellung, type FormatId, type HilfeStufe } from '../aufgaben/format';
import type { Mauer } from '../aufgaben/zahlenmauer';
import { zufall } from '../core/zufall';
import type { Antwort } from '../perlen/antwort';
import { blaetter, fertig, neuerSatz, type Satz } from './vergleich';
import { anhaengen, type Eintrag, type Historie } from './historie';

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

/** Profil des Kindes (nur auf dem Gerät) */
export interface Profil {
  /** 2: `formate` statt der Liste `gesehen` (Umzug von 1: `ladeProfil`) */
  version: 2;
  /** Kenntnis je Format; ein Format, das hier fehlt, ist neu */
  formate: Partial<Record<FormatId, Kenntnis>>;
  /** Blätter im Korb, gesamt */
  blaetter: number;
  saetze: number;
  /** Geheimwort: Wort und schon geöffnete Buchstaben (Stelle) */
  geheim: { wort: string; offen: number[] };
  ton: boolean;
}

/** Profil in Version 1 (bis Aufgabe A4): Liste der Formate, deren Lernbeispiel schon gezeigt wurde */
interface ProfilV1 extends Omit<Profil, 'version' | 'formate'> {
  version: 1;
  gesehen: FormatId[];
}

/** Platzhalter bis Etappe 5 (Welt): Wörter, die neue Orte öffnen */
export const GEHEIMWOERTER = ['TEICH', 'BERGE', 'STRAND'];

export function neuesProfil(): Profil {
  return { version: 2, formate: {}, blaetter: 0, saetze: 0, geheim: { wort: GEHEIMWOERTER[0], offen: [] }, ton: true };
}

export function kenntnis(p: Profil, id: FormatId): Kenntnis {
  return p.formate[id] ?? 'neu';
}

/** Lernbeispiel kommt von selbst vor der Aufgabe: bei neu und nochmal */
export function lernbeispielVorher(p: Profil, id: FormatId): boolean {
  return kenntnis(p, id) !== 'bekannt';
}

/** Umzug 1 → 2: jedes Format aus `gesehen` ist bekannt, alle anderen neu; alles Übrige bleibt, wie es war */
function profilVonV1(p: Partial<ProfilV1>): Profil {
  const { gesehen, version: _v, ...rest } = p;
  const formate: Profil['formate'] = {};
  for (const id of Array.isArray(gesehen) ? gesehen : []) formate[id] = 'bekannt';
  return { ...neuesProfil(), ...rest, version: 2, formate };
}

/**
 * Gespeichertes Profil lesen, Version 1 umziehen; fehlt ein Feld, kommt der Wert eines neuen Profils dazu.
 * Nichts gespeichert, kaputt oder unbekannte (neuere) Version → null; das Gespeicherte bewahrt vorher
 * `ladeGeschuetzt` unter `profil-unbekannt` auf.
 */
export function ladeProfil(roh: unknown): Profil | null {
  if (!roh || typeof roh !== 'object') return null;
  const p = roh as { version?: unknown };
  if (p.version === 2) return { ...neuesProfil(), ...(roh as Partial<Profil>) };
  if (p.version === 1) return profilVonV1(roh as Partial<ProfilV1>);
  return null;
}

/**
 * Kenntnis nach einem fertigen Satz: ein Format, dessen Aufgabe zurückgelegt oder erst mit Hilfe Stufe 4
 * gelöst wurde, bekommt beim nächsten Mal das Lernbeispiel noch einmal. Sonst bleibt alles (aus „nochmal“
 * wird „bekannt“ erst, wenn das Lernbeispiel durch ist).
 */
export function kenntnisNachSatz(formate: Profil['formate'], neu: readonly Eintrag[]): Profil['formate'] {
  const out = { ...formate };
  for (const e of neu) if (e.ergebnis === 'zurueck' || (e.ergebnis === 'hilfe' && e.hilfe >= 4)) out[e.format] = 'nochmal';
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
  };
}

/** Sitzung in Version 1 (bis Aufgabe A2): Aufgaben ohne Zahlenraum, Zahlenmauer ohne Grenze */
interface SitzungV1 extends Omit<Sitzung, 'version' | 'aufgaben'> {
  version: 1;
  aufgaben: Omit<Aufgabe, 'zahlenraum'>[];
}

/**
 * Umzug 1 → 2. Version 1 kannte keinen Zahlenraum; ihre Aufgaben sind die von heute bis 20:
 * Zahlenmauer Stufe 1 bis 10, sonst bis 20. Bedingung, Wahl, Version und Samen jeder Aufgabe
 * und der ganze Zustand von Raupe und Zwilling bleiben, wie sie waren.
 */
function vonV1(s: SitzungV1): Sitzung {
  const aufgaben: Aufgabe[] = s.aufgaben.map((a) => {
    const bedingung = a.format === 'zahlenmauer' ? { ...(a.bedingung as Omit<Mauer, 'grenze'>), grenze: a.stufe === 1 ? 10 : 20 } : a.bedingung;
    return { ...a, zahlenraum: 20, bedingung };
  });
  return { ...s, version: 2, aufgaben };
}

/**
 * Gespeicherte Sitzung lesen, ältere Versionen umziehen. Unbekanntes (leer, kaputt, neuere Version) → null:
 * dann beginnt ein neuer Satz; das Gespeicherte bewahrt vorher `ladeGeschuetzt` unter `sitzung-unbekannt` auf.
 */
export function ladeSitzung(roh: unknown): Sitzung | null {
  if (!roh || typeof roh !== 'object') return null;
  const s = roh as { version?: unknown };
  if (s.version === 2) return roh as Sitzung;
  if (s.version === 1) return vonV1(roh as SitzungV1);
  return null;
}

export function stimmtFuer(s: Sitzung) {
  return (i: number, a: Antwort) => stimmt(FORMATE[s.aufgaben[i].format], s.aufgaben[i], a);
}

/**
 * Satz fertig → Blätter in den Korb, ein Buchstabe des Geheimworts öffnet sich, jede Aufgabe kommt in
 * die Historie, die Kenntnis der Formate wird nachgeführt (`kenntnisNachSatz`). Alles genau einmal
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
  const historie = anhaengen(h, s.aufgaben, s.satz, jetzt);
  const formate = kenntnisNachSatz(p.formate, historie.eintraege.slice(h.eintraege.length));
  return {
    sitzung: { ...s, gezaehlt: true },
    profil: { ...p, formate, blaetter: p.blaetter + blaetter(s.satz).wert, saetze: p.saetze + 1, geheim: { ...geheim, offen: [...geheim.offen, neu] } },
    historie,
    neuerBuchstabe: neu,
  };
}
