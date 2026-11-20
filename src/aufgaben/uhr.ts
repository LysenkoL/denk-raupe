import type { Antwort } from '../perlen/antwort';
import { gleich } from '../perlen/antwort';
import { zeit } from '../perlen/perle';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { HONIG, HONIG_KANTE, LATERNE, LATERNE_KANTE, PAPIER, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE, WEISS, ZIFFER_FARBEN } from '../design/farbe';
import { svgHuelle } from './zaehlen';
import { nest as mulde } from './bildteile';

/**
 * Uhr (Nr. 18, Engine Bild, Antwort Wahl): eine Uhr mit Zeigern – wie spät ist es? Die Perlen zeigen Uhrzeiten (7:30).
 * Stufe 1: volle und halbe Stunden; drei Perlen – die richtige, die Stunde daneben (halb 8 ≠ 8:30) und die vertauschten
 *          Zeiger.
 * Stufe 2: schwerer wird die Genauigkeit – Viertelstunden (7:15, 7:45); vier Perlen.
 * Stufe 3: schwerer wird der Tag – neben der Uhr Sonne oder Mond: Sonne am Nachmittag (Zeiger auf 1–5) heißt 13–17 Uhr,
 *          Sonne am Vormittag (8–11) bleibt 8–11 Uhr, Mond (8–11) heißt 20–23 Uhr. Antwort in Ziffern (15:00); vier Perlen,
 *          darunter dieselbe Zeit ohne Nachmittag (3:00). Grenzstunden (6, 7, 12) kommen auf Stufe 3 nicht vor – dort
 *          wäre Sonne oder Mond nicht eindeutig.
 * Der Löser liest die Zeiger: der große Zeiger gibt die Minuten (nur 0, 15, 30, 45), der kleine muss dazu passen
 * (zwischen zwei Zahlen, je nach Minuten); passen sie nicht zusammen, gibt es keine Lösung. Dazu Sonne oder Mond.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt den großen Zeiger hervor (zuerst die Minuten); Stufe 3 färbt das Stück des
 * Zifferblatts, in dem der kleine Zeiger steht (zwischen zwei Zahlen). Steht er genau auf einer Zahl (volle Stunde),
 * verrät das die Stunde und mit dem großen Zeiger alles – dann an der ähnlichen Aufgabe.
 */
export type Tageszeit = 'keine' | 'sonne' | 'mond';
export interface Uhr {
  /** Winkel der Zeiger in Grad, im Uhrzeigersinn ab 12 */
  stundenWinkel: number;
  minutenWinkel: number;
  tageszeit: Tageszeit;
}

/** Uhr zu einer Zeit (Stunde 0–23): Zeiger wie bei einer echten Uhr */
export function uhrFuer(stunde: number, minute: number, tageszeit: Tageszeit = 'keine'): Uhr {
  return { stundenWinkel: ((stunde % 12) * 30 + minute / 2) % 360, minutenWinkel: minute * 6, tageszeit };
}

/** Stunde auf dem Zifferblatt (1–12) und Minute aus den Zeigern; null, wenn sie nicht zusammenpassen */
export function ablesen(u: Uhr): { stunde: number; minute: number } | null {
  const minute = Math.round(u.minutenWinkel / 6) % 60;
  if (Math.abs(u.minutenWinkel - minute * 6) > 0.5 || minute % 15 !== 0) return null;
  // der kleine Zeiger steht um minute/2 Grad hinter seiner Zahl
  const basis = u.stundenWinkel - minute / 2;
  const h = Math.round(basis / 30);
  if (Math.abs(basis - h * 30) > 1) return null;
  return { stunde: ((h % 12) + 12) % 12 || 12, minute };
}

/** Stunde 0–23 nach Sonne und Mond; null, wenn sie nicht eindeutig ist */
export function tagesStunde(h12: number, t: Tageszeit): number | null {
  if (t === 'keine') return h12;
  if (t === 'sonne') return h12 >= 8 && h12 <= 11 ? h12 : h12 >= 1 && h12 <= 5 ? h12 + 12 : null;
  return h12 >= 8 && h12 <= 11 ? h12 + 12 : null;
}

const alsZeit = (stunde: number, minute: number): Antwort => ({ art: 'zeit', stunde, minute });

function loesungen(u: Uhr): Antwort[] {
  const z = ablesen(u);
  if (!z) return [];
  const s = tagesStunde(z.stunde, u.tageszeit);
  return s === null ? [] : [alsZeit(s, z.minute)];
}

function erzeuge(z: Zufall, stufe: number): Uhr {
  if (stufe === 3) {
    const t = z.eins(['sonne', 'sonne', 'mond'] as const);
    const h12 = t === 'sonne' ? z.eins([1, 2, 3, 4, 5, 8, 9, 10, 11]) : z.ganz(8, 11);
    return uhrFuer(h12, z.eins([0, 30, 0, 15, 45]), t);
  }
  const minute = stufe === 1 ? z.eins([0, 30]) : z.eins([15, 45, 0, 30, 15, 45]);
  return uhrFuer(z.ganz(1, 12), minute);
}

/** Perlen: die richtige; die Stunde daneben (halb 8 ist 7:30, nicht 8:30); vertauschte Zeiger; ohne Nachmittag; andere Viertel */
function wahl(u: Uhr, z: Zufall): Antwort[] {
  const l = loesungen(u)[0] as Extract<Antwort, { art: 'zeit' }>;
  const a = ablesen(u)!;
  const anzahl = u.tageszeit === 'keine' && (a.minute === 0 || a.minute === 30) ? 3 : 4;
  const tag = u.tageszeit !== 'keine';
  // Stunde verschieben: auf dem Zifferblatt 1–12, mit Sonne oder Mond 0–23
  const neben = (h: number, d: number) => (tag ? (h + d + 24) % 24 : ((h + d - 1 + 24) % 12) + 1);
  const h = l.stunde;
  const kandidaten: Antwort[] = [
    alsZeit(neben(h, a.minute >= 30 ? 1 : -1), a.minute),
    alsZeit(a.minute === 0 ? 12 : a.minute / 5, (Math.round(u.stundenWinkel / 90) * 15) % 60),
    ...(tag ? [alsZeit(a.stunde, a.minute), alsZeit(neben(h, h >= 12 ? -12 : 12), a.minute)] : []),
    alsZeit(h, (a.minute + 30) % 60),
    alsZeit(h, (a.minute + 15) % 60),
    alsZeit(neben(h, a.minute >= 30 ? -1 : 1), a.minute),
  ];
  const out: Antwort[] = [l];
  for (const k of kandidaten) if (out.length < anzahl && !out.some((o) => gleich(o, k))) out.push(k);
  return z.mischen(out);
}

/** Hilfe Stufe 3 verrät bei voller Stunde alles (kleiner Zeiger genau auf der Zahl) */
const schrittVerraet = (u: Uhr) => ablesen(u)?.minute === 0;

/* ---------- Bild ---------- */

const R = 104;
/** Nachthimmel hinter dem Mond: dunkles Blau, damit die helle Sichel klar zu sehen ist */
const NACHT = '#2B3A67';
const f = (n: number) => Math.round(n * 10) / 10;
const lage = (cx: number, cy: number, w: number, r: number): [number, number] => {
  const b = ((w - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(b), cy + r * Math.sin(b)];
};

/** Sonne oder Mond in der Ecke */
function himmel(x: number, y: number, t: Tageszeit): string {
  if (t === 'sonne') {
    let s = '';
    for (let k = 0; k < 8; k++) {
      const [a, b] = lage(x, y, k * 45, 22);
      const [c, d] = lage(x, y, k * 45, 31);
      s += `<path d="M${f(a)} ${f(b)}L${f(c)} ${f(d)}" stroke="${HONIG_KANTE}" stroke-width="5" stroke-linecap="round"/>`;
    }
    return `<g data-zeichen="sonne">${s}<circle cx="${x}" cy="${y}" r="16" fill="${HONIG}" stroke="${HONIG_KANTE}" stroke-width="3"/></g>`;
  }
  if (t === 'mond')
    return `<g data-zeichen="mond"><circle cx="${x}" cy="${y}" r="27" fill="${NACHT}"/><path d="M${x + 6} ${y - 20} A20 20 0 1 0 ${x + 6} ${y + 20} A15 15 0 1 1 ${x + 6} ${y - 20} Z" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/></g>`;
  return '';
}

/**
 * Zifferblatt mit Zahlen 1–12 und Minutenstrichen, kleiner Zeiger dunkel und kurz, großer Zeiger blau und lang;
 * rechts oben Sonne oder Mond, darunter das Nest der Uhrzeit.
 * `hilfe` 2: großer Zeiger warm hervorgehoben; 3: dazu das Stück zwischen den Zahlen, in dem der kleine Zeiger steht.
 */
function zeichne(u: Uhr, o: ZeichenOptionen): string {
  const W = 300;
  const cx = W / 2;
  const cy = R + 14;
  let s = '';
  const blatt = o.hilfe >= 3 && (o.aehnlich || !schrittVerraet(u)) && !o.vorrechnen;
  s += `<circle cx="${cx}" cy="${cy + 5}" r="${R + 8}" fill="${STEIN_KANTE}"/><circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="${STEIN}"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="${PAPIER}"/>`;
  if (blatt) {
    const a = Math.floor(u.stundenWinkel / 30) * 30;
    const [x1, y1] = lage(cx, cy, a, R - 2);
    const [x2, y2] = lage(cx, cy, a + 30, R - 2);
    s += `<path data-hilfe="schritt" d="M${cx} ${cy}L${f(x1)} ${f(y1)}A${R - 2} ${R - 2} 0 0 1 ${f(x2)} ${f(y2)}Z" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  }
  for (let k = 0; k < 60; k++) {
    const voll = k % 5 === 0;
    const [a, b] = lage(cx, cy, k * 6, R - 3);
    const [c, d] = lage(cx, cy, k * 6, R - (voll ? 13 : 8));
    s += `<path d="M${f(a)} ${f(b)}L${f(c)} ${f(d)}" stroke="${voll ? TINTE : TINTE_LEISE}" stroke-width="${voll ? 3 : 1.5}" stroke-linecap="round"/>`;
  }
  for (let k = 1; k <= 12; k++) {
    const [x, y] = lage(cx, cy, k * 30, R - 30);
    s += `<text x="${f(x)}" y="${f(y + 8)}" text-anchor="middle" font-size="23" font-weight="800" fill="${TINTE}">${k}</text>`;
  }
  // großer Zeiger (Minuten): lang, blau; kleiner Zeiger (Stunden): kurz, dick, dunkel
  const blau = ZIFFER_FARBEN[6];
  const [mx, my] = lage(cx, cy, u.minutenWinkel, R - 16);
  const [hx, hy] = lage(cx, cy, u.stundenWinkel, R * 0.5);
  if (o.hilfe >= 2 || o.vorrechnen) s += `<path data-hilfe="teil" d="M${cx} ${cy}L${f(mx)} ${f(my)}" stroke="${LATERNE_KANTE}" stroke-width="16" stroke-linecap="round" opacity="0.8"/>`;
  s += `<path data-zeiger="minuten" d="M${cx} ${cy}L${f(mx)} ${f(my)}" stroke="${blau}" stroke-width="7" stroke-linecap="round"/>`;
  s += `<path data-zeiger="stunden" d="M${cx} ${cy}L${f(hx)} ${f(hy)}" stroke="${TINTE}" stroke-width="11" stroke-linecap="round"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="8" fill="${TINTE}"/><circle cx="${cx}" cy="${cy}" r="3" fill="${WEISS}"/>`;
  s += himmel(W - 34, 34, u.tageszeit);
  // Nest der Uhrzeit
  const ny = cy + R + 22;
  s += mulde(W / 2 - 60, ny, 120, 58);
  const a = o.vorrechnen ? loesungen(u)[0] : o.gewaehlt;
  if (a?.art === 'zeit') s += `<text${o.vorrechnen ? '' : ' data-inhalt=""'} x="${W / 2}" y="${ny + 40}" text-anchor="middle" font-size="30" font-weight="800" fill="${TINTE}">${zeit(a.stunde, a.minute)}</text>`;
  else s += `<text x="${W / 2}" y="${ny + 40}" text-anchor="middle" font-size="30" font-weight="800" fill="${TINTE_LEISE}">?</text>`;
  return svgHuelle(W, ny + 70, 'Uhr', s);
}

export const UHR: Format<Uhr> = {
  id: 'uhr',
  nr: 18,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z8',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieSpaet',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'wahl' }),
  wahl,
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) 3 Uhr; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator (halbe Stunde). */
  beispiele: () => {
    let zweite: Uhr | null = null;
    for (let s = 0; !zweite; s++) {
      const u = aufgabeAus(UHR, s * 2654435761, 1).bedingung;
      if (ablesen(u)?.minute === 30) zweite = u;
    }
    return [uhrFuer(3, 0), zweite];
  },
};
