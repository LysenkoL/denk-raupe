import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen, Zahlenraum } from './format';
import {
  DING_AB,
  DING_FARBEN,
  DING_FORMEN,
  DING_R,
  STREU_ZELLE,
  ding,
  gewaehlteZahl,
  hilfeRahmen,
  inReihen,
  leiste,
  nest,
  reiheBreite,
  sichtbareAnzahlen,
  svgHuelle,
  tablett,
  verstreut,
  type Ding,
  type DingFarbe,
  type DingForm,
} from './zaehlen';
import { LATERNE, LATERNE_KANTE } from '../design/farbe';

/**
 * Wie viele? (Nr. 1, Engine Bild): Dinge liegen auf einem Holztablett – wie viele sind es?
 * Stufe 1: wenige Dinge in einer Reihe, je fünf und fünf (wie auf dem Zwanzigerfeld); bis 10, bei Zahlenraum 100 bis 20.
 * Stufe 2: schwerer wird die Ordnung – die Dinge liegen lose verstreut (bis 10 / bis 15 / bis 20), das Kind
 *          muss selbst Ordnung halten (Werkzeug: gezählte Dinge antippen und markieren).
 * Stufe 3: schwerer wird die Menge – Dinge sind zu Bündeln auf Holzleisten gelegt (Bündeln): bei Zahlenraum 10
 *          ein Fünferbündel und lose, bei 20 ein oder zwei Zehnerbündel und lose (11–20), bei 100 zwei bis
 *          fünf Zehner und lose (20–59; mehr Dinge passen nicht lesbar auf ein Telefon).
 * Der Löser zählt nur die Dinge im Bild und verwirft ein Bild, in dem sich zwei Dinge berühren.
 *
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“: посчитанные предметы отмечаются): Stufe 2 rahmt die erste Gruppe
 * (fünf Dinge oder ein Bündel) warm ein; Stufe 3 rahmt jede Gruppe ein und markiert die erste als „gezählt“
 * (heller Ring) – das Kind zählt in Fünfern und Zehnern weiter. Keine Zahl im Bild.
 */
export interface WieViele {
  art: 'reihe' | 'streu' | 'buendel';
  form: DingForm;
  farbe: DingFarbe;
  dinge: Ding[];
  /** Holzleisten der Bündel: linke obere Ecke der Reihe und Zahl der Dinge darauf */
  leisten: { x: number; y: number; m: number }[];
  /** Gruppen für die Hilfe (Nummern in `dinge`): je fünf oder ein Bündel – der Löser liest sie nicht */
  gruppen: number[][];
  /** Höhe des Tabletts */
  hoehe: number;
  /** Breite des Bildes: so breit wie die Dinge brauchen – wenige Dinge erscheinen so größer */
  breite: number;
}

/** größte Breite des Bildes (zehn Dinge in einer Reihe, sieben Spalten der Streu) */
export const BREITE = 340;
const RAND = 18;
const LEISTE_AB = 42;
/** Bildbreite zu einer Breite der Dinge `cw`: Rand des Tabletts dazu; nie schmaler, als das Nest braucht */
const bildBreite = (cw: number) => Math.max(cw + 2 * RAND + 8, 150);

/** Teile von je fünf, in der Reihenfolge der Dinge */
function fuenfer(von: number, bis: number): number[][] {
  const out: number[][] = [];
  for (let k = von; k < bis; k += 5) out.push(Array.from({ length: Math.min(5, bis - k) }, (_, j) => k + j));
  return out;
}

export function baueReihe(n: number, form: DingForm, farbe: DingFarbe): WieViele {
  const cw = reiheBreite(Math.min(n, 10));
  const breite = bildBreite(cw);
  const dinge = inReihen(n, (breite - cw) / 2, 4 + RAND);
  const reihen = Math.ceil(n / 10);
  return { art: 'reihe', form, farbe, dinge, leisten: [], gruppen: fuenfer(0, n), hoehe: reihen * DING_AB - (DING_AB - 2 * DING_R) + 2 * RAND, breite };
}

function baueStreu(z: Zufall, n: number, form: DingForm, farbe: DingFarbe): WieViele {
  // wenige Dinge: ein schmaleres Feld (sie liegen nicht verloren auf einem breiten Tablett)
  const spalten = Math.min(7, Math.max(4, Math.ceil(Math.sqrt(n * 1.6))));
  const zeilen = Math.max(3, Math.ceil((n * 1.5) / spalten));
  const breite = bildBreite(spalten * STREU_ZELLE - 16);
  const dinge = verstreut(z, n, spalten, zeilen, (breite - spalten * STREU_ZELLE) / 2, 4 + RAND - 8);
  return { art: 'streu', form, farbe, dinge, leisten: [], gruppen: fuenfer(0, n), hoehe: zeilen * STREU_ZELLE + 2 * RAND - 16, breite };
}

/** `buendel` Bündel zu je `groesse` Dingen auf Leisten, darunter `lose` Dinge in Reihen */
export function baueBuendel(buendel: number, groesse: 5 | 10, lose: number, form: DingForm, farbe: DingFarbe): WieViele {
  const dinge: Ding[] = [];
  const leisten: WieViele['leisten'] = [];
  const gruppen: number[][] = [];
  const breite = bildBreite(reiheBreite(groesse));
  const bx = (breite - reiheBreite(groesse)) / 2;
  let y = 4 + RAND + 6;
  for (let b = 0; b < buendel; b++) {
    leisten.push({ x: bx, y, m: groesse });
    gruppen.push(Array.from({ length: groesse }, (_, j) => dinge.length + j));
    dinge.push(...inReihen(groesse, bx, y));
    y += LEISTE_AB;
  }
  if (lose) {
    const start = dinge.length;
    const lx = (breite - reiheBreite(Math.min(lose, 10))) / 2;
    dinge.push(...inReihen(lose, lx, y + 4));
    gruppen.push(...fuenfer(start, start + lose));
    y += 4 + Math.ceil(lose / 10) * DING_AB;
  } else y -= LEISTE_AB - (2 * DING_R + 6);
  return { art: 'buendel', form, farbe, dinge, leisten, gruppen, hoehe: y - 4 + RAND - (lose ? DING_AB - 2 * DING_R : 0), breite };
}

/** kleinste und größte Zahl je Stufe und Zahlenraum (siehe Kommentar oben) */
export function bereich(stufe: number, zr: Zahlenraum): [number, number] {
  if (stufe === 1) return zr === 100 ? [5, 20] : [3, 10];
  if (stufe === 2) return zr === 10 ? [4, 10] : zr === 20 ? [6, 15] : [10, 20];
  return zr === 10 ? [6, 10] : zr === 20 ? [11, 20] : [20, 59];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): WieViele {
  const form = z.eins(DING_FORMEN);
  const farbe = z.eins(DING_FARBEN);
  const [a, b] = bereich(stufe, e.zahlenraum);
  const n = z.ganz(a, b);
  if (stufe === 1) return baueReihe(n, form, farbe);
  if (stufe === 2) return baueStreu(z, n, form, farbe);
  const groesse = e.zahlenraum === 10 ? 5 : 10;
  return baueBuendel(Math.floor(n / groesse), groesse, n % groesse, form, farbe);
}

/** Löser: zählt die Dinge im Bild (Gruppen und Leisten liest er nicht) */
function loesungen(w: WieViele): Antwort[] {
  return sichtbareAnzahlen(w.dinge).map((wert) => ({ art: 'zahl', wert }));
}

/** Kasten um eine Gruppe in Reihen (Rahmen der Hilfe) */
function kasten(w: WieViele, g: number[]): [number, number, number, number] {
  const xs = g.map((k) => w.dinge[k].x);
  const ys = g.map((k) => w.dinge[k].y);
  const p = DING_R + 7;
  return [Math.min(...xs) - p, Math.min(...ys) - p, Math.max(...xs) - Math.min(...xs) + 2 * p, Math.max(...ys) - Math.min(...ys) + 2 * p + 2];
}

/** Rahmen der Gruppe `g`: Kasten bei Reihen und Bündeln, warme Höfe um jedes Ding bei Streu */
function gruppenRahmen(w: WieViele, g: number[], art: 'teil' | 'schritt'): string {
  if (w.art !== 'streu') {
    const [x, y, bw, bh] = kasten(w, g);
    return hilfeRahmen(x, y, bw, bh, art);
  }
  const strich = art === 'schritt' ? ' stroke-dasharray="7 5"' : '';
  return `<g data-hilfe="${art}">${g.map((k) => `<circle cx="${w.dinge[k].x}" cy="${w.dinge[k].y + 1}" r="${DING_R + 8}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"${strich}/>`).join('')}</g>`;
}

/**
 * Tablett mit den Dingen, darunter das Nest der Antwort. Jedes Ding ist antippbar (data-zaehl: gezählt markieren).
 * `hilfe` 2: erste Gruppe eingerahmt; 3: jede Gruppe eingerahmt, die erste als gezählt markiert.
 * `vorrechnen`: alle Gruppen eingerahmt, im Nest die Zahl.
 */
function zeichne(w: WieViele, o: ZeichenOptionen): string {
  const H = w.hoehe + 8 + 10 + 62;
  let s = tablett(4, 4, w.breite - 8, w.hoehe);
  for (const l of w.leisten) s += leiste(l.x, l.y, l.m);
  if (o.vorrechnen) w.gruppen.forEach((g) => (s += gruppenRahmen(w, g, 'teil')));
  else if (o.hilfe >= 2) {
    s += gruppenRahmen(w, w.gruppen[0], 'teil');
    if (o.hilfe >= 3) w.gruppen.slice(1).forEach((g) => (s += gruppenRahmen(w, g, 'schritt')));
  }
  const erste = new Set(o.hilfe >= 3 && !o.vorrechnen ? w.gruppen[0] : []);
  w.dinge.forEach((d, k) => (s += ding(d, w.form, w.farbe, { nr: k, markiert: erste.has(k) })));
  // das Nest gleich unter der rechten Ecke des Tabletts: dorthin gehört die Antwort
  const ny = w.hoehe + 8 + 10;
  const loesung = o.vorrechnen ? (loesungen(w)[0] as { wert: number }).wert : null;
  s += nest(w.breite - 4 - 84, ny, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(w.breite, H, 'Wie viele?', s);
}

export const WIE_VIELE: Format<WieViele> = {
  id: 'wie-viele',
  nr: 1,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z1',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieViele',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) ein einziges Ding – ein Blick; (2) drei Dinge; (3) gewöhnliche Aufgabe der Stufe 1:
   * sieben Dinge in einer Reihe, fünf und zwei.
   */
  beispiele: () => [baueReihe(1, 'kreis', 'rot'), baueReihe(3, 'stern', 'blau'), baueReihe(7, 'quadrat', 'gruen')],
};
