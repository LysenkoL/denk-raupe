import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { LATERNE_KANTE, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE } from '../design/farbe';
import { svgHuelle } from './zaehlen';
import { nest as mulde } from './bildteile';

/**
 * ABC-Reihe (Nr. 55, Engine Reihe, Antwort Wahl eines Buchstabens): Buchstaben in der Reihenfolge des Alphabets, einer
 * fehlt. Großbuchstaben A–Z.
 * Stufe 1: vier Buchstaben hintereinander ab A bis E, die Lücke in der Mitte (A, B, ?, D); drei Perlen.
 * Stufe 2: fünf Buchstaben hintereinander irgendwo im Alphabet, die Lücke irgendwo; vier Perlen.
 * Stufe 3: jeder zweite Buchstabe (A, C, E, ?) oder rückwärts (H, G, ?, E); fünf Buchstaben; vier Perlen.
 * Der Löser probiert alle Schritte im Alphabet (±1, ±2, ±3), die zu den gezeigten Buchstaben passen; alle müssen für die
 * Lücke denselben Buchstaben ergeben, und er muss im Alphabet liegen.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die Nachbarn der Lücke hervor; Stufe 3 zeichnet unter zwei gezeigten Nachbarn einen
 * Bogen mit so vielen Punkten, wie der Schritt im Alphabet weit ist (voll vorwärts, leer rückwärts). Keine Buchstaben.
 */
export interface AbcReihe {
  /** Buchstaben; null = Lücke (genau eine) */
  reihe: (string | null)[];
  wahl: string[];
}

export const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function lueckenBuchstaben(r: readonly (string | null)[]): string[] {
  const out = new Set<string>();
  const l = r.findIndex((x) => x === null);
  for (const d of [-3, -2, -1, 1, 2, 3]) {
    const erste = r.findIndex((x) => x !== null);
    const start = ABC.indexOf(r[erste]!) - erste * d;
    if (r.every((x, i) => x === null || ABC.indexOf(x) === start + i * d)) {
      const k = start + l * d;
      if (k >= 0 && k < 26) out.add(ABC[k]);
    }
  }
  return [...out];
}

function loesungen(a: AbcReihe): Antwort[] {
  if (a.reihe.filter((x) => x === null).length !== 1) return [];
  const v = lueckenBuchstaben(a.reihe);
  return v.length === 1 && a.wahl.includes(v[0]) ? [{ art: 'buchstabe', wert: v[0] }] : [];
}

function erzeuge(z: Zufall, stufe: number): AbcReihe {
  for (;;) {
    const n = stufe === 1 ? 4 : 5;
    const d = stufe < 3 ? 1 : z.eins([2, 2, -1, -2]);
    const start = stufe === 1 ? z.ganz(0, 1) : z.ganz(d > 0 ? 0 : (n - 1) * -d, d > 0 ? 25 - (n - 1) * d : 25);
    const reihe: (string | null)[] = Array.from({ length: n }, (_, i) => ABC[start + i * d]);
    if (reihe.some((x) => x === undefined)) continue;
    const l = stufe === 1 ? z.ganz(1, 2) : z.ganz(0, n - 1);
    const richtig = reihe[l]!;
    reihe[l] = null;
    const k = ABC.indexOf(richtig);
    // falsche: Nachbarn im Alphabet (eins daneben), ein Buchstabe aus der Reihe, einer zwei daneben
    const kandidaten = [ABC[k + 1], ABC[k - 1], ABC[k + 2], ABC[k - 2], ...(reihe.filter((x) => x) as string[])].filter((x) => x && x !== richtig);
    const wahl = [richtig];
    for (const c of z.mischen(kandidaten)) if (wahl.length < (stufe === 1 ? 3 : 4) && !wahl.includes(c)) wahl.push(c);
    const a = { reihe, wahl: z.mischen(wahl) };
    if (loesungen(a).length === 1) return a;
  }
}

/* ---------- Bild ---------- */

const AB = 64;

function zeichne(a: AbcReihe, o: ZeichenOptionen): string {
  const n = a.reihe.length;
  const W = Math.max(n * AB + 16, 312);
  const x0 = (W - n * AB) / 2;
  let s = '';
  const zeig = o.vorrechnen ? loesungen(a)[0] : o.gewaehlt;
  a.reihe.forEach((c, i) => {
    const x = x0 + i * AB + 4;
    if (c) s += `<rect x="${x}" y="${8 + 4}" width="${AB - 8}" height="56" rx="12" fill="${STEIN_KANTE}"/><rect x="${x}" y="8" width="${AB - 8}" height="56" rx="12" fill="${STEIN}"/><text x="${x + (AB - 8) / 2}" y="48" text-anchor="middle" font-size="32" font-weight="800" fill="${TINTE}">${c}</text>`;
    else {
      s += mulde(x, 8, AB - 8, 52);
      if (zeig?.art === 'buchstabe') s += `<text${o.vorrechnen ? '' : ' data-inhalt=""'} x="${x + (AB - 8) / 2}" y="48" text-anchor="middle" font-size="32" font-weight="800" fill="${TINTE}">${zeig.wert}</text>`;
      else s += `<text x="${x + (AB - 8) / 2}" y="47" text-anchor="middle" font-size="30" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
    }
  });
  const l = a.reihe.findIndex((x) => x === null);
  const nachbarn = [l - 1, l + 1].filter((i) => i >= 0 && i < n);
  if (o.hilfe >= 2 || o.vorrechnen)
    for (const i of nachbarn) s = `<rect data-hilfe="teil" x="${x0 + i * AB - 2}" y="2" width="${AB + 4}" height="70" rx="15" fill="#FFE9A8" stroke="${LATERNE_KANTE}" stroke-width="3"/>` + s;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    // Schritt zwischen zwei gezeigten Nachbarn: Bogen mit so vielen Punkten, wie der Schritt im Alphabet weit ist
    const paar = a.reihe.findIndex((x, i) => x !== null && a.reihe[i + 1] !== null && a.reihe[i + 1] !== undefined);
    if (paar >= 0) {
      const d = ABC.indexOf(a.reihe[paar + 1]!) - ABC.indexOf(a.reihe[paar]!);
      const [xa, xb] = [x0 + paar * AB + AB / 2, x0 + (paar + 1) * AB + AB / 2];
      let t = `<path d="M${xa} 76 Q${(xa + xb) / 2} 100 ${xb} 76" fill="none" stroke="${LATERNE_KANTE}" stroke-width="4"/>`;
      for (let j = 0; j < Math.abs(d); j++) t += `<circle cx="${(xa + xb) / 2 + (j - (Math.abs(d) - 1) / 2) * 9}" cy="104" r="3.5" fill="${d > 0 ? TINTE : 'none'}" stroke="${TINTE}" stroke-width="1.5"/>`;
      s += `<g data-hilfe="schritt">${t}</g>`;
    }
  }
  const h = 112;
  return svgHuelle(W, h, 'ABC-Reihe', s);
}

export const ABC_REIHE: Format<AbcReihe> = {
  id: 'abc-reihe',
  nr: 55,
  version: 1,
  bereich: 'woerter',
  faehigkeit: 'W1',
  motor: 'reihe',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcherBuchstabeFehlt',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl: (a) => a.wahl.map((wert) => ({ art: 'buchstabe', wert }) as Antwort),
  zeichne,
  /** Lernbeispiel: (1) A, ?, C – zwei Perlen; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ reihe: ['A', null, 'C'], wahl: ['B', 'D'] }, aufgabeAus(ABC_REIHE, 0, 1).bedingung],
};
