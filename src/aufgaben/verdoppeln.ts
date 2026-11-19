import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen, Zahlenraum } from './format';
import {
  DING_AB,
  DING_FARBEN,
  DING_FORMEN,
  DING_R,
  ding,
  gewaehlteZahl,
  hilfeRahmen,
  inReihen,
  kachel,
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
 * Verdoppeln und halbieren (Nr. 16, Engine Bild): Dinge auf dem Tablett (oder eine Zahl) und ein Bildzeichen:
 * „aus einem werden zwei“ = verdoppeln, „aus zweien wird einer“ = halbieren. Wie viele sind es dann?
 * Die zwei Bildzeichen sind in allen Aufgaben dieselben; das Lernbeispiel führt beide ein.
 * Stufe 1: Dinge in Fünferreihen; das Doppelte bis 10 und die Hälfte von höchstens 10 (bei Zahlenraum 100: bis 20).
 * Stufe 2: schwerer werden die Zahlen – Dinge bis 10/20/40, das Doppelte und die Hälfte bis zum Zahlenraum.
 * Stufe 3: schwerer wird die Vorstellung – keine Dinge mehr, nur die Zahl auf einer Kachel (bei 100: das Doppelte
 *          von 5–50, die Hälfte gerader Zahlen 10–100).
 * Der Löser zählt die Dinge (oder liest die Zahl) und rechnet; eine ungerade Zahl hat keine Hälfte → verworfen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt das Bildzeichen warm ein (was zu tun ist); Stufe 3 legt die Rechnung als Punkte
 * darunter – beim Verdoppeln zweimal dieselbe Zahl in zwei Farben, beim Halbieren die Zahl in zwei gleich große
 * Teile gefärbt. Keine Zahl.
 */
export interface Verdoppeln {
  art: 'doppelt' | 'halb';
  /** Zahl auf der Kachel (Stufe 3) oder null, wenn Dinge liegen */
  zahl: number | null;
  dinge: Ding[] | null;
  form: DingForm;
  farbe: DingFarbe;
  /** Höhe des Tabletts (0 ohne Dinge) */
  hoehe: number;
}

export const BREITE = 340;
const RAND = 18;

export function mitDingen(art: Verdoppeln['art'], n: number, form: DingForm, farbe: DingFarbe): Verdoppeln {
  const dinge = inReihen(n, (BREITE - reiheBreite(Math.min(n, 10))) / 2, 4 + RAND);
  return { art, zahl: null, dinge, form, farbe, hoehe: Math.ceil(n / 10) * DING_AB - (DING_AB - 2 * DING_R) + 2 * RAND };
}

/** kleinste und größte Zahl, die verdoppelt oder halbiert wird, je Stufe und Zahlenraum */
export function bereich(art: Verdoppeln['art'], stufe: number, zr: Zahlenraum): [number, number] {
  const tab: Record<number, Record<Zahlenraum, [number, number, number, number]>> = {
    // [doppelt von, bis, halb von, bis]
    1: { 10: [1, 5, 2, 10], 20: [1, 5, 2, 10], 100: [1, 10, 2, 20] },
    2: { 10: [3, 5, 6, 10], 20: [6, 10, 12, 20], 100: [11, 25, 22, 40] },
    3: { 10: [1, 5, 2, 10], 20: [3, 10, 6, 20], 100: [5, 50, 10, 100] },
  };
  const t = tab[stufe][zr];
  return art === 'doppelt' ? [t[0], t[1]] : [t[2], t[3]];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Verdoppeln {
  const form = z.eins(DING_FORMEN);
  const farbe = z.eins(DING_FARBEN);
  const art = z.zahl() < 0.5 ? 'doppelt' : 'halb';
  const [a, b] = bereich(art, stufe, e.zahlenraum);
  let n = z.ganz(a, b);
  if (art === 'halb' && n % 2) n = n + 1 <= b ? n + 1 : n - 1;
  if (stufe === 3) return { art, zahl: n, dinge: null, form, farbe, hoehe: 0 };
  return mitDingen(art, n, form, farbe);
}

/** Löser: Zahl der Dinge (berühren sich zwei, sind zwei Zahlen möglich) oder die Zahl der Kachel, dann rechnen */
function loesungen(v: Verdoppeln): Antwort[] {
  const zahlen = v.dinge ? sichtbareAnzahlen(v.dinge) : v.zahl === null ? [] : [v.zahl];
  const out: Antwort[] = [];
  for (const n of zahlen) {
    if (v.art === 'doppelt') out.push({ art: 'zahl', wert: 2 * n });
    else if (n % 2 === 0) out.push({ art: 'zahl', wert: n / 2 });
  }
  return out;
}

export function hilfePunkte(v: Verdoppeln): PunktArt[] {
  const n = v.dinge ? v.dinge.length : (v.zahl ?? 0);
  return v.art === 'doppelt' ? [...punkte(n, 'erster'), ...punkte(n, 'zweiter')] : [...punkte(n / 2, 'erster'), ...punkte(n / 2, 'zweiter')];
}

/** Bildzeichen auf einem Holzschild: ● → ●● (verdoppeln) oder ●● → ● (halbieren) */
function bildzeichen(x: number, y: number, v: Verdoppeln, w: number): string {
  const art = v.art;
  const h = 64;
  let s = `<g data-zeichen="${art}">` + schild(x, y, w, h);
  // dieselben Dinge wie auf dem Tablett (Form und Farbe der Aufgabe): das Zeichen gehört sichtbar zu ihnen
  const punkt = (cx: number) => ding({ x: cx, y: y + h / 2 }, v.form, v.farbe);
  const links = art === 'doppelt' ? [x + 26] : [x + 20, x + 47];
  const rechts = art === 'doppelt' ? [x + w - 47, x + w - 20] : [x + w - 26];
  s += links.map(punkt).join('') + rechts.map(punkt).join('');
  // kleiner, dünner Pfeil: Teil des Zeichens, nicht der Weg zur Antwort
  s += pfeil(x + (art === 'doppelt' ? 43 : 64), y + h / 2, x + w - (art === 'doppelt' ? 64 : 43), y + h / 2, 0, 3.5);
  return s + '</g>';
}

/**
 * Tablett mit den Dingen (oder Kachel mit der Zahl), darunter Bildzeichen → Nest. `hilfe` 2: Bildzeichen eingerahmt;
 * 3: dazu die Punkte. `vorrechnen`: wie 2, im Nest die Lösung.
 */
function zeichne(v: Verdoppeln, o: ZeichenOptionen): string {
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  let y = 4;
  const loesung = o.vorrechnen ? (loesungen(v)[0] as { wert: number }).wert : null;
  const nestHtml = (ny: number, nw = 80) => nest(BREITE - 4 - nw, ny, nw, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  if (v.dinge) {
    s += tablett(4, y, BREITE - 8, v.hoehe);
    v.dinge.forEach((d, k) => (s += ding(d, v.form, v.farbe, { nr: k })));
    y += v.hoehe + 24;
    const zx = 30;
    if (hervor) s += hilfeRahmen(zx - 7, y - 7, 140 + 14, 64 + 18, 'teil');
    s += bildzeichen(zx, y, v, 140);
    s += pfeil(zx + 140 + 14, y + 32, BREITE - 4 - 80 - 14, y + 32);
    s += nestHtml(y + 5);
    y += 64 + 12;
  } else {
    // Kachel → Bildzeichen → Nest in einer Reihe
    const kw = 66;
    y = 14;
    s += kachel(4, y + 1, kw, 62, String(v.zahl), String(v.zahl).length > 2 ? 26 : 30);
    const zx = 4 + kw + 12;
    if (hervor) s += hilfeRahmen(zx - 7, y - 7, 124 + 14, 64 + 18, 'teil');
    s += bildzeichen(zx, y, v, 124);
    s += pfeil(zx + 124 + 10, y + 32, BREITE - 4 - 76 - 10, y + 32);
    s += nestHtml(y + 5, 76);
    y += 64 + 16;
  }
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const f = punktefeld(hilfePunkte(v), BREITE, y + 6);
    s += f.svg;
    y += f.hoehe + 12;
  }
  return svgHuelle(BREITE, y + 4, 'Verdoppeln und halbieren', s);
}

export const VERDOPPELN: Format<Verdoppeln> = {
  id: 'verdoppeln',
  nr: 16,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'verdoppleHalbiere',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel, beide Bildzeichen: (1) ein Ding verdoppeln; (2) sechs Dinge halbieren; (3) gewöhnliche Aufgabe
   * der Stufe 1: vier Dinge verdoppeln.
   */
  beispiele: () => [mitDingen('doppelt', 1, 'kreis', 'rot'), mitDingen('halb', 6, 'stern', 'blau'), mitDingen('doppelt', 4, 'quadrat', 'gruen')],
};
