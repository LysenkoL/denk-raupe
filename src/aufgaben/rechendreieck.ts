import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, LATERNE, LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE } from '../design/farbe';
import { gewaehlteZahl, kleinerRaum, nest, svgHuelle } from './zaehlen';

/**
 * Rechendreieck (Nr. 8, Engine Raster mit einer leeren Zelle): in den drei Ecken innen liegen Plättchen-Zahlen; an jeder
 * Seite außen steht die Summe der zwei Ecken daneben. Eine Zahl fehlt.
 * Stufe 1: alle Ecken stehen da, eine Seite fehlt (Summe); bis 10 (bei Zahlenraum 100 bis 20).
 * Stufe 2: eine Ecke fehlt, ihre zwei Seiten und die anderen Ecken stehen da (Ergänzen); im ganzen Zahlenraum.
 * Stufe 3: nur die drei Seiten stehen da – gesucht eine Ecke (zwei Seiten zusammen, minus die dritte, halbiert).
 * Der Löser kennt nur die gezeigten Zahlen: er probiert jede Zahl für die erste unbekannte Ecke und rechnet die anderen
 * über die Seiten aus; jede gezeigte Zahl muss stimmen. Genau ein Wert der gefragten Stelle muss übrig bleiben.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die zwei Zahlen hervor, die neben der Lücke liegen (Seite und Ecke bzw. zwei Ecken);
 * Stufe 3 zeichnet die Rechnung als Bogen von den zwei Zahlen zur Lücke – ohne Zahl.
 */
export type Platz = 'a' | 'b' | 'c' | 'ab' | 'bc' | 'ca';
export interface Rechendreieck {
  /** gezeigte Zahlen; die gefragte Stelle fehlt hier */
  zahlen: Partial<Record<Platz, number>>;
  frage: Platz;
}

const ECKEN: ('a' | 'b' | 'c')[] = ['a', 'b', 'c'];
const SEITEN: Record<'ab' | 'bc' | 'ca', ['a' | 'b' | 'c', 'a' | 'b' | 'c']> = { ab: ['a', 'b'], bc: ['b', 'c'], ca: ['c', 'a'] };
const GRENZE = 200;

/** alle Belegungen der Ecken, die zu den gezeigten Zahlen passen */
export function belegungen(d: Rechendreieck): Record<'a' | 'b' | 'c', number>[] {
  const out: Record<'a' | 'b' | 'c', number>[] = [];
  const pruefe = (e: Record<'a' | 'b' | 'c', number>) =>
    ECKEN.every((k) => d.zahlen[k] === undefined || d.zahlen[k] === e[k]) &&
    (Object.keys(SEITEN) as (keyof typeof SEITEN)[]).every((s) => d.zahlen[s] === undefined || d.zahlen[s] === e[SEITEN[s][0]] + e[SEITEN[s][1]]) &&
    ECKEN.every((k) => e[k] >= 0);
  // Ecke a: bekannt oder durchprobiert; b und c daraus über Seiten, sonst durchprobiert
  const as = d.zahlen.a !== undefined ? [d.zahlen.a] : Array.from({ length: GRENZE + 1 }, (_, i) => i);
  for (const a of as) {
    const bs = d.zahlen.b !== undefined ? [d.zahlen.b] : d.zahlen.ab !== undefined ? [d.zahlen.ab - a] : Array.from({ length: GRENZE + 1 }, (_, i) => i);
    for (const b of bs) {
      const c = d.zahlen.c !== undefined ? d.zahlen.c : d.zahlen.ca !== undefined ? d.zahlen.ca - a : d.zahlen.bc !== undefined ? d.zahlen.bc - b : null;
      const cs = c !== null ? [c] : Array.from({ length: GRENZE + 1 }, (_, i) => i);
      for (const cc of cs) if (pruefe({ a, b, c: cc })) out.push({ a, b, c: cc });
    }
  }
  return out;
}

const wertAn = (e: Record<'a' | 'b' | 'c', number>, p: Platz) => (p.length === 1 ? e[p as 'a'] : e[SEITEN[p as 'ab'][0]] + e[SEITEN[p as 'ab'][1]]);

function loesungen(d: Rechendreieck): Antwort[] {
  if (d.zahlen[d.frage] !== undefined) return [];
  const werte = [...new Set(belegungen(d).map((e) => wertAn(e, d.frage)))];
  return werte.slice(0, 3).map((wert) => ({ art: 'zahl', wert }));
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Rechendreieck {
  const g = stufe === 1 ? kleinerRaum(e.zahlenraum) : e.zahlenraum;
  for (;;) {
    const ecken = { a: z.ganz(0, Math.floor(g / 2)), b: z.ganz(0, Math.floor(g / 2)), c: z.ganz(0, Math.floor(g / 2)) };
    const alle: Record<Platz, number> = { ...ecken, ab: ecken.a + ecken.b, bc: ecken.b + ecken.c, ca: ecken.c + ecken.a };
    if (Math.max(...Object.values(alle)) > g || Math.max(...Object.values(alle)) < g * 0.5) continue;
    let frage: Platz;
    let zahlen: Partial<Record<Platz, number>>;
    if (stufe === 1) {
      frage = z.eins(['ab', 'bc', 'ca'] as const);
      zahlen = { a: alle.a, b: alle.b, c: alle.c };
    } else if (stufe === 2) {
      frage = z.eins(ECKEN);
      zahlen = { ...alle };
      delete zahlen[frage];
      // die gegenüberliegende Seite weglassen: gerechnet wird über eine Nachbarseite
      const gegen = ({ a: 'bc', b: 'ca', c: 'ab' } as const)[frage];
      delete zahlen[gegen];
    } else {
      frage = z.eins(ECKEN);
      zahlen = { ab: alle.ab, bc: alle.bc, ca: alle.ca };
    }
    return { zahlen, frage };
  }
}

/* ---------- Bild ---------- */

const W = 320;
const ECKE_LAGE: Record<'a' | 'b' | 'c', [number, number]> = { a: [160, 92], b: [242, 222], c: [78, 222] };
const SEITE_LAGE: Record<'ab' | 'bc' | 'ca', [number, number]> = { ab: [262, 116], bc: [160, 300], ca: [58, 116] };

/** gezeigte Zahlen neben der Lücke, aus denen gerechnet wird (für die Hilfe): bei einer Seite ihre zwei Ecken, bei einer Ecke
 * ihre zwei Seiten und – wo sie dasteht – die Ecke gegenüber einer dieser Seiten */
export function nachbarn(d: Rechendreieck): Platz[] {
  const da = (p: Platz) => d.zahlen[p] !== undefined;
  if (d.frage.length === 2) return SEITEN[d.frage as 'ab'].filter(da);
  const seiten = (Object.keys(SEITEN) as ('ab' | 'bc' | 'ca')[]).filter((s) => SEITEN[s].includes(d.frage as 'a') && da(s));
  const ecken = seiten.map((s) => SEITEN[s].find((k) => k !== d.frage)!).filter(da);
  return [...seiten, ...ecken].slice(0, 2);
}

function zeichne(d: Rechendreieck, o: ZeichenOptionen): string {
  let s = '';
  s += `<path d="M160 22 L300 270 L20 270 Z" fill="${FIGUR_TOKEN.nest}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="5" stroke-linejoin="round"/>`;
  s += `<path d="M160 70 L252 236 L68 236 Z" fill="${PAPIER}" opacity="0.6"/>`;
  const hilfe = o.hilfe >= 2 || !!o.vorrechnen ? nachbarn(d) : [];
  const lage = (p: Platz): [number, number] => (p.length === 1 ? ECKE_LAGE[p as 'a'] : SEITE_LAGE[p as 'ab']);
  for (const p of hilfe) {
    const [x, y] = lage(p);
    s += `<circle data-hilfe="teil" cx="${x}" cy="${y}" r="36" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  }
  if (o.hilfe >= 3 && !o.vorrechnen && hilfe.length) {
    const [fx, fy] = lage(d.frage);
    s += `<g data-hilfe="schritt">${hilfe.map((p) => {
      const [x, y] = lage(p);
      return `<path d="M${x} ${y} Q${(x + fx) / 2 + 20} ${(y + fy) / 2 - 20} ${fx} ${fy}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="5" stroke-dasharray="8 6"/>`;
    }).join('')}</g>`;
  }
  const loesung = o.vorrechnen ? (loesungen(d)[0] as { wert: number }).wert : null;
  for (const p of ['a', 'b', 'c', 'ab', 'bc', 'ca'] as Platz[]) {
    const [x, y] = lage(p);
    const v = d.zahlen[p];
    if (p === d.frage) s += nest(x - 38, y - 26, 76, 48, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
    else if (v !== undefined) {
      const ecke = p.length === 1;
      s += ecke
        ? `<circle cx="${x}" cy="${y + 3}" r="27" fill="${STEIN_KANTE}"/><circle cx="${x}" cy="${y}" r="27" fill="${STEIN}"/>`
        : `<rect x="${x - 32}" y="${y - 22}" width="64" height="44" rx="10" fill="${PAPIER}" stroke="${FIGUR_TOKEN['ast-kante']}" stroke-width="2.5"/>`;
      s += `<text x="${x}" y="${y + 10}" text-anchor="middle" font-size="27" font-weight="800" fill="${TINTE}">${v}</text>`;
    }
  }
  return svgHuelle(W, 330, 'Rechendreieck', s);
}

export const RECHENDREIECK: Format<Rechendreieck> = {
  id: 'rechendreieck',
  nr: 8,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'raster',
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
  /** Lernbeispiel: (1) Ecken 1, 2, 0 – gesucht die Seite 1 + 2; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ zahlen: { a: 1, b: 2, c: 0 }, frage: 'ab' }, aufgabeAus(RECHENDREIECK, 0, 1).bedingung],
};
