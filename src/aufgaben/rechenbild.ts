import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { LATERNE, LATERNE_KANTE } from '../design/farbe';
import {
  DING_AB,
  DING_FARBEN,
  DING_FORMEN,
  DING_R,
  ding,
  gewaehlteZahl,
  hilfeRahmen,
  inReihen,
  kleinerRaum,
  leiste,
  nest,
  pfeil,
  punkte,
  punktefeld,
  reiheBreite,
  schild,
  sichtbareAnzahlen,
  svgHuelle,
  tablett,
  type Ding,
  type DingFarbe,
  type DingForm,
  type PunktArt,
} from './zaehlen';

/**
 * Rechenbild (Nr. 6, Engine Bild): auf dem Tablett liegen Dinge; was mit dem Pfeil vom Brettchen kommt, kommt
 * dazu; was durchgestrichen ist, geht weg. Wie viele sind es jetzt? Die zwei Zeichen (Pfeil = dazu,
 * Durchstreichen = weg) sind in allen Aufgaben dieselben.
 * Stufe 1: ein Schritt (dazu oder weg), kleine Änderung (1–3), ohne Zehnerübergang; bis 10, bei Zahlenraum 100 bis 20.
 * Stufe 2: schwerer wird die Rechnung – ein Schritt mit größerer Änderung (2–9) im ganzen Zahlenraum; bei 20
 *          und 100 immer über den Zehner (8 + 5, 13 − 6, 47 + 5). Bei 100 liegen die Zehner auf Holzleisten.
 * Stufe 3: schwerer wird die Zahl der Schritte – es geht etwas weg UND es kommt etwas dazu.
 * Bei Zahlenraum 100 liegen höchstens 59 Dinge auf dem Tablett (mehr sind auf dem Telefon nicht lesbar).
 * Der Löser zählt die Dinge im Bild: auf dem Tablett ohne die durchgestrichenen, dazu die vom Brettchen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt warm ein, was sich ändert (Brettchen mit dem Pfeil, durchgestrichene Dinge);
 * Stufe 3 legt die Rechnung als Punkte in Fünfern und Zehnern darunter: was da war, was weggeht
 * (durchgestrichen), was dazukommt (andere Farbe). Keine Zahl.
 */
export interface RechenDing extends Ding {
  ort: 'da' | 'dazu';
}
export interface Rechenbild {
  form: DingForm;
  farbe: DingFarbe;
  dinge: RechenDing[];
  leisten: { x: number; y: number; m: number }[];
  /** Brettchen, von dem die Dinge dazukommen (oben links), oder keins */
  brett: { x: number; y: number; w: number; h: number } | null;
  /** Lage und Höhe des Tabletts */
  tablettY: number;
  tablettH: number;
  /** Breite des Bildes: so breit wie Tablett und Brettchen brauchen – wenige Dinge erscheinen so größer */
  breite: number;
}

export const BREITE = 340;
const RAND = 18;
const LEISTE_AB = 42;

/** Zehnerübergang: Start und Ergebnis liegen in verschiedenen Zehnern (ein voller Zehner zählt nicht als Übergang) */
export function ueberZehner(a: number, c: number): boolean {
  return Math.floor(a / 10) !== Math.floor(c / 10) && a % 10 !== 0 && c % 10 !== 0;
}

/** Bild bauen: `a` auf dem Tablett, davon die letzten `weg` durchgestrichen; `dazu` kommen vom Brettchen */
export function baue(a: number, weg: number, dazu: number, form: DingForm, farbe: DingFarbe): Rechenbild {
  const dinge: RechenDing[] = [];
  const leisten: Rechenbild['leisten'] = [];
  let brett: Rechenbild['brett'] = null;
  // Breite: Tablett um die Dinge, Brettchen mit Platz für den Pfeil; mindestens so
  // breit wie die Punkte der Hilfe Stufe 3 (das Bild behält mit jeder Hilfe dieselbe Breite); höchstens BREITE
  const cw = reiheBreite(Math.min(a >= 20 ? 10 : a, 10));
  const breite = Math.max(cw + 2 * RAND + 8, dazu ? 8 + reiheBreite(Math.min(dazu, 5)) + 2 * RAND + 96 : 0, 210);
  let y = 4;
  if (dazu) {
    const bw = reiheBreite(Math.min(dazu, 5)) + 2 * RAND;
    const bh = Math.ceil(dazu / 5) * DING_AB - (DING_AB - 2 * DING_R) + 2 * RAND - 4;
    brett = { x: 8, y, w: bw, h: bh };
    dinge.push(...inReihen(dazu, 8 + RAND, y + RAND - 2, 5).map((d) => ({ ...d, ort: 'dazu' as const })));
    y += bh + 26;
  }
  const tablettY = y;
  let iy = y + RAND + (a >= 20 ? 6 : 0);
  const da: Ding[] = [];
  if (a >= 20) {
    const bx = (breite - reiheBreite(10)) / 2;
    for (let b = 0; b < Math.floor(a / 10); b++) {
      leisten.push({ x: bx, y: iy, m: 10 });
      da.push(...inReihen(10, bx, iy));
      iy += LEISTE_AB;
    }
    const lose = a % 10;
    if (lose) {
      da.push(...inReihen(lose, (breite - reiheBreite(lose)) / 2, iy + 2));
      iy += 2 + DING_AB;
    } else iy += 2 * DING_R + 11 - LEISTE_AB;
  } else {
    da.push(...inReihen(a, (breite - reiheBreite(Math.min(a, 10))) / 2, iy));
    iy += Math.ceil(a / 10) * DING_AB;
  }
  da.forEach((d, k) => dinge.push({ ...d, ort: 'da', ...(k >= a - weg ? { weg: true } : {}) }));
  const tablettH = iy - (DING_AB - 2 * DING_R) + RAND - tablettY;
  return { form, farbe, dinge, leisten, brett, tablettY, tablettH, breite };
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Rechenbild {
  const form = z.eins(DING_FORMEN);
  const farbe = z.eins(DING_FARBEN);
  const zr = e.zahlenraum;
  // größte Zahl auf dem Tablett und im Ergebnis
  const g = stufe === 1 ? kleinerRaum(zr) : zr;
  const maxDa = Math.min(g, 59);
  for (;;) {
    if (stufe === 3) {
      const a = z.ganz(4, maxDa);
      const weg = z.ganz(1, Math.min(5, a - 1));
      const dazu = z.ganz(1, 5);
      if (a - weg + dazu > g) continue;
      return baue(a, weg, dazu, form, farbe);
    }
    const plus = z.zahl() < 0.5;
    const b = stufe === 1 ? z.ganz(1, 3) : zr === 10 ? z.ganz(3, 6) : z.ganz(2, 9);
    const a = plus ? z.ganz(1, maxDa) : z.ganz(b + 1, maxDa);
    const c = plus ? a + b : a - b;
    if (c > g || c < 1) continue;
    if (stufe === 1 && ueberZehner(a, c)) continue;
    if (stufe === 2 && zr !== 10 && !ueberZehner(a, c)) continue;
    return plus ? baue(a, 0, b, form, farbe) : baue(a, b, 0, form, farbe);
  }
}

/**
 * Löser (liest nur die Dinge): auf dem Tablett ohne die durchgestrichenen, dazu die vom Brettchen. Mehrdeutig,
 * wenn sich zwei Dinge berühren (eins könnte übersehen werden) oder ein Ding auf dem Brettchen durchgestrichen
 * ist (kommt es oder geht es?).
 */
function loesungen(r: Rechenbild): Antwort[] {
  const zahl = r.dinge.filter((d) => !d.weg).length;
  const zweifel = sichtbareAnzahlen(r.dinge).length > 1 || r.dinge.some((d) => d.ort === 'dazu' && d.weg);
  return (zweifel ? [zahl, zahl - 1] : [zahl]).map((wert) => ({ art: 'zahl', wert }));
}

/** Punkte der Hilfe Stufe 3: was bleibt, was weggeht, was dazukommt */
export function hilfePunkte(r: Rechenbild): PunktArt[] {
  const da = r.dinge.filter((d) => d.ort === 'da');
  const weg = da.filter((d) => d.weg).length;
  const dazu = r.dinge.filter((d) => d.ort === 'dazu').length;
  return [...punkte(da.length - weg, 'erster'), ...punkte(weg, 'weg'), ...punkte(dazu, 'zweiter')];
}

/**
 * Brettchen mit Pfeil oben, Tablett darunter, Nest der Antwort unten rechts. Jedes Ding ist antippbar (gezählt).
 * `hilfe` 2: Brettchen und durchgestrichene Dinge warm eingerahmt; 3: dazu die Punkte. `vorrechnen`: wie 2, mit Zahl.
 */
function zeichne(r: Rechenbild, o: ZeichenOptionen): string {
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  if (r.brett) {
    const b = r.brett;
    if (hervor) s += hilfeRahmen(b.x - 6, b.y - 2, b.w + 12, b.h + 12, 'teil');
    s += schild(b.x, b.y, b.w, b.h);
  }
  s += tablett(4, r.tablettY, r.breite - 8, r.tablettH);
  for (const l of r.leisten) s += leiste(l.x, l.y, l.m);
  const weg = r.dinge.filter((d) => d.weg);
  if (hervor && weg.length)
    s += `<g data-hilfe="teil">${weg.map((d) => `<circle cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 7}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`).join('')}</g>`;
  r.dinge.forEach((d, k) => (s += ding(d, r.form, r.farbe, { nr: k })));
  if (r.brett) {
    const b = r.brett;
    // Pfeil vom Brettchen hinunter aufs Tablett
    s += pfeil(b.x + b.w + 10, b.y + b.h / 2, Math.min(b.x + b.w + 80, r.breite - 40), r.tablettY + 2, 30);
  }
  let y = r.tablettY + r.tablettH + 5;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const feld = punktefeld(hilfePunkte(r), r.breite, y + 14);
    s += feld.svg;
    y += 14 + feld.hoehe;
  }
  const loesung = o.vorrechnen ? (loesungen(r)[0] as { wert: number }).wert : null;
  // das Nest gleich unter der rechten Ecke des Tabletts
  s += nest(r.breite - 4 - 84, y + 8, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(r.breite, y + 8 + 62, 'Rechenbild', s);
}

export const RECHENBILD: Format<Rechenbild> = {
  id: 'rechenbild',
  nr: 6,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVieleJetzt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) eins da, eins kommt dazu; (2) drei da, eins geht weg; (3) gewöhnliche Aufgabe der
   * Stufe 1: vier da, zwei kommen dazu.
   */
  beispiele: () => [baue(1, 0, 1, 'kreis', 'rot'), baue(3, 1, 0, 'stern', 'blau'), baue(4, 0, 2, 'quadrat', 'gruen')],
};
