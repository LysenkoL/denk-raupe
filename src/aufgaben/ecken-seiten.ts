import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Format, ZeichenOptionen } from './format';
import { FIGUR_TOKEN, FORM_FARBEN, LATERNE, LATERNE_KANTE, PAPIER, TINTE, WEISS, kanteZu, mix, type FormFarbe } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, nest, schild, svgHuelle } from './zaehlen';

/**
 * Ecken und Seiten (Nr. 93, Engine Bild): eine große Form – wie viele Ecken (oder Seiten) hat sie?
 * Was gezählt wird, zeigt das Schild: Quadrat mit einem dicken Punkt an einer Ecke = Ecken; Quadrat mit einer
 * dicken farbigen Seite = Seiten.
 * Stufe 1: regelmäßige Formen mit 3–6 Ecken, gerade stehend (eine Seite unten waagerecht).
 * Stufe 2: schwerer wird die Gestalt – unregelmäßige gewölbte Formen mit 3–7 Ecken, gedreht.
 * Stufe 3: schwerer wird die Art – nicht gewölbte Formen (Winkel, T, U, Treppe, Pfeil, Haus, Stern) mit 5–12 Ecken,
 *          gedreht und gespiegelt; eine Ecke kann nach innen zeigen.
 * Der Löser liest nur die Punkte des Umrisses: Ecke ist ein Punkt, an dem der Umriss deutlich abknickt (mindestens
 * 25°). Knickt er kaum (8–25°), ist unklar, ob das Kind dort eine Ecke sieht – zwei Antworten, verworfen; ebenso bei
 * einer sehr kurzen Seite oder einem Umriss, der sich selbst schneidet. Bei einer geschlossenen Form gibt es so viele
 * Seiten wie Ecken.
 *
 * Hilfe auf dem Bild: Stufe 2 markiert den Anfang – die erste Ecke (oder Seite) warm, dazu das Schild;
 * Stufe 3 markiert von dort im Uhrzeigersinn die erste Hälfte der Ecken (oder Seiten) als gezählt.
 * Jede Ecke (jede Seite) lässt sich antippen und als gezählt markieren (data-zaehl).
 */
export type Was = 'ecken' | 'seiten';
export interface EckenSeiten {
  /** Punkte des Umrisses im Bild, im Uhrzeigersinn auf dem Bildschirm */
  punkte: [number, number][];
  was: Was;
  farbe: FormFarbe;
}

const KNICK = 25;
const KAUM = 8;
const KURZ = 22;

/** Knickwinkel in Grad an jedem Punkt (0 = gerade weiter) */
export function knicke(p: readonly [number, number][]): number[] {
  const n = p.length;
  return p.map((q, i) => {
    const a = p[(i + n - 1) % n];
    const b = p[(i + 1) % n];
    const w1 = Math.atan2(q[1] - a[1], q[0] - a[0]);
    const w2 = Math.atan2(b[1] - q[1], b[0] - q[0]);
    let d = ((w2 - w1) * 180) / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return Math.abs(d);
  });
}

function schneiden(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const o = (p: [number, number], q: [number, number], r: [number, number]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** schneidet sich der Umriss selbst? (nicht benachbarte Seiten) */
export function selbstSchnitt(p: readonly [number, number][]): boolean {
  const n = p.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      if (schneiden(p[i], p[(i + 1) % n], p[j], p[(j + 1) % n])) return true;
    }
  return false;
}

/** Löser: deutliche Knicke zählen; unklare Knicke, kurze Seiten oder Selbstschnitt → zwei Antworten */
function loesungen(b: EckenSeiten): Antwort[] {
  const k = knicke(b.punkte);
  const n = k.filter((w) => w >= KNICK).length;
  const unklar =
    n < 3 ||
    k.some((w) => w >= KAUM && w < KNICK) ||
    selbstSchnitt(b.punkte) ||
    b.punkte.some((q, i) => {
      const r = b.punkte[(i + 1) % b.punkte.length];
      return Math.hypot(r[0] - q[0], r[1] - q[1]) < KURZ;
    });
  return unklar ? [{ art: 'zahl', wert: n }, { art: 'zahl', wert: n + 1 }] : [{ art: 'zahl', wert: n }];
}

/* ---------- Formen ---------- */

const FELD_B = 250;
const FELD_H = 200;
const KOPF = 76;

/** Vorlagen der Stufe 3 auf einem Raster (Einheiten), im Uhrzeigersinn auf dem Bildschirm (y nach unten) */
export const VORLAGEN: Record<string, [number, number][]> = {
  winkel: [[0, 0], [1, 0], [1, 2], [3, 2], [3, 3], [0, 3]],
  t: [[0, 0], [3, 0], [3, 1], [2, 1], [2, 3], [1, 3], [1, 1], [0, 1]],
  u: [[0, 0], [1, 0], [1, 2], [2, 2], [2, 0], [3, 0], [3, 3], [0, 3]],
  treppe: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [0, 3]],
  pfeil: [[0, 1], [2, 1], [2, 0], [3.5, 1.5], [2, 3], [2, 2], [0, 2]],
  haus: [[0, 1.2], [1.5, 0], [3, 1.2], [3, 3], [0, 3]],
  plus: [[1, 0], [2, 0], [2, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 2], [0, 2], [0, 1], [1, 1]],
  stern: Array.from({ length: 10 }, (_, i) => {
    const w = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.75 : 1.6;
    return [1.6 + r * Math.cos(w), 1.6 + r * Math.sin(w)] as [number, number];
  }),
  zickzack: [[0, 0], [1, 1], [2, 0], [3, 1], [3, 3], [0, 3]],
};

/** im Uhrzeigersinn auf dem Bildschirm (y nach unten): Fläche nach der Schnürsenkelformel positiv */
function imUhrzeigersinn(p: [number, number][]): [number, number][] {
  let a = 0;
  p.forEach((q, i) => {
    const r = p[(i + 1) % p.length];
    a += q[0] * r[1] - r[0] * q[1];
  });
  return a >= 0 ? p : [...p].reverse();
}

/** Punkte drehen (Grad), spiegeln und in das Feld einpassen (unter dem Kopf, mittig) */
export function einpassen(p: [number, number][], dreh = 0, spiegeln = false): [number, number][] {
  const w = (dreh * Math.PI) / 180;
  const [c, s] = [Math.cos(w), Math.sin(w)];
  let q = p.map(([x, y]) => [spiegeln ? -x : x, y]).map(([x, y]) => [x * c - y * s, x * s + y * c] as [number, number]);
  const xs = q.map((r) => r[0]);
  const ys = q.map((r) => r[1]);
  const [x0, y0] = [Math.min(...xs), Math.min(...ys)];
  const m = Math.min(FELD_B / (Math.max(...xs) - x0 || 1), FELD_H / (Math.max(...ys) - y0 || 1));
  const bw = (Math.max(...xs) - x0) * m;
  const bh = (Math.max(...ys) - y0) * m;
  q = q.map(([x, y]) => [Math.round(((x - x0) * m + (FELD_B - bw) / 2 + 20) * 10) / 10, Math.round(((y - y0) * m + (FELD_H - bh) / 2 + KOPF + 14) * 10) / 10]);
  return imUhrzeigersinn(q);
}

/** regelmäßige Form mit n Ecken, eine Seite unten waagerecht */
export function regelmaessig(n: number): [number, number][] {
  const start = Math.PI / 2 + Math.PI / n;
  return Array.from({ length: n }, (_, i) => {
    const w = start + (i * 2 * Math.PI) / n;
    return [Math.cos(w), Math.sin(w)] as [number, number];
  });
}

const FARBEN: FormFarbe[] = ['rot', 'orange', 'gruen', 'blau', 'lila'];

function erzeuge(z: Zufall, stufe: number): EckenSeiten {
  const was: Was = z.eins(['ecken', 'seiten'] as const);
  const farbe = z.eins(FARBEN);
  if (stufe === 1) return { punkte: einpassen(regelmaessig(z.ganz(3, 6))), was, farbe };
  if (stufe === 2) {
    const n = z.ganz(3, 7);
    // Winkel um die Mitte mit Mindestabstand, Radius leicht verschieden: immer gewölbt
    for (;;) {
      const w = Array.from({ length: n }, () => z.zahl() * 2 * Math.PI).sort((a, b) => a - b);
      const luecken = w.map((a, i) => (i === n - 1 ? w[0] + 2 * Math.PI : w[i + 1]) - a);
      if (Math.min(...luecken) < (2 * Math.PI) / n / 2.2 || Math.max(...luecken) > Math.PI * 0.9) continue;
      const p = w.map((a) => [Math.cos(a), Math.sin(a)] as [number, number]);
      return { punkte: einpassen(p, z.ganz(0, 23) * 15), was, farbe };
    }
  }
  const vorlage = VORLAGEN[z.eins(Object.keys(VORLAGEN))];
  return { punkte: einpassen(vorlage, z.ganz(0, 7) * 45 + z.eins([0, 15]), z.zahl() < 0.5), was, farbe };
}

/* ---------- Bild ---------- */

const pfad = (p: readonly [number, number][]) => p.map(([x, y]) => `${x},${y}`).join(' ');
/** Punkte mit deutlichem Knick (Ecken), in der Reihenfolge des Umrisses */
const eckPunkte = (b: EckenSeiten) => {
  const k = knicke(b.punkte);
  return b.punkte.filter((_, i) => k[i] >= KNICK);
};

/** Schild: Quadrat mit Punkt an einer Ecke (Ecken) oder mit dicker Seite (Seiten) */
function zeichenSchild(x: number, y: number, was: Was, hell: boolean): string {
  let t = '';
  if (hell) t += hilfeRahmen(x - 6, y - 6, 92, 76, 'teil', 18);
  t += schild(x, y, 80, 62);
  const [a, b, c] = [x + 22, x + 58, y + 14];
  const grau = FIGUR_TOKEN['hut-grau'];
  t += `<rect x="${a}" y="${c}" width="${b - a}" height="36" rx="2" fill="${grau}" stroke="${FIGUR_TOKEN['hut-grau-kante']}" stroke-width="3"/>`;
  if (was === 'ecken') t += `<circle data-zeichen="ecke" cx="${b}" cy="${c}" r="7" fill="${FIGUR_TOKEN.halstuch}" stroke="${TINTE}" stroke-width="2"/>`;
  else t += `<path data-zeichen="seite" d="M${a} ${c + 36}H${b}" stroke="${FIGUR_TOKEN.halstuch}" stroke-width="8" stroke-linecap="round"/>`;
  return t;
}

/** Marke an einer Ecke oder Seite: `art` teil (Anfang), schritt (gezählt) */
function marke(b: EckenSeiten, k: number, art: 'teil' | 'schritt'): string {
  const e = eckPunkte(b);
  const fill = art === 'teil' ? LATERNE : WEISS;
  if (b.was === 'ecken') {
    const [x, y] = e[k];
    return `<circle data-hilfe="${art}" cx="${x}" cy="${y}" r="13" fill="${fill}" stroke="${LATERNE_KANTE}" stroke-width="4"/>`;
  }
  const [p, q] = [e[k], e[(k + 1) % e.length]];
  const d = `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`;
  if (art === 'teil') return `<path data-hilfe="teil" d="${d}" stroke="${LATERNE_KANTE}" stroke-width="12" stroke-linecap="round"/>`;
  return `<g data-hilfe="schritt"><path d="${d}" stroke="${LATERNE_KANTE}" stroke-width="13" stroke-linecap="round"/><path d="${d}" stroke="${WEISS}" stroke-width="6" stroke-linecap="round"/></g>`;
}

/** antippbare Ecken oder Seiten: unsichtbar, bis das Kind tippt (Ring wie bei Wie viele?) */
function zaehlStellen(b: EckenSeiten): string {
  const e = eckPunkte(b);
  return e
    .map((p, k) => {
      const [x, y] = b.was === 'ecken' ? p : [(p[0] + e[(k + 1) % e.length][0]) / 2, (p[1] + e[(k + 1) % e.length][1]) / 2];
      return `<g data-zaehl="${k}"><circle cx="${x}" cy="${y}" r="16" fill="${PAPIER}" opacity="0"/><g class="zaehl-ring" opacity="0"><circle cx="${x}" cy="${y}" r="11" fill="${WEISS}" stroke="${LATERNE_KANTE}" stroke-width="3"/></g></g>`;
    })
    .join('');
}

/**
 * Schild oben links, Nest oben rechts, darunter die große Form (Fläche mit kräftigem Rand).
 * `hilfe` 2: Schild und Anfang hervorgehoben; 3: dazu die erste Hälfte im Uhrzeigersinn als gezählt markiert.
 * `vorrechnen`: alle Ecken (Seiten) markiert, im Nest die Zahl.
 */
function zeichne(b: EckenSeiten, o: ZeichenOptionen): string {
  const W = FELD_B + 40;
  const H = KOPF + FELD_H + 28;
  const c = FORM_FARBEN[b.farbe];
  let s = zeichenSchild(8, 6, b.was, o.hilfe >= 2 || !!o.vorrechnen);
  s += `<polygon points="${pfad(b.punkte.map(([x, y]) => [x + 2, y + 5]))}" fill="${kanteZu(c)}" stroke="${kanteZu(c)}" stroke-width="6" stroke-linejoin="round" opacity="0.6"/>`;
  s += `<polygon points="${pfad(b.punkte)}" fill="${mix(c, WEISS, 0.55)}" stroke="${mix(kanteZu(c), TINTE, 0.25)}" stroke-width="6" stroke-linejoin="round"/>`;
  const n = eckPunkte(b).length;
  if (o.vorrechnen) for (let k = 0; k < n; k++) s += marke(b, k, 'teil');
  else if (o.hilfe >= 2) {
    if (o.hilfe >= 3) for (let k = 1; k < Math.ceil(n / 2); k++) s += marke(b, k, 'schritt');
    s += marke(b, 0, 'teil');
  }
  s += zaehlStellen(b);
  const loesung = o.vorrechnen ? n : null;
  s += nest(W - 4 - 84, 10, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, H, 'Ecken und Seiten', s);
}

export const ECKEN_SEITEN: Format<EckenSeiten> = {
  id: 'ecken-seiten',
  nr: 93,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R3',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieViele',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab (höchstens 12): liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) Dreieck, Ecken; (2) Quadrat, Seiten; (3) gewöhnliche Aufgabe der Stufe 1: Sechseck, Ecken. */
  beispiele: () => [
    { punkte: einpassen(regelmaessig(3)), was: 'ecken', farbe: 'blau' },
    { punkte: einpassen(regelmaessig(4)), was: 'seiten', farbe: 'gruen' },
    { punkte: einpassen(regelmaessig(6)), was: 'ecken', farbe: 'orange' },
  ],
};
