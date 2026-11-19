import { FIGUR_TOKEN, LATERNE, LATERNE_KANTE, TINTE_LEISE } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import type { Zufall } from '../core/zufall';
import { antwortNest, gruppe, kachel, laterneRahmen, stufeGrenze, svgRahmen, tablett, zahl, zeichenForm } from './bildteile';

/**
 * Entdeckerpäckchen (Nr. 96, Bild): Aufgaben untereinander, die sich nach einer Regel ändern
 * (9 + 1, 8 + 2, 7 + 3, …); in der letzten fehlt eine Zahl.
 * Stufe 1: nur plus; eine Zahl wird je Zeile um eins größer oder kleiner, die andere bleibt oder ändert sich
 *          gegenläufig (die Summe bleibt); es fehlt das Ergebnis. Zahlen eine Stufe unter dem Zahlenraum.
 * Stufe 2: schwerer wird die Regel – plus oder minus, beide Zahlen ändern sich um bis zu zwei; es fehlt das
 *          Ergebnis oder die zweite Zahl. Ganzer Zahlenraum.
 * Stufe 3: schwerer wird die Lücke – Schritte bis fünf (bis 100 auch zehn), es fehlt auch die erste Zahl.
 *
 * Löser (unabhängig vom Generator): sammelt jede Zahl 0–100, mit der die letzte Aufgabe stimmt, UND die
 * Fortsetzung der Spalte, wenn die Spalte darüber gleichmäßig wächst oder fällt. Beide Wege müssen dieselbe
 * Zahl geben; die Aufgaben darüber müssen stimmen.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die Spalte über der Lücke warm ein, die übrigen Zahlen darüber gehen in
 * den Halbschatten; Stufe 3 zeigt zwischen den Zeilen dieser Spalte, wie sie sich ändert – Plus- oder
 * Minuszeichen und so viele Punkte wie der Schritt (keine Ziffer). Bleibt die Spalte gleich, verriete das die
 * Zahl (`schrittVerraet`).
 */
export type Rechenart = 'plus' | 'minus';
export type Zelle = number | null;
export interface Paeckchen {
  zeichen: Rechenart;
  /** Zeilen [erste Zahl, zweite Zahl, Ergebnis]; in der letzten genau eine Lücke (null) */
  zeilen: [Zelle, Zelle, Zelle][];
}

const rechne = (a: number, b: number, z: Rechenart) => (z === 'plus' ? a + b : a - b);

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Paeckchen {
  const g = stufeGrenze(stufe, e.zahlenraum);
  for (;;) {
    let zeichen: Rechenart = 'plus';
    let da: number;
    let db: number;
    let luecke: number;
    if (stufe === 1) {
      [da, db] = z.eins([
        [1, 0],
        [0, 1],
        [-1, 1],
        [1, -1],
      ]);
      luecke = 2;
    } else {
      zeichen = z.eins<Rechenart>(['plus', 'minus']);
      const gross = stufe === 2 ? [-2, -1, 0, 1, 2] : g === 100 ? [-10, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 10] : [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
      da = z.eins(gross);
      db = z.eins(gross);
      if (da === 0 && db === 0) continue;
      luecke = stufe === 2 ? z.eins([1, 2]) : z.ganz(0, 2);
    }
    const a1 = z.ganz(stufe === 1 ? 1 : 0, g);
    const b1 = z.ganz(stufe === 1 ? 1 : 0, g);
    const zeilen: [Zelle, Zelle, Zelle][] = [];
    let ok = true;
    for (let k = 0; k < 4 && ok; k++) {
      const a = a1 + k * da;
      const b = b1 + k * db;
      const c = rechne(a, b, zeichen);
      ok = [a, b, c].every((v) => v >= 0 && v <= g);
      zeilen.push([a, b, c]);
    }
    if (!ok) continue;
    // keine Aufgabe mit lauter Nullen; minus nicht „x − 0“ in jeder Zeile
    if (zeilen.some(([a, b]) => a === 0 && b === 0)) continue;
    zeilen[3][luecke] = null;
    return { zeichen, zeilen };
  }
}

/** Spalte und Wert der Lücke in der letzten Zeile */
function lueckeVon(p: Paeckchen): number {
  return p.zeilen[p.zeilen.length - 1].indexOf(null);
}

/** Löser: Zahlen, mit denen die letzte Aufgabe stimmt, und die Fortsetzung der Spalte */
function loesungen(p: Paeckchen): Antwort[] {
  const n = p.zeilen.length;
  const sp = lueckeVon(p);
  if (sp < 0 || p.zeilen[n - 1].filter((x) => x === null).length !== 1) return [];
  // die vollständigen Aufgaben darüber müssen stimmen
  for (const zeile of p.zeilen.slice(0, -1)) {
    if (zeile.some((x) => x === null)) return [];
    if (rechne(zeile[0]!, zeile[1]!, p.zeichen) !== zeile[2]) return [];
  }
  const out = new Set<number>();
  for (let v = 0; v <= 100; v++) {
    const z = p.zeilen[n - 1].map((x) => x ?? v) as number[];
    if (rechne(z[0], z[1], p.zeichen) === z[2]) out.add(v);
  }
  // Fortsetzung der Spalte: gleichmäßiger Schritt über alle Zeilen darüber
  const spalte = p.zeilen.slice(0, -1).map((zeile) => zeile[sp] as number);
  if (spalte.length >= 2) {
    const d = spalte[1] - spalte[0];
    const weiter = spalte[spalte.length - 1] + d;
    if (spalte.every((x, i) => i === 0 || x - spalte[i - 1] === d) && weiter >= 0 && weiter <= 100) out.add(weiter);
  }
  return [...out].map((wert) => ({ art: 'zahl', wert }));
}

/** Schritt der Spalte über der Lücke (für Hilfe und schrittVerraet) */
export function spaltenSchritt(p: Paeckchen): number {
  const sp = lueckeVon(p);
  return (p.zeilen[1][sp] as number) - (p.zeilen[0][sp] as number);
}

const KB = 62;
const KH = 46;
const ZEICHEN_B = 34;
const ZEILE = 70;
const RAND = 18;
const spalteX = (sp: number) => RAND + sp * (KB + ZEICHEN_B);

/** Plättchen der Hilfe Stufe 3: Plus/Minus/Gleich und Punkte für den Schritt (zehn: eine Stange) */
function schrittMarke(cx: number, cy: number, d: number): string {
  const n = Math.abs(d);
  const punkte = n === 10 ? 1 : n;
  const b = 30 + (n === 10 ? 30 : punkte * 11);
  let s = `<rect x="${cx - b / 2}" y="${cy - 12}" width="${b}" height="24" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  s += zeichenForm(d > 0 ? 'plus' : d < 0 ? 'minus' : 'gleich', cx - b / 2 + 15, cy, 11, TINTE_LEISE);
  if (n === 10) s += `<rect data-menge="zehn" x="${cx - b / 2 + 26}" y="${cy - 4.5}" width="28" height="9" rx="4.5" fill="${FIGUR_TOKEN.halstuch}"/>`;
  else for (let k = 0; k < punkte; k++) s += `<circle data-menge="eins" cx="${cx - b / 2 + 32 + k * 11}" cy="${cy}" r="4.3" fill="${FIGUR_TOKEN.halstuch}"/>`;
  return s;
}

function zeichne(p: Paeckchen, o: ZeichenOptionen): string {
  const n = p.zeilen.length;
  const sp = lueckeVon(p);
  const W = spalteX(2) + KB + RAND;
  const H = RAND + n * ZEILE - (ZEILE - KH) + RAND + 6;
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const loes = loesungen(p);
  const l = loes.length >= 1 && loes[0].art === 'zahl' ? loes[0].wert : 0;
  let s = tablett(0, 0, W, H, 18);
  if (hervor) {
    const x = spalteX(sp);
    s += `<g data-hilfe="teil">${laterneRahmen(x - 6, RAND - 6, KB + 12, (n - 1) * ZEILE - (ZEILE - KH) + 16, 14)}</g>`;
  }
  p.zeilen.forEach((zeile, k) => {
    const y = RAND + k * ZEILE;
    const letzte = k === n - 1;
    let t = '';
    zeile.forEach((v, i) => {
      const x = spalteX(i);
      if (v === null) t += antwortNest(x, y, KB, KH, o, l, 26);
      else {
        const schatten = hervor && !letzte && i !== sp;
        t += gruppe(schatten ? 'schatten' : null, kachel(x, y, KB, KH) + zahl(x + KB / 2, y + KH / 2, v, 26));
      }
    });
    t += zahl(spalteX(0) + KB + ZEICHEN_B / 2, y + KH / 2, p.zeichen === 'plus' ? '+' : '−', 26, TINTE_LEISE);
    t += zahl(spalteX(1) + KB + ZEICHEN_B / 2, y + KH / 2, '=', 26, TINTE_LEISE);
    s += t;
  });
  if (o.hilfe >= 3 || o.vorrechnen) {
    const d = spaltenSchritt(p);
    let t = '';
    for (let k = 0; k < n - 1; k++) t += schrittMarke(spalteX(sp) + KB / 2, RAND + k * ZEILE + KH + (ZEILE - KH) / 2 + 2, d);
    s += `<g data-hilfe="schritt">${t}</g>`;
  }
  return svgRahmen(W, H + 6, s, 'Entdeckerpäckchen');
}

export const ENTDECKERPAECKCHEN: Format<Paeckchen> = {
  id: 'entdeckerpaeckchen',
  nr: 96,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z4',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlFehlt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** gleichbleibende Spalte: der Schritt „bleibt gleich“ zeigte die Zahl schon – dann an der ähnlichen Aufgabe */
  schrittVerraet: (p) => spaltenSchritt(p) === 0,
  /**
   * Lernbeispiel: (1) drei Zeilen 1 + 1, 1 + 2, 1 + 3 – das Ergebnis wächst um eins; (2) dasselbe mit vier
   * Zeilen; (3) gewöhnliche Aufgabe der Stufe 1: 1 + 2, 2 + 2, 3 + 2, 4 + 2. Alle Antworten einstellig.
   */
  beispiele: () => [
    { zeichen: 'plus', zeilen: [[1, 1, 2], [1, 2, 3], [1, 3, null]] },
    { zeichen: 'plus', zeilen: [[1, 1, 2], [1, 2, 3], [1, 3, 4], [1, 4, null]] },
    { zeichen: 'plus', zeilen: [[1, 2, 3], [2, 2, 4], [3, 2, 5], [4, 2, null]] },
  ],
};
