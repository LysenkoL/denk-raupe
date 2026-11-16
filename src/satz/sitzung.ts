import { FORMATE } from '../aufgaben';
import { aufgabeAus, stimmt, type Aufgabe, type FormatId, type HilfeStufe } from '../aufgaben/format';
import { zufall } from '../core/zufall';
import type { Antwort } from '../perlen/antwort';
import { blaetter, fertig, neuerSatz, type Satz } from './vergleich';

/**
 * Ein laufender Satz mit allem, was gespeichert wird: jede Aufgabe ganz (Format, Version, Samen,
 * Stufe, Bedingung, Wahl, Hilfe), dazu der Zustand von Raupe und Zwilling.
 * Wird nach jeder Änderung gespeichert und nach Verlassen, Drehen oder Update genau so wiederhergestellt.
 */
export interface Sitzung {
  version: 1;
  samen: number;
  aufgaben: Aufgabe[];
  satz: Satz;
  aktuell: number;
  /** Hilfestufe, die gerade offen ist, je Aufgabe */
  hilfeOffen: HilfeStufe[];
  /** Blätter schon in den Korb gezählt (einmal je Satz) */
  gezaehlt: boolean;
}

/** Profil des Kindes (nur auf dem Gerät) */
export interface Profil {
  version: 1;
  /** Formate, deren Lernbeispiel schon gezeigt wurde */
  gesehen: FormatId[];
  /** Blätter im Korb, gesamt */
  blaetter: number;
  saetze: number;
  /** Geheimwort: Wort und schon geöffnete Buchstaben (Stelle) */
  geheim: { wort: string; offen: number[] };
  ton: boolean;
}

/** Platzhalter bis Etappe 5 (Welt): Wörter, die neue Orte öffnen */
export const GEHEIMWOERTER = ['TEICH', 'BERGE', 'STRAND'];

export function neuesProfil(): Profil {
  return { version: 1, gesehen: [], blaetter: 0, saetze: 0, geheim: { wort: GEHEIMWOERTER[0], offen: [] }, ton: true };
}

/** Probesatz (Etappe 3): je ein Zahlenmauer-, Wer-ist-es- und Muster-Aufgabe in zufälliger Reihenfolge */
export const PROBE_FORMATE: FormatId[] = ['zahlenmauer', 'wer-ist-es', 'muster'];

export function neueSitzung(samen: number): Sitzung {
  const z = zufall(samen);
  const ids = z.mischen(PROBE_FORMATE);
  const aufgaben = ids.map((id, i) => aufgabeAus(FORMATE[id], (samen + i * 104729) >>> 0, z.ganz(1, 2)));
  return {
    version: 1,
    samen,
    aufgaben,
    satz: neuerSatz(aufgaben.length),
    aktuell: 0,
    hilfeOffen: aufgaben.map(() => 0),
    gezaehlt: false,
  };
}

export function stimmtFuer(s: Sitzung) {
  return (i: number, a: Antwort) => stimmt(FORMATE[s.aufgaben[i].format], s.aufgaben[i], a);
}

/** Satz fertig → Blätter in den Korb, ein Buchstabe des Geheimworts öffnet sich (einmal) */
export function abschliessen(s: Sitzung, p: Profil, z = zufall(s.samen ^ 0x5bd1e995)): { sitzung: Sitzung; profil: Profil; neuerBuchstabe: number | null } {
  if (!fertig(s.satz) || s.gezaehlt) return { sitzung: s, profil: p, neuerBuchstabe: null };
  let geheim = p.geheim;
  if (geheim.offen.length >= geheim.wort.length) {
    const naechstes = GEHEIMWOERTER[(GEHEIMWOERTER.indexOf(geheim.wort) + 1) % GEHEIMWOERTER.length];
    geheim = { wort: naechstes, offen: [] };
  }
  const zu = [...geheim.wort].map((_, i) => i).filter((i) => !geheim.offen.includes(i));
  const neu = z.eins(zu);
  return {
    sitzung: { ...s, gezaehlt: true },
    profil: { ...p, blaetter: p.blaetter + blaetter(s.satz).wert, saetze: p.saetze + 1, geheim: { ...geheim, offen: [...geheim.offen, neu] } },
    neuerBuchstabe: neu,
  };
}
