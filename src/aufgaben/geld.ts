import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import type { Einstellung, Format, ZeichenOptionen } from './format';
import { FIGUR_TOKEN, HONIG, HONIG_KANTE, STEIN, STEIN_KANTE, TINTE, TINTE_LEISE, WEISS, ZIFFER_FARBEN, mix } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, nest, pfeil, punkte, punktefeld, schild, svgHuelle, type PunktArt } from './zaehlen';

/**
 * Geld (Nr. 17, Engine Bild, Antwort Zahl in ganzen Euro): Münzen und Scheine liegen da – wie viel Euro sind es?
 * Gezeichnet in eigener, einfacher Form (Münze: Kreis mit Wert, Schein: Rechteck mit Wert), keine echten Motive.
 * Stufe 1: nur 1-€- und 2-€-Münzen, nach Wert sortiert; 2–10 €.
 * Stufe 2: schwerer wird die Mischung – Münzen und Scheine (5 €, 10 €, bei Zahlenraum 100 auch 20 € und 50 €) gemischt;
 *          bis zum Zahlenraum.
 * Stufe 3: schwerer wird die Frage – Rückgeld: ein Ding kostet so viel (Preisschild), bezahlt wird mit einem Schein oder
 *          Münzen, die mehr wert sind. Wie viel Euro kommen zurück?
 * Cent kommen nicht vor (Euro und Cent sind Stoff der 2. Klasse); die Antwort ist eine ganze Zahl wie sonst auch.
 * Der Löser zählt die Werte im Bild zusammen (Stufe 3: bezahlt minus Preis; ist nicht mehr bezahlt als der Preis,
 * gibt es keine Antwort).
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die Scheine und großen Münzen hervor (mit ihnen anfangen) bzw. das Preisschild;
 * Stufe 3 legt jeden Euro als Punkt darunter – je Geldstück eine Farbe, beim Rückgeld der Preis durchgestrichen. Keine Zahl.
 */
export type Wert = 1 | 2 | 5 | 10 | 20 | 50;
export interface Geld {
  /** Geldstücke in der Reihenfolge im Bild */
  stuecke: Wert[];
  /** Stufe 3: Preis auf dem Schild; sonst null */
  preis: number | null;
}

const summe = (s: readonly Wert[]) => s.reduce<number>((a, w) => a + w, 0);

function loesungen(g: Geld): Antwort[] {
  const n = summe(g.stuecke);
  if (g.preis === null) return [{ art: 'zahl', wert: n }];
  return n > g.preis ? [{ art: 'zahl', wert: n - g.preis }] : [];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Geld {
  const zr = e.zahlenraum;
  for (;;) {
    if (stufe === 1) {
      const grenze = 10;
      const stuecke: Wert[] = Array.from({ length: z.ganz(2, 6) }, () => z.eins([1, 2] as const));
      if (summe(stuecke) > grenze) continue;
      return { stuecke: stuecke.sort((a, b) => b - a), preis: null };
    }
    if (stufe === 2) {
      const werte: Wert[] = zr === 100 ? [1, 2, 5, 10, 20, 50] : [1, 2, 5, 10];
      const stuecke: Wert[] = Array.from({ length: z.ganz(3, 6) }, () => z.eins(werte));
      const n = summe(stuecke);
      if (n > zr || n < 6 || !stuecke.some((w) => w >= 5) || !stuecke.some((w) => w < 5)) continue;
      return { stuecke, preis: null };
    }
    // Rückgeld: bezahlt mit einem Schein (oder zwei Münzen bei Zahlenraum 10)
    const schein: Wert = zr === 10 ? z.eins([5, 10] as const) : zr === 20 ? z.eins([10, 20] as const) : z.eins([10, 20, 50] as const);
    const preis = z.ganz(1, schein - 1);
    if (zr === 100 && schein === 50 && preis < 20) continue;
    return { stuecke: [schein], preis };
  }
}

/* ---------- Bild ---------- */

const GOLD = HONIG;
const SILBER = '#D9DEE3';
const SILBER_KANTE = '#9AA4AE';
/** Farbe der Scheine: aus der Ziffernpalette, hell gemischt */
const SCHEIN: Record<number, string> = { 5: ZIFFER_FARBEN[5], 10: ZIFFER_FARBEN[1], 20: ZIFFER_FARBEN[6], 50: ZIFFER_FARBEN[2] };

const MUENZE_R: Record<number, number> = { 1: 26, 2: 30 };
const SCHEIN_B = 104;
const SCHEIN_H = 56;
const AB = 10;
const BREITE = 300;

/** Lage jedes Geldstücks: von links nach rechts, mit Umbruch */
export function anordnung(stuecke: readonly Wert[], x0 = 8, y0 = 8, breite = BREITE - 16): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  let [x, y, zeile] = [x0, y0, 0];
  for (const w of stuecke) {
    const [bw, bh] = w >= 5 ? [SCHEIN_B, SCHEIN_H] : [2 * MUENZE_R[w], 2 * MUENZE_R[w]];
    if (x + bw > x0 + breite) {
      x = x0;
      y += zeile + AB;
      zeile = 0;
    }
    out.push({ x, y, w: bw, h: bh });
    x += bw + AB;
    zeile = Math.max(zeile, bh);
  }
  return out;
}

function stueck(w: Wert, x: number, y: number): string {
  if (w >= 5) {
    const c = SCHEIN[w];
    const hell = mix(c, WEISS, 0.62);
    return (
      `<g data-geld="${w}"><rect x="${x}" y="${y + 3}" width="${SCHEIN_B}" height="${SCHEIN_H}" rx="7" fill="${mix(c, TINTE, 0.25)}"/>` +
      `<rect x="${x}" y="${y}" width="${SCHEIN_B}" height="${SCHEIN_H}" rx="7" fill="${hell}" stroke="${c}" stroke-width="3"/>` +
      `<circle cx="${x + 24}" cy="${y + SCHEIN_H / 2}" r="14" fill="${mix(c, WEISS, 0.35)}"/>` +
      `<text x="${x + SCHEIN_B - 38}" y="${y + 37}" text-anchor="middle" font-size="27" font-weight="800" fill="${TINTE}">${w}</text>` +
      `<text x="${x + SCHEIN_B - 12}" y="${y + 37}" text-anchor="middle" font-size="17" font-weight="800" fill="${TINTE}">€</text></g>`
    );
  }
  const r = MUENZE_R[w];
  const [cx, cy] = [x + r, y + r];
  // 1 €: innen Silber, außen Gold; 2 €: innen Gold, außen Silber – nur als Erkennungszeichen, kein echtes Motiv
  const [aussen, innen, kante] = w === 1 ? [GOLD, SILBER, HONIG_KANTE] : [SILBER, GOLD, SILBER_KANTE];
  return (
    `<g data-geld="${w}"><circle cx="${cx}" cy="${cy + 3}" r="${r}" fill="${kante}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${aussen}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="${innen}"/>` +
    `<text x="${cx - 3}" y="${cy + 9}" text-anchor="middle" font-size="25" font-weight="800" fill="${TINTE}">${w}</text>` +
    `<text x="${cx + 11}" y="${cy + 9}" text-anchor="middle" font-size="12" font-weight="800" fill="${TINTE}">€</text></g>`
  );
}

/** Punkte der Hilfe Stufe 3: je Euro ein Punkt, Geldstücke abwechselnd gefärbt; beim Rückgeld der Preis durchgestrichen */
export function hilfePunkte(g: Geld): PunktArt[] {
  if (g.preis !== null) return [...punkte(g.preis, 'weg'), ...punkte(summe(g.stuecke) - g.preis, 'erster')];
  return g.stuecke.flatMap((w, k) => punkte(w, k % 2 ? 'zweiter' : 'erster'));
}

/** Preisschild aus Holz mit einem Ball und dem Preis */
function preisSchild(x: number, y: number, preis: number, hell: boolean): string {
  let s = '';
  if (hell) s += hilfeRahmen(x - 6, y - 6, 132, 82, 'teil');
  s += schild(x, y, 120, 70);
  s += `<circle cx="${x + 34}" cy="${y + 35}" r="22" fill="${FIGUR_TOKEN.halstuch}"/><path d="M${x + 14} ${y + 31} Q${x + 34} ${y + 44} ${x + 54} ${y + 31}" fill="none" stroke="${WEISS}" stroke-width="4"/>`;
  s += `<rect x="${x + 62}" y="${y + 16}" width="50" height="38" rx="6" fill="${STEIN}" stroke="${STEIN_KANTE}" stroke-width="2"/>`;
  s += `<text x="${x + 81}" y="${y + 44}" text-anchor="middle" font-size="22" font-weight="800" fill="${TINTE}">${preis}</text>`;
  s += `<text x="${x + 102}" y="${y + 44}" text-anchor="middle" font-size="13" font-weight="800" fill="${TINTE}">€</text>`;
  return s;
}

/**
 * Stufe 1–2: die Geldstücke, darunter das Nest mit „€“. Stufe 3: Preisschild oben, darunter das Geld, ein Pfeil zum
 * Schild, ein Pfeil zurück ins Nest. `hilfe` 2: Scheine und 2-€-Münzen (bzw. Preisschild) hervorgehoben; 3: dazu Punkte.
 */
function zeichne(g: Geld, o: ZeichenOptionen): string {
  const W = BREITE;
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  let s = '';
  let y = 8;
  if (g.preis !== null) {
    s += preisSchild(W - 8 - 120, 8, g.preis, hell);
    y = 8 + 70 + 30;
  }
  const lage = anordnung(g.stuecke, 8, y, g.preis !== null ? 140 : W - 16);
  if (hell && g.preis === null) {
    const gross = Math.max(...g.stuecke);
    g.stuecke.forEach((w, k) => {
      if (w === gross) s += hilfeRahmen(lage[k].x - 5, lage[k].y - 5, lage[k].w + 10, lage[k].h + 12, 'teil');
    });
  }
  g.stuecke.forEach((w, k) => (s += stueck(w, lage[k].x, lage[k].y)));
  y = Math.max(...lage.map((l) => l.y + l.h)) + 12;
  if (g.preis !== null) {
    // bezahlt: Pfeil vom Geld hinauf zum Schild
    s += pfeil(lage[0].x + lage[0].w + 8, lage[0].y + lage[0].h / 2, W - 8 - 120 + 20, 8 + 76, -20);
  }
  let punkteSvg = '';
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const feld = punktefeld(hilfePunkte(g), W, y + 4);
    punkteSvg = feld.svg;
    y += 4 + feld.hoehe + 4;
  }
  const loesung = o.vorrechnen ? (loesungen(g)[0] as { wert: number }).wert : null;
  const nx = W - 4 - 84 - 30;
  // Rückgeld: Pfeil vom Schild zurück ins Nest; die Punkte der Hilfe liegen darüber
  if (g.preis !== null) s += pfeil(W - 8 - 60, 8 + 80, nx + 60, y + 10, 30);
  s += punkteSvg;
  s += nest(nx, y + 8, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  s += `<text x="${W - 4 - 14}" y="${y + 8 + 38}" text-anchor="middle" font-size="26" font-weight="800" fill="${TINTE_LEISE}">€</text>`;
  return svgHuelle(W, y + 8 + 62, 'Geld', s);
}

export const GELD: Format<Geld> = {
  id: 'geld',
  nr: 17,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z8',
  motor: 'bild',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVielEuro',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) eine 2-€-Münze; (2) 2 € und 1 €; (3) gewöhnliche Aufgabe der Stufe 1: 2 + 2 + 1 + 1 = 6 €. */
  beispiele: () => [
    { stuecke: [2], preis: null },
    { stuecke: [2, 1], preis: null },
    { stuecke: [2, 2, 1, 1], preis: null },
  ],
};
