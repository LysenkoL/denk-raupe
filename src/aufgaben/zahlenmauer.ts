import { LATERNE, LATERNE_KANTE, PAPIER, TINTE, TINTE_LEISE } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Einstellung, Format, Zahlenraum } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Zahlenmauer (Raster): jeder Stein = Summe der beiden Steine darunter; ein Stein fehlt.
 * Die Stufe bestimmt den Bau der Mauer, der Zahlenraum der Eltern die größte Zahl.
 * Stufe 1: 3 Reihen, fehlender Stein oben oder in der Mitte – nur addieren;
 *          Zahlen eine Stufe unter dem Zahlenraum (bis 20 → bis 10, bis 100 → bis 20, bis 10 bleibt bis 10).
 * Stufe 2: schwerer wird die Rechnung – der fehlende Stein kann auch unten stehen (ergänzen statt addieren),
 *          und die Zahlen gehen bis zum ganzen Zahlenraum.
 * Stufe 3: schwerer wird der Bau – 4 Reihen, mehr Steine zum Überblicken, fehlender Stein überall;
 *          Zahlen im ganzen Zahlenraum.
 * Bis 20 (Standard) sind die Mauern genau die von Version 1.
 *
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“): Stufe 2 hebt die zwei Steine hervor, von denen die Antwort
 * abhängt, die übrigen gehen in den Halbschatten; Stufe 3 legt dazu ihre Summe als Punkte, in Fünfern und
 * Zehnern wie auf dem Zwanzigerfeld. Kein Text im Bild, keine Zahl der Lösung.
 */
export interface Mauer {
  /** Reihen von unten; Stein (r, i) = Stein (r-1, i) + Stein (r-1, i+1) */
  reihen: number[][];
  /** fehlender Stein */
  fehlt: [number, number];
  /** größte Zahl, die in dieser Mauer stehen darf (aus Stufe und Zahlenraum); nur für den Generator, nicht für die Eingabe */
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

/** Rechnung zum Vorrechnen (nur an der ähnlichen Aufgabe und im Lernbeispiel, nie an der eigenen) */
function gleichung(m: Mauer, mitLoesung: boolean): string {
  const { steine, rechnung } = abhaengig(m);
  const w = (s: [number, number]) => m.reihen[s[0]][s[1]];
  const x = mitLoesung ? String(m.reihen[m.fehlt[0]][m.fehlt[1]]) : '?';
  return rechnung === 'plus' ? `${w(steine[0])} + ${w(steine[1])} = ${x}` : `${x} + ${w(steine[1])} = ${w(steine[0])}`;
}

const SW = 66;
const SH = 42;

/** Art eines Punktes der Hilfe Stufe 3: Punkt des ersten oder zweiten hervorgehobenen Steins, oder leer (fehlt noch) */
export type PunktArt = 'erster' | 'zweiter' | 'leer';

/**
 * Punkte der Hilfe Stufe 3, in der Reihenfolge des Legens (Zehnerreihen, `punktLage`).
 * Addieren: erst die Punkte des einen Steins, dann die des anderen – zusammen ihre Summe.
 * Ergänzen: so viele Punkte wie der Stein darüber; die des Nachbarn voll, die übrigen leer.
 * Die Lösung steht nie als Zahl da: das Kind zählt die Punkte (in Fünfern) selbst.
 */
export function hilfePunkte(m: Mauer): PunktArt[] {
  const { steine, rechnung } = abhaengig(m);
  const w = (s: [number, number]) => m.reihen[s[0]][s[1]];
  const reihe = (n: number, art: PunktArt): PunktArt[] => Array.from({ length: n }, () => art);
  if (rechnung === 'plus') return [...reihe(w(steine[0]), 'erster'), ...reihe(w(steine[1]), 'zweiter')];
  const nachbar = w(steine[1]);
  return [...reihe(nachbar, 'zweiter'), ...reihe(w(steine[0]) - nachbar, 'leer')];
}

/** Abstand der Punkte; Lücke nach je fünf Punkten einer Reihe und nach je fünf Reihen (wie Zwanzigerfeld/Hunderterfeld) */
const PUNKT = 17;
const LUECKE = 10;
export const PUNKTE_JE_REIHE = 10;

/** Lage des k-ten Punktes im Punktefeld: Reihe und Spalte, Mittelpunkt relativ zur linken oberen Ecke */
export function punktLage(k: number): { reihe: number; spalte: number; x: number; y: number } {
  const reihe = Math.floor(k / PUNKTE_JE_REIHE);
  const spalte = k % PUNKTE_JE_REIHE;
  return {
    reihe,
    spalte,
    x: spalte * PUNKT + (spalte >= 5 ? LUECKE : 0) + PUNKT / 2,
    y: reihe * PUNKT + (reihe >= 5 ? LUECKE : 0) + PUNKT / 2,
  };
}

function punktefeld(m: Mauer, breite: number, oben: number): { svg: string; hoehe: number } {
  const punkte = hilfePunkte(m);
  const reihen = Math.max(1, Math.ceil(punkte.length / PUNKTE_JE_REIHE));
  const feldB = PUNKTE_JE_REIHE * PUNKT + LUECKE;
  const feldH = reihen * PUNKT + (reihen > 5 ? LUECKE : 0);
  const x0 = (breite - feldB) / 2;
  const y0 = oben + 8;
  let s = `<rect data-hilfe="schritt" x="${x0 - 8}" y="${oben}" width="${feldB + 16}" height="${feldH + 16}" rx="12" fill="${PAPIER}" stroke="${LATERNE_KANTE}" stroke-width="2.5"/>`;
  punkte.forEach((art, k) => {
    const p = punktLage(k);
    const fill = art === 'erster' ? TINTE_LEISE : art === 'zweiter' ? LATERNE_KANTE : PAPIER;
    s += `<circle data-punkt="${art}" cx="${x0 + p.x}" cy="${y0 + p.y}" r="6" fill="${fill}" stroke="${TINTE_LEISE}" stroke-width="2"/>`;
  });
  return { svg: s, hoehe: feldH + 16 };
}

/**
 * `hilfe` 2: die zwei Steine, von denen die Antwort abhängt, bekommen einen warmen Rahmen (data-hilfe="teil"),
 * die übrigen gehen in den Halbschatten (data-hilfe="schatten"); der fehlende Stein bleibt, wie er ist.
 * `hilfe` 3: dazu ihre Summe als Punkte unter der Mauer (data-hilfe="schritt").
 * `vorrechnen` (ähnliche Aufgabe, Lernbeispiel): Steine hervorgehoben, Rechnung mit Ergebnis.
 */
function zeichne(m: Mauer, o: { hilfe: number; gewaehlt: Antwort | null; vorrechnen?: boolean }): string {
  const n = m.reihen.length;
  const W = n * SW + 8;
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const { steine } = abhaengig(m);
  const markiert = (r: number, i: number) => hervor && steine.some(([a, b]) => a === r && b === i);
  let s = '';
  m.reihen.forEach((reihe, r) => {
    reihe.forEach((v, i) => {
      const x = 4 + r * (SW / 2) + i * SW;
      const y = 4 + (n - 1 - r) * SH;
      const fehlt = r === m.fehlt[0] && i === m.fehlt[1];
      const teil = markiert(r, i);
      const schatten = hervor && !fehlt && !teil;
      const fill = fehlt ? '#FDEEDC' : teil ? LATERNE : '#FFFFFF';
      const stroke = fehlt ? '#E8893A' : teil ? LATERNE_KANTE : '#1B2033';
      s += `<g${teil ? ' data-hilfe="teil"' : schatten ? ' data-hilfe="schatten" opacity="0.4"' : ''}>`;
      s += `<rect x="${x + 2}" y="${y + 2}" width="${SW - 4}" height="${SH - 4}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="${teil ? 4 : 2.5}"${fehlt ? ' stroke-dasharray="7 5"' : ''}/>`;
      let text = String(v);
      let farbe = TINTE;
      if (fehlt) {
        if (o.vorrechnen) text = String(v);
        else if (o.gewaehlt?.art === 'zahl') ((text = String(o.gewaehlt.wert)), (farbe = '#8A4B12'));
        else ((text = '?'), (farbe = '#8A4B12'));
      }
      s += `<text x="${x + SW / 2}" y="${y + SH / 2 + 8}" text-anchor="middle" font-size="23" font-weight="800" fill="${farbe}">${text}</text></g>`;
    });
  });
  let H = n * SH + 8;
  if (o.vorrechnen) {
    s += `<text x="${W / 2}" y="${n * SH + 46}" text-anchor="middle" font-size="26" font-weight="800" fill="#2F6B3A">${gleichung(m, true)}</text>`;
    H += 56;
  } else if (o.hilfe >= 3) {
    const feld = punktefeld(m, W, n * SH + 14);
    s += feld.svg;
    H += feld.hoehe + 14;
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
  /** Feld wie bei jeder Zahl: nicht aus der Grenze der Mauer – sonst verriete es, wie groß die Antwort sein kann */
  eingabe: () => ({ art: 'zahl' }),
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
