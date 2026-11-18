import { TINTE } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, Zahlenraum } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Zahlenmauer (Raster): jeder Stein = Summe der beiden Steine darunter; ein Stein fehlt.
 * Die Stufe bestimmt den Bau der Mauer, der Zahlenraum der Eltern die größte Zahl:
 * Stufe 1: 3 Reihen, fehlender Stein oben oder in der Mitte (addieren);
 *          Zahlen eine Stufe unter dem Zahlenraum (bis 20 → bis 10, bis 100 → bis 20, bis 10 bleibt bis 10).
 * Stufe 2: 3 Reihen, fehlender Stein auch unten (ergänzen); Zahlen im ganzen Zahlenraum.
 * Stufe 3: 4 Reihen, fehlender Stein überall; Zahlen im ganzen Zahlenraum.
 * Bis 20 (Standard) sind die Mauern genau die von Version 1.
 */
export interface Mauer {
  /** Reihen von unten; Stein (r, i) = Stein (r-1, i) + Stein (r-1, i+1) */
  reihen: number[][];
  /** fehlender Stein */
  fehlt: [number, number];
  /** größte Zahl, die in dieser Mauer stehen darf (aus Stufe und Zahlenraum); bestimmt die Eingabe */
  grenze: Zahlenraum;
}

const HOEHE = [0, 3, 3, 4];

/** größte Zahl der Mauer: Stufe 1 eine Stufe unter dem Zahlenraum, sonst der Zahlenraum selbst */
export function grenzeFuer(stufe: number, zahlenraum: Zahlenraum): Zahlenraum {
  if (stufe > 1) return zahlenraum;
  return zahlenraum === 100 ? 20 : 10;
}

/**
 * größte Zahl der unteren Reihe je Höhe und Grenze. Für 3 Reihen bis 10 und bis 20 und für 4 Reihen bis 20
 * sind es die Werte von Version 1 – so bleiben die Mauern bis 20 gleich.
 */
const BASIS_MAX: Record<number, Record<Zahlenraum, number>> = {
  3: { 10: 4, 20: 8, 100: 40 },
  4: { 10: 3, 20: 4, 100: 20 },
};

function baue(basis: number[]): number[][] {
  const r = [basis];
  while (r[r.length - 1].length > 1) {
    const u = r[r.length - 1];
    r.push(u.slice(1).map((v, i) => u[i] + v));
  }
  return r;
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Mauer {
  const n = HOEHE[stufe];
  const grenze = grenzeFuer(stufe, e.zahlenraum);
  const max = BASIS_MAX[n][grenze];
  for (;;) {
    const basis = Array.from({ length: n }, () => z.ganz(stufe === 1 ? 0 : 1, max));
    const reihen = baue(basis);
    if (reihen[n - 1][0] > grenze || reihen[n - 1][0] < 4) continue;
    const plaetze: [number, number][] = [];
    reihen.forEach((reihe, r) => reihe.forEach((_, i) => (stufe > 1 || r > 0) && plaetze.push([r, i])));
    return { reihen, fehlt: z.eins(plaetze), grenze };
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
      let farbe = TINTE;
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
  nr: 7,
  /** 2: Zahlenraum kommt aus der Einstellung, Mauer kennt ihre Grenze */
  version: 2,
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
  eingabe: (m) => ({ art: 'zahl', max: m.grenze }),
  zeichne,
  /**
   * Lernbeispiel: vom Kleinsten zur gewöhnlichen Mauer der Stufe 1 (Steine und größte Zahl wachsen).
   * Alle Antworten einstellig: eine Ziffernperle genügt.
   */
  beispiele: () => [
    // zwei Reihen, 1 + 1: eine einzige Rechnung
    { reihen: baue([1, 1]), fehlt: [1, 0], grenze: 10 },
    // drei Reihen aus Einsen, der oberste Stein fehlt
    { reihen: baue([1, 1, 1]), fehlt: [2, 0], grenze: 10 },
    // gewöhnliche Mauer der Stufe 1: ein Stein in der Mitte fehlt
    { reihen: baue([1, 3, 2]), fehlt: [1, 1], grenze: 10 },
  ],
};
