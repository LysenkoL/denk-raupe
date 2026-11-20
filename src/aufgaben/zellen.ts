import { FORM_FARBEN, HOLZ_KANTE, PAPIER, kanteZu, type FormFarbe } from '../design/farbe';

/**
 * Figuren aus Kästchen (Engine Auswahl: Spiegel, Drehen, Spiegel-Achse): ein Gitter aus Zeilen, jedes Kästchen leer (null)
 * oder in einer Formfarbe. Hilfsfunktionen zum Spiegeln, Drehen, Vergleichen und Zeichnen.
 */
export type Zelle = FormFarbe | null;
export type Gitter = Zelle[][];

export const gleichesGitter = (a: Gitter, b: Gitter) => a.length === b.length && a.every((r, i) => r.length === b[i].length && r.every((c, j) => c === b[i][j]));
/** links–rechts gespiegelt */
export const spiegelLR = (g: Gitter): Gitter => g.map((r) => [...r].reverse());
/** oben–unten gespiegelt */
export const spiegelOU = (g: Gitter): Gitter => [...g].reverse().map((r) => [...r]);
/** um 90° im Uhrzeigersinn gedreht */
export const drehen = (g: Gitter): Gitter => g[0].map((_, j) => g.map((r) => r[j]).reverse());
/** an der Diagonale von links oben nach rechts unten gespiegelt (nur quadratisch) */
export const spiegelD = (g: Gitter): Gitter => g[0].map((_, j) => g.map((r) => r[j]));

/** leere Ränder weg: die Figur ohne ihre Lage im Gitter */
export function zuschneiden(g: Gitter): Gitter {
  const zeilen = g.map((r, i) => (r.some((c) => c) ? i : -1)).filter((i) => i >= 0);
  const spalten = g[0].map((_, j) => (g.some((r) => r[j]) ? j : -1)).filter((j) => j >= 0);
  if (!zeilen.length) return [[]];
  return g.slice(zeilen[0], zeilen[zeilen.length - 1] + 1).map((r) => r.slice(spalten[0], spalten[spalten.length - 1] + 1));
}

/** alle vier Drehungen (zugeschnitten) */
export function drehungen(g: Gitter): Gitter[] {
  const out: Gitter[] = [zuschneiden(g)];
  for (let k = 1; k < 4; k++) out.push(zuschneiden(drehen(out[k - 1])));
  return out;
}

/** Kästchen mit Kante unten, Licht oben (wie die Würfel) – leere Kästchen als helle Mulde */
export function gitterSvg(g: Gitter, x: number, y: number, z: number, o: { leer?: boolean } = {}): string {
  let s = '';
  g.forEach((r, i) =>
    r.forEach((c, j) => {
      const [px, py] = [x + j * z, y + i * z];
      if (c) {
        const f = FORM_FARBEN[c];
        s += `<rect x="${px + 1}" y="${py + 1}" width="${z - 2}" height="${z - 2}" rx="${z * 0.14}" fill="${f}" stroke="${kanteZu(f)}" stroke-width="2"/>`;
      } else if (o.leer !== false) s += `<rect x="${px + 1}" y="${py + 1}" width="${z - 2}" height="${z - 2}" rx="${z * 0.14}" fill="${PAPIER}" stroke="${HOLZ_KANTE}" stroke-width="1.2"/>`;
    }),
  );
  return s;
}
