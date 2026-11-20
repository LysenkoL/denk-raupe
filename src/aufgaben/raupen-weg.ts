import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FOKUS, LATERNE, LATERNE_KANTE, PAPIER, TINTE } from '../design/farbe';
import { stein } from './plan';
import { pfeilZeichen, raupenKopf, type Richtung } from './oben-unten';

/**
 * Raupen-Weg (Nr. 28, Engine Weg, Antwort Tippen auf ein Tor): in jedem Feld liegt ein Pfeil. Die Raupe beginnt auf
 * ihrem Feld und geht immer in die Richtung des Pfeils, auf dem sie gerade steht – bis sie durch ein Tor am Rand
 * hinausgeht. Durch welches Tor?
 * Stufe 1: 3 × 3 Felder, Weg aus 2–3 Schritten, drei Tore.
 * Stufe 2: 4 × 4 Felder, Weg aus 3–5 Schritten, vier Tore.
 * Stufe 3: 4 × 4 Felder, Weg aus 5–8 Schritten mit Kurven, vier Tore; andere Pfeile führen zu den anderen Toren.
 * Der Löser geht den Weg ab: läuft die Raupe im Kreis oder aus dem Feld, wo kein Tor ist, gibt es keine Lösung.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt das Feld der Raupe und ihren ersten Pfeil hervor; Stufe 3 zeigt die ersten zwei
 * Schritte als Spur (bei einem Weg aus höchstens zwei Schritten an der ähnlichen Aufgabe).
 */
export interface Tor {
  /** Feld am Rand und Richtung hinaus */
  feld: number;
  richtung: Richtung;
}
export interface RaupenWeg {
  n: number;
  pfeile: Richtung[];
  start: number;
  tore: Tor[];
}

const SCHRITT: Record<Richtung, [number, number]> = { oben: [0, -1], unten: [0, 1], links: [-1, 0], rechts: [1, 0] };

/** Weg der Raupe: besuchte Felder und das Tor, durch das sie hinausgeht (oder null) */
export function gehen(w: RaupenWeg): { felder: number[]; tor: number | null } {
  const felder = [w.start];
  let f = w.start;
  for (let k = 0; k <= w.n * w.n; k++) {
    const r = w.pfeile[f];
    const [x, y] = [(f % w.n) + SCHRITT[r][0], Math.floor(f / w.n) + SCHRITT[r][1]];
    if (x < 0 || y < 0 || x >= w.n || y >= w.n) {
      const t = w.tore.findIndex((t) => t.feld === f && t.richtung === r);
      return { felder, tor: t >= 0 ? t : null };
    }
    f = y * w.n + x;
    if (felder.includes(f)) return { felder, tor: null };
    felder.push(f);
  }
  return { felder, tor: null };
}

function loesungen(w: RaupenWeg): Antwort[] {
  const t = gehen(w).tor;
  return t === null ? [] : [{ art: 'zahl', wert: t + 1 }];
}

const RICHTUNGEN: Richtung[] = ['oben', 'unten', 'links', 'rechts'];

function erzeuge(z: Zufall, stufe: number): RaupenWeg {
  const n = stufe === 1 ? 3 : 4;
  const [min, max] = stufe === 1 ? [2, 3] : stufe === 2 ? [3, 5] : [5, 8];
  const anzahl = stufe === 1 ? 3 : 4;
  for (;;) {
    const pfeile = Array.from({ length: n * n }, () => z.eins(RICHTUNGEN));
    const start = z.ganz(0, n * n - 1);
    // Ausgänge aller Felder: wohin jedes Feld führt (für die Tore der anderen Wege)
    const ende = (s: number) => gehen({ n, pfeile, start: s, tore: [] });
    const weg = ende(start);
    if (weg.felder.length < min + 1 || weg.felder.length > max + 1) continue;
    const letztes = weg.felder[weg.felder.length - 1];
    const r = pfeile[letztes];
    const [x, y] = [(letztes % n) + SCHRITT[r][0], Math.floor(letztes / n) + SCHRITT[r][1]];
    if (x >= 0 && y >= 0 && x < n && y < n) continue; // im Kreis gelaufen
    if (stufe === 3 && new Set(weg.felder.slice(0, -1).map((f) => pfeile[f])).size < 3) continue;
    const tore: Tor[] = [{ feld: letztes, richtung: r }];
    // weitere Tore: Ausgänge anderer Felder
    for (const s of z.mischen(Array.from({ length: n * n }, (_, i) => i))) {
      const e = ende(s);
      const l = e.felder[e.felder.length - 1];
      const rr = pfeile[l];
      const [ax, ay] = [(l % n) + SCHRITT[rr][0], Math.floor(l / n) + SCHRITT[rr][1]];
      if (ax >= 0 && ay >= 0 && ax < n && ay < n) continue;
      if (tore.length < anzahl && !tore.some((t) => t.feld === l && t.richtung === rr)) tore.push({ feld: l, richtung: rr });
    }
    if (tore.length < anzahl) continue;
    const gemischt = z.mischen(tore);
    return { n, pfeile, start, tore: gemischt };
  }
}

const schrittVerraet = (w: RaupenWeg) => gehen(w).felder.length <= 3;

/* ---------- Bild ---------- */

const Z = 62;
const RAND = 46;

function zeichne(w: RaupenWeg, o: ZeichenOptionen): string {
  const W = w.n * Z + 2 * RAND;
  const lage = (f: number): [number, number] => [RAND + (f % w.n) * Z, RAND + Math.floor(f / w.n) * Z];
  let s = '';
  const { felder } = gehen(w);
  const spur = o.vorrechnen ? felder : o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(w)) ? felder.slice(0, 3) : [];
  if (o.hilfe >= 2 || o.vorrechnen) {
    const [x, y] = lage(w.start);
    s += `<rect data-hilfe="teil" x="${x - 4}" y="${y - 4}" width="${Z + 2}" height="${Z + 2}" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  }
  w.pfeile.forEach((r, f) => {
    const [x, y] = lage(f);
    s += stein(x, y, Z - 6, Z - 6);
    s += pfeilZeichen(x + Z / 2 - 3, y + Z / 2 - 3, r, 15);
    // die Raupe sitzt klein oben links auf ihrem Feld, der Pfeil bleibt ganz zu sehen
    if (f === w.start) s += raupenKopf(x + 4, y + 4, 13);
  });
  if (spur.length > 1) {
    const pts = spur.map((f) => lage(f).map((v) => v + Z / 2 - 3).join(' ')).join(' L');
    s += `<path data-hilfe="${o.vorrechnen ? 'teil' : 'schritt'}" d="M${pts}" fill="none" stroke="${LATERNE_KANTE}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 8" opacity="0.9"/>`;
  }
  const gew = o.vorrechnen ? (loesungen(w)[0] as { wert: number }).wert - 1 : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  w.tore.forEach((t, k) => {
    const [x, y] = lage(t.feld);
    const [dx, dy] = SCHRITT[t.richtung];
    const cx = x + Z / 2 - 3 + dx * (Z / 2 + 18);
    const cy = y + Z / 2 - 3 + dy * (Z / 2 + 18);
    s += `<g class="wahl-ziel" data-wahl="${k}" role="button" tabindex="0" aria-label="Tor ${k + 1}" opacity="1">`;
    s += `<circle cx="${cx}" cy="${cy}" r="24" fill="${PAPIER}" opacity="0.01"/>`;
    s += `<rect x="${cx - 19}" y="${cy - 19}" width="38" height="38" rx="10" fill="${FIGUR_TOKEN.blatt}" stroke="${FIGUR_TOKEN['blatt-kante']}" stroke-width="3"/>`;
    s += `<text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="22" font-weight="800" fill="${TINTE}">${k + 1}</text>`;
    if (gew === k) s += `<rect${o.vorrechnen ? '' : ' data-inhalt=""'} x="${cx - 25}" y="${cy - 25}" width="50" height="50" rx="14" fill="none" stroke="${FOKUS}" stroke-width="5"/>`;
    s += '</g>';
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${W}" role="group" aria-label="Raupen-Weg">${s}</svg>`;
}

export const RAUPEN_WEG: Format<RaupenWeg> = {
  id: 'raupen-weg',
  nr: 28,
  version: 1,
  bereich: 'logik',
  faehigkeit: 'L3',
  motor: 'weg',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'durchWelchesTor',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (w) => w.tore.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) 2 × 2, die Raupe geht einen Schritt nach rechts und hinaus; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [
    { n: 2, pfeile: ['rechts', 'rechts', 'unten', 'unten'], start: 0, tore: [{ feld: 3, richtung: 'unten' }, { feld: 1, richtung: 'rechts' }] },
    aufgabeAus(RAUPEN_WEG, 0, 1).bedingung,
  ],
};
