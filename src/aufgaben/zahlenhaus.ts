import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { STEIN, STEIN_KANTE, TINTE, WEISS, FIGUR_TOKEN } from '../design/farbe';
import { gewaehlteZahl, hilfeRahmen, nest, punkte, punktefeld, svgHuelle } from './zaehlen';

/**
 * Zahlenhaus (Nr. 4, mit dem Variante Nr. 5 „Verliebte Zahlen“ als Stufe 1; Engine Raster mit einer leeren Zelle):
 * Auf dem Dach steht eine Zahl; in jedem Stockwerk stehen zwei Zahlen, die zusammen die Dachzahl ergeben. In einem
 * Stockwerk fehlt eine Zahl.
 * Stufe 1 (Verliebte Zahlen): das Dach ist immer 10, drei Stockwerke, rechts fehlt eine Zahl.
 * Stufe 2: schwerer wird die Dachzahl – 5 bis zum Zahlenraum (bei 100: volle Zehner bis 100 oder bis 20), 3–4
 *          Stockwerke, die fehlende Zahl ist rechts.
 * Stufe 3: schwerer wird die Lage – die fehlende Zahl kann links oder rechts sein; 4 Stockwerke; Stockwerke nicht der
 *          Reihe nach (keine Treppe, an der man ablesen könnte).
 * Der Löser rechnet nur mit dem, was im Haus steht: Dachzahl minus die bekannte Zahl im Stockwerk der Lücke; jedes
 * volle Stockwerk muss die Dachzahl ergeben, sonst widerspricht das Haus sich (keine Lösung).
 *
 * Hilfe auf dem Bild: Stufe 2 rahmt das Dach und das Stockwerk mit der Lücke ein; Stufe 3 legt die Dachzahl als Punkte
 * darunter – die bekannte Zahl dunkel, der Rest leer (zum Zählen). Keine Zahl.
 */
export interface Zahlenhaus {
  dach: number;
  /** Stockwerke von oben nach unten; null = Lücke (genau eine) */
  stockwerke: [number | null, number | null][];
}

function loesungen(h: Zahlenhaus): Antwort[] {
  const voll = h.stockwerke.filter(([a, b]) => a !== null && b !== null) as [number, number][];
  if (voll.some(([a, b]) => a + b !== h.dach)) return [];
  const luecken = h.stockwerke.filter(([a, b]) => a === null || b === null);
  if (luecken.length !== 1) return [];
  const [a, b] = luecken[0];
  const bekannt = (a ?? b) as number | null;
  if (bekannt === null || bekannt > h.dach) return [];
  return [{ art: 'zahl', wert: h.dach - bekannt }];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Zahlenhaus {
  const zr = e.zahlenraum;
  for (;;) {
    // bis 100: volle Zehner (Teile in Zehnern) oder bis 20; sonst bis zum Zahlenraum
    const dach = stufe === 1 ? 10 : zr === 100 && z.zahl() < 0.5 ? z.ganz(2, 10) * 10 : z.ganz(5, Math.min(zr, 20));
    const n = stufe === 1 ? 3 : stufe === 2 ? z.ganz(3, 4) : 4;
    const schritt = dach >= 30 ? 10 : 1;
    const teile = z.mischen(Array.from({ length: dach / schritt + 1 }, (_, k) => k * schritt)).slice(0, n);
    if (teile.length < n) continue;
    // Stufe 1 und 2: Stockwerke der Reihe nach (kleine Zahl links zuerst); Stufe 3: durcheinander
    if (stufe < 3) teile.sort((x, y) => x - y);
    const stockwerke: [number | null, number | null][] = teile.map((t) => [t, dach - t]);
    const k = z.ganz(0, n - 1);
    const links = stufe === 3 && z.zahl() < 0.5;
    stockwerke[k] = links ? [null, stockwerke[k][1]] : [stockwerke[k][0], null];
    return { dach, stockwerke };
  }
}

/* ---------- Bild ---------- */

const ZB = 82;
const ZH = 52;

function zelle(x: number, y: number, inhalt: string): string {
  return `<rect x="${x}" y="${y + 3}" width="${ZB}" height="${ZH}" rx="8" fill="${STEIN_KANTE}"/><rect x="${x}" y="${y}" width="${ZB}" height="${ZH}" rx="8" fill="${STEIN}"/>` + inhalt;
}
const zahl = (x: number, y: number, n: number | string) => `<text x="${x}" y="${y + 10}" text-anchor="middle" font-size="28" font-weight="800" fill="${TINTE}">${n}</text>`;

function zeichne(h: Zahlenhaus, o: ZeichenOptionen): string {
  const W = 2 * ZB + 60;
  const x0 = 30;
  const dachH = 70;
  let s = '';
  const k = h.stockwerke.findIndex(([a, b]) => a === null || b === null);
  const hell = o.hilfe >= 2 || !!o.vorrechnen;
  if (hell) {
    s += `<path data-hilfe="teil" d="M${x0 - 10} ${dachH + 8} L${W / 2} 0 L${W - x0 + 10} ${dachH + 8} Z" fill="${FIGUR_TOKEN['blatt-gold-licht']}" stroke="${FIGUR_TOKEN['blatt-gold-kante']}" stroke-width="3" stroke-linejoin="round"/>`;
    s += hilfeRahmen(x0 - 8, dachH + 10 + k * (ZH + 6) - 4, 2 * ZB + 20, ZH + 12, 'teil');
  }
  s += `<path d="M${x0 - 4} ${dachH + 4} L${W / 2} 6 L${W - x0 + 4} ${dachH + 4} Z" fill="${FIGUR_TOKEN.halstuch}" stroke="${FIGUR_TOKEN['halstuch-kante']}" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<text x="${W / 2}" y="${dachH - 8}" text-anchor="middle" font-size="30" font-weight="800" fill="${WEISS}">${h.dach}</text>`;
  const loesung = o.vorrechnen ? (loesungen(h)[0] as { wert: number }).wert : null;
  h.stockwerke.forEach(([a, b], i) => {
    const y = dachH + 10 + i * (ZH + 6);
    [a, b].forEach((v, j) => {
      const x = x0 + j * (ZB + 4);
      if (v !== null) s += zelle(x, y, zahl(x + ZB / 2, y + ZH / 2, v));
      else s += nest(x, y, ZB, ZH - 4, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
    });
  });
  let y = dachH + 10 + h.stockwerke.length * (ZH + 6) + 4;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const [a, b] = h.stockwerke[k];
    const bekannt = (a ?? b)!;
    const f = punktefeld([...punkte(bekannt, 'erster'), ...punkte(h.dach - bekannt, 'leer')], W, y + 4);
    s += f.svg;
    y += f.hoehe + 8;
  }
  return svgHuelle(W, y, 'Zahlenhaus', s);
}

export const ZAHLENHAUS: Format<Zahlenhaus> = {
  id: 'zahlenhaus',
  nr: 4,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z2',
  motor: 'raster',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheZahlFehlt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) Dach 3, ein Stockwerk 1 und ?; (2) Dach 5, zwei Stockwerke; (3) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [
    { dach: 3, stockwerke: [[1, null]] },
    { dach: 5, stockwerke: [[1, 4], [2, null]] },
    aufgabeAus(ZAHLENHAUS, 0, 1).bedingung,
  ],
};
