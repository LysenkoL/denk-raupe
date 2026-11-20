import { blattSvg, korbSvg, vorderteilSvg, type Ausdruck } from './figuren';

/**
 * Bilder der Figuren an EINER Stelle (docs/STIL.md, Abschnitte 11 und 12; Paket K1).
 *
 * Bis die Bilder aus K1 da sind, zeichnet src/bilder/figuren.ts vorläufige Figuren als SVG. Ein Bild aus K1
 * wird hier eingetragen – Import der Datei aus diesem Ordner und eine Zeile in `K1` – sonst ändert sich nichts:
 * jede Figur steht in einem festen Kasten (Seitenverhältnis wie die viewBox in figuren.ts), die Seite legt
 * nur den Kasten.
 *
 * Was K1 liefern muss (WebP mit transparentem Hintergrund, ohne Schatten am Boden):
 * - `raupe-<ausdruck>`, `zwilling`: Vorderteil, aufgerichtet, Kasten 4 : 5 (z. B. 960 × 1200 px);
 *   das erste Segment ist ein Kreis mit Mitte bei (50 %, 78,7 %) und Radius 27,5 % der Breite – dort schließt
 *   die Perle an (eine Perle ist 83,3 % der Kastenbreite).
 * - `blatt`, `blatt-gold`: Blatt quer, Stiel links in halber Höhe, Kasten 7 : 5 (z. B. 700 × 500 px).
 * - `korb`, `korb-voll`: Korb von vorn, Kasten 15 : 13 (z. B. 600 × 520 px), Boden am unteren Rand.
 *
 * Die alten Bilder im Stil der Lese-Raupe (kopf*.webp, blatt*.webp, korb*.webp) liegen noch in diesem
 * Ordner, werden aber nirgends mehr benutzt; K1 ersetzt sie.
 */
export type FigurName = `raupe-${Ausdruck}` | 'zwilling' | 'blatt' | 'blatt-gold' | 'korb' | 'korb-voll';

/** Bilder aus K1 – leer, solange es sie nicht gibt. Beispiel: `'zwilling': zwillingBild,` (import zwillingBild from './zwilling.webp') */
export const K1: Partial<Record<FigurName, string>> = {};

function zeichnung(name: FigurName): string {
  if (name === 'zwilling') return vorderteilSvg('zwilling');
  if (name === 'blatt' || name === 'blatt-gold') return blattSvg(name === 'blatt-gold');
  if (name === 'korb' || name === 'korb-voll') return korbSvg(name === 'korb-voll');
  return vorderteilSvg('kind', name.slice('raupe-'.length) as Ausdruck);
}

/** Figur als HTML: Bild aus K1, wenn eingetragen, sonst die vorläufige Zeichnung. Größe und Lage setzt CSS. */
export function figur(name: FigurName): string {
  const bild = K1[name];
  return bild ? `<img class="figur-bild" src="${bild}" alt="" draggable="false">` : zeichnung(name);
}

export type BlattArt = 'normal' | 'gold';
export const blattFigur = (art: BlattArt): string => figur(art === 'gold' ? 'blatt-gold' : 'blatt');
