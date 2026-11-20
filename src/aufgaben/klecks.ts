import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { WEISS, ZIFFER_FARBEN, ZIFFER_KANTEN } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, kachel, kleinerRaum, punkte, punktefeld, svgHuelle, zeichen, type PunktArt } from './zaehlen';
import { ueberZehner } from './rechenbild';

/**
 * Klecks-Rätsel (Nr. 71, Engine Bild): in einer Rechnung liegt ein Tintenklecks über einer Zahl: 14 + Klecks = 21.
 * Welche Zahl ist darunter?
 * Stufe 1: nur Plus, der Klecks liegt auf der zweiten Zahl (ergänzen), ohne Zehnerübergang; bis 10, bei
 *          Zahlenraum 100 bis 20.
 * Stufe 2: schwerer wird die Art der Rechnung – Plus mit dem Klecks vorn oder hinten, oder Minus mit dem Klecks
 *          auf der abgezogenen Zahl (15 − Klecks = 8); im ganzen Zahlenraum, bei 20 und 100 über den Zehner.
 * Stufe 3: schwerer wird die Umkehrung – der Klecks liegt am Anfang einer Minusaufgabe (Klecks − 6 = 8) oder
 *          einer Plusaufgabe mit Zehnerübergang (Klecks + 7 = 23).
 * Der Löser probiert für jeden Klecks jede Zahl 0–100 und rechnet nach.
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt die zwei bekannten Zahlen warm ein; Stufe 3 legt die Rechnung als Punkte
 * darunter (bekannte Zahl als Punkte, was fehlt als leere Punkte, was abgezogen wird durchgestrichen). Keine Zahl.
 */
export interface Klecks {
  /** null = unter einem Klecks */
  links: number | null;
  zeichen: '+' | '−';
  rechts: number | null;
  ergebnis: number | null;
}

export const BREITE = 340;
const KW = 66;
const ZW = 34;
const Y = 14;
const KH = 64;

const rechne = (a: number, z: Klecks['zeichen'], b: number) => (z === '+' ? a + b : a - b);

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Klecks {
  const zr = e.zahlenraum;
  const g = stufe === 1 ? kleinerRaum(zr) : zr;
  for (;;) {
    const form = stufe === 1 ? 'plus-hinten' : stufe === 2 ? z.eins(['plus-hinten', 'plus-vorn', 'minus-hinten'] as const) : z.eins(['minus-vorn', 'plus-vorn'] as const);
    const plus = form.startsWith('plus');
    const a = z.ganz(plus ? 0 : 1, g);
    const b = z.ganz(1, Math.max(1, Math.min(stufe === 1 ? 9 : 19, g)));
    const c = rechne(a, plus ? '+' : '−', b);
    if (c < 0 || c > g) continue;
    if (a === 0 || c === 0) continue;
    const ueber = ueberZehner(a, c);
    if (stufe === 1 && ueber) continue;
    if (stufe === 2 && zr !== 10 && !ueber) continue;
    if (stufe === 3 && form === 'plus-vorn' && zr !== 10 && !ueber) continue;
    const zeichen = plus ? '+' : '−';
    if (form.endsWith('vorn')) return { links: null, zeichen, rechts: b, ergebnis: c };
    return { links: a, zeichen, rechts: null, ergebnis: c };
  }
}

/** Löser: jeder Klecks 0–100; jede Belegung, die stimmt, ist eine Antwort (Wert unter dem ersten Klecks) */
function loesungen(k: Klecks): Antwort[] {
  const werte = (v: number | null) => (v === null ? Array.from({ length: 101 }, (_, i) => i) : [v]);
  const out: Antwort[] = [];
  for (const a of werte(k.links))
    for (const b of werte(k.rechts))
      for (const c of werte(k.ergebnis))
        if (rechne(a, k.zeichen, b) === c) out.push({ art: 'zahl', wert: k.links === null ? a : k.rechts === null ? b : c });
  return out;
}

/** Punkte der Hilfe Stufe 3 (eine Lücke) */
export function hilfePunkte(k: Klecks): PunktArt[] {
  const c = k.ergebnis ?? 0;
  if (k.zeichen === '+') {
    if (k.links !== null) return [...punkte(k.links, 'erster'), ...punkte(c - k.links, 'leer')];
    const b = k.rechts ?? 0;
    return [...punkte(c - b, 'leer'), ...punkte(b, 'zweiter')];
  }
  if (k.links !== null) return [...punkte(c, 'erster'), ...punkte(k.links - c, 'weg')];
  return [...punkte(c, 'erster'), ...punkte(k.rechts ?? 0, 'weg')];
}

/** Tintenklecks: runde Lache mit Zacken und zwei Spritzern; darauf „?“ oder die Zahl des Kindes (hell) */
function klecks(cx: number, cy: number, inhalt: string, eigen: boolean): string {
  const farbe = ZIFFER_FARBEN[7];
  const kante = ZIFFER_KANTEN[7];
  // geschlossene, weiche Kontur: Q-Kurven zwischen Spitzen und Mulden
  const n = 9;
  let d = '';
  for (let i = 0; i < n; i++) {
    const w = (i / n) * Math.PI * 2;
    const wm = ((i + 0.5) / n) * Math.PI * 2;
    const wn = ((i + 1) / n) * Math.PI * 2;
    const r = 33 + ((i * 7) % 3) * 2.5;
    const rn = 33 + (((i + 1) * 7) % 3) * 2.5;
    const x = cx + r * Math.cos(w);
    const y = cy + r * 0.88 * Math.sin(w);
    if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const qx = cx + 22 * Math.cos(wm);
    const qy = cy + 22 * 0.88 * Math.sin(wm);
    d += `Q${qx.toFixed(1)} ${qy.toFixed(1)} ${(cx + rn * Math.cos(wn)).toFixed(1)} ${(cy + rn * 0.88 * Math.sin(wn)).toFixed(1)}`;
  }
  d += 'Z';
  let s = `<g data-klecks="">`;
  s += `<path d="${d}" fill="${kante}" transform="translate(0 3)"/><path d="${d}" fill="${farbe}"/>`;
  s += `<circle cx="${cx + 31}" cy="${cy + 27}" r="5" fill="${farbe}"/><circle cx="${cx - 34}" cy="${cy - 22}" r="3.5" fill="${farbe}"/>`;
  s += `<ellipse cx="${cx - 12}" cy="${cy - 16}" rx="9" ry="5" fill="${WEISS}" opacity="0.35" transform="rotate(-25 ${cx - 12} ${cy - 16})"/>`;
  s += `<text${eigen ? ' data-inhalt=""' : ''} x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="31" font-weight="800" fill="${WEISS}">${inhalt}</text>`;
  return s + '</g>';
}

/**
 * Zahl, Zeichen, Zahl, =, Zahl als Kacheln; der Klecks liegt auf einer. `hilfe` 2: die bekannten Zahlen eingerahmt;
 * 3: dazu die Punkte. `vorrechnen`: wie 2, auf dem Klecks steht die Lösung.
 */
function zeichne(k: Klecks, o: ZeichenOptionen): string {
  const hervor = o.hilfe >= 2 || !!o.vorrechnen;
  const breite = 3 * KW + 2 * ZW + 4 * 6;
  let x = (BREITE - breite) / 2;
  const loesung = o.vorrechnen ? (loesungen(k)[0] as { wert: number }).wert : null;
  let s = '';
  const glied = (v: number | null) => {
    if (v === null) {
      const g = gewaehlteZahl(o.gewaehlt);
      const inhalt = loesung ?? g;
      s += klecks(x + KW / 2, Y + KH / 2 + 2, inhalt === null ? '?' : String(inhalt), loesung === null && g !== null);
    } else {
      if (hervor) s += hilfeRahmen(x - 5, Y - 5, KW + 10, KH + 14, 'teil');
      s += kachel(x, Y, KW, KH, String(v), String(v).length > 2 ? 26 : 30);
    }
    x += KW + 6;
  };
  const zei = (z: string) => {
    s += zeichen(x + ZW / 2, Y + KH / 2, z, 34);
    x += ZW + 6;
  };
  glied(k.links);
  zei(k.zeichen);
  glied(k.rechts);
  zei('=');
  glied(k.ergebnis);
  let H = Y + KH + 22;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const f = punktefeld(hilfePunkte(k), BREITE, H);
    s += f.svg;
    H += f.hoehe + 6;
  }
  return svgHuelle(BREITE, H, 'Klecks-Rätsel', s);
}

export const KLECKS: Format<Klecks> = {
  id: 'klecks',
  nr: 71,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'unterDemKlecks',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 1 + Klecks = 2; (2) 2 + Klecks = 5; (3) gewöhnliche Aufgabe der Stufe 1: 4 + Klecks = 7 */
  beispiele: () => [
    { links: 1, zeichen: '+', rechts: null, ergebnis: 2 },
    { links: 2, zeichen: '+', rechts: null, ergebnis: 5 },
    { links: 4, zeichen: '+', rechts: null, ergebnis: 7 },
  ],
};
