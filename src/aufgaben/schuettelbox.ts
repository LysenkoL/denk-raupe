import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Einstellung, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, HOLZ, HOLZ_KANTE, LATERNE, LATERNE_KANTE, TINTE, WEISS } from '../design/farbe';
import { DING_FARBEN, ding, gewaehlteZahl, nest, punkte, punktefeld, schild, svgHuelle, type DingFarbe } from './zaehlen';

/**
 * Schüttelbox (Nr. 3, Engine Bauen, Antwort Zahl): in einer Schachtel liegen Kugeln – wie viele, steht auf dem Schild.
 * Die Schachtel wurde geschüttelt; eine Hälfte ist mit einem Deckel zu. Wie viele Kugeln liegen unter dem Deckel?
 * Stufe 1: 3–6 Kugeln. Stufe 2: 5–10 Kugeln. Stufe 3: 10–20 Kugeln (bei Zahlenraum 10: 7–10, mehr unter dem Deckel).
 * Unter dem Deckel kann auch keine Kugel sein; offen liegt mindestens eine.
 * Der Löser rechnet nur mit dem, was zu sehen ist: Zahl auf dem Schild minus die Kugeln in der offenen Hälfte.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt das Schild hervor (so viele sind es zusammen); Stufe 3 legt die Zahl des Schildes als
 * Punkte darunter – die offenen Kugeln dunkel, der Rest leer zum Zählen. Keine Zahl.
 */
export interface Schuettelbox {
  gesamt: number;
  offen: number;
  farbe: DingFarbe;
}

function loesungen(b: Schuettelbox): Antwort[] {
  return b.offen <= b.gesamt ? [{ art: 'zahl', wert: b.gesamt - b.offen }] : [];
}

function erzeuge(z: Zufall, stufe: number, e: Einstellung): Schuettelbox {
  const [a, c] = stufe === 1 ? [3, 6] : stufe === 2 ? [5, 10] : e.zahlenraum === 10 ? [7, 10] : [10, 20];
  const gesamt = z.ganz(a, c);
  const offen = stufe === 3 ? z.ganz(1, Math.floor(gesamt / 2)) : z.ganz(1, gesamt);
  return { gesamt, offen, farbe: z.eins(DING_FARBEN) };
}

function zeichne(b: Schuettelbox, o: ZeichenOptionen): string {
  const W = 320;
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += `<rect data-hilfe="teil" x="${W / 2 - 56}" y="0" width="112" height="76" rx="18" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3.5"/>`;
  s += schild(W / 2 - 48, 6, 96, 62) + `<text x="${W / 2}" y="49" text-anchor="middle" font-size="34" font-weight="800" fill="${TINTE}">${b.gesamt}</text>`;
  // Schachtel: zwei Hälften; rechts der Deckel
  const [bx, by, bw, bh] = [14, 90, W - 28, 150];
  s += `<rect x="${bx}" y="${by + 6}" width="${bw}" height="${bh}" rx="16" fill="${HOLZ_KANTE}"/><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="16" fill="${HOLZ}"/>`;
  s += `<path d="M${W / 2} ${by + 8}V${by + bh - 8}" stroke="${HOLZ_KANTE}" stroke-width="5"/>`;
  const spalten = 4;
  for (let k = 0; k < b.offen; k++) s += ding({ x: bx + 22 + (k % spalten) * 33, y: by + 22 + Math.floor(k / spalten) * 30 }, 'kreis', b.farbe, { nr: k });
  s += `<rect x="${W / 2 + 4}" y="${by - 4}" width="${bw / 2 - 2}" height="${bh + 10}" rx="14" fill="${FIGUR_TOKEN.korb}" stroke="${FIGUR_TOKEN['korb-kante']}" stroke-width="4"/>`;
  s += `<rect x="${W / 2 + 18}" y="${by + 6}" width="${bw / 2 - 30}" height="5" rx="2.5" fill="${WEISS}" opacity="0.4"/>`;
  let y = by + bh + 16;
  if (o.hilfe >= 3 && !o.vorrechnen) {
    const f = punktefeld([...punkte(b.offen, 'erster'), ...punkte(b.gesamt - b.offen, 'leer')], W, y);
    s += f.svg;
    y += f.hoehe + 8;
  }
  const loesung = o.vorrechnen ? b.gesamt - b.offen : null;
  s += nest(W / 2 + 4 + (bw / 2 - 2) / 2 - 42, by + bh / 2 - 27, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, y, 'Schüttelbox', s);
}

export const SCHUETTELBOX: Format<Schuettelbox> = {
  id: 'schuettelbox',
  nr: 3,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z2',
  motor: 'bauen',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'wieVieleVersteckt',
  stufen: 3,
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) 2 Kugeln, 1 offen; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => [{ gesamt: 2, offen: 1, farbe: 'rot' }, aufgabeAus(SCHUETTELBOX, 0, 1).bedingung],
};
