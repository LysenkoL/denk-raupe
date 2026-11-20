import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { LATERNE, LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE, WEISS } from '../design/farbe';
import { gewaehlteZahl, nest, schild, svgHuelle } from './zaehlen';

/**
 * Zehner-Paare (Nr. 76, Engine Verbinden, Antwort Zahl): Zahlen auf Steinen; je zwei ergeben zusammen die Zahl auf dem
 * Schild (10, bei Zahlenraum 20 auch 20, bei 100 auch 100). Eine Zahl bleibt ohne Partner – welche?
 * Gezählte Steine lassen sich antippen und markieren (Werkzeug, wie die Fäden der Engine).
 * Stufe 1: fünf Zahlen, Ziel 10.
 * Stufe 2: sieben Zahlen, Ziel 10, 20 oder 100 (Zehner) je nach Zahlenraum.
 * Stufe 3: neun Zahlen, dieselbe Zahl kommt mehrmals vor – der Rest ist eine von ihnen.
 * Der Löser (docs/LOESER.md, Abschnitt 6): alle Arten, die Steine in Paare zu teilen; jede übrige Zahl muss dieselbe sein.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt ein Paar ein; Stufe 3 ein zweites (nur wenn danach noch mindestens drei Steine frei
 * sind, sonst an der ähnlichen Aufgabe).
 */
export interface ZehnerPaare {
  ziel: number;
  zahlen: number[];
}

/** mögliche Reste: Werte, die übrig bleiben können, wenn alle anderen paarweise das Ziel ergeben */
export function reste(z: ZehnerPaare): number[] {
  const out = new Set<number>();
  const n = z.zahlen.length;
  const geh = (frei: number[], rest: number | null) => {
    if (!frei.length) {
      if (rest !== null) out.add(z.zahlen[rest]);
      return;
    }
    const [a, ...weiter] = frei;
    if (rest === null) geh(weiter, a);
    weiter.forEach((b, j) => {
      if (z.zahlen[a] + z.zahlen[b] === z.ziel) geh(weiter.filter((_, k) => k !== j), rest);
    });
  };
  if (n % 2 === 1) geh(Array.from({ length: n }, (_, i) => i), null);
  return [...out];
}

function loesungen(z: ZehnerPaare): Antwort[] {
  return reste(z).map((wert) => ({ art: 'zahl', wert }));
}

/** eine Teilung in Paare (Nummern der Steine), bei der genau ein Stein übrig bleibt – für die Hilfe */
export function paare(z: ZehnerPaare): [number, number][] {
  const geh = (frei: number[], rest: boolean): [number, number][] | null => {
    if (!frei.length) return rest ? [] : null;
    const [a, ...weiter] = frei;
    for (let j = 0; j < weiter.length; j++)
      if (z.zahlen[a] + z.zahlen[weiter[j]] === z.ziel) {
        const r = geh(weiter.filter((_, k) => k !== j), rest);
        if (r) return [[a, weiter[j]], ...r];
      }
    return rest ? null : geh(weiter, true);
  };
  return geh(z.zahlen.map((_, i) => i), false) ?? [];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): ZehnerPaare {
  const ziel = stufe === 1 || e.zahlenraum === 10 ? 10 : e.zahlenraum === 20 ? z.eins([10, 20]) : z.eins([10, 100]);
  const schritt = ziel === 100 ? 10 : 1;
  const n = stufe === 1 ? 5 : stufe === 2 ? 7 : 9;
  for (;;) {
    const zahlen: number[] = [];
    for (let k = 0; k < (n - 1) / 2; k++) {
      const a = z.ganz(1, ziel / schritt - 1) * schritt;
      zahlen.push(a, ziel - a);
    }
    const rest = stufe === 3 ? z.eins(zahlen) : z.ganz(1, ziel / schritt - 1) * schritt;
    zahlen.push(rest);
    const b = { ziel, zahlen: z.mischen(zahlen) };
    // der Rest hat keinen eigenen Partner (sonst bliebe eine andere Zahl übrig)
    if (loesungen(b).length !== 1) continue;
    if (stufe < 3 && zahlen.filter((x) => x === rest).length > 1) continue;
    return b;
  }
}

const schrittVerraet = (z: ZehnerPaare) => z.zahlen.length - 4 < 3;

/* ---------- Bild ---------- */

const ZB = 64;

function zeichne(p: ZehnerPaare, o: ZeichenOptionen): string {
  const je = p.zahlen.length <= 5 ? p.zahlen.length : Math.ceil(p.zahlen.length / 2);
  const W = Math.max(je * (ZB + 8) + 20, 280);
  const x0 = (W - je * (ZB + 8)) / 2 + 4;
  const lage = (i: number): [number, number] => [x0 + (i % je) * (ZB + 8), 92 + Math.floor(i / je) * (ZB + 10)];
  let s = schild(W / 2 - 50, 6, 100, 62) + `<text x="${W / 2}" y="${50}" text-anchor="middle" font-size="34" font-weight="800" fill="${TINTE}">${p.ziel}</text>`;
  const ps = paare(p);
  const zeig = o.vorrechnen ? ps : o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(p)) ? ps.slice(0, 2) : o.hilfe >= 2 ? ps.slice(0, 1) : [];
  zeig.forEach(([a, b], k) => {
    for (const i of [a, b]) {
      const [x, y] = lage(i);
      s += `<rect data-hilfe="${k === 0 || o.vorrechnen ? 'teil' : 'schritt'}" x="${x - 5}" y="${y - 5}" width="${ZB + 10}" height="${ZB + 10}" rx="14" fill="${k === 0 ? LATERNE : 'none'}" stroke="${LATERNE_KANTE}" stroke-width="3.5"${k ? ' stroke-dasharray="8 5"' : ''}/>`;
    }
  });
  p.zahlen.forEach((v, i) => {
    const [x, y] = lage(i);
    s += `<g data-zaehl="${i}"><rect x="${x}" y="${y + 4}" width="${ZB}" height="${ZB - 6}" rx="12" fill="${STEIN_KANTE}"/><g class="ding"><rect x="${x}" y="${y}" width="${ZB}" height="${ZB - 6}" rx="12" fill="${STEIN}"/></g>`;
    s += `<text x="${x + ZB / 2}" y="${y + ZB / 2 + 7}" text-anchor="middle" font-size="26" font-weight="800" fill="${TINTE}">${v}</text>`;
    s += `<g class="zaehl-ring" opacity="0"><rect x="${x - 3}" y="${y - 3}" width="${ZB + 6}" height="${ZB}" rx="14" fill="none" stroke="${LATERNE_KANTE}" stroke-width="3"/><rect x="${x}" y="${y}" width="${ZB}" height="${ZB - 6}" rx="12" fill="${WEISS}" opacity="0.45"/></g>`;
    s += `<rect x="${x}" y="${y}" width="${ZB}" height="${ZB}" fill="${PAPIER}" opacity="0"/></g>`;
  });
  const y = lage(p.zahlen.length - 1)[1] + ZB + 14;
  const loesung = o.vorrechnen ? (loesungen(p)[0] as { wert: number }).wert : null;
  s += nest(W / 2 - 42, y, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, y + 64, 'Zehner-Paare', s);
}

export const ZEHNER_PAARE: Format<ZehnerPaare> = {
  id: 'zehner-paare',
  nr: 76,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z2',
  motor: 'verbinden',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheBleibtUebrig',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) drei Zahlen: 3, 7 und 5; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ ziel: 10, zahlen: [3, 5, 7] }, aufgabeAus(ZEHNER_PAARE, 0, 1).bedingung],
};
