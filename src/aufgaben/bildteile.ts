import { FIGUR_TOKEN, HOLZ, HOLZ_KANTE, HOLZKNOPF, LATERNE, LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE, WEISS } from '../design/farbe';
import type { Antwort } from '../perlen/antwort';
import type { Zahlenraum } from './format';

/**
 * Bauteile der Rechenbilder (Engine Bild, docs/STIL.md, „Движки“ und „Помощь на рисунке“): Holztablett,
 * Sandsteinkachel, Nest der Antwort, warme Rahmen der Hilfe, Mengenbild aus Zehnerstangen und Punkten.
 * Alles aus den Farb-Token, ohne dunkle Umrisse; Licht oben links, Kante unten.
 */

/** größte Zahl auf Stufe 1: eine Stufe unter dem Zahlenraum (wie die Zahlenmauer), sonst der Zahlenraum */
export function stufeGrenze(stufe: number, zahlenraum: Zahlenraum): Zahlenraum {
  if (stufe > 1) return zahlenraum;
  return zahlenraum === 100 ? 20 : 10;
}

/** Schrift der Zahlen in allen Rechenbildern */
export const ZAHL_GEWICHT = 800;

/** Holztablett, auf dem die Dinge liegen (Engine Bild): helles Holz, Kante unten, Licht oben */
export function tablett(x: number, y: number, w: number, h: number, rx = 18): string {
  return (
    `<rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="${rx}" fill="${HOLZ_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${HOLZ}"/>` +
    `<rect x="${x + rx}" y="${y + 4}" width="${Math.max(0, w - 2 * rx)}" height="4" rx="2" fill="${WEISS}" opacity="0.5"/>`
  );
}

/** Brettchen aus hellem Holz (Knopfholz) für eine Zeile */
export function brett(x: number, y: number, w: number, h: number, rx = 14): string {
  return (
    `<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="${rx}" fill="${HOLZ_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${HOLZKNOPF}"/>`
  );
}

/** Kachel aus Sandstein mit Fase unten und Licht oben */
export function kachel(x: number, y: number, w: number, h: number, rx = 10): string {
  return (
    `<rect x="${x}" y="${y + 3.5}" width="${w}" height="${h}" rx="${rx}" fill="${STEIN_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${STEIN}"/>` +
    `<rect x="${x + 6}" y="${y + 3}" width="${Math.max(0, w - 12)}" height="3.5" rx="1.75" fill="${WEISS}" opacity="0.45"/>`
  );
}

/** leeres Nest: Mulde mit gestricheltem Rand (der einzige Strich, der gestrichelt sein darf) */
export function nest(x: number, y: number, w: number, h: number, rx = 10): string {
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h + 3.5}" rx="${rx}" fill="${FIGUR_TOKEN.nest}"/>` +
    `<rect x="${x + 2}" y="${y + 5}" width="${w - 4}" height="${h - 3.5}" rx="${rx - 1}" fill="${PAPIER}" opacity="0.55"/>` +
    `<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 1.5}" rx="${rx - 1}" fill="none" stroke="${HOLZ_KANTE}" stroke-width="2.5" stroke-dasharray="7 5"/>`
  );
}

/** Zahl oder Zeichen mittig in einem Kasten */
export function zahl(cx: number, cy: number, text: string | number, groesse = 24, farbe = TINTE): string {
  return `<text x="${cx}" y="${cy + groesse * 0.36}" text-anchor="middle" font-size="${groesse}" font-weight="${ZAHL_GEWICHT}" fill="${farbe}">${text}</text>`;
}

/**
 * Nest der Antwort: zeigt „?“, die Zahl des Kindes (data-inhalt, egal ob sie stimmt) oder beim Vorrechnen
 * die Lösung. Wie das Nest aussieht, hängt nie von seinem Inhalt ab.
 */
export function antwortNest(x: number, y: number, w: number, h: number, o: { gewaehlt: Antwort | null; vorrechnen?: boolean }, loesung: number, groesse = 24): string {
  let s = nest(x, y, w, h);
  if (o.vorrechnen) s += zahl(x + w / 2, y + h / 2 + 1, loesung, groesse);
  else if (o.gewaehlt?.art === 'zahl') s += `<g data-inhalt="">${zahl(x + w / 2, y + h / 2 + 1, o.gewaehlt.wert, groesse)}</g>`;
  else s += zahl(x + w / 2, y + h / 2 + 1, '?', groesse, TINTE_LEISE);
  return s;
}

/** warmer Rahmen der Hilfe Stufe 2 hinter einem Teil (data-hilfe="teil" trägt die Gruppe) */
export function laterneRahmen(x: number, y: number, w: number, h: number, rx = 14): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
}

/** Gruppe für Hilfe: Teil (warm), Schatten (halb durchsichtig) oder gewöhnlich */
export function gruppe(art: 'teil' | 'schatten' | null, inhalt: string): string {
  if (art === 'teil') return `<g data-hilfe="teil">${inhalt}</g>`;
  if (art === 'schatten') return `<g data-hilfe="schatten" opacity="0.35">${inhalt}</g>`;
  return `<g>${inhalt}</g>`;
}

/** Größe des Mengenbilds: Perlen in Zehnerstangen nebeneinander, dann die Einer in Fünfern */
const PERLE_R = 5.6;
const PERLE_ABSTAND = 13;
const FUENFER_LUECKE = 5;
const STANGE_ABSTAND = 7;
/** Höhe einer Spalte aus k Perlen (Lücke nach der fünften) */
const spaltenHoehe = (k: number) => k * PERLE_ABSTAND + (k > 5 ? FUENFER_LUECKE : 0);

/**
 * Menge ohne Ziffer (Hilfe Stufe 3: „один шаг проступает на рисунке, точки — пятёрками“): jede volle Zehn
 * eine Stange aus zehn Perlen mit Lücke nach fünf, die Einer als gleich große Perlen, fünf übereinander, dann
 * die nächsten fünf. So zählt das Kind selbst, und keine Zahl der Lösung steht im Bild.
 */
export function mengenBild(n: number, x: number, y: number, farbe: string = FIGUR_TOKEN.halstuch, kante: string = FIGUR_TOKEN['halstuch-kante']): { svg: string; breite: number; hoehe: number } {
  const zehner = Math.floor(n / 10);
  const einer = n % 10;
  const D = 2 * PERLE_R;
  const perle = (cx: number, cy: number) =>
    `<circle cx="${cx}" cy="${cy + 1.3}" r="${PERLE_R}" fill="${kante}"/><circle cx="${cx}" cy="${cy}" r="${PERLE_R}" fill="${farbe}"/><circle cx="${cx - 1.8}" cy="${cy - 1.9}" r="1.6" fill="${WEISS}" opacity="0.5"/>`;
  const spalte = (cx: number, k: number) => {
    let t = '';
    for (let p = 0; p < k; p++) t += perle(cx, y + PERLE_R + p * PERLE_ABSTAND + (p >= 5 ? FUENFER_LUECKE : 0));
    return t;
  };
  let s = '';
  let cx = x;
  for (let k = 0; k < zehner; k++) {
    // Stange: Holzleiste hinter zehn Perlen
    s += `<g data-menge="zehn"><rect x="${cx + PERLE_R - 2.5}" y="${y - 3}" width="5" height="${spaltenHoehe(10) + 4}" rx="2.5" fill="${HOLZ_KANTE}"/>${spalte(cx + PERLE_R, 10)}</g>`;
    cx += D + STANGE_ABSTAND;
  }
  if (zehner > 0 && einer > 0) cx += 6;
  for (let k = 0; k < einer; k++) {
    const sp = Math.floor(k / 5);
    const r = k % 5;
    const px = cx + sp * (D + 4) + PERLE_R;
    s += `<g data-menge="eins">${perle(px, y + PERLE_R + r * PERLE_ABSTAND)}</g>`;
  }
  const einerB = einer > 0 ? (einer > 5 ? 2 * D + 4 : D) : 0;
  const breite = Math.max(1, cx - x - (einer === 0 && zehner > 0 ? STANGE_ABSTAND : 0) + einerB);
  const hoehe = zehner > 0 ? spaltenHoehe(10) - (PERLE_ABSTAND - D) : spaltenHoehe(Math.min(einer, 5)) - (PERLE_ABSTAND - D);
  return { svg: s, breite, hoehe: Math.max(D, hoehe) };
}

/** Zahl der Zehnerstangen und Einerpunkte im Bild (für Tests) */
export function mengeImBild(svg: string): number {
  return 10 * (svg.match(/data-menge="zehn"/g) ?? []).length + (svg.match(/data-menge="eins"/g) ?? []).length;
}

/** Pfeil (Dreieck) in Laternenfarbe, Spitze bei (x, y), Richtung in Grad (0 = nach rechts) */
export function pfeilSpitze(x: number, y: number, winkel: number, farbe: string = LATERNE_KANTE, g = 11): string {
  return `<path d="M0 0 L${-g} ${-g * 0.62} L${-g} ${g * 0.62} Z" fill="${farbe}" transform="translate(${x} ${y}) rotate(${winkel})"/>`;
}

/** Plus- und Minuszeichen als Form (für Hilfen, die keinen Text schreiben) */
export function zeichenForm(art: 'plus' | 'minus' | 'gleich', cx: number, cy: number, g = 12, farbe: string = TINTE): string {
  const d = 3.4;
  if (art === 'gleich')
    return `<rect x="${cx - g / 2}" y="${cy - 4.5}" width="${g}" height="${d}" rx="1.7" fill="${farbe}"/><rect x="${cx - g / 2}" y="${cy + 1.1}" width="${g}" height="${d}" rx="1.7" fill="${farbe}"/>`;
  let s = `<rect x="${cx - g / 2}" y="${cy - d / 2}" width="${g}" height="${d}" rx="1.7" fill="${farbe}"/>`;
  if (art === 'plus') s += `<rect x="${cx - d / 2}" y="${cy - g / 2}" width="${d}" height="${g}" rx="1.7" fill="${farbe}"/>`;
  return s;
}

export const svgRahmen = (w: number, h: number, inhalt: string, name: string) =>
  `<svg class="aufgabe-svg" viewBox="0 0 ${Math.ceil(w)} ${Math.ceil(h)}" role="img" aria-label="${name}">${inhalt}</svg>`;
