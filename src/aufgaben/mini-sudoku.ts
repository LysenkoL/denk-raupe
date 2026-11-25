import type { Antwort, Form } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, HOLZ_KANTE, LATERNE, LATERNE_KANTE, PAPIER, TINTE_LEISE, type FormFarbe } from '../design/farbe';
import { formPfad } from '../perlen/maler';
import { stein } from './plan';
import { svgHuelle } from './zaehlen';

/**
 * Mini-Sudoku (Nr. 25, Engine Raster mit mehreren Zellen, Antwort Gitter): in jeder Zeile und jeder Spalte steht jedes
 * Zeichen genau einmal (bei 4 × 4 auch in jedem der vier 2 × 2-Blöcke). Das Kind tippt eine leere Zelle an und setzt
 * im Lade ein Zeichen; ist das Gitter voll, kann es die Perle (Zeichen „Gitter“) abgeben. Geprüft wird das ganze Gitter.
 * Stufe 1: 3 × 3, zwei leere Zellen. Stufe 2: 3 × 3, vier oder fünf leere Zellen. Stufe 3: 4 × 4 mit Blöcken, 6–8 leer.
 * Zeichen sind Formen in je eigener Farbe (verschieden in Form UND Farbe).
 * Der Löser (docs/LOESER.md, Abschnitt 6) probiert alle Belegungen der leeren Zellen; genau eine muss passen.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt Zeile und Spalte der leichtesten leeren Zelle hervor (dort passt nur ein Zeichen);
 * Stufe 3 rahmt dazu diese Zelle gestrichelt ein – „fang hier an“. Kein Zeichen wird eingesetzt.
 */
export interface MiniSudoku {
  n: 3 | 4;
  /** Wert je Zelle (Nummer des Zeichens), −1 = leer */
  start: number[];
  zeichen: { form: Form; farbe: FormFarbe }[];
}

/** Nachbarn einer Zelle: dieselbe Zeile, Spalte und (bei 4 × 4) derselbe Block */
function nachbarn(n: number, k: number): number[] {
  const [z, s] = [Math.floor(k / n), k % n];
  const out: number[] = [];
  for (let i = 0; i < n * n; i++) {
    if (i === k) continue;
    const [zi, si] = [Math.floor(i / n), i % n];
    const block = n === 4 && Math.floor(zi / 2) === Math.floor(z / 2) && Math.floor(si / 2) === Math.floor(s / 2);
    if (zi === z || si === s || block) out.push(i);
  }
  return out;
}

/** passende Zeichen einer leeren Zelle bei gegebener Belegung */
export function kandidaten(m: Pick<MiniSudoku, 'n'>, werte: readonly number[], k: number): number[] {
  const belegt = new Set(nachbarn(m.n, k).map((i) => werte[i]));
  return Array.from({ length: m.n }, (_, v) => v).filter((v) => !belegt.has(v));
}

/** bis zu `max` volle Belegungen, die zum Anfang passen */
export function belegungen(m: MiniSudoku, max = 2): number[][] {
  const out: number[][] = [];
  const werte = [...m.start];
  // der Anfang selbst darf keinen Widerspruch haben
  if (werte.some((v, k) => v >= 0 && nachbarn(m.n, k).some((i) => werte[i] === v))) return out;
  const geh = (): void => {
    if (out.length >= max) return;
    const k = werte.indexOf(-1);
    if (k < 0) return void out.push([...werte]);
    for (const v of kandidaten(m, werte, k)) {
      werte[k] = v;
      geh();
      werte[k] = -1;
    }
  };
  geh();
  return out;
}

function loesungen(m: MiniSudoku): Antwort[] {
  return belegungen(m).map((wert) => ({ art: 'sammel', zeichen: 'gitter', wert }));
}

const PAARE: [Form, FormFarbe][] = [['kreis', 'rot'], ['dreieck', 'blau'], ['stern', 'gelb'], ['quadrat', 'gruen'], ['raute', 'lila']];

/** volles Gitter: lateinisches Quadrat (3 × 3) bzw. Sudoku 4 × 4, gemischt durch Tauschen von Zeilen, Spalten, Zeichen */
function vollesGitter(z: Zufall, n: 3 | 4): number[] {
  let g: number[][] = n === 3 ? [[0, 1, 2], [1, 2, 0], [2, 0, 1]] : [[0, 1, 2, 3], [2, 3, 0, 1], [1, 0, 3, 2], [3, 2, 1, 0]];
  const perm = z.mischen(Array.from({ length: n }, (_, i) => i));
  g = g.map((r) => r.map((v) => perm[v]));
  if (n === 3) {
    g = z.mischen(g);
    const sp = z.mischen([0, 1, 2]);
    g = g.map((r) => sp.map((j) => r[j]));
  } else {
    // Zeilen nur innerhalb ihres Bandes und Bänder untereinander tauschen (Blöcke bleiben gültig); ebenso Spalten
    const band = (b: number[][]) => (z.zahl() < 0.5 ? [b[1], b[0]] : b);
    const zeilen = z.zahl() < 0.5 ? [...band(g.slice(2)), ...band(g.slice(0, 2))] : [...band(g.slice(0, 2)), ...band(g.slice(2))];
    g = zeilen;
    const stapel = (a: number, b: number) => (z.zahl() < 0.5 ? [b, a] : [a, b]);
    const sp = z.zahl() < 0.5 ? [...stapel(2, 3), ...stapel(0, 1)] : [...stapel(0, 1), ...stapel(2, 3)];
    g = g.map((r) => sp.map((j) => r[j]));
  }
  return g.flat();
}

function erzeuge(z: Zufall, stufe: number): MiniSudoku {
  const n: 3 | 4 = stufe === 3 ? 4 : 3;
  const leer = stufe === 1 ? 2 : stufe === 2 ? z.ganz(4, 5) : z.ganz(6, 8);
  const zeichen = z.mischen(PAARE).slice(0, n).map(([form, farbe]) => ({ form, farbe }));
  for (;;) {
    const voll = vollesGitter(z, n);
    const start = [...voll];
    for (const k of z.mischen(Array.from({ length: n * n }, (_, i) => i)).slice(0, leer)) start[k] = -1;
    const m = { n, start, zeichen };
    if (belegungen(m).length === 1) return m;
  }
}

/** leichteste leere Zelle: die mit den wenigsten passenden Zeichen (für die Hilfe) */
export function leichteste(m: MiniSudoku): number {
  let best = -1;
  let wenig = Infinity;
  m.start.forEach((v, k) => {
    if (v !== -1) return;
    const c = kandidaten(m, m.start, k).length;
    if (c < wenig) [best, wenig] = [k, c];
  });
  return best;
}

/* ---------- Bild ---------- */

const Z = 72;

function zeichne(m: MiniSudoku, o: ZeichenOptionen): string {
  const W = m.n * Z + 16;
  const werte = o.vorrechnen ? belegungen(m)[0] : o.gewaehlt?.art === 'sammel' && o.gewaehlt.zeichen === 'gitter' ? (o.gewaehlt.wert as number[]) : m.start;
  let s = '';
  const lage = (k: number): [number, number] => [8 + (k % m.n) * Z, 8 + Math.floor(k / m.n) * Z];
  const l = leichteste(m);
  if ((o.hilfe >= 2 || o.vorrechnen) && l >= 0) {
    const [x, y] = lage(l);
    s += `<g data-hilfe="teil"><rect x="4" y="${y - 3}" width="${m.n * Z + 8}" height="${Z}" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/><rect x="${x - 3}" y="4" width="${Z}" height="${m.n * Z + 8}" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/></g>`;
  }
  m.start.forEach((v, k) => {
    const [x, y] = lage(k);
    if (v >= 0) {
      s += stein(x, y, Z - 6, Z - 6) + formPfad(m.zeichen[v].form, x + Z / 2 - 3, y + Z / 2 - 3, 21, FORM_FARBEN[m.zeichen[v].farbe]);
      return;
    }
    const w = werte?.[k] ?? -1;
    s += `<g data-zelle="${k}" role="button" tabindex="0" aria-label="Feld ${k + 1}">`;
    s += `<rect class="zelle-rand" x="${x + 1}" y="${y + 1}" width="${Z - 8}" height="${Z - 8}" rx="10" fill="${PAPIER}" stroke="${HOLZ_KANTE}" stroke-width="2.5"/>`;
    if (w >= 0) s += `<g${o.vorrechnen ? '' : ' data-inhalt=""'}>${formPfad(m.zeichen[w].form, x + Z / 2 - 3, y + Z / 2 - 3, 21, FORM_FARBEN[m.zeichen[w].farbe])}</g>`;
    else s += `<text x="${x + Z / 2 - 3}" y="${y + Z / 2 + 7}" text-anchor="middle" font-size="24" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
    s += '</g>';
  });
  if (o.hilfe >= 3 && !o.vorrechnen && l >= 0) {
    const [x, y] = lage(l);
    s += `<rect data-hilfe="schritt" x="${x - 4}" y="${y - 4}" width="${Z + 2}" height="${Z + 2}" rx="13" fill="none" stroke="${LATERNE_KANTE}" stroke-width="4" stroke-dasharray="8 5"/>`;
  }
  if (m.n === 4) s += `<path d="M${8 + 2 * Z - 3} 4V${m.n * Z + 8}M4 ${8 + 2 * Z - 3}H${m.n * Z + 8}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="4" stroke-linecap="round"/>`;
  return svgHuelle(W, m.n * Z + 16, 'Mini-Sudoku', s);
}

export const MINI_SUDOKU: Format<MiniSudoku> = {
  id: 'mini-sudoku',
  nr: 25,
  version: 1,
  bereich: 'logik',
  faehigkeit: 'L2',
  motor: 'raster',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'fuelleDasGitter',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'raster' }),
  raster: { start: (m) => m.start, zeichen: (m) => m.zeichen.map((z) => ({ art: 'form', form: z.form, farbe: z.farbe }) as Antwort) },
  zeichne,
  /** Lernbeispiel: (1) 3 × 3 mit einer leeren Zelle; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const zeichen = PAARE.slice(0, 3).map(([form, farbe]) => ({ form, farbe }));
    return [{ n: 3, start: [0, 1, 2, 1, 2, 0, 2, 0, -1], zeichen }, aufgabeAus(MINI_SUDOKU, 0, 1).bedingung];
  },
};
