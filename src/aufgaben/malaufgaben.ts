import { FIGUR_TOKEN, WEISS } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, gruppe, laterneRahmen, stufeGrenze, svgRahmen, tablett } from './bildteile';

/**
 * Malaufgaben (Nr. 73, Bild, 2. Klasse): Plättchen liegen in gleich langen Reihen – wie viele sind es?
 * Die Antwort ist eine Zahl; die Reihen sind das Bild von „r mal c“.
 * Stufe 1: Kernaufgaben – Reihen zu 2, 5 oder 10, zwei bis fünf Reihen; die Zahlen eine Stufe unter dem
 *          Zahlenraum (bis 20 → bis 10, bis 100 → bis 20).
 * Stufe 2: schwerer wird die Reihe – Reihen zu 2 bis 5 (auch 3 und 4, die man nicht in Fünfern sieht),
 *          zwei bis fünf Reihen, bis zum ganzen Zahlenraum.
 * Stufe 3: schwerer wird die Größe – mindestens eine Seite hat 6 bis 10 (lange Reihen oder viele Reihen),
 *          bis zum ganzen Zahlenraum. Bis 10 passt keine solche Aufgabe: dort bleibt es bei Stufe 2.
 * Plättchen liegen in Fünfern: Lücke nach dem fünften Plättchen einer Reihe und nach der fünften Reihe.
 *
 * Löser: zählt alle Plättchen; ein Bild mit ungleich langen Reihen ist keine Malaufgabe (keine Lösung).
 * Hilfe auf dem Bild: Stufe 2 rahmt die erste Reihe warm ein, die übrigen gehen in den Halbschatten;
 * Stufe 3 rahmt jede Reihe einzeln – das Kind sieht r gleiche Päckchen. Keine Zahl dazu.
 */
export interface Malaufgabe {
  /** Zahl der Plättchen je Reihe, von oben */
  reihen: number[];
}

/** Längen der Reihen je Stufe */
const REIHE: Record<number, number[]> = { 1: [2, 5, 10], 2: [2, 3, 4, 5], 3: [2, 3, 4, 5, 6, 7, 8, 9, 10] };

/** alle (Reihen, Länge) einer Stufe innerhalb der Grenze */
export function moeglich(stufe: number, e: Einstellung): [number, number][] {
  const grenze = stufeGrenze(stufe, e.zahlenraum);
  const paare = (s: number) => {
    const out: [number, number][] = [];
    for (const c of REIHE[s]) for (let r = 2; r <= (s === 3 ? 10 : 5); r++) if (r * c <= grenze && (s < 3 || Math.max(r, c) >= 6)) out.push([r, c]);
    return out;
  };
  const p = paare(stufe);
  return p.length ? p : paare(2);
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Malaufgabe {
  const [r, c] = z.eins(moeglich(stufe, e));
  return { reihen: Array.from({ length: r }, () => c) };
}

/** Löser: zählt die Plättchen; nur gleich lange Reihen sind eine Malaufgabe */
function loesungen(m: Malaufgabe): Antwort[] {
  if (m.reihen.length === 0 || m.reihen.some((n) => n !== m.reihen[0] || n < 1)) return [];
  const summe = m.reihen.reduce((a, b) => a + b, 0);
  return summe <= 100 ? [{ art: 'zahl', wert: summe }] : [];
}

const ABSTAND = 31;
const LUECKE = 11;
const R = 11.5;
const RAND = 18;
const MIN_B = 300;

const px = (k: number) => k * ABSTAND + (k >= 5 ? LUECKE : 0);
/** Reihen etwas weiter auseinander als die Plättchen in der Reihe: so sieht man die Reihen, und die Rahmen der Hilfe berühren sich nicht */
const ZEILE = 40;
const py = (k: number) => k * ZEILE + (k >= 5 ? LUECKE : 0);

/** ein Plättchen: Kante unten, Licht oben links */
function plaettchen(cx: number, cy: number): string {
  return (
    `<circle data-plaettchen="" cx="${cx}" cy="${cy + 2.5}" r="${R}" fill="${FIGUR_TOKEN['halstuch-kante']}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FIGUR_TOKEN.halstuch}"/>` +
    `<circle cx="${cx - 3.8}" cy="${cy - 4}" r="3.4" fill="${WEISS}" opacity="0.45"/>`
  );
}

function zeichne(m: Malaufgabe, o: ZeichenOptionen): string {
  const breiteste = Math.max(...m.reihen);
  const feldB = px(breiteste - 1) + ABSTAND;
  const feldH = py(m.reihen.length - 1) + ABSTAND;
  const W = Math.max(MIN_B, feldB + 2 * RAND + 8);
  const x0 = (W - feldB) / 2;
  const y0 = 6 + RAND;
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const schritt = o.hilfe >= 3 || !!o.vorrechnen;
  let s = tablett(x0 - RAND, 6, feldB + 2 * RAND, feldH + 2 * RAND);
  m.reihen.forEach((n, r) => {
    const y = y0 + py(r);
    let reihe = '';
    const rahmen = laterneRahmen(x0 - 6, y - 3, px(n - 1) + ABSTAND + 12, ABSTAND + 6, 18);
    if (hervor && r === 0) reihe += rahmen;
    else if (schritt) reihe += `<g data-hilfe="schritt">${rahmen}</g>`;
    for (let k = 0; k < n; k++) reihe += plaettchen(x0 + px(k) + ABSTAND / 2, y + ABSTAND / 2 - 1);
    s += gruppe(!hervor ? null : r === 0 ? 'teil' : schritt ? null : 'schatten', reihe);
  });
  const nestB = 84;
  const nestH = 54;
  const ny = 6 + feldH + 2 * RAND + 20;
  s += antwortNest((W - nestB) / 2, ny, nestB, nestH, o, m.reihen.reduce((a, b) => a + b, 0), 28);
  return svgRahmen(W, ny + nestH + 8, s, 'Malaufgabe');
}

export const MALAUFGABEN: Format<Malaufgabe> = {
  id: 'malaufgaben',
  nr: 73,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z6',
  motor: 'bild',
  klasse: 2,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVielePlaettchen',
  stufen: 3,
  erzeuge,
  loesungen,
  /** Feld wie bei jeder Zahl: hängt nur vom Zahlenraum ab, nie von der Aufgabe */
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /**
   * Lernbeispiel: (1) eine Reihe aus drei Plättchen – zählen; (2) zwei Reihen zu zwei;
   * (3) gewöhnliche Aufgabe der Stufe 1: drei Reihen zu zwei. Alle Antworten einstellig.
   */
  beispiele: () => [{ reihen: [3] }, { reihen: [2, 2] }, { reihen: [2, 2, 2] }],
};
