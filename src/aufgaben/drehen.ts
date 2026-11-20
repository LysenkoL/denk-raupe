import type { Antwort } from '../perlen/antwort';
import type { Zufall } from '../core/zufall';
import { aufgabeAus, type Format, type ZeichenOptionen } from './format';
import type { FormFarbe } from '../design/farbe';
import { hilfeRahmen, schild } from './zaehlen';
import { kartenReihe } from './auswahl';
import { drehen, drehungen, gitterSvg, gleichesGitter, spiegelLR, zuschneiden, type Gitter } from './zellen';

/**
 * Drehen (Nr. 36, Engine Auswahl): oben eine Figur aus Kästchen (ein Kästchen in anderer Farbe als Merkpunkt). Welche
 * Karte zeigt dieselbe Figur, nur gedreht? Die anderen Karten zeigen die Figur gespiegelt (sie lässt sich durch
 * Drehen nicht so legen) oder eine andere Figur.
 * Stufe 1: vier Kästchen, halbe Drehung; drei Karten.
 * Stufe 2: fünf Kästchen, Viertel- oder Dreivierteldrehung; vier Karten.
 * Stufe 3: sechs Kästchen, beliebige Drehung; vier Karten, darunter zwei gespiegelte in verschiedener Lage.
 * Die Figur ist nie spiegelgleich (sonst wäre ihr Spiegelbild auch eine Drehung). Der Löser prüft jede Karte gegen alle
 * vier Drehungen der Figur; genau eine Karte muss passen.
 *
 * Hilfe auf dem Bild: Stufe 2 hebt den Merkpunkt der Figur hervor (an ihm erkennt man die Lage); Stufe 3 macht eine
 * gespiegelte Karte blass – übrig bleiben mindestens zwei.
 */
export interface Drehen {
  figur: Gitter;
  karten: Gitter[];
}

const istDrehung = (f: Gitter, k: Gitter) => drehungen(f).some((d) => gleichesGitter(d, zuschneiden(k)));

function loesungen(d: Drehen): Antwort[] {
  return d.karten.flatMap((k, i) => (istDrehung(d.figur, k) ? [{ art: 'zahl', wert: i + 1 } as Antwort] : []));
}

const FARBEN: FormFarbe[] = ['blau', 'gruen', 'lila', 'orange'];

/** zusammenhängende Figur aus `n` Kästchen in einem 4 × 4-Gitter, ein Kästchen als Merkpunkt (rot) */
function figur(z: Zufall, n: number): Gitter {
  const farbe = z.eins(FARBEN);
  const zellen: [number, number][] = [[z.ganz(1, 2), z.ganz(1, 2)]];
  while (zellen.length < n) {
    const [i, j] = z.eins(zellen);
    const [di, dj] = z.eins([[0, 1], [1, 0], [0, -1], [-1, 0]] as const);
    const neu: [number, number] = [i + di, j + dj];
    if (neu[0] < 0 || neu[1] < 0 || neu[0] > 3 || neu[1] > 3 || zellen.some(([a, b]) => a === neu[0] && b === neu[1])) continue;
    zellen.push(neu);
  }
  const g: Gitter = Array.from({ length: 4 }, () => Array(4).fill(null));
  zellen.forEach(([i, j]) => (g[i][j] = farbe));
  const [mi, mj] = z.eins(zellen);
  g[mi][mj] = 'rot';
  return zuschneiden(g);
}

const drehe = (g: Gitter, k: number) => {
  let r = g;
  for (let i = 0; i < k; i++) r = drehen(r);
  return zuschneiden(r);
};

function erzeuge(z: Zufall, stufe: number): Drehen {
  const n = stufe + 3;
  const anzahl = stufe === 1 ? 3 : 4;
  for (;;) {
    const f = figur(z, n);
    // nie spiegelgleich, alle vier Drehungen verschieden
    if (istDrehung(f, spiegelLR(f))) continue;
    const dr = drehungen(f);
    if (dr.some((a, i) => dr.some((b, j) => i < j && gleichesGitter(a, b)))) continue;
    const k = stufe === 1 ? 2 : stufe === 2 ? z.eins([1, 3]) : z.ganz(1, 3);
    const richtig = drehe(f, k);
    const spiegel = spiegelLR(f);
    const falsche = [drehe(spiegel, k), drehe(spiegel, (k + 1) % 4), drehe(spiegel, (k + 2) % 4), drehe(figur(z, n), z.ganz(0, 3))];
    const karten: Gitter[] = [richtig];
    for (const x of stufe === 3 ? falsche : [falsche[0], falsche[3], falsche[1]]) if (karten.length < anzahl && !istDrehung(f, x) && !karten.some((y) => gleichesGitter(zuschneiden(y), zuschneiden(x)))) karten.push(x);
    if (karten.length < anzahl) continue;
    return { figur: f, karten: z.mischen(karten) };
  }
}

/** Karte, die Stufe 3 blass macht: die erste gespiegelte */
export function blasseKarte(d: Drehen): number {
  return d.karten.findIndex((k) => !istDrehung(d.figur, k) && istDrehung(spiegelLR(d.figur), k));
}

/* ---------- Bild ---------- */


function zeichne(d: Drehen, o: ZeichenOptionen): string {
  // drei Karten nebeneinander brauchen 3 · 120 + Rand
  const W = d.karten.length === 3 ? 372 : 300;
  const z = 26;
  const fw = d.figur[0].length * z;
  const fh = d.figur.length * z;
  const sw = Math.max(fw + 30, 120);
  let s = '';
  s += schild((W - sw) / 2, 6, sw, fh + 24);
  const fx = (W - fw) / 2;
  const fy = 18;
  if (o.hilfe >= 2 || o.vorrechnen)
    d.figur.forEach((r, i) => r.forEach((c, j) => c === 'rot' && (s += hilfeRahmen(fx + j * z - 5, fy + i * z - 5, z + 10, z + 10, 'teil', 8))));
  s += gitterSvg(d.figur, fx, fy, z, { leer: false });
  const oben = fh + 40;
  const gew = o.vorrechnen ? (loesungen(d)[0] as { wert: number }).wert - 1 : o.gewaehlt?.art === 'zahl' ? o.gewaehlt.wert - 1 : null;
  const blass = o.hilfe >= 3 && !o.vorrechnen ? blasseKarte(d) : -1;
  const reihe = kartenReihe(
    d.karten.length,
    d.karten.length === 4 ? 2 : 3,
    W,
    oben,
    (i, cx, cy) => {
      const k = d.karten[i];
      const kz = Math.min(20, 84 / Math.max(k.length, k[0].length));
      return gitterSvg(k, cx - (k[0].length * kz) / 2, cy - (k.length * kz) / 2 + 4, kz, { leer: false });
    },
    { gewaehlt: gew, nummer: true, blass: (i) => (i === blass ? 'schritt' : null) },
    (i) => `Karte ${i + 1}`,
  );
  s += reihe.svg;
  return `<svg class="aufgabe-svg" viewBox="0 0 ${W} ${oben + reihe.hoehe}" role="group" aria-label="Drehen">${s}</svg>`;
}

export const DREHEN: Format<Drehen> = {
  id: 'drehen',
  nr: 36,
  version: 1,
  bereich: 'raum',
  faehigkeit: 'R1',
  motor: 'auswahl',
  klasse: 1,
  lesen: 0,
  braucht: [],
  /** Druckblock kommt mit Etappe 8 */
  druck: false,
  auftrag: 'gleicheFigurGedreht',
  stufen: 3,
  /** hängt nicht vom Zahlenraum ab: liest die Einstellung nicht */
  erzeuge,
  loesungen,
  eingabe: () => ({ art: 'bild' }),
  wahl: (d) => d.karten.map((_, i) => ({ art: 'zahl', wert: i + 1 }) as Antwort),
  zeichne,
  /** Lernbeispiel: (1) ein Winkel aus drei Kästchen, zwei Karten; (2) gewöhnliche Aufgabe der Stufe 1 aus dem Generator. */
  beispiele: () => {
    const [b, r, _] = ['blau' as FormFarbe, 'rot' as FormFarbe, null];
    const f: Gitter = [[r, _], [b, b]];
    return [{ figur: f, karten: [drehe(f, 1), drehe(spiegelLR([[r, b, _], [_, b, b]]), 0)] }, aufgabeAus(DREHEN, 0, 1).bedingung];
  },
};
