import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import { FOKUS, LATERNE, LATERNE_KANTE, PAPIER, TINTE, type FormFarbe } from '../design/farbe';
import { gitterSvg, gleichesGitter, spiegelD, spiegelLR, spiegelOU, type Gitter } from './zellen';

/**
 * Spiegel-Achse (Nr. 79, Engine Auswahl, Antwort Nummer der Linie): eine Figur aus Kästchen, darüber gestrichelte Linien
 * mit Nummern. An welcher Linie lässt sich die Figur so falten, dass beide Hälften genau aufeinander liegen?
 * Stufe 1: 4 × 4 Kästchen, zwei Linien (senkrecht und waagerecht).
 * Stufe 2: 6 × 6 Kästchen, zwei Linien, zwei Farben.
 * Stufe 3: 6 × 6 Kästchen, vier Linien (dazu die zwei Diagonalen).
 * Der Löser prüft jede gezeigte Linie: Spiegelt man die Figur an ihr, kommt dieselbe Figur heraus? Genau eine Linie muss
 * es sein.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt die Figur hervor (Rahmen); Stufe 3 macht eine falsche Linie blass – übrig bleiben
 * mindestens zwei Linien (bei zwei Linien verrät das alles: dann an der ähnlichen Aufgabe).
 */
export type Linie = 'senkrecht' | 'waagerecht' | 'diagonal' | 'gegendiagonal';
export interface Spiegelachse {
  figur: Gitter;
  linien: Linie[];
}

const SPIEGEL: Record<Linie, (g: Gitter) => Gitter> = {
  senkrecht: spiegelLR,
  waagerecht: spiegelOU,
  diagonal: spiegelD,
  gegendiagonal: (g) => spiegelLR(spiegelD(spiegelLR(g))),
};
export const symmetrisch = (g: Gitter, l: Linie) => gleichesGitter(g, SPIEGEL[l](g));

function loesungen(s: Spiegelachse): Antwort[] {
  return s.linien.flatMap((l, i) => (symmetrisch(s.figur, l) ? [{ art: 'zahl', wert: i + 1 } as Antwort] : []));
}

const FARBEN: FormFarbe[] = ['blau', 'gruen', 'orange', 'lila', 'rot'];

function erzeuge(z: Zufall, stufe: number): Spiegelachse {
  const n = stufe === 1 ? 4 : 6;
  const linien: Linie[] = stufe === 3 ? z.mischen(['senkrecht', 'waagerecht', 'diagonal', 'gegendiagonal']) : z.mischen(['senkrecht', 'waagerecht']);
  const farben = z.mischen(FARBEN).slice(0, stufe === 1 ? 1 : 2);
  for (;;) {
    const ziel = z.eins(linien);
    // zufällige Hälfte, dann gespiegelt ergänzt
    let g: Gitter = Array.from({ length: n }, () => Array.from({ length: n }, () => (z.zahl() < 0.4 ? z.eins(farben) : null)));
    const sp = SPIEGEL[ziel](g);
    g = g.map((r, i) =>
      r.map((c, j) => {
        const vorn = ziel === 'senkrecht' ? j < n / 2 : ziel === 'waagerecht' ? i < n / 2 : ziel === 'diagonal' ? j >= i : i + j < n;
        return vorn ? c : sp[i][j];
      }),
    );
    if (!symmetrisch(g, ziel)) continue;
    const voll = g.flat().filter((c) => c).length;
    if (voll < n * 1.5 || voll > n * n * 0.7) continue;
    if (linien.filter((l) => symmetrisch(g, l)).length !== 1) continue;
    return { figur: g, linien };
  }
}

const schrittVerraet = (s: Spiegelachse) => s.linien.length < 3;
/** Linie, die Stufe 3 blass macht: die erste falsche */
const blasseLinie = (s: Spiegelachse) => s.linien.findIndex((l) => !symmetrisch(s.figur, l));

/* ---------- Bild ---------- */

const W = 300;

function zeichne(s: Spiegelachse, o: ZeichenOptionen): string {
  const n = s.figur.length;
  const z = 216 / n;
  const x0 = (W - n * z) / 2;
  const y0 = 42;
  const [a, b] = [x0 - 22, x0 + n * z + 22];
  const [c, d] = [y0 - 22, y0 + n * z + 22];
  const mx = x0 + (n * z) / 2;
  const my = y0 + (n * z) / 2;
  const strecke: Record<Linie, [number, number, number, number]> = {
    senkrecht: [mx, c, mx, d],
    waagerecht: [a, my, b, my],
    diagonal: [a + 10, c + 10, b - 10, d - 10],
    gegendiagonal: [b - 10, c + 10, a + 10, d - 10],
  };
  let t = '';
  if (o.hilfe >= 2 || o.vorrechnen) t += `<rect data-hilfe="teil" x="${x0 - 8}" y="${y0 - 8}" width="${n * z + 16}" height="${n * z + 16}" rx="12" fill="${LATERNE}" stroke="${LATERNE_KANTE}" stroke-width="3"/>`;
  t += gitterSvg(s.figur, x0, y0, z);
  const gew = o.vorrechnen ? (loesungen(s)[0] as { wert: number }).wert - 1 : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  const blass = o.hilfe >= 3 && !o.vorrechnen && (o.aehnlich || !schrittVerraet(s)) ? blasseLinie(s) : -1;
  s.linien.forEach((l, i) => {
    const [x1, y1, x2, y2] = strecke[l];
    const gewaehlt = gew === i;
    t += `<g class="wahl-ziel" data-wahl="${i}" role="button" tabindex="0" aria-label="Linie ${i + 1}" opacity="${blass === i ? 0.25 : 1}"${blass === i ? ' data-hilfe="schritt"' : ''}>`;
    t += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${PAPIER}" stroke-width="30" stroke-opacity="0.01" stroke-linecap="round"/>`;
    if (gewaehlt) t += `<path${o.vorrechnen ? '' : ' data-inhalt=""'} d="M${x1} ${y1}L${x2} ${y2}" stroke="${FOKUS}" stroke-width="9" stroke-linecap="round" opacity="0.5"/>`;
    t += `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${TINTE}" stroke-width="4" stroke-dasharray="9 6" stroke-linecap="round"/>`;
    t += `<circle cx="${x1}" cy="${y1}" r="16" fill="${PAPIER}" stroke="${gewaehlt ? FOKUS : TINTE}" stroke-width="3"/><text x="${x1}" y="${y1 + 7}" text-anchor="middle" font-size="19" font-weight="800" fill="${TINTE}">${i + 1}</text>`;
    t += '</g>';
  });
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${d + 22}" role="group" aria-label="Spiegel-Achse">${t}</svg>`;
}

export const SPIEGELACHSE: Format<Spiegelachse> = {
  id: 'spiegelachse',
  nr: 79,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'welcheLinieFalten',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (s) => s.linien.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  schrittVerraet,
  /** Lernbeispiel: (1) 2 × 2: zwei Kästchen nebeneinander oben; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const [b, _] = ['blau' as FormFarbe, null];
    return [{ figur: [[b, b], [_, _]], linien: ['waagerecht', 'senkrecht'] as Linie[] }, aufgabeAus(SPIEGELACHSE, 0, 1).bedingung];
  },
};
