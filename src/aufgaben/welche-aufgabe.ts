import type { Antwort, Rechenzeichen } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { LATERNE, LATERNE_KANTE } from '../design/farbe';
import { DING_FARBEN, DING_FORMEN, DING_R, ding, hilfeRahmen, kleinerRaum, pfeil, schild, svgHuelle, tablett, sichtbareAnzahlen, type DingFarbe, type DingForm } from './zaehlen';
import { baue as baueRechenbild, type Rechenbild } from './rechenbild';
import { als, ergebnis, rechnungsNest, type Rechnung } from './aufgabenfamilie';

/**
 * Welche Aufgabe passt? (Nr. 92, Engine Bild, Antwort Wahl): ein Rechenbild ohne Zahlen – Dinge liegen auf dem Tablett;
 * mit dem Pfeil kommen welche dazu, oder durchgestrichene gehen weg (dieselben zwei Zeichen wie im Rechenbild, Nr. 6).
 * Welche Aufgabe erzählt das Bild? 5 da, 2 gehen weg → 5 − 2. Die Tauschaufgabe der richtigen (bei „dazu“: 2 + 5) steht
 * nie unter den Perlen – sie wäre auch richtig.
 * Stufe 1: bis 10 (bei Zahlenraum 100 bis 20), drei Perlen: die richtige, dieselben Zahlen mit dem anderen Zeichen,
 *          eine Aufgabe mit dem Ergebnis statt der ersten Zahl (7 − 2).
 * Stufe 2: schwerer wird die Menge – im ganzen Zahlenraum (höchstens 20 Dinge im Bild), vier Perlen.
 * Stufe 3: schwerer wird die Ähnlichkeit – vier Perlen, alle aus denselben drei Zahlen (5 − 2, 5 + 2, 3 + 2, 5 − 3):
 *          gezählt werden muss genau, und das Zeichen muss zur Handlung passen.
 * Der Löser zählt die Dinge im Bild (da, weg, dazu) und nimmt die Perlen, die genau diese Handlung erzählen:
 * „dazu“ a + b oder b + a, „weg“ a − b. Berühren sich zwei Dinge, ist die Zahl nicht sicher – keine Lösung.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt warm ein, was sich ändert (Brettchen mit dem Pfeil oder die durchgestrichenen Dinge);
 * Stufe 3 rahmt dazu die Dinge ein, die am Anfang da sind – die erste Zahl der Aufgabe. Keine Zahl im Bild.
 */
export interface WelcheAufgabe {
  /** am Anfang da; was sich ändert; dazu oder weg */
  da: number;
  aenderung: number;
  art: 'dazu' | 'weg';
  form: DingForm;
  farbe: DingFarbe;
  perlen: Rechnung[];
}

export const bild = (w: Pick<WelcheAufgabe, 'da' | 'aenderung' | 'art' | 'form' | 'farbe'>): Rechenbild =>
  w.art === 'dazu' ? baueRechenbild(w.da, 0, w.aenderung, w.form, w.farbe) : baueRechenbild(w.da, w.aenderung, 0, w.form, w.farbe);

/** was das Kind im Bild zählt: da (auf dem Tablett), weg (durchgestrichen), dazu (auf dem Brettchen) */
export function gezaehlt(r: Rechenbild): { da: number; weg: number; dazu: number; sicher: boolean } {
  const tablett = r.dinge.filter((d) => d.ort === 'da');
  return {
    da: tablett.length,
    weg: tablett.filter((d) => d.weg).length,
    dazu: r.dinge.filter((d) => d.ort === 'dazu').length,
    sicher: sichtbareAnzahlen(r.dinge).length === 1,
  };
}

/** Löser: welche Perlen erzählen das Bild? */
function loesungen(w: WelcheAufgabe): Antwort[] {
  const g = gezaehlt(bild(w));
  if (!g.sicher || (g.weg > 0 && g.dazu > 0) || g.weg + g.dazu === 0) return [];
  const passt = (p: Rechnung) =>
    g.dazu > 0
      ? p.zeichen === 'plus' && ((p.links === g.da && p.rechts === g.dazu) || (p.links === g.dazu && p.rechts === g.da))
      : p.zeichen === 'minus' && p.links === g.da && p.rechts === g.weg;
  return w.perlen.filter(passt).map(als);
}

const r = (links: number, zeichen: Rechenzeichen, rechts: number): Rechnung => ({ links, zeichen, rechts });
const gleich = (x: Rechnung, y: Rechnung) => x.links === y.links && x.zeichen === y.zeichen && x.rechts === y.rechts;

/** falsche Perlen zu a (da), b (Änderung), c (Ergebnis); `nah`: nur aus denselben drei Zahlen */
function falsche(a: number, b: number, art: 'dazu' | 'weg', z: Zufall, nah: boolean): Rechnung[] {
  const c = art === 'dazu' ? a + b : a - b;
  const nahe = art === 'dazu' ? [r(a, 'minus', b), r(c, 'minus', b), r(c, 'minus', a), r(c, 'plus', b)] : [r(a, 'plus', b), r(c, 'minus', b), r(c, 'plus', b), r(a, 'minus', c)];
  const weit = [r(a + 1, art === 'dazu' ? 'plus' : 'minus', b), r(a, art === 'dazu' ? 'plus' : 'minus', b + 1), r(a - 1, art === 'dazu' ? 'plus' : 'minus', b)];
  const liste = nah ? z.mischen(nahe) : [...z.mischen(nahe).slice(0, 2), ...z.mischen(weit)];
  return liste.filter((x) => x.links > 0 && x.rechts > 0 && ergebnis(x) !== null);
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): WelcheAufgabe {
  const grenze = Math.min(20, stufe === 1 ? kleinerRaum(e.zahlenraum) : e.zahlenraum);
  const form = z.eins(DING_FORMEN);
  const farbe = z.eins(DING_FARBEN);
  for (;;) {
    const art = z.eins(['dazu', 'weg'] as const);
    const a = z.ganz(2, grenze - (art === 'dazu' ? 1 : 0));
    const b = art === 'dazu' ? z.ganz(1, Math.min(5, grenze - a)) : z.ganz(1, Math.min(5, a - 1));
    if (b < 1 || a === b) continue;
    const richtig = art === 'dazu' ? r(a, 'plus', b) : r(a, 'minus', b);
    const tausch = r(b, 'plus', a);
    const anzahl = stufe === 1 ? 3 : 4;
    const perlen: Rechnung[] = [richtig];
    for (const k of falsche(a, b, art, z, stufe === 3))
      if (perlen.length < anzahl && !perlen.some((p) => gleich(p, k)) && !(art === 'dazu' && gleich(k, tausch))) perlen.push(k);
    if (perlen.length < anzahl) continue;
    return { da: a, aenderung: b, art, form, farbe, perlen: z.mischen(perlen) };
  }
}

/* ---------- Bild ---------- */

/**
 * Brettchen mit Pfeil (dazu) oder durchgestrichene Dinge (weg) auf dem Tablett, darunter das Nest der Aufgabe.
 * `hilfe` 2: was sich ändert, warm eingerahmt; 3: dazu die Dinge, die am Anfang da sind. `vorrechnen`: Lösung im Nest.
 */
function zeichne(w: WelcheAufgabe, o: ZeichenOptionen): string {
  const rb = bild(w);
  const W = Math.max(rb.breite, 260);
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  if (rb.brett) {
    const b = rb.brett;
    if (hervor) s += hilfeRahmen(b.x - 6, b.y - 2, b.w + 12, b.h + 12, 'teil');
    s += schild(b.x, b.y, b.w, b.h);
  }
  s += tablett(4, rb.tablettY, W - 8, rb.tablettH);
  const amAnfang = rb.dinge.filter((d) => d.ort === 'da');
  if (o.hilfe >= 3 || o.vorrechnen)
    s += `<g data-hilfe="${o.vorrechnen ? 'teil' : 'schritt'}">${amAnfang.map((d) => `<circle cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 6}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="3" stroke-dasharray="6 4"/>`).join('')}</g>`;
  const weg = rb.dinge.filter((d) => d.weg);
  if (hervor && weg.length) s += `<g data-hilfe="teil">${weg.map((d) => `<circle cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 7}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`).join('')}</g>`;
  rb.dinge.forEach((d, k) => (s += ding(d, w.form, w.farbe, { nr: k })));
  if (rb.brett) {
    const b = rb.brett;
    s += pfeil(b.x + b.w + 10, b.y + b.h / 2, Math.min(b.x + b.w + 80, W - 40), rb.tablettY + 2, 30);
  }
  const y = rb.tablettY + rb.tablettH + 14;
  const loesung = o.vorrechnen ? loesungen(w)[0] : null;
  s += rechnungsNest(W / 2 - 80, y, 160, loesung ?? o.gewaehlt, !!loesung);
  return svgHuelle(W, y + 70, 'Welche Aufgabe passt?', s);
}

export const WELCHE_AUFGABE: Format<WelcheAufgabe> = {
  id: 'welche-aufgabe',
  nr: 92,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z4',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheAufgabePasst',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (w) => w.perlen.map(als),
  zeichne,
  /**
   * Lernbeispiel: (1) 2 da, 1 kommt dazu – zwei Perlen (+ oder −); (2) 4 da, 1 geht weg – drei Perlen;
   * (3) gewöhnliche Aufgabe der Stufe 1 aus dem Generator.
   */
  beispiele: () => [
    { da: 2, aenderung: 1, art: 'dazu', form: 'kreis', farbe: 'rot', perlen: [r(2, 'minus', 1), r(2, 'plus', 1)] },
    { da: 4, aenderung: 1, art: 'weg', form: 'stern', farbe: 'blau', perlen: [r(4, 'minus', 1), r(4, 'plus', 1), r(3, 'minus', 1)] },
    dritte(),
  ],
};

/** dritter Schritt: erste Aufgabe der Stufe 1 aus dem Generator (Samen wie im Test), bei der mehr als 5 Dinge zu sehen sind */
function dritte(): WelcheAufgabe {
  for (let s = 0; ; s++) {
    const a = aufgabeAus(WELCHE_AUFGABE, s * 2654435761, 1).bedingung;
    if (a.da + (a.art === 'dazu' ? a.aenderung : 0) > 5) return a;
  }
}
