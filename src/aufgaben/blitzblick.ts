import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FIGUR_TOKEN, PAPIER, TINTE } from '../design/farbe';
import { DING_R, ding, gewaehlteZahl, hilfeRahmen, inReihen, nest, sichtbareAnzahlen, svgHuelle, tablett, verstreut, type Ding, type DingFarbe } from './zaehlen';

/**
 * Blitzblick (Nr. 2, Engine Blick, nur Bildschirm): auf dem Tablett liegen Punkte, zugedeckt von zwei großen Blättern.
 * Ist das Kind bereit, tippt es auf die Blätter: sie gehen auf, die Punkte sind 2 Sekunden zu sehen, dann gehen die
 * Blätter wieder zu. Noch einmal tippen zeigt dasselbe noch einmal („Noch einmal“ der Engine). Wie viele Punkte waren es?
 * Stufe 1: 2–5 Punkte, locker verstreut.
 * Stufe 2: 4–8 Punkte, verstreut.
 * Stufe 3: 6–10 Punkte in Fünferreihen (wie auf dem Zwanzigerfeld): fünf und noch ein paar auf einen Blick.
 * Der Löser zählt die Punkte; berühren sich zwei, ist die Zahl nicht sicher zu sehen (verworfen).
 *
 * Hilfe auf dem Bild: Stufe 2 zeigt doppelt so lange (4 Sekunden) und rahmt das Tablett ein; Stufe 3 lässt dazu die
 * ersten Punkte (eine Fünfergruppe oder die Hälfte) auch zugedeckt als helle Umrisse auf dem Blatt stehen.
 */
export interface Blitzblick {
  punkte: Ding[];
  farbe: DingFarbe;
  breite: number;
  hoehe: number;
}

function loesungen(b: Blitzblick): Antwort[] {
  return sichtbareAnzahlen(b.punkte).map((wert) => ({ art: 'zahl', wert }));
}

const RAND = 18;

function erzeuge(z: Zufall, stufe: number): Blitzblick {
  const farbe = z.eins<DingFarbe>(['rot', 'blau', 'gruen', 'lila', 'orange']);
  if (stufe === 3) {
    const n = z.ganz(6, 10);
    const punkte = inReihen(n, RAND + 20, RAND + 30, 5);
    return { punkte, farbe, breite: 240, hoehe: 140 };
  }
  const n = stufe === 1 ? z.ganz(2, 5) : z.ganz(4, 8);
  return { punkte: verstreut(z, n, 5, 3, RAND, RAND + 4), farbe, breite: 5 * 44 + 2 * RAND, hoehe: 3 * 44 + 2 * RAND };
}

/** Punkte, die Stufe 3 unter dem Blatt als Umriss stehen lässt: die erste Fünfergruppe oder die Hälfte */
export const vorgezeigt = (b: Blitzblick) => (b.punkte.length > 5 ? 5 : Math.floor(b.punkte.length / 2));

function blatt(x: number, y: number, w: number, h: number, links: boolean): string {
  const c = FIGUR_TOKEN.blatt;
  const k = FIGUR_TOKEN['blatt-kante'];
  const ader = FIGUR_TOKEN['blatt-ader'];
  const [x0, x1] = links ? [x, x + w] : [x + w, x];
  return (
    `<path d="M${x0} ${y + h / 2} Q${(x0 + x1) / 2} ${y - 10} ${x1} ${y + h / 2} Q${(x0 + x1) / 2} ${y + h + 10} ${x0} ${y + h / 2} Z" fill="${c}" stroke="${k}" stroke-width="4"/>` +
    `<path d="M${x0 + (links ? 10 : -10)} ${y + h / 2} L${x1} ${y + h / 2}" stroke="${ader}" stroke-width="4" stroke-linecap="round"/>`
  );
}

/**
 * Tablett mit Punkten in einer Blick-Gruppe (data-blick): der Bildschirm setzt beim Tippen die Klasse „laeuft“, CSS
 * zeigt dann die Punkte für --blick-dauer und deckt sie wieder zu (src/styles/satz.css). Darunter das Nest.
 */
function zeichne(b: Blitzblick, o: ZeichenOptionen): string {
  const W = b.breite + 8;
  const offen = !!o.vorrechnen;
  const dauer = o.hilfe >= 2 ? 4 : 2;
  let s = '';
  if (o.hilfe >= 2 || o.vorrechnen) s += hilfeRahmen(0, 0, W, b.hoehe + 8, 'teil');
  s += tablett(4, 4, b.breite, b.hoehe);
  const punkte = b.punkte.map((d) => ding(d, 'kreis', b.farbe)).join('');
  const umriss = o.hilfe >= 3 && !o.vorrechnen ? `<g data-hilfe="schritt">${b.punkte.slice(0, vorgezeigt(b)).map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${DING_R}" fill="${PAPIER}" fill-opacity="0.5" stroke="${TINTE}" stroke-width="2.5" stroke-dasharray="4 3"/>`).join('')}</g>` : '';
  if (offen) s += punkte;
  else {
    s += `<g data-blick="1" class="blick" style="--blick-dauer:${dauer}s" role="button" tabindex="0" aria-label="Blätter öffnen">`;
    s += `<g class="blick-inhalt">${punkte}</g>`;
    s += `<g class="blick-blatt">${blatt(4, 4, b.breite / 2 + 10, b.hoehe, true)}${blatt(4 + b.breite / 2 - 10, 4, b.breite / 2 + 10, b.hoehe, false)}</g>`;
    s += `<rect x="4" y="4" width="${b.breite}" height="${b.hoehe}" fill="${PAPIER}" opacity="0"/>`;
    s += '</g>';
    s += umriss;
  }
  const loesung = o.vorrechnen ? b.punkte.length : null;
  s += nest(W - 4 - 84, b.hoehe + 20, 84, 54, loesung ?? gewaehlteZahl(o.gewaehlt), { loesung: loesung !== null });
  return svgHuelle(W, b.hoehe + 20 + 62, 'Blitzblick', s);
}

export const BLITZBLICK: Format<Blitzblick> = {
  id: 'blitzblick',
  nr: 2,
  version: 1,
  bereich: 'zahlen',
  faehigkeit: 'Z1',
  motor: 'blick',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** nur Bildschirm (die Punkte verschwinden) */
  druck: false,
  auftrag: 'wieVieleWaren',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab (höchstens 10): liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'zahl' }),
  zeichne,
  /** Lernbeispiel: (1) zwei Punkte; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator mit mehr als zwei Punkten. */
  beispiele: () => {
    let zweite: Blitzblick | null = null;
    for (let s = 0; !zweite; s++) {
      const b = aufgabeAus(BLITZBLICK, s * 2654435761, 1).bedingung;
      if (b.punkte.length > 2) zweite = b;
    }
    return [{ punkte: [{ x: 80, y: 80 }, { x: 160, y: 90 }], farbe: 'rot', breite: 256, hoehe: 168 }, zweite];
  },
};
