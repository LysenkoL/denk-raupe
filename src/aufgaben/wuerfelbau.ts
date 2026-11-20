import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { FORM_FARBEN, LATERNE, LATERNE_KANTE, STEIN, STEIN_KANTE, TINTE, WEISS, kanteZu, mix, type FormFarbe } from '../design/farbe';
import { gewaehlteZahl, nest, svgHuelle } from './zaehlen';

/**
 * Würfelbau (Nr. 37, Engine Bild): Würfel stehen in Türmen auf einer Bodenplatte – wie viele Würfel sind es?
 * Die Platte hat ein oder zwei Reihen Felder; jeder Turm ist ein Stapel ohne Lücke (ein Würfel schwebt nie).
 * Stufe 1: eine Reihe, 2–3 Türme, je 1–3 hoch – jeder Würfel ist zu sehen.
 * Stufe 2: schwerer wird die Tiefe – zwei Reihen, 2–3 Felder breit; hinten verdecken vordere Türme untere Würfel.
 * Stufe 3: schwerer wird das Mitdenken – zwei Reihen, 3–4 Felder breit, mindestens ein Würfel ist ganz versteckt.
 * Bei Zahlenraum 10 höchstens 10 Würfel, sonst höchstens 16.
 *
 * Bild: Schrägbild (Kavalierperspektive, Tiefe halb so lang nach rechts oben). Bei höchstens zwei Reihen gehört
 * jede Deckfläche, die man sieht, zu genau einem Feld und einer Höhe (eine andere Lage gäbe dieselbe Fläche erst
 * zwei Reihen weiter hinten). Der Löser liest nur die Höhen und prüft mit Sehstrahlen, was zu sehen ist:
 * eindeutig ist der Bau, wenn von jedem Turm mindestens die Hälfte der Deckfläche und von jedem leeren Feld
 * mindestens die Hälfte des Bodens zu sehen ist (docs/LOESER.md, Abschnitt 6: „столбик, целиком спрятанный за
 * другим“). Sonst gibt er zwei Antworten, und die Aufgabe wird verworfen.
 *
 * Hilfe auf dem Bild (docs/TZ.md, „Помощь“: верхний этаж приподнимается, видны спрятанные кубики):
 * Stufe 2 hebt das oberste Stockwerk an (data-hilfe="teil") – darunter wird die nächste Lage sichtbar;
 * Stufe 3 legt alle Stockwerke auseinander (data-hilfe="schritt"): jeder Würfel ist zu sehen, gezählt wird selbst.
 */
export interface Wuerfelbau {
  /** Höhe je Feld: hoehen[reihe][spalte], Reihe 0 vorn */
  hoehen: number[][];
  farbe: FormFarbe;
}

/** Farben der Würfel: kräftig genug für drei Flächen auf hellem Grund (kein Gelb) */
export const WUERFEL_FARBEN = ['blau', 'gruen', 'orange', 'rot', 'lila'] as const satisfies readonly FormFarbe[];

const U = 40;
/** Anteil der Tiefe in x und y (Kavalierperspektive) */
const TX = 0.5;
const TY = 0.5;

export const summe = (b: Wuerfelbau): number => b.hoehen.flat().reduce((a, h) => a + h, 0);
const hoehe = (b: Wuerfelbau, x: number, d: number): number => b.hoehen[d]?.[x] ?? 0;

/**
 * Ist der Punkt (X, D, Z) von vorn zu sehen? Der Sehstrahl zum Kind läuft (X + TX·t, D − t, Z + TY·t), t > 0;
 * verdeckt ist er, wenn er durch einen Turm geht. Für jeden Turm wird das t-Intervall exakt berechnet.
 */
export function sichtbar(b: Wuerfelbau, X: number, D: number, Z: number): boolean {
  const eps = 1e-6;
  for (let d = 0; d < b.hoehen.length; d++)
    for (let x = 0; x < b.hoehen[d].length; x++) {
      const h = b.hoehen[d][x];
      if (!h) continue;
      const lo = Math.max(eps, (x - X) / TX, D - d - 1);
      const hi = Math.min((x + 1 - X) / TX, D - d, (h - Z) / TY);
      if (lo < hi - 1e-9) return false;
    }
  return true;
}

const PROBEN = [0.17, 0.39, 0.61, 0.83];
/** Anteil sichtbarer Punkte einer waagerechten Fläche des Feldes (x, d) in Höhe z */
export function anteilSichtbar(b: Wuerfelbau, x: number, d: number, z: number): number {
  let n = 0;
  for (const u of PROBEN) for (const v of PROBEN) if (sichtbar(b, x + u, d + v, z)) n++;
  return n / (PROBEN.length * PROBEN.length);
}

/** ist von Würfel (x, d, z) irgendetwas zu sehen (Vorderseite, rechte Seite oder Deckfläche)? */
export function wuerfelSichtbar(b: Wuerfelbau, x: number, d: number, z: number): boolean {
  for (const u of PROBEN)
    for (const v of PROBEN) {
      if (sichtbar(b, x + u, d, z + v)) return true;
      if (sichtbar(b, x + 1, d + u, z + v)) return true;
      if (z === hoehe(b, x, d) - 1 && sichtbar(b, x + u, d + v, z + 1)) return true;
    }
  return false;
}

/** Zahl der Würfel, von denen nichts zu sehen ist (man muss sie sich denken) */
export function versteckte(b: Wuerfelbau): number {
  let n = 0;
  b.hoehen.forEach((reihe, d) => reihe.forEach((h, x) => {
    for (let z = 0; z < h; z++) if (!wuerfelSichtbar(b, x, d, z)) n++;
  }));
  return n;
}

/** Löser: jede Höhe muss sich am Bild ablesen lassen – dann genau die Summe, sonst zwei Antworten */
function loesungen(b: Wuerfelbau): Antwort[] {
  const n = summe(b);
  // mehr als zwei Reihen: Deckflächen lassen sich nicht mehr eindeutig einem Feld zuordnen
  let klar = b.hoehen.length >= 1 && b.hoehen.length <= 2 && n > 0;
  b.hoehen.forEach((reihe, d) => reihe.forEach((h, x) => {
    if (h > 0 && anteilSichtbar(b, x, d, h) < 0.5) klar = false;
    if (h === 0 && anteilSichtbar(b, x, d, 0) < 0.5) klar = false;
  }));
  return klar ? [{ art: 'zahl', wert: n }] : [{ art: 'zahl', wert: n }, { art: 'zahl', wert: n + 1 }];
}

function reihe(z: Zufall, breite: number, von: number, bis: number): number[] {
  return Array.from({ length: breite }, () => z.ganz(von, bis));
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Wuerfelbau {
  const farbe = z.eins(WUERFEL_FARBEN);
  const max = e.zahlenraum === 10 ? 10 : 16;
  for (;;) {
    let hoehen: number[][];
    if (stufe === 1) hoehen = [reihe(z, z.ganz(2, 3), 1, 3)];
    else if (stufe === 2) {
      const breite = z.ganz(2, 3);
      hoehen = [reihe(z, breite, 0, 2), reihe(z, breite, 1, 3)];
    } else {
      const breite = z.ganz(3, 4);
      hoehen = [reihe(z, breite, 0, 3), reihe(z, breite, 0, 3)];
    }
    const b: Wuerfelbau = { hoehen, farbe };
    const n = summe(b);
    if (n > max || n < (stufe === 3 ? 7 : stufe === 2 ? 4 : 2)) continue;
    // jede Reihe trägt etwas; auf Stufe 2 und 3 steht vorn mindestens ein Turm
    if (hoehen.some((r) => r.every((h) => h === 0))) continue;
    if (stufe === 3 && versteckte(b) < 1) continue;
    return b;
  }
}

/* ---------- Bild ---------- */

const f = (n: number) => Math.round(n * 10) / 10;

/** Lage auf dem Bildschirm: Ursprung (ox, oy) = vordere linke untere Ecke des Feldes (0, 0) */
function punkt(ox: number, oy: number, x: number, d: number, z: number): string {
  return `${f(ox + U * (x + TX * d))},${f(oy - U * (z + TY * d))}`;
}

function flaeche(pkte: string[], fill: string, stroke: string): string {
  return `<polygon points="${pkte.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
}

/** ein Würfel: Vorderseite, rechte Seite, Deckfläche (Licht von oben links) */
function wuerfel(ox: number, oy: number, x: number, d: number, z: number, c: string): string {
  const kante = kanteZu(c);
  const linie = mix(kante, TINTE, 0.3);
  const p = (dx: number, dd: number, dz: number) => punkt(ox, oy, x + dx, d + dd, z + dz);
  return (
    flaeche([p(0, 0, 0), p(1, 0, 0), p(1, 0, 1), p(0, 0, 1)], c, linie) +
    flaeche([p(1, 0, 0), p(1, 1, 0), p(1, 1, 1), p(1, 0, 1)], kante, linie) +
    flaeche([p(0, 0, 1), p(1, 0, 1), p(1, 1, 1), p(0, 1, 1)], mix(c, WEISS, 0.42), linie)
  );
}

/** Hub eines Stockwerks in Würfeln: Stufe 2 hebt das oberste an, Stufe 3 legt alle auseinander */
function hub(z: number, oben: number, art: 'ganz' | 'oben' | 'aus'): number {
  if (art === 'aus') return z * 0.6;
  if (art === 'oben') return z === oben && oben > 0 ? 0.6 : 0;
  return 0;
}

/**
 * Bodenplatte mit Feldern, darauf die Türme (von hinten nach vorn, von links nach rechts, von unten nach oben).
 * Darunter rechts das Nest der Antwort. `hilfe` 2: oberstes Stockwerk angehoben; 3: alle Stockwerke auseinander.
 * `vorrechnen` (ähnliche Aufgabe): auseinander und die Zahl im Nest.
 */
function zeichne(b: Wuerfelbau, o: ZeichenOptionen): string {
  const tiefe = b.hoehen.length;
  const breite = Math.max(...b.hoehen.map((r) => r.length));
  const oben = Math.max(...b.hoehen.flat()) - 1;
  const art: 'ganz' | 'oben' | 'aus' = o.vorrechnen || o.hilfe >= 3 ? 'aus' : o.hilfe >= 2 ? 'oben' : 'ganz';
  const maxHub = hub(oben, oben, art);
  const W = Math.max(U * (breite + TX * tiefe) + 40, 190);
  const turmH = U * (oben + 1 + maxHub + TY * tiefe);
  const ox = (W - U * (breite + TX * tiefe)) / 2;
  const oy = 14 + turmH;
  const c = FORM_FARBEN[b.farbe];
  let s = '';
  // Bodenplatte: Kante vorn, Felder aus Sandstein
  const ecke = (x: number, d: number) => punkt(ox, oy, x, d, 0);
  const [vl, vr] = [ecke(0, 0), ecke(breite, 0)];
  const unten = (p: string) => p.replace(/,([\d.]+)$/, (_, y) => `,${f(Number(y) + 8)}`);
  s += `<polygon points="${vl} ${vr} ${ecke(breite, tiefe)} ${unten(ecke(breite, tiefe))} ${unten(vr)} ${unten(vl)}" fill="${STEIN_KANTE}"/>`;
  for (let d = 0; d < tiefe; d++)
    for (let x = 0; x < breite; x++) s += `<polygon points="${ecke(x, d)} ${ecke(x + 1, d)} ${ecke(x + 1, d + 1)} ${ecke(x, d + 1)}" fill="${STEIN}" stroke="${STEIN_KANTE}" stroke-width="2.5"/>`;
  s += zeichneTuerme(b, ox, oy, oben, art, c, o);
  const nx = W - 4 - 84;
  const ny = oy + 8 + 14;
  const loesung = o.vorrechnen ? summe(b) : null;
  s += nest(nx, ny, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, ny + 54 + 8, 'Würfelbau', s);
}

/** Türme in der richtigen Reihenfolge; ein angehobener Würfel trägt die Markierung der Hilfe */
function zeichneTuerme(b: Wuerfelbau, ox: number, oy: number, oben: number, art: 'ganz' | 'oben' | 'aus', c: string, o: ZeichenOptionen): string {
  const hilfe = o.vorrechnen ? 'teil' : art === 'aus' ? 'schritt' : 'teil';
  let s = '';
  for (let d = b.hoehen.length - 1; d >= 0; d--)
    for (let x = 0; x < b.hoehen[d].length; x++)
      for (let z = 0; z < b.hoehen[d][x]; z++) {
        const h = hub(z, oben, art);
        const w = wuerfel(ox, oy - U * h, x, d, z, c);
        s += h > 0 ? `<g data-hilfe="${hilfe}">${w}</g>` : w;
      }
  // Schatten des Hubs: warmer Rand um die Bodenplatte zeigt, dass etwas angehoben ist
  if (art !== 'ganz' && !o.vorrechnen) {
    const tiefe = b.hoehen.length;
    const breite = Math.max(...b.hoehen.map((r) => r.length));
    const p = (x: number, d: number) => punkt(ox, oy, x, d, 0);
    s = `<polygon data-hilfe="${hilfe}" points="${p(0, 0)} ${p(breite, 0)} ${p(breite, tiefe)} ${p(0, tiefe)}" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3" opacity="0.7"/>` + s;
  }
  return s;
}

export const WUERFELBAU: Format<Wuerfelbau> = {
  id: 'wuerfelbau',
  nr: 37,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R2',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVieleWuerfel',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) ein einziger Würfel; (2) zwei Türme, 1 und 2 hoch; (3) gewöhnliche Aufgabe der Stufe 1. */
  beispiele: () => [
    { hoehen: [[1]], farbe: 'blau' },
    { hoehen: [[1, 2]], farbe: 'gruen' },
    { hoehen: [[2, 1, 3]], farbe: 'orange' },
  ],
};
