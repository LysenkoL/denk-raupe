import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, LATERNE_KANTE, PAPIER, TINTE, WEISS, type FormFarbe } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, nest, schild, svgHuelle, tablett } from './zaehlen';

/**
 * Zähl-Bild (Nr. 47, Engine Bild): verschiedene Formen liegen durcheinander – wie viele Dreiecke sind es?
 * Was gezählt wird, zeigt das Schild links oben: ein graues Dreieck = jedes Dreieck, gleich welche Farbe,
 * Größe und Lage (dasselbe Grau wie „irgendein Hut“ in Wer ist es?).
 * Stufe 1: 6–8 Formen, 2–5 Dreiecke, alle aufrecht; die anderen Formen sind rund oder eckig-gerade (Kreis, Quadrat).
 * Stufe 2: schwerer wird die Menge und die Lage – 9–12 Formen, 3–8 Dreiecke, gedreht; dazu Stern und Raute.
 * Stufe 3: schwerer wird die Ähnlichkeit – 12–16 Formen, 4–10 Dreiecke (auch rechtwinklige und spitze), dazu
 *          Trapeze: sie sehen aus wie ein Dreieck mit abgeschnittener Spitze, haben aber vier Ecken.
 * Der Löser zählt die Formen mit drei Ecken (Ecken der Form, nicht ihr Name im Generator) und verwirft ein Bild,
 * in dem sich zwei Formen berühren – dann könnte das Kind zwei als eine sehen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt das Schild warm ein, alle Formen ohne drei Ecken gehen in den Halbschatten;
 * Stufe 3 markiert dazu die erste Hälfte der Dreiecke (in Lesereihenfolge) als gezählt – weiter zählt das Kind.
 * Jede Form lässt sich antippen und als gezählt markieren (data-zaehl, wie bei Wie viele?).
 */
export type ZaehlForm = 'dreieck' | 'rechtwinklig' | 'spitz' | 'kreis' | 'quadrat' | 'raute' | 'stern' | 'trapez';
export interface ZaehlDing {
  form: ZaehlForm;
  x: number;
  y: number;
  /** Radius des umschriebenen Kreises */
  r: number;
  /** Drehung in Grad */
  dreh: number;
  farbe: FormFarbe;
}
export interface ZaehlBild {
  dinge: ZaehlDing[];
  breite: number;
  hoehe: number;
}

/** Ecken einer Form, aus den Punkten des Umrisses (Kreis 0) */
export function ecken(d: Pick<ZaehlDing, 'form'>): number {
  return umriss({ ...d, x: 0, y: 0, r: 10, dreh: 0, farbe: 'rot' }).length;
}

/** Punkte des Umrisses (gedreht um die Mitte); Kreis: keine Ecken */
export function umriss(d: ZaehlDing): [number, number][] {
  const r = d.r;
  let p: [number, number][];
  switch (d.form) {
    case 'kreis':
      return [];
    case 'dreieck':
      p = [[0, -r], [r * 0.87, r * 0.5], [-r * 0.87, r * 0.5]];
      break;
    case 'rechtwinklig':
      p = [[-r * 0.7, -r * 0.7], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7]];
      break;
    case 'spitz':
      p = [[0, -r], [r * 0.5, r * 0.86], [-r * 0.5, r * 0.86]];
      break;
    case 'quadrat':
      p = [[-r * 0.7, -r * 0.7], [r * 0.7, -r * 0.7], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7]];
      break;
    case 'raute':
      p = [[0, -r], [r * 0.62, 0], [0, r], [-r * 0.62, 0]];
      break;
    case 'trapez':
      // die obere Seite ist fast halb so lang wie die untere: deutlich vier Ecken
      p = [[-r * 0.42, -r * 0.55], [r * 0.42, -r * 0.55], [r * 0.95, r * 0.55], [-r * 0.95, r * 0.55]];
      break;
    case 'stern': {
      p = [];
      for (let i = 0; i < 10; i++) {
        const w = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        p.push([rr * Math.cos(w), rr * Math.sin(w)]);
      }
      break;
    }
  }
  const w = (d.dreh * Math.PI) / 180;
  const [c, s] = [Math.cos(w), Math.sin(w)];
  return p.map(([x, y]) => [d.x + x * c - y * s, d.y + x * s + y * c]);
}

/** Abstand, unter dem zwei Formen als berührend gelten (umschriebene Kreise plus Luft) */
const LUFT = 6;

/** Löser: Formen mit drei Ecken; berühren sich zwei Formen, ist die Zahl nicht sicher zu sehen */
function loesungen(b: ZaehlBild): Antwort[] {
  const n = b.dinge.filter((d) => ecken(d) === 3).length;
  for (let i = 0; i < b.dinge.length; i++)
    for (let j = i + 1; j < b.dinge.length; j++) {
      const [p, q] = [b.dinge[i], b.dinge[j]];
      if (Math.hypot(p.x - q.x, p.y - q.y) < p.r + q.r + LUFT) return n > 0 ? [{ art: 'zahl', wert: n }, { art: 'zahl', wert: n - 1 }] : [{ art: 'zahl', wert: 0 }, { art: 'zahl', wert: 1 }];
    }
  return [{ art: 'zahl', wert: n }];
}

const ZELLE = 66;
const R = 24;
const WACKEL = 4;
const FARBEN: FormFarbe[] = ['rot', 'orange', 'gelb', 'gruen', 'blau', 'lila'];

interface Plan {
  spalten: number;
  zeilen: number;
  formen: [number, number];
  dreiecke: [number, number];
  andere: ZaehlForm[];
  dreieckArten: ZaehlForm[];
  gedreht: boolean;
}
const PLAN: Record<number, Plan> = {
  1: { spalten: 4, zeilen: 3, formen: [6, 8], dreiecke: [2, 5], andere: ['kreis', 'quadrat'], dreieckArten: ['dreieck'], gedreht: false },
  2: { spalten: 5, zeilen: 3, formen: [9, 12], dreiecke: [3, 8], andere: ['kreis', 'quadrat', 'stern', 'raute'], dreieckArten: ['dreieck'], gedreht: true },
  3: { spalten: 5, zeilen: 4, formen: [12, 16], dreiecke: [4, 10], andere: ['trapez', 'trapez', 'quadrat', 'raute', 'kreis', 'stern'], dreieckArten: ['dreieck', 'rechtwinklig', 'spitz'], gedreht: true },
};

const KOPF = 76;
const RAND = 14;

export function baue(spalten: number, zeilen: number, dinge: Omit<ZaehlDing, 'x' | 'y'>[], zellen: number[], z?: Zufall): ZaehlBild {
  const breite = spalten * ZELLE + 2 * RAND;
  const plaziert = dinge.map((d, k) => {
    const c = zellen[k];
    const w = () => (z ? z.ganz(-WACKEL, WACKEL) : 0);
    return { ...d, x: RAND + (c % spalten) * ZELLE + ZELLE / 2 + w(), y: KOPF + RAND + Math.floor(c / spalten) * ZELLE + ZELLE / 2 + w() };
  });
  // Lesereihenfolge: oben links zuerst (die Hilfe markiert die ersten Dreiecke)
  plaziert.sort((a, b) => Math.round(a.y / ZELLE) - Math.round(b.y / ZELLE) || a.x - b.x);
  return { dinge: plaziert, breite, hoehe: KOPF + zeilen * ZELLE + 2 * RAND };
}

function erzeuge(z: Zufall, stufe: number): ZaehlBild {
  const p = PLAN[stufe] ?? PLAN[3];
  const formen = z.ganz(p.formen[0], p.formen[1]);
  const dreiecke = z.ganz(p.dreiecke[0], Math.min(p.dreiecke[1], formen - 2));
  const dinge: Omit<ZaehlDing, 'x' | 'y'>[] = [];
  const groesse = () => (stufe === 3 ? z.eins([R - 4, R, R]) : R);
  const dreh = () => (p.gedreht ? z.ganz(0, 11) * 30 : 0);
  for (let k = 0; k < dreiecke; k++) dinge.push({ form: z.eins(p.dreieckArten), r: groesse(), dreh: dreh(), farbe: z.eins(FARBEN) });
  // jede andere Art kommt vor, so weit Platz ist
  const andere = z.mischen(p.andere);
  for (let k = 0; dinge.length < formen; k++) dinge.push({ form: andere[k % andere.length], r: groesse(), dreh: dreh(), farbe: z.eins(FARBEN) });
  const zellen = z.mischen(Array.from({ length: p.spalten * p.zeilen }, (_, i) => i)).slice(0, formen);
  return baue(p.spalten, p.zeilen, z.mischen(dinge), zellen, z);
}

/* ---------- Bild ---------- */

const f = (n: number) => Math.round(n * 10) / 10;
const pfad = (pk: [number, number][]) => pk.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');

/** eine Form mit dunklem Umriss (wie im Muster und in den Wahlkacheln), Licht oben links */
export function zaehlForm(d: ZaehlDing, fill: string = FORM_FARBEN[d.farbe], umrissFarbe: string = TINTE): string {
  const k = `fill="${fill}" stroke="${umrissFarbe}" stroke-width="2.6" stroke-linejoin="round"`;
  if (d.form === 'kreis') return `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r * 0.82)}" ${k}/>`;
  return `<polygon points="${pfad(umriss(d))}" ${k}/>`;
}

function ding(d: ZaehlDing, nr: number, o: { schatten?: boolean; markiert?: boolean }): string {
  let t = `<g data-zaehl="${nr}"${o.schatten ? ' data-hilfe="schatten" opacity="0.3"' : ''}>`;
  t += `<circle cx="${f(d.x)}" cy="${f(d.y)}" r="${d.r + 6}" fill="${PAPIER}" opacity="0"/>`;
  if (o.markiert) t += `<circle data-hilfe="schritt" cx="${f(d.x)}" cy="${f(d.y)}" r="${d.r + 6}" fill="${WEISS}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  t += `<g class="ding">${zaehlForm(d)}</g>`;
  t += `<g class="zaehl-ring" opacity="0"><circle cx="${f(d.x)}" cy="${f(d.y)}" r="${d.r + 7}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="2.5"/><circle cx="${f(d.x)}" cy="${f(d.y)}" r="${d.r + 4.5}" fill="none" stroke="${WEISS}" stroke-width="3"/></g>`;
  return t + '</g>';
}

/** Schild „zähle diese“: graues Dreieck auf Holz */
function zeichenSchild(x: number, y: number, hell: boolean): string {
  let t = '';
  if (hell) t += hilfeRahmen(x - 6, y - 6, 92, 76, 'teil', 18);
  t += schild(x, y, 80, 62);
  t += zaehlForm({ form: 'dreieck', x: x + 40, y: y + 34, r: 23, dreh: 0, farbe: 'rot' }, FIGUR_TOKEN['hut-grau'], FIGUR_TOKEN['hut-grau-kante']);
  return t;
}

/**
 * Schild oben links, darunter das Holztablett mit den Formen, rechts oben das Nest.
 * `hilfe` 2: Schild hervorgehoben, Formen ohne drei Ecken im Halbschatten; 3: dazu die erste Hälfte der Dreiecke
 * als gezählt markiert. `vorrechnen`: Formen ohne drei Ecken im Halbschatten, im Nest die Zahl.
 */
function zeichne(b: ZaehlBild, o: ZeichenOptionen): string {
  let s = zeichenSchild(8, 6, o.hilfe >= 2 || !!o.vorrechnen);
  s += tablett(4, KOPF, b.breite - 8, b.hoehe - KOPF - 4);
  const drei = b.dinge.map((d, k) => (ecken(d) === 3 ? k : -1)).filter((k) => k >= 0);
  const markiert = new Set(o.hilfe >= 3 && !o.vorrechnen ? drei.slice(0, Math.ceil(drei.length / 2)) : []);
  const schatten = o.hilfe >= 2 || !!o.vorrechnen;
  b.dinge.forEach((d, k) => (s += ding(d, k, { schatten: schatten && ecken(d) !== 3, markiert: markiert.has(k) })));
  const loesung = o.vorrechnen ? drei.length : null;
  s += nest(b.breite - 4 - 84, 10, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(b.breite, b.hoehe + 6, 'Zähl-Bild', s);
}

export const ZAEHL_BILD: Format<ZaehlBild> = {
  id: 'zaehl-bild',
  nr: 47,
  version: 1,
  bereich: 'blick',
  faehigkeit: 'B1',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieViele',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab (höchstens 10 Dreiecke): liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) ein Dreieck und ein Kreis – ein Blick; (2) zwei Dreiecke zwischen Kreis und Quadrat;
   * (3) gewöhnliche Aufgabe der Stufe 1 (aus dem Generator, erster Samen).
   */
  beispiele: () => {
    const d = (form: ZaehlForm, farbe: FormFarbe): Omit<ZaehlDing, 'x' | 'y'> => ({ form, farbe, r: R, dreh: 0 });
    return [
      baue(4, 3, [d('dreieck', 'rot'), d('kreis', 'blau')], [5, 6]),
      baue(4, 3, [d('dreieck', 'gruen'), d('kreis', 'rot'), d('quadrat', 'blau'), d('dreieck', 'orange')], [1, 4, 6, 11]),
      aufgabeAus(ZAEHL_BILD, 0, 1).bedingung,
    ];
  },
};
