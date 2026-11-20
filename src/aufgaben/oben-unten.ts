import type { Antwort, Form } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, LATERNE, LATERNE_KANTE, TINTE, type FormFarbe } from '../design/farbe';
import { schild, svgHuelle } from './zaehlen';
import { ZELLE, alsAntwort, antwortNest, elemente, formIm, stein, type Element } from './plan';

/**
 * Oben, unten, links, rechts (Nr. 42, Engine Bild, Antwort Wahl): auf einem Feld aus Steinen sitzt die Raupe;
 * auf dem Schild stehen Pfeile. Die Raupe geht für jeden Pfeil einen Stein in seine Richtung – was liegt dort?
 * Stufe 1: 3 × 3 Steine, die Raupe in der Mitte, ein Pfeil.
 * Stufe 2: schwerer wird der Weg – zwei Pfeile, die Raupe an beliebiger Stelle (3 × 3).
 * Stufe 3: schwerer wird die Länge – drei Pfeile auf 4 × 4 Steinen; links und rechts kommen beide vor.
 * Kein Pfeil führt gleich wieder zurück; der Weg bleibt auf dem Feld und endet nicht bei der Raupe.
 * Der Löser geht den Weg der Pfeile ab; verlässt er das Feld oder endet auf einem leeren Stein, gibt es keine Antwort.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die Raupe und den ersten Pfeil warm hervor; Stufe 3 zeigt den ersten Schritt
 * (Rahmen um den Stein nach dem ersten Pfeil). Bei nur einem Pfeil verrät das alles – dann zeigt die Hilfe den
 * Schritt an der ähnlichen Aufgabe (`schrittVerraet`).
 */
export type Richtung = 'oben' | 'unten' | 'links' | 'rechts';
export interface ObenUnten {
  spalten: number;
  zeilen: number;
  /** Zeile für Zeile; auf dem Stein der Raupe null */
  felder: (Element | null)[];
  /** Stein der Raupe (Nummer in `felder`) */
  start: number;
  pfeile: Richtung[];
}

const SCHRITT: Record<Richtung, [number, number]> = { oben: [0, -1], unten: [0, 1], links: [-1, 0], rechts: [1, 0] };
const GEGEN: Record<Richtung, Richtung> = { oben: 'unten', unten: 'oben', links: 'rechts', rechts: 'links' };
export const RICHTUNGEN: Richtung[] = ['oben', 'unten', 'links', 'rechts'];

/** Weg der Raupe: Nummern der Steine nach jedem Pfeil; null, sobald sie das Feld verlässt */
export function weg(b: Pick<ObenUnten, 'spalten' | 'zeilen' | 'start'>, pfeile: readonly Richtung[]): number[] | null {
  let [x, y] = [b.start % b.spalten, Math.floor(b.start / b.spalten)];
  const out: number[] = [];
  for (const p of pfeile) {
    x += SCHRITT[p][0];
    y += SCHRITT[p][1];
    if (x < 0 || y < 0 || x >= b.spalten || y >= b.zeilen) return null;
    out.push(y * b.spalten + x);
  }
  return out;
}

function loesungen(b: ObenUnten): Antwort[] {
  const w = weg(b, b.pfeile);
  if (!w || !w.length) return [];
  const e = b.felder[w[w.length - 1]];
  return e ? [alsAntwort(e)] : [];
}

function erzeuge(z: Zufall, stufe: number): ObenUnten {
  const n = stufe === 3 ? 4 : 3;
  const schritte = stufe;
  for (;;) {
    const start = stufe === 1 ? 4 : z.ganz(0, n * n - 1);
    const pfeile: Richtung[] = [];
    for (let k = 0; k < schritte; k++) {
      const moeglich = RICHTUNGEN.filter((r) => k === 0 || r !== GEGEN[pfeile[k - 1]]);
      pfeile.push(z.eins(moeglich));
    }
    const w = weg({ spalten: n, zeilen: n, start }, pfeile);
    if (!w || w[w.length - 1] === start) continue;
    if (stufe === 3 && !(pfeile.includes('links') || pfeile.includes('rechts'))) continue;
    const felder: (Element | null)[] = elemente(z, n * n);
    felder[start] = null;
    return { spalten: n, zeilen: n, felder, start, pfeile };
  }
}

/** Wahl: Lösung; Ende mit vertauschtem links/rechts, mit vertauschtem oben/unten; Stein davor; dann Nachbarn */
function wahl(b: ObenUnten, z: Zufall): Antwort[] {
  const l = loesungen(b)[0];
  const anzahl = b.pfeile.length === 1 ? 3 : 4;
  const tausch = (paar: [Richtung, Richtung]) => b.pfeile.map((p) => (p === paar[0] ? paar[1] : p === paar[1] ? paar[0] : p));
  const ende = (pf: Richtung[]) => {
    const w = weg(b, pf);
    const e = w && w.length ? b.felder[w[w.length - 1]] : null;
    return e ? alsAntwort(e) : null;
  };
  const kandidaten = [
    ende(tausch(['links', 'rechts'])),
    ende(tausch(['oben', 'unten'])),
    ende(b.pfeile.slice(0, -1)),
    ...RICHTUNGEN.map((r) => ende([...b.pfeile, r])),
    ...z.mischen(b.felder).map((e) => (e ? alsAntwort(e) : null)),
  ];
  const out: Antwort[] = [l];
  for (const k of kandidaten) if (k && out.length < anzahl && !out.some((o) => gleich(o, k))) out.push(k);
  return z.mischen(out);
}

/** Hilfe Stufe 3 (erster Schritt) verrät bei einem einzigen Pfeil die Lösung */
const schrittVerraet = (b: ObenUnten) => b.pfeile.length < 2;

/* ---------- Bild ---------- */

/** Pfeil auf dem Schild: dunkel, dick, mit Spitze */
export function pfeilZeichen(cx: number, cy: number, r: Richtung, s = 18): string {
  const w = { rechts: 0, unten: 90, links: 180, oben: 270 }[r];
  return `<g data-zeichen="pfeil-${r}" transform="rotate(${w} ${cx} ${cy})"><path d="M${cx - s} ${cy}H${cx + s * 0.55}" stroke="${TINTE}" stroke-width="7" stroke-linecap="round"/><path d="M${cx + s * 0.05} ${cy - s * 0.6}L${cx + s} ${cy}L${cx + s * 0.05} ${cy + s * 0.6}Z" fill="${TINTE}" stroke="${TINTE}" stroke-width="3" stroke-linejoin="round"/></g>`;
}

/** Kopf der Raupe aus Samt (wie die Raupe auf dem Ast), ohne Umriss */
export function raupenKopf(cx: number, cy: number, r = 22): string {
  const c = FIGUR_TOKEN.raupe;
  const k = FIGUR_TOKEN['raupe-kante'];
  return (
    `<circle cx="${cx}" cy="${cy + r * 0.12}" r="${r}" fill="${k}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>` +
    `<ellipse cx="${cx - r * 0.35}" cy="${cy - r * 0.4}" rx="${r * 0.4}" ry="${r * 0.26}" fill="${FIGUR_TOKEN['raupe-licht']}" opacity="0.8"/>` +
    `<ellipse cx="${cx - r * 0.32}" cy="${cy - r * 0.05}" rx="${r * 0.19}" ry="${r * 0.22}" fill="${FIGUR_TOKEN.auge}"/><ellipse cx="${cx + r * 0.32}" cy="${cy - r * 0.05}" rx="${r * 0.19}" ry="${r * 0.22}" fill="${FIGUR_TOKEN.auge}"/>` +
    `<circle cx="${cx - r * 0.3}" cy="${cy}" r="${r * 0.11}" fill="${TINTE}"/><circle cx="${cx + r * 0.34}" cy="${cy}" r="${r * 0.11}" fill="${TINTE}"/>` +
    `<path d="M${cx - r * 0.28} ${cy + r * 0.42} Q${cx} ${cy + r * 0.62} ${cx + r * 0.28} ${cy + r * 0.42}" fill="none" stroke="${k}" stroke-width="2.6" stroke-linecap="round"/>`
  );
}

const KOPF = 86;
const PFEIL_AB = 48;

/**
 * Schild mit den Pfeilen oben links, daneben das Nest, darunter das Feld mit der Raupe.
 * `hilfe` 2: Raupe und erster Pfeil hervorgehoben; 3: dazu der Stein nach dem ersten Pfeil umrahmt.
 * `vorrechnen`: der ganze Weg umrahmt, im Nest die Lösung.
 */
function zeichne(b: ObenUnten, o: ZeichenOptionen): string {
  const schildB = 24 + b.pfeile.length * PFEIL_AB;
  const W = Math.max(b.spalten * ZELLE + 14, schildB + 16 + 70);
  const x0 = (W - b.spalten * ZELLE + 6) / 2;
  const y0 = KOPF;
  const H = y0 + b.zeilen * ZELLE + 10;
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  s += schild(8, 8, schildB, 62);
  if (hell) s += `<rect data-hilfe="teil" x="${8 + 12 + 2}" y="14" width="${PFEIL_AB - 4}" height="50" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  b.pfeile.forEach((p, k) => (s += pfeilZeichen(8 + 12 + PFEIL_AB / 2 + k * PFEIL_AB, 39, p)));
  s += antwortNest(8 + schildB + 10, 10, o.vorrechnen ? loesungen(b)[0] : o.gewaehlt, !!o.vorrechnen);
  const lage = (i: number): [number, number] => [x0 + (i % b.spalten) * ZELLE, y0 + Math.floor(i / b.spalten) * ZELLE];
  const w = weg(b, b.pfeile) ?? [];
  const umrahmt = o.vorrechnen ? w : o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(b)) ? w.slice(0, 1) : [];
  const ring = (i: number, art: 'teil' | 'schritt') => {
    const [x, y] = lage(i);
    return `<rect data-hilfe="${art}" x="${x - 3}" y="${y - 3}" width="${ZELLE}" height="${ZELLE + 2}" rx="13" fill="none" stroke="${LATERNE_KANTE}" stroke-width="5"${art === 'schritt' ? ' stroke-dasharray="9 6"' : ''}/>`;
  };
  b.felder.forEach((e, i) => {
    const [x, y] = lage(i);
    s += stein(x, y, ZELLE - 6, ZELLE - 6);
    s += e ? formIm(x + ZELLE / 2 - 3, y + ZELLE / 2 - 3, e) : raupenKopf(x + ZELLE / 2 - 3, y + ZELLE / 2 - 3);
  });
  umrahmt.forEach((i) => (s += ring(i, o.vorrechnen ? 'teil' : 'schritt')));
  if (hell) s += ring(b.start, 'teil');
  return svgHuelle(W, H, 'Oben, unten, links, rechts', s);
}

export const OBEN_UNTEN: Format<ObenUnten> = {
  id: 'oben-unten',
  nr: 42,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R4',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wasLiegtDort',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl,
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) eine Reihe aus drei Steinen, ein Pfeil nach rechts; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const e = (form: Form, farbe: FormFarbe): Element => ({ form, farbe });
    return [
      { spalten: 3, zeilen: 1, felder: [e('kreis', 'rot'), null, e('stern', 'blau')], start: 1, pfeile: ['rechts'] },
      aufgabeAus(OBEN_UNTEN, 0, 1).bedingung,
    ];
  },
};
