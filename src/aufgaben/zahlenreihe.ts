import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE } from '../design/farbe';
import { gewaehlteZahl, kleinerRaum, nest, svgHuelle } from './zaehlen';

/**
 * Zahlenreihe (Nr. 11, Engine Reihe, Antwort Zahl): Zahlen auf Steinen folgen einer Regel – welche kommt als nächste?
 * Stufe 1: gleicher Schritt +1 bis +3, vier Zahlen, bis 10 (bei Zahlenraum 100 bis 20).
 * Stufe 2: gleicher Schritt vorwärts oder rückwärts (bis ±5, bei 100 auch Zehner), fünf Zahlen, im Zahlenraum.
 * Stufe 3: zwei Schritte im Wechsel (+3, −1, +3, −1 …) mit sechs Zahlen oder Verdoppeln (1, 2, 4, 8 …) mit fünf.
 * Der Löser (docs/LOESER.md, Abschnitt 6) probiert alle Regeln der Klasse: gleicher Schritt, Wechsel zweier Schritte
 * (nur ab fünf Zahlen), Verdoppeln, wachsender Schritt (+1, +2, +3 …). Alle Regeln, die zu den gezeigten Zahlen passen,
 * müssen dieselbe nächste Zahl geben; sie darf nicht unter 0 und nicht über 100 liegen.
 *
 * Hilfe auf dem Bild: Stufe 2 zeichnet Bögen von Stein zu Stein (es gibt einen Schritt); Stufe 3 legt unter jeden
 * Bogen so viele Punkte, wie der Schritt groß ist (voll vorwärts, leer rückwärts; bei Verdoppeln kein Punkt). Keine Zahl.
 */
export interface Zahlenreihe {
  zahlen: number[];
}

/** nächste Zahl nach jeder passenden Regel */
export function fortsetzungen(r: readonly number[]): number[] {
  const out = new Set<number>();
  const d = r.slice(1).map((x, i) => x - r[i]);
  if (d.every((x) => x === d[0])) out.add(r[r.length - 1] + d[0]);
  if (r.length >= 5 && d[0] !== d[1] && d.every((x, i) => x === d[i % 2])) out.add(r[r.length - 1] + d[d.length % 2]);
  if (r[0] > 0 && r.every((x, i) => i === 0 || x === 2 * r[i - 1])) out.add(2 * r[r.length - 1]);
  const dd = d.slice(1).map((x, i) => x - d[i]);
  if (dd.length >= 1 && dd[0] !== 0 && dd.every((x) => x === dd[0])) out.add(r[r.length - 1] + d[d.length - 1] + dd[0]);
  return [...out];
}

function loesungen(z: Zahlenreihe): Antwort[] {
  return fortsetzungen(z.zahlen).filter((x) => x >= 0 && x <= 100).map((wert) => ({ art: 'zahl', wert }));
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Zahlenreihe {
  const g = stufe === 1 ? kleinerRaum(e.zahlenraum) : e.zahlenraum;
  for (;;) {
    let zahlen: number[];
    if (stufe === 1) {
      const d = z.ganz(1, 3);
      const a = z.ganz(0, g - 4 * d);
      zahlen = [0, 1, 2, 3].map((k) => a + k * d);
    } else if (stufe === 2) {
      const d = z.eins([-1, 1]) * (g === 100 && z.zahl() < 0.4 ? z.eins([10, 5]) : z.ganz(1, 5));
      const a = z.ganz(0, g);
      zahlen = [0, 1, 2, 3, 4].map((k) => a + k * d);
    } else if (z.zahl() < 0.65 || g < 20) {
      const [d1, d2] = [z.ganz(-3, 5), z.ganz(-3, 5)];
      if (d1 === d2 || d1 + d2 <= 0 || d1 === 0 || d2 === 0) continue;
      const a = z.ganz(0, g);
      zahlen = [a];
      for (let k = 0; k < 5; k++) zahlen.push(zahlen[k] + (k % 2 ? d2 : d1));
    } else {
      const a = z.eins([1, 2, 3]);
      zahlen = [0, 1, 2, 3, 4].map((k) => a * 2 ** k);
    }
    const l = loesungen({ zahlen });
    if (zahlen.some((x) => x < 0 || x > g) || l.length !== 1 || (l[0] as { wert: number }).wert > g) continue;
    return { zahlen };
  }
}

/* ---------- Bild ---------- */

const AB = 66;

function zeichne(r: Zahlenreihe, o: ZeichenOptionen): string {
  const n = r.zahlen.length;
  const W = (n + 1) * AB + 12;
  const y = 64;
  let s = '';
  const mitte = (k: number) => 8 + k * AB + AB / 2;
  if (o.hilfe >= 2 || o.vorrechnen)
    for (let k = 0; k + 1 < n; k++) s += `<path data-hilfe="teil" d="M${mitte(k) + 6} ${y - 26} Q${mitte(k) + AB / 2} ${y - 60} ${mitte(k + 1) - 6} ${y - 26}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="4"/>`;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const verdoppeln = r.zahlen[0] > 0 && r.zahlen.every((x, i) => i === 0 || x === 2 * r.zahlen[i - 1]);
    for (let k = 0; k + 1 < n && !verdoppeln; k++) {
      const d = r.zahlen[k + 1] - r.zahlen[k];
      const m = Math.min(10, Math.abs(d));
      let t = '';
      for (let j = 0; j < m; j++) {
        const px = mitte(k) + AB / 2 + (j - (m - 1) / 2) * 7;
        t += d > 0 ? `<circle cx="${px}" cy="${y - 50}" r="3" fill="${TINTE}"/>` : `<circle cx="${px}" cy="${y - 50}" r="2.6" fill="${PAPIER}" stroke="${TINTE}" stroke-width="1.4"/>`;
      }
      s += `<g data-hilfe="schritt">${t}</g>`;
    }
  }
  r.zahlen.forEach((x, k) => {
    s += `<rect x="${mitte(k) - 28}" y="${y - 22 + 4}" width="56" height="48" rx="12" fill="${STEIN_KANTE}"/><rect x="${mitte(k) - 28}" y="${y - 22}" width="56" height="48" rx="12" fill="${STEIN}"/>`;
    s += `<text x="${mitte(k)}" y="${y + 11}" text-anchor="middle" font-size="26" font-weight="800" fill="${TINTE}">${x}</text>`;
  });
  const loesung = o.vorrechnen ? (loesungen(r)[0] as { wert: number }).wert : null;
  s += nest(mitte(n) - 30, y - 24, 60, 50, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, y + 40, 'Zahlenreihe', s);
}

export const ZAHLENREIHE: Format<Zahlenreihe> = {
  id: 'zahlenreihe',
  nr: 11,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z5',
  motor: 'reihe',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlKommt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 1, 2, 3, 4; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator mit Schritt größer als 1. */
  beispiele: () => {
    let zweite: Zahlenreihe | null = null;
    for (let s = 0; !zweite; s++) {
      const b = aufgabeAus(ZAHLENREIHE, s * 2654435761, 1).bedingung;
      if (b.zahlen[1] - b.zahlen[0] > 1 && b.zahlen[3] + (b.zahlen[1] - b.zahlen[0]) < 10) zweite = b;
    }
    return [{ zahlen: [1, 2, 3, 4] }, zweite];
  },
};
