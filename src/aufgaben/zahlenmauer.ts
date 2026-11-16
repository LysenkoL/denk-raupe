import type { Antwort } from '../perlen/antwort';
import type { Format } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Zahlenmauer (Raster): jeder Stein = Summe der beiden Steine darunter; ein Stein fehlt.
 * Stufe 1: 3 Reihen bis 10, fehlender Stein oben oder in der Mitte (addieren).
 * Stufe 2: 3 Reihen bis 20, auch unten (ergänzen). Stufe 3: 4 Reihen bis 20, überall.
 */
export interface Mauer {
  /** Reihen von unten; Stein (r, i) = Stein (r-1, i) + Stein (r-1, i+1) */
  reihen: number[][];
  /** fehlender Stein */
  fehlt: [number, number];
}

const GRENZE = [0, 10, 20, 20];
const HOEHE = [0, 3, 3, 4];

function baue(basis: number[]): number[][] {
  const r = [basis];
  while (r[r.length - 1].length > 1) {
    const u = r[r.length - 1];
    r.push(u.slice(1).map((v, i) => u[i] + v));
  }
  return r;
}

function erzeuge(z: Zufall, stufe: number): Mauer {
  const n = HOEHE[stufe];
  const grenze = GRENZE[stufe];
  for (;;) {
    const basis = Array.from({ length: n }, () => z.ganz(stufe === 1 ? 0 : 1, n === 4 ? 4 : stufe === 1 ? 4 : 8));
    const reihen = baue(basis);
    if (reihen[n - 1][0] > grenze || reihen[n - 1][0] < 4) continue;
    const plaetze: [number, number][] = [];
    reihen.forEach((reihe, r) => reihe.forEach((_, i) => (stufe > 1 || r > 0) && plaetze.push([r, i])));
    return { reihen, fehlt: z.eins(plaetze) };
  }
}

/** Löser: probiert jede Zahl 0–100 für den fehlenden Stein und prüft ALLE Steine der Mauer */
function loesungen(m: Mauer): Antwort[] {
  const out: Antwort[] = [];
  const [fr, fi] = m.fehlt;
  for (let v = 0; v <= 100; v++) {
    const r = m.reihen.map((reihe, ri) => reihe.map((x, i) => (ri === fr && i === fi ? v : x)));
    let ok = true;
    for (let ri = 1; ri < r.length && ok; ri++) for (let i = 0; i < r[ri].length; i++) if (r[ri][i] !== r[ri - 1][i] + r[ri - 1][i + 1]) ok = false;
    if (ok) out.push({ art: 'zahl', wert: v });
  }
  return out;
}

/** Steine, von denen die Antwort abhängt: zwei Steine darunter, sonst Stein darüber und Nachbar */
export function abhaengig(m: Mauer): { steine: [number, number][]; rechnung: 'plus' | 'ergaenzen' } {
  const [r, i] = m.fehlt;
  if (r > 0) return { steine: [[r - 1, i], [r - 1, i + 1]], rechnung: 'plus' };
  const breite = m.reihen[0].length;
  if (i + 1 < breite) return { steine: [[1, i], [0, i + 1]], rechnung: 'ergaenzen' };
  return { steine: [[1, i - 1], [0, i - 1]], rechnung: 'ergaenzen' };
}

function gleichung(m: Mauer, mitLoesung: boolean): string {
  const { steine, rechnung } = abhaengig(m);
  const w = (s: [number, number]) => m.reihen[s[0]][s[1]];
  const x = mitLoesung ? String(m.reihen[m.fehlt[0]][m.fehlt[1]]) : '?';
  return rechnung === 'plus' ? `${w(steine[0])} + ${w(steine[1])} = ${x}` : `${x} + ${w(steine[1])} = ${w(steine[0])}`;
}

const SW = 66;
const SH = 42;

function zeichne(m: Mauer, o: { hilfe: number; gewaehlt: Antwort | null; vorrechnen?: boolean }): string {
  const n = m.reihen.length;
  const W = n * SW + 8;
  const H = n * SH + 8 + (o.hilfe >= 2 || o.vorrechnen ? 56 : 0);
  const { steine } = abhaengig(m);
  const markiert = (r: number, i: number) => (o.hilfe >= 2 || o.vorrechnen) && steine.some(([a, b]) => a === r && b === i);
  let s = '';
  m.reihen.forEach((reihe, r) => {
    reihe.forEach((v, i) => {
      const x = 4 + r * (SW / 2) + i * SW;
      const y = 4 + (n - 1 - r) * SH;
      const fehlt = r === m.fehlt[0] && i === m.fehlt[1];
      const fill = fehlt ? '#FDEEDC' : markiert(r, i) ? '#FFF3B0' : '#FFFFFF';
      const stroke = fehlt ? '#E8893A' : '#1B2033';
      s += `<rect x="${x + 2}" y="${y + 2}" width="${SW - 4}" height="${SH - 4}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${markiert(r, i) ? 4 : 2.5}"${fehlt ? ' stroke-dasharray="7 5"' : ''}/>`;
      let text = String(v);
      let farbe = '#1F2421';
      if (fehlt) {
        if (o.vorrechnen) text = String(v);
        else if (o.gewaehlt?.art === 'zahl') ((text = String(o.gewaehlt.wert)), (farbe = '#8A4B12'));
        else ((text = '?'), (farbe = '#8A4B12'));
      }
      s += `<text x="${x + SW / 2}" y="${y + SH / 2 + 8}" text-anchor="middle" font-size="23" font-weight="800" fill="${farbe}">${text}</text>`;
    });
  });
  if (o.hilfe >= 3 || o.vorrechnen) {
    s += `<text x="${W / 2}" y="${n * SH + 46}" text-anchor="middle" font-size="26" font-weight="800" fill="#2F6B3A">${gleichung(m, !!o.vorrechnen)}</text>`;
  } else if (o.hilfe === 2) {
    s += `<text x="${W / 2}" y="${n * SH + 46}" text-anchor="middle" font-size="18" font-weight="700" fill="#5B655F">Schau auf die gelben Steine.</text>`;
  }
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Zahlenmauer">${s}</svg>`;
}

export const ZAHLENMAUER: Format<Mauer> = {
  id: 'zahlenmauer',
  version: 1,
  auftrag: 'Welche Zahl fehlt?',
  stufen: 3,
  eingabe: 'zahl',
  erzeuge,
  loesungen,
  zeichne,
  beispiel: () => ({ reihen: baue([1, 2]), fehlt: [1, 0] }),
};
