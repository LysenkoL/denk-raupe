import { FIGUR_TOKEN, FORM_FARBEN, HOLZ, HOLZ_KANTE, LATERNE, LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE, WEISS, kanteZu, mix, type FormFarbe } from '../design/farbe';
import type { Form } from '../perlen/antwort';
import { formPfad } from '../perlen/maler';
import type { Zahlenraum } from './format';
import type { Zufall } from '../core/zufall';

/**
 * Bausteine der Engine Bild für die Zahl-Formate der Gruppe Г1 (Wie viele?, Rechenbild, Rechenmaschine,
 * Größer oder kleiner, Verdoppeln und halbieren, Klecks-Rätsel): Dinge zum Zählen, Tablett aus Holz, Kacheln
 * aus Sandstein, Nest der Antwort, Rahmen der Hilfe und Punkte der Hilfe Stufe 3 (in Fünfern und Zehnern).
 * Ohne schwarze Umrisse: Form aus Fläche, Kante unten, Licht oben links (docs/STIL.md, Abschnitte 3 und 8).
 */

/** Radius eines Dings zum Zählen und Abstand zweier Dinge in einer Reihe */
export const DING_R = 12;
export const DING_AB = 29;
/** Lücke nach fünf Dingen einer Reihe (wie auf dem Zwanzigerfeld) */
export const FUENF_LUECKE = 9;

/** Farben der Dinge: Formfarben ohne Gelb – gelb auf hellem Holz ist zu schwach zu sehen */
export const DING_FARBEN = ['rot', 'orange', 'gruen', 'blau', 'lila'] as const satisfies readonly FormFarbe[];
export type DingFarbe = (typeof DING_FARBEN)[number];
export const DING_FORMEN = ['kreis', 'quadrat', 'dreieck', 'stern'] as const satisfies readonly Form[];
export type DingForm = (typeof DING_FORMEN)[number];

/** ein Ding im Bild: Mitte; `weg` = durchgestrichen (geht weg) */
export interface Ding {
  x: number;
  y: number;
  weg?: boolean;
}

/** größte Zahl der leichten Stufe: eine Stufe unter dem Zahlenraum (bis 10 bleibt bis 10), wie bei der Zahlenmauer */
export function kleinerRaum(zr: Zahlenraum): 10 | 20 {
  return zr === 100 ? 20 : 10;
}

/**
 * Wie viele Dinge sieht das Kind? Zwei Dinge, die sich berühren oder überlappen, kann es als eins sehen:
 * dann passen n und n − 1 (die Aufgabe ist mehrdeutig und wird verworfen). Sonst genau n.
 */
export function sichtbareAnzahlen(dinge: readonly Ding[]): number[] {
  const n = dinge.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) if (Math.hypot(dinge[i].x - dinge[j].x, dinge[i].y - dinge[j].y) < 2 * DING_R + 1) return [n, n - 1];
  return [n];
}

/** x-Versatz der k-ten Stelle einer Zehnerreihe (Lücke nach fünf) */
export function spalteX(k: number): number {
  return k * DING_AB + (k >= 5 ? FUENF_LUECKE : 0);
}
/** Breite einer Reihe aus `m` Dingen */
export function reiheBreite(m: number): number {
  return m <= 0 ? 0 : spalteX(m - 1) + 2 * DING_R;
}

/**
 * `n` Dinge in Zehnerreihen (je fünf und fünf), links oben bei (x0, y0) – Mitte des ersten Dings bei
 * (x0 + R, y0 + R). `je`: Dinge je Reihe (10 oder 5).
 */
export function inReihen(n: number, x0: number, y0: number, je = 10): Ding[] {
  return Array.from({ length: n }, (_, k) => ({ x: x0 + DING_R + spalteX(k % je), y: y0 + DING_R + Math.floor(k / je) * DING_AB }));
}

/**
 * `n` Dinge lose verstreut in einem Feld aus `spalten` × `zeilen` Zellen: jede Zelle höchstens ein Ding, leicht
 * verschoben. Zwei Dinge berühren sich nie (Abstand der Zellen minus doppelte Verschiebung ≥ 2 R + 2).
 */
export const STREU_ZELLE = 44;
const STREU_WACKEL = 7;
export function verstreut(z: Zufall, n: number, spalten: number, zeilen: number, x0: number, y0: number): Ding[] {
  const zellen = z.mischen(Array.from({ length: spalten * zeilen }, (_, i) => i)).slice(0, n);
  // Lesereihenfolge: oben links zuerst (so liegen die Fünfer der Hilfe beieinander)
  zellen.sort((a, b) => a - b);
  return zellen.map((c) => ({
    x: x0 + STREU_ZELLE / 2 + (c % spalten) * STREU_ZELLE + z.ganz(-STREU_WACKEL, STREU_WACKEL),
    y: y0 + STREU_ZELLE / 2 + Math.floor(c / spalten) * STREU_ZELLE + z.ganz(-STREU_WACKEL, STREU_WACKEL),
  }));
}

/** Gestalt eines Dings ohne Umriss: Kante unten, Fläche, Licht oben links */
function dingGestalt(form: DingForm, x: number, y: number, farbe: string): string {
  const s = form === 'kreis' ? DING_R : form === 'quadrat' ? DING_R * 0.98 : DING_R * 1.08;
  const k = kanteZu(farbe);
  let t = formPfad(form, x, y + 2.6, s, k, 'none', 0) + formPfad(form, x, y, s, farbe, 'none', 0);
  t += `<ellipse cx="${(x - s * 0.32).toFixed(1)}" cy="${(y - s * 0.36).toFixed(1)}" rx="${(s * 0.34).toFixed(1)}" ry="${(s * 0.2).toFixed(1)}" fill="${WEISS}" opacity="0.55"/>`;
  return t;
}

/**
 * Ein Ding zum Zählen. `nr` macht es zum Werkzeug „gezählt markieren“ (data-zaehl, Engine Bild: das Kind tippt,
 * es bekommt einen hellen Ring – der Bildschirm setzt die Klasse, das Bild selbst weiß nichts davon).
 * `weg`: durchgestrichen und blass (geht weg) – derselbe Strich wie „nicht“ in allen Formaten.
 * `markiert`: Ring der Hilfe Stufe 3 („diese sind schon gezählt“).
 */
export function ding(d: Ding, form: DingForm, farbe: DingFarbe, o: { nr?: number; markiert?: boolean } = {}): string {
  const fill = FORM_FARBEN[farbe];
  let t = o.nr !== undefined ? `<g data-zaehl="${o.nr}">` : '<g>';
  // unsichtbare Tippfläche etwas größer als das Ding
  if (o.nr !== undefined) t += `<circle cx="${d.x}" cy="${d.y}" r="${DING_R + 4}" fill="${PAPIER}" opacity="0"/>`;
  if (o.markiert) t += `<circle data-hilfe="schritt" cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 4.5}" fill="${WEISS}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  t += `<g class="ding"${d.weg ? ' opacity="0.45"' : ''}>${dingGestalt(form, d.x, d.y, fill)}</g>`;
  if (d.weg) t += `<path data-zeichen="weg" d="M${d.x - DING_R - 2} ${d.y + DING_R + 2}L${d.x + DING_R + 2} ${d.y - DING_R - 2}" stroke="${TINTE}" stroke-width="4.5" stroke-linecap="round"/>`;
  // heller Ring „gezählt“: unsichtbar, bis der Bildschirm die Klasse „gezaehlt“ setzt (app.css)
  if (o.nr !== undefined)
    t += `<g class="zaehl-ring" opacity="0"><circle cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 5.5}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="2.5"/><circle cx="${d.x}" cy="${d.y + 1}" r="${DING_R + 3}" fill="none" stroke="${WEISS}" stroke-width="3.5"/></g>`;
  return t + '</g>';
}

/** Tablett aus hellem Holz mit Kante unten und Licht oben (Engine Bild: die Dinge liegen darauf) */
export function tablett(x: number, y: number, w: number, h: number): string {
  return (
    `<rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="16" fill="${HOLZ_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${HOLZ}"/>` +
    `<rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" rx="12" fill="${mix(HOLZ, PAPIER, 0.45)}"/>` +
    `<rect x="${x + 14}" y="${y + 2.5}" width="${w - 28}" height="3" rx="1.5" fill="${WEISS}" opacity="0.55"/>`
  );
}

/** Holzleiste unter einer Reihe aus `m` Dingen: ein Bündel (Zehner oder Fünfer) */
export function leiste(x: number, y: number, m: number): string {
  const w = reiheBreite(m) + 12;
  return (
    `<rect x="${x - 6}" y="${y - 6 + 4}" width="${w}" height="${2 * DING_R + 12}" rx="${DING_R + 6}" fill="${FIGUR_TOKEN['ast-kante']}"/>` +
    `<rect x="${x - 6}" y="${y - 6}" width="${w}" height="${2 * DING_R + 12}" rx="${DING_R + 6}" fill="${FIGUR_TOKEN.ast}"/>` +
    `<rect x="${x + 6}" y="${y - 4}" width="${w - 24}" height="3" rx="1.5" fill="${FIGUR_TOKEN['ast-licht']}"/>`
  );
}

/** Kachel aus Sandstein mit Zahl oder Zeichen */
export function kachel(x: number, y: number, w: number, h: number, text: string, groesse = 30): string {
  return (
    `<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="12" fill="${STEIN_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${STEIN}"/>` +
    `<rect x="${x + 8}" y="${y + 3}" width="${w - 16}" height="4" rx="2" fill="${WEISS}" opacity="0.45"/>` +
    `<text x="${x + w / 2}" y="${y + h / 2 + groesse * 0.36}" text-anchor="middle" font-size="${groesse}" font-weight="800" fill="${TINTE}">${text}</text>`
  );
}

/** Rechenzeichen ohne Kachel (+, −, =, <, >) */
export function zeichen(x: number, y: number, z: string, groesse = 32): string {
  return `<text x="${x}" y="${y + groesse * 0.36}" text-anchor="middle" font-size="${groesse}" font-weight="800" fill="${TINTE}">${z}</text>`;
}

/**
 * Nest der Antwort: Mulde mit gestricheltem Rand, darin „?“ oder die Zahl des Kindes (data-inhalt) – sieht immer
 * gleich aus, egal ob sie stimmt. `loesung`: nur beim Vorrechnen (ähnliche Aufgabe).
 */
export function nest(x: number, y: number, w: number, h: number, inhalt: number | null, o: { loesung?: boolean } = {}): string {
  let t =
    `<rect x="${x}" y="${y}" width="${w}" height="${h + 4}" rx="12" fill="${FIGUR_TOKEN.nest}"/>` +
    `<rect x="${x + 2}" y="${y + 5}" width="${w - 4}" height="${h - 3}" rx="10" fill="${PAPIER}" opacity="0.55"/>` +
    `<rect x="${x + 2.5}" y="${y + 2.5}" width="${w - 5}" height="${h - 1}" rx="10" fill="none" stroke="${HOLZ_KANTE}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
  const ty = y + h / 2 + 12;
  if (inhalt === null) t += `<text x="${x + w / 2}" y="${ty}" text-anchor="middle" font-size="32" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  else t += `<text${o.loesung ? '' : ' data-inhalt=""'} x="${x + w / 2}" y="${ty}" text-anchor="middle" font-size="32" font-weight="800" fill="${TINTE}">${inhalt}</text>`;
  return t;
}

/** Zahl des Kindes im Nest: nur eine Zahl zählt */
export const gewaehlteZahl = (g: { art: string; wert?: unknown } | null): number | null => (g?.art === 'zahl' && typeof g.wert === 'number' ? g.wert : null);

/** warmer Rahmen der Hilfe (Laterne) hinter einem Teil des Bildes */
export function hilfeRahmen(x: number, y: number, w: number, h: number, art: 'teil' | 'schritt', rx = 14): string {
  return `<rect data-hilfe="${art}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"${art === 'schritt' ? ' stroke-dasharray="9 6"' : ''}/>`;
}

/** Pfeil aus Holz (Engine Bild: „kommt dazu“, „geht hinein“) von (x1, y1) nach (x2, y2), mit Bogen `bogen` */
export function pfeil(x1: number, y1: number, x2: number, y2: number, bogen = 0, dicke = 5): string {
  const mx = (x1 + x2) / 2 + bogen;
  const my = (y1 + y2) / 2 - Math.abs(bogen) * 0.3;
  const w = Math.atan2(y2 - my, x2 - mx);
  const a = 8 + dicke;
  const p1 = `${(x2 - a * Math.cos(w - 0.55)).toFixed(1)} ${(y2 - a * Math.sin(w - 0.55)).toFixed(1)}`;
  const p2 = `${(x2 - a * Math.cos(w + 0.55)).toFixed(1)} ${(y2 - a * Math.sin(w + 0.55)).toFixed(1)}`;
  const k = `fill="none" stroke="${TINTE_LEISE}" stroke-width="${dicke}" stroke-linecap="round" stroke-linejoin="round"`;
  return `<g data-zeichen="pfeil"><path d="M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}" ${k}/><path d="M${p1}L${x2} ${y2}L${p2}" ${k}/></g>`;
}

/** Schild aus Holz (Brettchen) – für Regeln und Bildzeichen */
export function schild(x: number, y: number, w: number, h: number): string {
  return (
    `<rect x="${x}" y="${y + 4}" width="${w}" height="${h}" rx="14" fill="${HOLZ_KANTE}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${HOLZ}"/>` +
    `<rect x="${x + 12}" y="${y + 3}" width="${w - 24}" height="3" rx="1.5" fill="${WEISS}" opacity="0.55"/>`
  );
}

/* ---------- Punkte der Hilfe Stufe 3 ---------- */

/**
 * Art eines Punktes: der ersten oder zweiten Zahl, leer (fehlt noch, zum Zählen) oder weg (durchgestrichen).
 * Farben wie bei der Zahlenmauer, damit das Kind dieselben Punkte überall wiedererkennt.
 */
export type PunktArt = 'erster' | 'zweiter' | 'leer' | 'weg';
const PUNKT = 17;
const PUNKT_LUECKE = 10;
const PUNKT_R = 7;
export const PUNKTE_JE_REIHE = 10;

/** Lage des k-ten Punktes: 10 je Reihe, Lücke nach fünf Punkten und nach fünf Reihen */
export function punktLage(k: number): { x: number; y: number } {
  const reihe = Math.floor(k / PUNKTE_JE_REIHE);
  const spalte = k % PUNKTE_JE_REIHE;
  return { x: spalte * PUNKT + (spalte >= 5 ? PUNKT_LUECKE : 0) + PUNKT / 2, y: reihe * PUNKT + (reihe >= 5 ? PUNKT_LUECKE : 0) + PUNKT / 2 };
}

/** n Punkte einer Art */
export const punkte = (n: number, art: PunktArt): PunktArt[] => Array.from({ length: Math.max(0, n) }, () => art);

/**
 * Laterne-Tafel mit Punkten (Hilfe Stufe 3: ein Schritt, data-hilfe="schritt"), mittig in der Breite `breite`
 * ab Höhe `oben`. Keine Zahl dazu – das Kind zählt die Punkte (in Fünfern) selbst.
 */
export function punktefeld(arten: readonly PunktArt[], breite: number, oben: number): { svg: string; hoehe: number } {
  const reihen = Math.max(1, Math.ceil(arten.length / PUNKTE_JE_REIHE));
  const feldB = PUNKTE_JE_REIHE * PUNKT + PUNKT_LUECKE;
  const feldH = reihen * PUNKT + (reihen > 5 ? PUNKT_LUECKE : 0);
  const x0 = (breite - feldB) / 2;
  const y0 = oben + 8;
  let s = `<rect data-hilfe="schritt" x="${x0 - 8}" y="${oben}" width="${feldB + 16}" height="${feldH + 16}" rx="12" fill="${LATERNE}"/>`;
  s += `<rect x="${x0 - 8}" y="${oben + feldH + 12}" width="${feldB + 16}" height="4" rx="2" fill="${LATERNE_KANTE}"/>`;
  arten.forEach((art, k) => {
    const p = punktLage(k);
    const cx = x0 + p.x;
    const cy = y0 + p.y;
    if (art === 'leer') s += `<circle data-punkt="leer" cx="${cx}" cy="${cy}" r="${PUNKT_R - 1.25}" fill="${PAPIER}" stroke="${TINTE_LEISE}" stroke-width="2.5"/>`;
    else {
      const fill = art === 'zweiter' ? FIGUR_TOKEN.halstuch : TINTE_LEISE;
      s += `<circle data-punkt="${art}" cx="${cx}" cy="${cy}" r="${PUNKT_R}" fill="${fill}"${art === 'weg' ? ' opacity="0.45"' : ''}/>`;
      if (art === 'weg') s += `<path d="M${cx - 6} ${cy + 6}L${cx + 6} ${cy - 6}" stroke="${TINTE}" stroke-width="2.5" stroke-linecap="round"/>`;
    }
  });
  return { svg: s, hoehe: feldH + 16 };
}

/** Zahl der Punkte jeder Art (für Tests und Lesbarkeit) */
export function zaehlePunkte(arten: readonly PunktArt[]): Record<PunktArt, number> {
  const out: Record<PunktArt, number> = { erster: 0, zweiter: 0, leer: 0, weg: 0 };
  for (const a of arten) out[a]++;
  return out;
}

/** SVG-Hülle aller Formate dieser Gruppe */
export function svgHuelle(w: number, h: number, name: string, inhalt: string): string {
  return `<svg class="aufgabe-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${name}">${inhalt}</svg>`;
}

/** Halbschatten der Hilfe Stufe 2 um einen Teil */
export const schatten = (inhalt: string): string => `<g data-hilfe="schatten" opacity="0.35">${inhalt}</g>`;
